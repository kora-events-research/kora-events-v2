#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
features.py - بناء عوامل ما قبل المباراة بترتيب زمني حسب تاريخ ووقت البداية.

القاعدة الأساسية: أي عامل لمباراة معينة يُحسب فقط من مباريات انتهت
بتاريخ/وقت سابق تمامًا لبداية هذه المباراة. لا نستخدم أي إحصائية من
المباراة نفسها أو من مباريات لاحقة.

حدود الضبط: ملف المصدر مجمع بأثر رجعي وقد يتضمن تصحيحات لاحقة،
وتوقيتات نشره الأصلية غير موثقة لدينا. فالضبط هنا زمني حسب بداية
المباريات، وليس إثباتًا أن كل قيمة كانت متاحة لحظيًا قبل البداية.

قيود معروفة:
- الموسم في بدايته، فالعينات الصغيرة شائعة. نعلّم العامل بعلامة "بيانات قليلة"
  بدل التظاهر بالدقة.
- مباريات نفس اليوم بتوقيت لاحق لا تدخل في حساب عوامل مباراة أبكر.
"""
import sqlite3
from collections import defaultdict, deque

import pandas as pd

WINDOW = 5            # نافذة "آخر 5 مباريات"
MIN_TEAM_MATCHES = 3  # أقل من ذلك = علامة بيانات قليلة للفريق
MIN_REF_MATCHES = 3   # أقل من ذلك = علامة بيانات قليلة للحكم


def build_features(db_path):
    con = sqlite3.connect(db_path)
    matches = pd.read_sql(
        "SELECT match_id, match_datetime, home_team, away_team, referee, "
        "fthg, ftag, hy, ay, hr, ar, hc, ac FROM matches ORDER BY match_datetime, match_id",
        con,
    )
    team_rows = pd.read_sql("SELECT * FROM team_match", con)
    con.close()

    by_team = defaultdict(list)
    for _, r in team_rows.iterrows():
        by_team[r["team"]].append(r)
    for t in by_team:
        by_team[t].sort(key=lambda r: (r["match_datetime"], r["match_id"]))

    def team_state(team, before_dt):
        played = [r for r in by_team[team] if r["match_datetime"] < before_dt]
        last = played[-WINDOW:]
        def avg(col, rows):
            vals = [r[col] for r in rows if r[col] is not None]
            return sum(vals) / len(vals) if vals else None
        return {
            "played": len(played),
            "gf5": avg("goals_for", last),
            "ga5": avg("goals_against", last),
            "y5": avg("yellows", last),
            "xg5": avg("xg_for", last),
            "ppg": avg("points", played),
        }

    ref_history = defaultdict(list)  # referee -> [(dt, total_yellows)]
    out = []
    for _, m in matches.iterrows():
        dt = m["match_datetime"]
        h = team_state(m["home_team"], dt)
        a = team_state(m["away_team"], dt)
        ref = (m["referee"] or "").strip()
        ref_past = [y for d, y in ref_history.get(ref, []) if d < dt]
        row = {
            "match_id": int(m["match_id"]),
            "match_datetime": dt,
            "home_team": m["home_team"],
            "away_team": m["away_team"],
            "referee": ref,
            "h_played": h["played"], "a_played": a["played"],
            "h_gf5": h["gf5"], "h_ga5": h["ga5"], "h_y5": h["y5"],
            "h_xg5": h["xg5"], "h_ppg": h["ppg"],
            "a_gf5": a["gf5"], "a_ga5": a["ga5"], "a_y5": a["y5"],
            "a_xg5": a["xg5"], "a_ppg": a["ppg"],
            "ref_y_avg": (sum(ref_past) / len(ref_past)) if ref_past else None,
            "ref_matches": len(ref_past),
            "low_team_data": int(h["played"] < MIN_TEAM_MATCHES or a["played"] < MIN_TEAM_MATCHES),
            "low_ref_data": int(len(ref_past) < MIN_REF_MATCHES),
            # الحقائق الفعلية تُحفظ فقط لتقييم النموذج لاحقًا، ولا تدخل كعوامل.
            "goals": (m["fthg"] or 0) + (m["ftag"] or 0),
            "total_yellows": (m["hy"] or 0) + (m["ay"] or 0),
            "total_reds": (m["hr"] or 0) + (m["ar"] or 0),
            "total_corners": (m["hc"] or 0) + (m["ac"] or 0),
            "home_scored": int((m["fthg"] or 0) >= 1),
            "away_scored": int((m["ftag"] or 0) >= 1),
        }
        out.append(row)
        if ref:
            ref_history[ref].append((dt, (m["hy"] or 0) + (m["ay"] or 0)))

    return pd.DataFrame(out)


if __name__ == "__main__":
    import pathlib
    db = pathlib.Path(__file__).resolve().parents[1] / "football_research.db"
    df = build_features(db)
    print(df.head(12).to_string())
    print(f"\nصفوف: {len(df)} | مباريات بعلامة بيانات حكم قليلة: {int(df.low_ref_data.sum())}")
