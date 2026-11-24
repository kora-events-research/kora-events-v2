#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_db.py - بناء قاعدة بيانات المشروع البحثي من ملف المصدر الخام.

المصدر: Football-Data.co.uk (ملف CSV موسم 2026/27 للدوري الإنجليزي الممتاز).
إن لم يوجد الملف محليًا يُنزَّل مباشرة من المصدر الأصلي. لا يعاد نشر البيانات
الخام داخل المستودع؛ كل مستخدم ينزّلها من مصدرها.

نستبعد كل أعمدة أسعار المراهنات عمدًا: المشروع بحثي محايد ولا يستخدم أسعارًا
أو بيانات شركات مراهنات كمدخل أو كهدف.

التشغيل: python3 src/build_db.py
"""
import csv
import pathlib
import sqlite3
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "E0_2627.csv"
CSV_URL = "https://football-data.co.uk/mmz4281/2627/E0.csv"
DB_PATH = ROOT / "football_research.db"

KEEP_COLS = [
    "Div", "Date", "Time", "HomeTeam", "AwayTeam",
    "FTHG", "FTAG", "FTR", "HTHG", "HTAG", "HTR",
    "Referee", "HxG", "AxG", "HS", "AS", "HST", "AST",
    "HF", "AF", "HC", "AC", "HY", "AY", "HR", "AR",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS matches (
    match_id INTEGER PRIMARY KEY,
    season TEXT NOT NULL,
    match_date TEXT NOT NULL,
    kickoff TEXT,
    match_datetime TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    referee TEXT,
    fthg INTEGER, ftag INTEGER, ftr TEXT,
    hthg INTEGER, htag INTEGER, htr TEXT,
    hxg REAL, axg REAL,
    hs INTEGER, as_ INTEGER, hst INTEGER, ast INTEGER,
    hf INTEGER, af INTEGER, hc INTEGER, ac INTEGER,
    hy INTEGER, ay INTEGER, hr INTEGER, ar INTEGER,
    UNIQUE(match_date, home_team, away_team)
);

CREATE TABLE IF NOT EXISTS team_match (
    match_id INTEGER NOT NULL REFERENCES matches(match_id),
    team TEXT NOT NULL,
    is_home INTEGER NOT NULL,
    match_datetime TEXT NOT NULL,
    goals_for INTEGER, goals_against INTEGER,
    yellows INTEGER, reds INTEGER,
    corners_for INTEGER, corners_against INTEGER,
    xg_for REAL, xg_against REAL,
    points INTEGER,
    PRIMARY KEY (match_id, team)
);

CREATE TABLE IF NOT EXISTS experiment_predictions (
    event TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES matches(match_id),
    split TEXT NOT NULL,
    actual INTEGER NOT NULL,
    p_baseline REAL,
    p_model REAL,
    abstained INTEGER NOT NULL DEFAULT 0,
    abstain_reason TEXT,
    PRIMARY KEY (event, match_id)
);

CREATE TABLE IF NOT EXISTS experiment_metrics (
    event TEXT NOT NULL,
    split TEXT NOT NULL,
    n INTEGER,
    positives INTEGER,
    brier_baseline REAL, brier_model REAL,
    logloss_baseline REAL, logloss_model REAL,
    acc_baseline REAL, acc_model REAL,
    abstained INTEGER,
    PRIMARY KEY (event, split)
);
"""


def to_int(v):
    v = (v or "").strip()
    return int(v) if v not in ("", "NA") else None


def to_float(v):
    v = (v or "").strip()
    return float(v) if v not in ("", "NA") else None


def parse_date(d):
    day, month, year = d.strip().split("/")
    return f"{year}-{month}-{day}"


def ensure_csv():
    if CSV_PATH.exists():
        return
    CSV_PATH.parent.mkdir(exist_ok=True)
    print(f"تنزيل ملف المصدر من {CSV_URL}")
    urllib.request.urlretrieve(CSV_URL, CSV_PATH)


def main():
    ensure_csv()
    if DB_PATH.exists():
        DB_PATH.unlink()
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)

    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r.get("Date", "").strip()]

    n_matches = 0
    for r in rows:
        date_iso = parse_date(r["Date"])
        kickoff = (r.get("Time") or "").strip()
        dt = f"{date_iso} {kickoff or '00:00'}"
        vals = {k: r.get(k) for k in KEEP_COLS}
        fthg, ftag = to_int(vals["FTHG"]), to_int(vals["FTAG"])
        hy, ay = to_int(vals["HY"]), to_int(vals["AY"])
        hr, ar = to_int(vals["HR"]), to_int(vals["AR"])
        cur = con.execute(
            """INSERT INTO matches
               (season, match_date, kickoff, match_datetime, home_team, away_team,
                referee, fthg, ftag, ftr, hthg, htag, htr, hxg, axg,
                hs, as_, hst, ast, hf, af, hc, ac, hy, ay, hr, ar)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            ("2026-27", date_iso, kickoff, dt,
             vals["HomeTeam"], vals["AwayTeam"], (vals["Referee"] or "").strip(),
             fthg, ftag, vals["FTR"],
             to_int(vals["HTHG"]), to_int(vals["HTAG"]), vals["HTR"],
             to_float(vals["HxG"]), to_float(vals["AxG"]),
             to_int(vals["HS"]), to_int(vals["AS"]), to_int(vals["HST"]), to_int(vals["AST"]),
             to_int(vals["HF"]), to_int(vals["AF"]), to_int(vals["HC"]), to_int(vals["AC"]),
             hy, ay, hr, ar),
        )
        mid = cur.lastrowid
        for team, is_home, gf, ga, yel, red, cf, ca, xgf, xga in (
            (vals["HomeTeam"], 1, fthg, ftag, hy, hr, to_int(vals["HC"]), to_int(vals["AC"]),
             to_float(vals["HxG"]), to_float(vals["AxG"])),
            (vals["AwayTeam"], 0, ftag, fthg, ay, ar, to_int(vals["AC"]), to_int(vals["HC"]),
             to_float(vals["AxG"]), to_float(vals["HxG"])),
        ):
            pts = None
            if gf is not None and ga is not None:
                pts = 3 if gf > ga else (1 if gf == ga else 0)
            con.execute(
                """INSERT INTO team_match
                   (match_id, team, is_home, match_datetime, goals_for, goals_against,
                    yellows, reds, corners_for, corners_against, xg_for, xg_against, points)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (mid, team, is_home, dt, gf, ga, yel, red, cf, ca, xgf, xga, pts),
            )
        n_matches += 1

    con.commit()
    n_team_rows = con.execute("SELECT COUNT(*) FROM team_match").fetchone()[0]
    span = con.execute("SELECT MIN(match_date), MAX(match_date) FROM matches").fetchone()
    print(f"اتبنت قاعدة البيانات: {DB_PATH}")
    print(f"مباريات: {n_matches} | صفوف فريق/مباراة: {n_team_rows} | الفترة: {span[0]} إلى {span[1]}")
    con.close()


if __name__ == "__main__":
    main()
