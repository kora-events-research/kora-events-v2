#!/usr/bin/env python3
"""Build data/schedule.json from openfootball (CC0) 2026-27 Premier League file.

Full-season upcoming fixture list: round, date, time, pairing. Public-domain
source, so per-fixture rows are publishable. All dates/times are the volunteer
file's values and are labeled provisional in the UI; played matches are left
to the archive. No analysis data in this file.
"""
import json, re, urllib.request, datetime, pathlib

SEASON = "2026-27"
URL = "https://raw.githubusercontent.com/openfootball/england/master/{}/1-premierleague.txt".format(SEASON)
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "schedule.json"

MD_RE = re.compile(r"^\s*▪\s+(.+?)\s*$")
DATE_RE = re.compile(r"^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$")
# Played "v"-format:  20:00  Manchester United FC  v Fulham FC   1-0 (0-0)
PLAYED_B = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)\s*-\s*(\d+)")
# Played score-in-middle:  19:00  Liverpool  4-2 (1-0)  Bournemouth
PLAYED_A = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+(\d+)\s*-\s*(\d+)(?:\s+\((\d+)\s*-\s*(\d+)\))?\s+(.+?)\s*$")
# Unplayed:  20:00  Manchester United FC  v Fulham FC   (times optional)
UNPLAYED = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s*$")
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def main():
    text = urllib.request.urlopen(URL, timeout=30).read().decode("utf-8")
    y1 = int(SEASON[:4])
    year = y1
    matchday = None
    cur_date = None
    rounds, order = {}, []
    total = unplayed_n = 0
    for line in text.splitlines():
        m = MD_RE.match(line)
        if m:
            matchday = m.group(1)
            continue
        d = DATE_RE.match(line)
        if d:
            mon = MONTHS[d.group(2)]
            if d.group(4):
                year = int(d.group(4))
            else:
                year = y1 if mon >= 8 else y1 + 1
            cur_date = f"{year:04d}-{mon:02d}-{int(d.group(3)):02d}"
            continue
        if not matchday or not cur_date or " v " not in line:
            continue
        if PLAYED_B.match(line) or PLAYED_A.match(line):
            total += 1
            continue  # played matches live in the archive
        u = UNPLAYED.match(line)
        if u:
            home, away = u.group(2).strip(), u.group(3).strip()
            if not home or not away:
                continue
            rec = {"date": cur_date, "time_uk": u.group(1), "home": home, "away": away}
            if matchday not in rounds:
                rounds[matchday] = []
                order.append(matchday)
            rounds[matchday].append(rec)
            total += 1
            unplayed_n += 1
    if total != 380:
        raise RuntimeError(f"expected 380 fixtures parsed, got {total}")
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    out_rounds = []
    stale_n = 0
    for r in order:
        if not rounds[r]:
            continue
        # جولة كل مواعيدها في الماضي ولا نتائج مسجلة لها في المصدر:
        # بانتظار تحديث المصدر — لا تُقدَّم كمباريات قادمة إطلاقًا.
        stale = all(m["date"] < today for m in rounds[r])
        if stale:
            stale_n += 1
        out_rounds.append({"round": r, "stale": stale, "matches": rounds[r]})
    out = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "openfootball/england (CC0, public domain)",
        "season": SEASON,
        "unplayed": unplayed_n,
        "stale_rounds": stale_n,
        "rounds": out_rounds,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size, "bytes;", unplayed_n, "unplayed fixtures in", len(out_rounds), "rounds;", stale_n, "stale")


if __name__ == "__main__":
    main()
