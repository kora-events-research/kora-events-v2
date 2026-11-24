#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_site.py - توليد data/snapshot.json الذي يغذي الموقع الثابت.

ينتج لقطة واحدة مختومة بوقت التوليد تشمل: تعريفات الأحداث وتكرارها،
نتائج التجربة الزمنية، توقعات المباريات القادمة (من ملف fixtures لدى
Football-Data وحده؛ توقف مكمل ESPN في 2026-11-24 لأسباب تعاقدية)، التكرارات المشتركة التجريبية
لمجموعات الأحداث (وصفية فقط)، وسجل التوقعات المحفوظة قبل الانطلاق مع
تقييمها بالنتائج الفعلية عند توفرها.

الحدود الترخيصية: لا ننشر صفوفًا بمستوى المباراة (بيانات Football-Data الخام)،
ولا أي بيانات أسعار/odds من أي مصدر إطلاقًا؛ جلب ESPN متوقف نهائيًا
(شروط استخدام ديزني، البند x: حظر الاستخراج الآلي).

التشغيل: python3 src/export_site.py
"""
import csv
import io
import json
import os
import pathlib
import re
import sqlite3
import urllib.request
from datetime import date, datetime, timedelta, timezone
from itertools import combinations
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

from features import build_features
from experiment import EVENTS, FEATURE_COLS, TRAIN_FRACTION, fit_logreg, predict_logreg, brier, logloss

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "football_research.db"
FIXTURES_URL = "https://football-data.co.uk/fixtures.csv"
ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates={}"
ESPN_DAYS_AHEAD = 10
# 2026-11-24: أوقفنا الجلب الآلي من ESPN نهائيًا. شروط استخدام ديزني
# (https://disneytermsofuse.com/english/، تغطي منتجات ESPN صراحة، البند x من
# الاستخدامات المحظورة) تحظر الوصول أو النسخ أو الاستخراج بوسائل آلية بما فيها
# بناء أي مجموعة بيانات. الجدولة الآن من ملف Football-Data وحده.
ESPN_ENABLED = False

# جدولة مبدئية مكملة من openfootball (المجال العام/CC0،
# https://github.com/openfootball/england): تقابل الأندية العشرين مع Football-Data،
# لكن تواريخ/أوقات الملف تعود لإصداره الأول وقد تتأخر عن تعديلات البث الرسمية
# بيوم أو يومين (مثال موثق: تعديلات نوفمبر على موقع الدوري الرسمي). لذلك:
# تُعرض مبارياته موسومة «جدول مبدئي — توقيت غير مؤكد» ولا تُستخدم أبدًا مرساة
# لتوقعات مسجلة قبل الانطلاق (لا تدخل forecast_log ولا تُبطل مدخلاته)، وتُستبعد
# أي مواجهة لُعبت فعلًا أو ظهرت في ملف Football-Data (الأولوية له دائمًا).
OPENFOOTBALL_ENABLED = True
OPENFOOTBALL_URL = "https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt"
OPENFOOTBALL_MAX_DAYS = 14

# 2026-11-24: الطبقة مُعطّلة مؤقتًا عمدًا. اللقطة تُلزَم إلى مستودع علني، وأي
# مواعيد مؤكدة مشتقة من football-data.org ستدخل تاريخ Git العام بشكل دائم لا
# يمكن التراجع عنه؛ شروطهم لا تتضمن نطاقًا صريحًا لذلك. تبقى الطبقة معطلة حتى
# يُعتمد مسار تقديم قابل للإبطال لا يُلزم بيانات المزود في تاريخ علني (مثل
# نشر Pages عبر artifact دون commit)، مع سلوك حذف عند الإلغاء قابل للتنفيذ.
#
# طبقة تأكيد الجدولة من football-data.org (اشتراك FREE فعّال باسم المشروع):
# تُستخدم فقط لترقية مباريات openfootball المبدئية إلى مواعيد مؤكدة (تاريخ/وقت
# الفريق نفسه من واجهتهم الرسمية). لا تُنشر منها صفوف مباريات خام بأي صيغة،
# ولا تُقرأ منها أي حقول odds إطلاقًا، والمفتاح يبقى في أسرار المنفّد فقط.
# العرض تحت الاشتراك الفعّال مع الإسناد الإلزامي في التذييل (§7.1)؛ عند إلغاء
# الاشتراك تُحذف هذه الطبقة وبياناتها من العرض فورًا (§9.1) وتبقى شارات
# openfootball المبدئية. إن تعذر الاتصال تبقى الشارات المبدئية كما هي.
FDORG_ENABLED = False  # انظر الملاحظة أعلاه: النشر معلّق حتى مسار تقديم قابل للإبطال
FDORG_URL = "https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED,TIMED"

# ربط أسماء football-data.org المختصرة بأسماء Football-Data (تسمية فقط).
FDORG_TEAM_MAP = {
    "Arsenal": "Arsenal", "Aston Villa": "Aston Villa",
    "Bournemouth": "Bournemouth", "Brentford": "Brentford",
    "Brighton": "Brighton", "Chelsea": "Chelsea",
    "Coventry City": "Coventry", "Crystal Palace": "Crystal Palace",
    "Everton": "Everton", "Fulham": "Fulham",
    "Hull City": "Hull", "Ipswich Town": "Ipswich",
    "Leeds United": "Leeds", "Liverpool": "Liverpool",
    "Man City": "Man City", "Man United": "Man United",
    "Newcastle": "Newcastle", "Nottingham Forest": "Nott'm Forest",
    "Sunderland": "Sunderland", "Tottenham": "Tottenham",
}

# ربط أسماء openfootball بأسماء Football-Data (تسمية فقط؛ الفرق نفسها).
OPENFOOTBALL_TEAM_MAP = {
    "Arsenal FC": "Arsenal", "Aston Villa FC": "Aston Villa",
    "AFC Bournemouth": "Bournemouth", "Brentford FC": "Brentford",
    "Brighton & Hove Albion FC": "Brighton", "Chelsea FC": "Chelsea",
    "Coventry City FC": "Coventry", "Crystal Palace FC": "Crystal Palace",
    "Everton FC": "Everton", "Fulham FC": "Fulham",
    "Hull City AFC": "Hull", "Ipswich Town FC": "Ipswich",
    "Leeds United FC": "Leeds", "Liverpool FC": "Liverpool",
    "Manchester City FC": "Man City", "Manchester United FC": "Man United",
    "Newcastle United FC": "Newcastle", "Nottingham Forest FC": "Nott'm Forest",
    "Sunderland AFC": "Sunderland", "Tottenham Hotspur FC": "Tottenham",
}
FORECAST_LOG = ROOT / "data" / "forecast_log.json"

EVENT_LABELS = {k: v["label"] for k, v in EVENTS.items()}

# ربط أسماء الفرق بين ESPN وFootball-Data (تسمية فقط؛ الفرق نفسها).
ESPN_TEAM_MAP = {
    "AFC Bournemouth": "Bournemouth",
    "Brighton & Hove Albion": "Brighton",
    "Coventry City": "Coventry",
    "Hull City": "Hull",
    "Ipswich Town": "Ipswich",
    "Leeds United": "Leeds",
    "Manchester City": "Man City",
    "Manchester United": "Man United",
    "Newcastle United": "Newcastle",
    "Nottingham Forest": "Nott'm Forest",
    "Tottenham Hotspur": "Tottenham",
}


def train_model(df, y, upto=None):
    X = df[FEATURE_COLS].astype(float)
    means = X.mean()
    Xf = X.fillna(means).to_numpy()
    mu, sd = Xf.mean(axis=0), Xf.std(axis=0) + 1e-9
    w = fit_logreg((Xf - mu) / sd, y)
    return w, means, mu, sd


def predict_with(w, means, mu, sd, Xdf):
    X = Xdf[FEATURE_COLS].astype(float).fillna(means).to_numpy()
    return predict_logreg(w, (X - mu) / sd)


def fetch_fd_fixtures():
    """صفوف جدولة Football-Data لدوري E0 (تحمل الحكم عادة)."""
    rows = []
    with urllib.request.urlopen(FIXTURES_URL, timeout=30) as resp:
        text = resp.read().decode("utf-8-sig")
    for fr in csv.DictReader(io.StringIO(text)):
        if fr.get("Div") != "E0":
            continue
        d = fr.get("Date", "").strip()
        if not d:
            continue
        day, month, year = d.split("/")
        rows.append({
            "date": f"{year}-{month}-{day}",
            "time": (fr.get("Time") or "").strip(),
            "home": fr.get("HomeTeam", "").strip(),
            "away": fr.get("AwayTeam", "").strip(),
            "referee": (fr.get("Referee") or "").strip() or None,
            "src": "football-data",
        })
    return rows


OF_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def fetch_openfootball_fixtures():
    """مباريات بلا نتيجة من ملف openfootball، موسومة مبدئية بتوقيت غير مؤكد.

    يرفع RuntimeError إن تعذر ربط أي اسم فريق — لا تخمين صامت للأسماء إطلاقًا.
    """
    with urllib.request.urlopen(OPENFOOTBALL_URL, timeout=30) as resp:
        text = resp.read().decode("utf-8")
    rows, cur_date, cur_year, last_month, last_time = [], None, 2026, 8, ""
    date_re = re.compile(r"^\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w+)\s+(\d{1,2})(?:\s+(\d{4}))?\s*$")
    match_re = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)(?:\s+\d+-\d+.*)?$")
    for line in text.splitlines():
        dm = date_re.match(line)
        if dm:
            mon = OF_MONTHS.get(dm.group(1))
            if mon is None:
                continue
            if dm.group(3):
                cur_year = int(dm.group(3))
            elif mon < last_month:  # عبور حدود السنة (Dec -> Jan)
                cur_year += 1
            last_month = mon
            cur_date = f"{cur_year:04d}-{mon:02d}-{int(dm.group(2)):02d}"
            last_time = ""
            continue
        mm = match_re.match(line)
        if mm and cur_date and "v" in line and not re.search(r"\d+-\d+", line):
            home_raw, away_raw = mm.group(2).strip(), mm.group(3).strip()
            home = OPENFOOTBALL_TEAM_MAP.get(home_raw)
            away = OPENFOOTBALL_TEAM_MAP.get(away_raw)
            if not home or not away:
                raise RuntimeError(f"openfootball team unmapped: {home_raw!r} / {away_raw!r}")
            if mm.group(1):
                last_time = mm.group(1)
            rows.append({"date": cur_date, "time": last_time,
                         "home": home, "away": away, "referee": None,
                         "src": "openfootball", "provisional": True})
    return rows


def fetch_fdorg_fixtures():
    """مواعيد مؤكدة من football-data.org: التوأمة + تاريخ/وقت UTC فقط.

    المفتاح من متغير البيئة FOOTBALL_DATA_ORG_TOKEN ولا يُطبع أبدًا.
    يرفع RuntimeError إن تعذر ربط أي اسم فريق — لا تخمين صامت إطلاقًا.
    """
    token = os.environ.get("FOOTBALL_DATA_ORG_TOKEN")
    if not token:
        return []
    req = urllib.request.Request(FDORG_URL, headers={"X-Auth-Token": token})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.load(resp)
    rows = []
    for m in payload.get("matches", []):
        home_raw = m["homeTeam"].get("shortName") or m["homeTeam"]["name"]
        away_raw = m["awayTeam"].get("shortName") or m["awayTeam"]["name"]
        home = FDORG_TEAM_MAP.get(home_raw)
        away = FDORG_TEAM_MAP.get(away_raw)
        if not home or not away:
            raise RuntimeError(f"football-data.org team unmapped: {home_raw!r} / {away_raw!r}")
        utc = datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00"))
        rows.append({"date": utc.date().isoformat(),
                     "home": home, "away": away,
                     "kickoff_utc": utc,
                     "src": "football-data.org", "provisional": False})
    return rows


def fetch_espn_fixtures():
    """حقائق الجدولة فقط من لوحة ESPN العامة (فريقان + تاريخ + وقت).

    لا نقرأ ولا نخزن أي حقول odds/pickcenter إطلاقًا. الأحداث بحالة pre فقط.
    """
    rows = []
    today = datetime.now(timezone.utc).date()
    for i in range(ESPN_DAYS_AHEAD + 1):
        day = today + timedelta(days=i)
        url = ESPN_SCOREBOARD.format(day.strftime("%Y%m%d"))
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "kora-events-research/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.load(resp)
        except Exception as exc:
            print(f"ESPN {day}: تعذر الجلب ({exc})")
            continue
        for ev in data.get("events", []):
            try:
                if ev.get("status", {}).get("type", {}).get("state") != "pre":
                    continue
                kick = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
                comp = ev["competitions"][0]
                home = away = None
                for c in comp["competitors"]:
                    name = c["team"]["displayName"]
                    name = ESPN_TEAM_MAP.get(name, name)
                    if c.get("homeAway") == "home":
                        home = name
                    else:
                        away = name
                if not home or not away:
                    continue
                london = kick.astimezone(ZoneInfo("Europe/London"))
                rows.append({
                    "date": london.strftime("%Y-%m-%d"),
                    "time": london.strftime("%H:%M"),
                    "home": home, "away": away,
                    "referee": None,  # ESPN لا يعلن الحكم مبكرًا عادة
                    "src": "espn",
                    "kickoff_utc": kick.astimezone(timezone.utc),
                })
            except Exception as exc:
                print(f"ESPN event skipped: {exc}")
    return rows


def main():
    df = build_features(DB).sort_values(["match_datetime", "match_id"]).reset_index(drop=True)
    n = len(df)
    split_idx = int(round(n * TRAIN_FRACTION))

    con = sqlite3.connect(DB)
    meta_row = con.execute("SELECT MIN(match_date), MAX(match_date), COUNT(*) FROM matches").fetchone()
    team_rows = con.execute("SELECT * FROM team_match ORDER BY match_datetime, match_id").fetchall()
    team_cols = [d[0] for d in con.execute("SELECT * FROM team_match LIMIT 1").description]
    con.close()

    y_all = {e: df.apply(spec["fn"], axis=1).to_numpy(dtype=float) for e, spec in EVENTS.items()}

    # خط الأساس: متوسط موسّع من المباريات السابقة فقط.
    def baseline_probs(y):
        out, running, count = [], 0.0, 0
        for i in range(n):
            out.append(min(max(running / count if count else 0.5, 0.02), 0.98))
            running += y[i]
            count += 1
        return np.array(out)

    base = {e: baseline_probs(y) for e, y in y_all.items()}

    exp_models, full_models = {}, {}
    for e in EVENTS:
        w, means, mu, sd = train_model(df.iloc[:split_idx], y_all[e][:split_idx])
        exp_models[e] = (w, means, mu, sd)
        w2, means2, mu2, sd2 = train_model(df, y_all[e])
        full_models[e] = (w2, means2, mu2, sd2)

    metrics = []
    for e, spec in EVENTS.items():
        w, means, mu, sd = exp_models[e]
        pm = predict_with(w, means, mu, sd, df.iloc[split_idx:])
        pb = base[e][split_idx:]
        yt = y_all[e][split_idx:]
        metrics.append({
            "event": e, "label": spec["label"], "n": int(len(yt)),
            "positives": int(yt.sum()), "base_rate": round(float(yt.mean()), 3),
            "brier_baseline": round(brier(pb, yt), 4), "brier_model": round(brier(pm, yt), 4),
            "acc_baseline": round(float(np.mean((pb >= 0.5) == yt)), 3),
            "acc_model": round(float(np.mean((pm >= 0.5) == yt)), 3),
        })

    freq = {e: {"label": EVENT_LABELS[e], "count": int(y.sum()), "of": n,
                "pct": round(100 * float(y.mean()), 1)} for e, y in y_all.items()}
    ch = int((df["total_corners"] >= 10).sum())
    freq["corners_high"] = {"label": "ركنيات كثيرة (10 أو أكثر)", "count": ch, "of": n,
                            "pct": round(100 * ch / n, 1), "descriptive": True}

    # التكرارات المشتركة التجريبية لكل مجموعة جزئية من الأحداث المتوقعة (وصفية فقط —
    # ليست توقعًا نموذجيًا لمباراة بعينها). مجاميع على مستوى العينة، لا صفوف مباريات.
    pred_events = list(EVENTS.keys())
    joints = {}
    for r in range(1, len(pred_events) + 1):
        for combo in combinations(pred_events, r):
            mask = np.ones(n, dtype=bool)
            for e in combo:
                mask &= y_all[e] > 0.5
            key = "|".join(sorted(combo))
            joints[key] = {"count": int(mask.sum()), "of": n}

    # ---- جدولة المباريات القادمة: Football-Data أولًا ثم ESPN مكملًا ----
    trs = [dict(zip(team_cols, r)) for r in team_rows]

    def state(team):
        played = [r for r in trs if r["team"] == team]
        last = played[-5:]

        def avg(col, rows):
            vals = [r[col] for r in rows if r[col] is not None]
            return sum(vals) / len(vals) if vals else None

        return {"played": len(played), "gf5": avg("goals_for", last),
                "ga5": avg("goals_against", last), "y5": avg("yellows", last),
                "xg5": avg("xg_for", last), "ppg": avg("points", played)}

    raw_fixtures = []
    fd_fix_status = "failed"
    try:
        raw_fixtures = fetch_fd_fixtures()
        fd_fix_status = "ok"
    except Exception as exc:
        print(f"تعذر جلب fixtures لدى Football-Data: {exc}")
    fd_keys = {(r["date"], r["home"], r["away"]) for r in raw_fixtures}
    played_pairs = {(str(r["match_datetime"])[:10], r["home_team"], r["away_team"])
                    for i, r in df.iterrows()}
    played_pairings = {(p[1], p[2]) for p in played_pairs}
    of_status = "disabled"
    if OPENFOOTBALL_ENABLED:
        try:
            today_utc = datetime.now(timezone.utc)
            today = today_utc.date()
            horizon = (today_utc + timedelta(days=OPENFOOTBALL_MAX_DAYS)).date()
            known_teams = {r["team"] for r in trs}
            of_rows = fetch_openfootball_fixtures()
            added = 0
            for r in of_rows:
                if r["home"] not in known_teams or r["away"] not in known_teams:
                    raise RuntimeError(f"openfootball team not in season data: {r}")
                d = date.fromisoformat(r["date"])
                if d < today or d > horizon:
                    continue
                if (r["home"], r["away"]) in played_pairings:
                    continue
                if any(k[1:] == (r["home"], r["away"]) for k in fd_keys):
                    continue
                raw_fixtures.append(r)
                added += 1
            print(f"openfootball: {added} مقابلة مبدئية ضمن نافذة {OPENFOOTBALL_MAX_DAYS} يومًا")
            of_status = "ok"
        except Exception as exc:
            print(f"تعذر جلب جدولة openfootball: {exc}")
            of_status = "failed"
    if FDORG_ENABLED:
        try:
            fdorg_rows = fetch_fdorg_fixtures()
            if fdorg_rows:
                by_pair = {(r["home"], r["away"]): r for r in fdorg_rows}
                upgraded = 0
                for i, r in enumerate(raw_fixtures):
                    if not r.get("provisional"):
                        continue
                    conf = by_pair.get((r["home"], r["away"]))
                    if conf:
                        raw_fixtures[i] = {**conf}
                        upgraded += 1
                print(f"football-data.org: {upgraded} مباراة رُقي موعدها إلى مؤكد")
        except Exception as exc:
            print(f"تعذر تأكيد المواعيد عبر football-data.org (تبقى الشارات المبدئية): {exc}")
    if ESPN_ENABLED:
        try:
            for r in fetch_espn_fixtures():
                if (r["date"], r["home"], r["away"]) not in fd_keys:
                    raw_fixtures.append(r)
        except Exception as exc:
            print(f"تعذر جلب جدولة ESPN: {exc}")

    last_dt = df["match_datetime"].max()
    now_utc = datetime.now(timezone.utc)
    fixtures = []
    for fr in raw_fixtures:
        dt = f"{fr['date']} {fr.get('time') or '00:00'}"
        if dt <= last_dt:
            continue
        home, away, ref = fr["home"], fr["away"], fr.get("referee")
        kickoff_utc = fr.get("kickoff_utc")
        if fr.get("provisional"):
            # مباريات openfootball: المصدر لا يحدد منطقة زمنية لأوقاته، فلا نحوّل
            # الوقت النصي إلى لحظة افتراضية إطلاقًا — مدخلة بتاريخ فقط، وقت الانطلاق
            # الدقيق مجهول؛ لا «انطلقت» ولا «لم تنطلق»، ولا تدخل أي تحقق زمني دقيق.
            kickoff_utc = None
            kickoff_passed = None
        else:
            if kickoff_utc is None and (fr.get("time") or "").strip():
                hh, mm = fr["time"].strip().split(":")[:2]
                y_, m_, d_ = fr["date"].split("-")
                kickoff_utc = datetime(int(y_), int(m_), int(d_), int(hh), int(mm),
                                       tzinfo=ZoneInfo("Europe/London")).astimezone(timezone.utc)
            kickoff_passed = (kickoff_utc <= now_utc) if kickoff_utc else None
        # مباراة انطلقت بالفعل (بتوقيت UTC الفعلي لحظة التوليد) لا تُعرض كقادمة إطلاقًا.
        if kickoff_passed is True:
            continue
        kick_london = kickoff_utc.astimezone(ZoneInfo("Europe/London")) if kickoff_utc else None
        hs, as_ = state(home), state(away)
        ref_hist = df[df["referee"] == ref] if ref else df.iloc[0:0]
        low_team = hs["played"] < 3 or as_["played"] < 3
        low_ref = len(ref_hist) < 3
        _r2 = lambda v: round(float(v), 2) if v is not None else None
        ref_y = float(ref_hist["total_yellows"].mean()) if len(ref_hist) else None
        Xf = pd.DataFrame([{
            "h_gf5": hs["gf5"], "h_ga5": hs["ga5"], "a_gf5": as_["gf5"],
            "a_ga5": as_["ga5"], "h_y5": hs["y5"], "a_y5": as_["y5"],
            "h_xg5": hs["xg5"], "a_xg5": as_["xg5"],
            "ref_y_avg": float(ref_hist["total_yellows"].mean()) if len(ref_hist) else None,
            "h_ppg": hs["ppg"], "a_ppg": as_["ppg"],
        }])
        probs = {}
        for e in EVENTS:
            w, means, mu, sd = full_models[e]
            p = predict_with(w, means, mu, sd, Xf)[0]
            # v2-baseline (2026-11-24): الرقم المعروض هو معدل الدوري الموسع.
            # تقييم مستقل متعدد المواسم (1634 مباراة محجوبة، 13 موسمًا) وجد
            # نموذج logreg أدنى من معدله البسيط في الأحداث الخمسة كلها، فلا
            # يُعرض تقديره المخصص كتوقع. يبقى في JSON للشفافية فقط.
            probs[e] = {"prob": round(freq[e]["pct"] / 100.0, 3),
                        "experimental_model": round(float(p), 3)}
        fixtures.append({
            "date": fr["date"], "time": fr.get("time") or "",
            "home": home, "away": away, "referee": ref,
            "ref_prior_matches": int(len(ref_hist)),
            "low_team_data": bool(low_team), "low_ref_data": bool(low_ref),
            "kickoff_london": kick_london.strftime("%Y-%m-%d %H:%M %Z") if kick_london else None,
            "kickoff_utc": kickoff_utc.strftime("%Y-%m-%d %H:%M UTC") if kickoff_utc else None,
            "kickoff_passed": kickoff_passed,
            "src": fr["src"],
            "provisional": bool(fr.get("provisional")),
            # متغيرات ما قبل المباراة المحسوبة فعلًا: معدلات مشتقة من مباريات
            # الموسم السابقة للمباراة فقط (آخر 5 للفورما، الموسم كاملًا للنقاط).
            # قيمة None تعني «غير متاحة في العينة» ولا تُعرض أبدًا كصفر.
            "prematch": {
                "window": 5,
                "home": {"played": hs["played"], "gf5": _r2(hs["gf5"]),
                         "ga5": _r2(hs["ga5"]), "y5": _r2(hs["y5"]),
                         "xg5": _r2(hs["xg5"]), "ppg": _r2(hs["ppg"])},
                "away": {"played": as_["played"], "gf5": _r2(as_["gf5"]),
                         "ga5": _r2(as_["ga5"]), "y5": _r2(as_["y5"]),
                         "xg5": _r2(as_["xg5"]), "ppg": _r2(as_["ppg"])},
                "referee_y_avg": _r2(ref_y),
            },
            "probs": probs,
        })

    fixtures.sort(key=lambda f: (f["date"], f["time"]))

    # ---- سجل التوقعات المحفوظة قبل الانطلاق + تقييمها بالنتائج الفعلية ----
    gen_utc = now_utc.strftime("%Y-%m-%d %H:%M UTC")
    log = {}
    if FORECAST_LOG.exists():
        try:
            log = json.loads(FORECAST_LOG.read_text(encoding="utf-8"))
        except Exception:
            log = {}
    for f in fixtures:
        # مباريات الجدولة المبدئية (openfootball) لا تُسجَّل توقعًا قبل الانطلاق:
        # توقيتها غير مؤكد فلا تصلح مرساة زمنية للتقييم المستقبلي.
        if f.get("provisional"):
            continue
        if f["kickoff_passed"] is False and f["kickoff_utc"]:
            key = f"{f['date']}|{f['home']}|{f['away']}"
            if key not in log:
                # أول تسجيل للتوقع يبقى كما هو نهائيًا؛ لا يُستبدل ولا يُحدَّث في أي تشغيل لاحق.
                log[key] = {
                    "home": f["home"], "away": f["away"], "date": f["date"],
                    "kickoff_utc": f["kickoff_utc"], "forecast_at": gen_utc,
                    "model_version": "v2-baseline",
                    "model_train_matches": n,
                    "data_through": meta_row[1],
                    "probs": {e: p["prob"] for e, p in f["probs"].items()},
                }
    FORECAST_LOG.parent.mkdir(exist_ok=True)
    # إعادة الجدولة: إن ظهرت مباراة قادمة بنفس الفريقين بتاريخ مختلف عن مدخلة لم تُلعب بعد،
    # تُوسم القديمة superseded ويُربط الجديد بها؛ الاحتمالات الأصلية لا تُمس أبدًا.
    played_keys = set()
    for i, row in df.iterrows():
        played_keys.add((str(row["match_datetime"])[:10], row["home_team"], row["away_team"]))
    pending_pairs = {}
    for k, e in log.items():
        if not e.get("status") and (e["date"], e["home"], e["away"]) not in played_keys:
            pending_pairs.setdefault((e["home"], e["away"]), []).append(k)
    for f in fixtures:
        if f.get("provisional"):
            continue  # المبدئي لا يُبطل مدخلات مسجلة؛ الإبطال من مصدر مؤكد فقط
        new_key = f"{f['date']}|{f['home']}|{f['away']}"
        for old_key in pending_pairs.get((f["home"], f["away"]), []):
            if old_key != new_key and not log[old_key].get("status"):
                log[old_key]["status"] = "superseded"
                log[old_key]["superseded_by"] = new_key
                if new_key in log and "supersedes" not in log[new_key]:
                    log[new_key]["supersedes"] = old_key
    FORECAST_LOG.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")

    results = []
    df_by_key = {}
    for i, row in df.iterrows():
        k = (str(row["match_datetime"])[:10], row["home_team"], row["away_team"])
        df_by_key[k] = i
    for key, entry in sorted(log.items()):
        if entry.get("status") == "superseded":
            continue  # لا تُقيَّم ولا تُحتسب ضمن المعلّق؛ مُلغاة بإعادة الجدولة
        idx = df_by_key.get((entry["date"], entry["home"], entry["away"]))
        if idx is None:
            continue  # لم تُلعب بعد أو لم تصل نتيجتها من المصدر بعد
        events = {}
        for e in EVENTS:
            events[e] = {"forecast": entry["probs"].get(e),
                         "actual": bool(y_all[e][idx] > 0.5)}
        mi = entry.get("model_train_matches")
        dt_ = entry.get("data_through")
        results.append({
            "home": entry["home"], "away": entry["away"], "date": entry["date"],
            "forecast_at": entry["forecast_at"],
            "model_info": (f"نموذج مدرب على {mi} مباراة حتى {dt_}" if mi else None),
            "events": events,
        })

    snap = {
        "meta": {
            "league": "الدوري الإنجليزي الممتاز", "league_code": "E0", "season": "2026/27",
            "matches": n, "from": meta_row[0], "to": meta_row[1],
            "generated_at_utc": gen_utc,
            "source": "https://football-data.co.uk/mmz4281/2627/E0.csv",
            "fixtures_source": FIXTURES_URL,
            "train": int(split_idx), "test": int(n - split_idx),
            # حالة مصادر الجلب الآلي وقت التوليد — شفافية كاملة: النجاح والفشل
            # يظهران كما هما، والترخيص مكتوب بلا خلط بين «مجاني» و«مفتوح».
            "sources": [
                {"name": "Football-Data results CSV",
                 "url": "https://football-data.co.uk/mmz4281/2627/E0.csv",
                 "status": "ok",
                 "coverage": f"{n} matches, {meta_row[0]} to {meta_row[1]}",
                 "license": "free public CSV with attribution; no explicit redistribution license — the site shows derived aggregates only",
                 "fetched_at": gen_utc},
                {"name": "Football-Data fixtures CSV",
                 "url": FIXTURES_URL,
                 "status": fd_fix_status,
                 "coverage": "upcoming EPL fixtures (confirmed dates)",
                 "license": "free public CSV with attribution; no explicit redistribution license",
                 "fetched_at": gen_utc if fd_fix_status == "ok" else None},
                {"name": "openfootball england",
                 "url": "https://github.com/openfootball/england",
                 "status": of_status,
                 "coverage": "results through round 5; provisional schedule beyond",
                 "license": "CC0 public domain",
                 "fetched_at": gen_utc if of_status == "ok" else None},
                {"name": "Football-Data.org API",
                 "url": "https://www.football-data.org/",
                 "status": "disabled",
                 "coverage": "no data displayed",
                 "license": "free tier; activation pending — not fetched",
                 "fetched_at": None},
            ],
            "notes": [
                "لقطة ثابتة بوقت التوليد، وليست بثًا مباشرًا ولا تحديثًا لحظيًا.",
                "أرقام البطاقات خاصة بمصدر Football-Data وتختلف عن العد الرسمي في بعض المباريات.",
                "النسب المعروضة للمباريات القادمة هي معدلات الدوري الحالية لكل حدث — مرجع عام، لا توقعًا مخصصًا لكل مباراة: تقييم مستقل (1634 مباراة محجوبة عبر 13 موسمًا) وجد النموذج التجريبي أدنى من المعدل البسيط، فأوقفنا عرض تقديره. قياس دقته المنفصل موثق في قسم التجربة.",
                "حقائق الجدولة (الفريقان والتاريخ والوقت) من ملف Football-Data وحده؛ أوقفنا جلب ESPN في 2026-11-24 لأن شروط استخدام ديزني تحظر الاستخراج الآلي. لا تُقرأ ولا تُعرض أي أسعار من أي مصدر.",
                "المباريات الموسومة «مبدئي» من جدولة openfootball (المجال العام/CC0: github.com/openfootball/england): مقابلات الفرق مؤكدة، لكن تواريخ وأوقات الانطلاق غير مؤكدة وقد تتغير بتعديلات البث؛ لا تُستخدم مرساة للتوقعات المسجلة، والأولوية دائمًا لملف Football-Data.",
            ],
        },
        "events": freq,
        "experiment": metrics,
        "fixtures": fixtures,
        "joints": joints,
        "results": results,
    }
    out = ROOT / "data" / "snapshot.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(snap, ensure_ascii=False), encoding="utf-8")
    print(f"snapshot.json: قادمة {len(fixtures)}، مجموعات مشتركة {len(joints)}، "
          f"توقعات مسجلة {len(log)}، تقييمات فعلية {len(results)}")


if __name__ == "__main__":
    main()
