#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
experiment.py - تجربة زمنية منضبطة: نموذج قابل للتعديل مقابل خط أساس.

منهجية العمل:
1) تقسيم زمني: أول 70% من المباريات (بترتيب الوقت) للتدريب، والباقي للاختبار.
   لا خلط عشوائي، لأن الخلط يسرّب معلومات المستقبل إلى الماضي.
2) خط الأساس: متوسط حدوث الحدث في الموسم حتى ما قبل المباراة مباشرة
   (متوسط متحرك متوسّع). أي نموذج لا يتفوق على هذا الخط لا قيمة إضافية له.
3) النموذج: انحدار لوجستي (تنفيذ numpy مباشر، بلا مكتبات خارجية) على عوامل
   ما قبل المباراة فقط. الصيغة والمعاملات داخل الكود وقابلة للتعديل.
4) الامتناع: عند نقص بيانات الحكم أو الفريق نسجّل ذلك ولا نخفي حالات الفشل.

الناتج: جدولا experiment_predictions و experiment_metrics في قاعدة البيانات،
وملف results/metrics.csv للعرض.

التشغيل: python3 src/experiment.py
"""
import json
import pathlib
import sqlite3

import numpy as np

from features import build_features

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "football_research.db"
RESULTS = ROOT / "results"

TRAIN_FRACTION = 0.65
EPS = 1e-6

# تعريف الأحداث البحثية (تعريفات كروية مستقلة، وليست مستوردة من أي موقع مراهنات).
EVENTS = {
    "goal_any": {
        "label": "هدف واحد على الأقل في المباراة",
        "fn": lambda r: int(r["goals"] >= 1),
    },
    "btts": {
        "label": "كلا الفريقين يسجل",
        "fn": lambda r: int(r["home_scored"] == 1 and r["away_scored"] == 1),
    },
    "over25": {
        "label": "ثلاثة أهداف أو أكثر في المباراة",
        "fn": lambda r: int(r["goals"] >= 3),
    },
    "yellow_any": {
        "label": "بطاقة صفراء واحدة على الأقل (حسب هذا المصدر)",
        "fn": lambda r: int(r["total_yellows"] >= 1),
    },
    "red_any": {
        "label": "بطاقة حمراء واحدة على الأقل (حسب هذا المصدر)",
        "fn": lambda r: int(r["total_reds"] >= 1),
    },
}

FEATURE_COLS = ["h_gf5", "h_ga5", "a_gf5", "a_ga5", "h_y5", "a_y5",
                "h_xg5", "a_xg5", "ref_y_avg", "h_ppg", "a_ppg"]


def fit_logreg(X, y, l2=1.0, lr=0.2, iters=4000):
    """انحدار لوجستي بسيط بمعدل تعلم ثابت وتنظيم L2. مكتوب لتسهيل فهمه وتعديله."""
    n, d = X.shape
    Xb = np.c_[np.ones(n), X]
    w = np.zeros(d + 1)
    for _ in range(iters):
        p = 1.0 / (1.0 + np.exp(-Xb @ w))
        grad = Xb.T @ (p - y) / n + l2 * np.r_[0.0, w[1:]] / n
        w -= lr * grad
    return w


def predict_logreg(w, X):
    Xb = np.c_[np.ones(X.shape[0]), X]
    return 1.0 / (1.0 + np.exp(-Xb @ w))


def brier(p, y):
    return float(np.mean((p - y) ** 2))


def logloss(p, y):
    p = np.clip(p, EPS, 1 - EPS)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def main():
    df = build_features(DB).sort_values(["match_datetime", "match_id"]).reset_index(drop=True)
    n = len(df)
    split_idx = int(round(n * TRAIN_FRACTION))
    train, test = df.iloc[:split_idx], df.iloc[split_idx:]

    con = sqlite3.connect(DB)
    con.execute("DELETE FROM experiment_predictions")
    con.execute("DELETE FROM experiment_metrics")
    RESULTS.mkdir(exist_ok=True)
    metrics_rows = []

    for event, spec in EVENTS.items():
        y_all = df.apply(spec["fn"], axis=1).to_numpy(dtype=float)

        # خط الأساس: متوسط موسّع محسوب فقط من مباريات سابقة.
        p_base_all, running, count = [], 0.0, 0
        prior_rate = 0.5  # قبل أي بيانات: 0.5 حيادي
        for i in range(n):
            p_base_all.append(min(max(running / count if count else prior_rate, 0.02), 0.98))
            running += y_all[i]
            count += 1
        p_base_all = np.array(p_base_all)

        # النموذج: تدريب على جزء التدريب فقط، مع تعويض القيم الناقصة بمتوسط التدريب.
        Xtr = train[FEATURE_COLS].astype(float)
        col_means = Xtr.mean()
        Xtr_f = Xtr.fillna(col_means).to_numpy()
        mu, sd = Xtr_f.mean(axis=0), Xtr_f.std(axis=0) + 1e-9
        ytr = y_all[:split_idx]
        w = fit_logreg((Xtr_f - mu) / sd, ytr)

        Xte = test[FEATURE_COLS].astype(float).fillna(col_means).to_numpy()
        p_model_te = predict_logreg(w, (Xte - mu) / sd)
        yte = y_all[split_idx:]
        p_base_te = p_base_all[split_idx:]

        abstain = ((test["low_ref_data"] == 1) | (test["low_team_data"] == 1)).to_numpy()
        reasons = [
            "بيانات سابقة قليلة (فريق أو حكم أقل من الحد الأدنى)" if a else ""
            for a in abstain
        ]

        for (mid, split, actual, pb, pm, ab, rs) in zip(
            test["match_id"], ["test"] * len(test), yte, p_base_te, p_model_te, abstain, reasons
        ):
            con.execute(
                "INSERT OR REPLACE INTO experiment_predictions VALUES (?,?,?,?,?,?,?,?)",
                (event, int(mid), split, int(actual), float(pb), float(pm), int(ab), rs),
            )
        for (mid, split, actual, pb) in zip(
            train["match_id"], ["train"] * len(train), ytr, p_base_all[:split_idx]
        ):
            con.execute(
                "INSERT OR REPLACE INTO experiment_predictions VALUES (?,?,?,?,?,?,?,?)",
                (event, int(mid), split, int(actual), float(pb), None, 0, ""),
            )

        row = {
            "event": event,
            "label": spec["label"],
            "split": "test",
            "n": int(len(yte)),
            "positives": int(yte.sum()),
            "base_rate_test": round(float(yte.mean()), 4),
            "brier_baseline": round(brier(p_base_te, yte), 4),
            "brier_model": round(brier(p_model_te, yte), 4),
            "logloss_baseline": round(logloss(p_base_te, yte), 4),
            "logloss_model": round(logloss(p_model_te, yte), 4),
            "acc_baseline": round(float(np.mean((p_base_te >= 0.5) == yte)), 4),
            "acc_model": round(float(np.mean((p_model_te >= 0.5) == yte)), 4),
            "abstained": int(abstain.sum()),
        }
        metrics_rows.append(row)
        con.execute(
            "INSERT OR REPLACE INTO experiment_metrics VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (event, "test", row["n"], row["positives"], row["brier_baseline"],
             row["brier_model"], row["logloss_baseline"], row["logloss_model"],
             row["acc_baseline"], row["acc_model"], row["abstained"]),
        )

    con.commit()
    con.close()

    import csv
    with (RESULTS / "metrics.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(metrics_rows[0].keys()))
        writer.writeheader()
        writer.writerows(metrics_rows)
    with (RESULTS / "metrics.json").open("w", encoding="utf-8") as f:
        json.dump(metrics_rows, f, ensure_ascii=False, indent=2)

    print(f"تقسيم زمني: تدريب {len(train)} مباراة / اختبار {len(test)} مباراة")
    for r in metrics_rows:
        print(json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
