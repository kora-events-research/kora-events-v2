#!/usr/bin/env python3
"""Build data/archive.json from openfootball (CC0) Premier League season files.

Public-domain per-match rows: dates, times, teams, FT/HT scores. No other
source's rows are published (FD stays aggregates-only by policy).
"""
import json, re, urllib.request, datetime, pathlib

SEASONS = ["2023-24", "2024-25", "2025-26", "2026-27"]
URL = "https://raw.githubusercontent.com/openfootball/england/master/{}/1-premierleague.txt"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "archive.json"

MD_RE = re.compile(r"^\s*▪\s+(.+?)\s*$")
DATE_RE = re.compile(r"^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$")
# Format A (score in middle):  19:00  Liverpool  4-2 (1-0)  Bournemouth
PLAYED_A = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+(\d+)\s*-\s*(\d+)(?:\s+\((\d+)\s*-\s*(\d+)\))?\s+(.+?)\s*$")
# Format B ("v" separator, score at end, time optional, halftime optional):
#   20:00  Manchester United FC  v Fulham FC   1-0 (0-0)
PLAYED_B = re.compile(r"^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)\s*-\s*(\d+)(?:\s+\((\d+)\s*-\s*(\d+)\))?\s*$")
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def season_years(season):
    y1 = int(season[:4])
    return y1, y1 + 1


def parse(season, text):
    y1, y2 = season_years(season)
    year = y1
    matchday = None
    cur_date = None
    days = {}  # (matchday) -> list of matches
    order = []
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
                year = y1 if mon >= 8 else y2
            cur_date = f"{year:04d}-{mon:02d}-{int(d.group(3)):02d}"
            continue
        rec = None
        p = PLAYED_B.match(line)  # try "v"-format first: PA's optional groups can mis-match it
        if p:
            ht = [int(p.group(6)), int(p.group(7))] if p.group(6) else None
            rec = {"date": cur_date, "time_uk": p.group(1),
                   "home": p.group(2).strip(), "away": p.group(3).strip(),
                   "ft": [int(p.group(4)), int(p.group(5))],
                   "ht": ht}
        else:
            p = PLAYED_A.match(line)
            if p:
                ht = [int(p.group(5)), int(p.group(6))] if p.group(5) else None
                rec = {"date": cur_date, "time_uk": p.group(1),
                       "home": p.group(2).strip(), "away": p.group(7).strip(),
                       "ft": [int(p.group(3)), int(p.group(4))],
                       "ht": ht}
        if rec and matchday and cur_date:
            if matchday not in days:
                days[matchday] = []
                order.append(matchday)
            days[matchday].append(rec)
    return [{"matchday": md, "matches": days[md]} for md in order]


def main():
    seasons = []
    for s in SEASONS:
        text = urllib.request.urlopen(URL.format(s), timeout=30).read().decode("utf-8")
        mds = parse(s, text)
        n = sum(len(md["matches"]) for md in mds)
        seasons.append({"season": s, "matchdays": mds, "played": n})
        print(s, n, "played matches,", len(mds), "rounds")
    out = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "openfootball/england (CC0, public domain)",
        "seasons": seasons,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
