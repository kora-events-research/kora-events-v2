#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_report.py - بناء ملف Excel عربي منظم يلخص النموذج الأولي ونتائجه.

التشغيل: python3 src/make_report.py
"""
import json
import pathlib
import sqlite3

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from event_dictionary import EVENT_CARDS, MISSING_FEATURES

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "football_research.db"
OUT = ROOT / "report" / "ملخص_النموذج_الأولي.xlsx"

HEAD_FILL = PatternFill("solid", fgColor="1F4E79")
HEAD_FONT = Font(bold=True, color="FFFFFF", size=11)
TITLE_FONT = Font(bold=True, size=14, color="1F4E79")
WRAP = Alignment(wrap_text=True, vertical="top", horizontal="right")
CENTER = Alignment(horizontal="center", vertical="center")


def style_sheet(ws, widths):
    ws.sheet_view.rightToLeft = True
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def autoheight(ws, widths):
    """ضبط ارتفاع الصفوف حسب طول النص الملتف حتى لا يُقتطع في العرض أو الطباعة."""
    import math
    merged = {}
    for rng in ws.merged_cells.ranges:
        wsum = sum(widths[c - 1] for c in range(rng.min_col, rng.max_col + 1)
                   if c - 1 < len(widths))
        merged[(rng.min_row, rng.min_col)] = wsum
    for row in ws.iter_rows():
        max_lines = 1
        for cell in row:
            v = cell.value
            if not isinstance(v, str) or not v:
                continue
            w = merged.get((cell.row, cell.column),
                           widths[cell.column - 1] if cell.column - 1 < len(widths) else 20)
            chars_per_line = max(int(w * 0.9), 8)
            lines = sum(math.ceil(max(len(seg), 1) / chars_per_line) for seg in v.split("\n"))
            max_lines = max(max_lines, lines)
        ws.row_dimensions[row[0].row].height = min(16 * max_lines + 6, 400)


def put_table(ws, start_row, headers, rows):
    for c, h in enumerate(headers, start=1):
        cell = ws.cell(row=start_row, column=c, value=h)
        cell.fill = HEAD_FILL
        cell.font = HEAD_FONT
        cell.alignment = CENTER
    for r, row in enumerate(rows, start=start_row + 1):
        for c, v in enumerate(row, start=1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.alignment = WRAP
    return start_row + len(rows) + 2


def main():
    con = sqlite3.connect(DB)
    n_matches = con.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
    span = con.execute("SELECT MIN(match_date), MAX(match_date) FROM matches").fetchone()
    freq = {}
    freq["goal_any"] = con.execute(
        "SELECT COUNT(*) FROM matches WHERE fthg + ftag >= 1").fetchone()[0]
    freq["btts"] = con.execute(
        "SELECT COUNT(*) FROM matches WHERE fthg >= 1 AND ftag >= 1").fetchone()[0]
    freq["over25"] = con.execute(
        "SELECT COUNT(*) FROM matches WHERE fthg + ftag >= 3").fetchone()[0]
    freq["yellow_any"] = con.execute(
        "SELECT COUNT(*) FROM matches WHERE hy + ay >= 1").fetchone()[0]
    freq["red_any"] = con.execute(
        "SELECT COUNT(*) FROM matches WHERE hr + ar >= 1").fetchone()[0]
    avg_corners = con.execute("SELECT AVG(hc + ac) FROM matches").fetchone()[0]
    match_rows = con.execute(
        """SELECT match_date, home_team, away_team, fthg, ftag, referee,
                  hy, ay, hr, ar, hc, ac, hxg, axg
           FROM matches ORDER BY match_datetime, match_id""").fetchall()
    metrics = json.loads((ROOT / "results" / "metrics.json").read_text(encoding="utf-8"))
    con.close()

    wb = Workbook()

    # 1) نظرة عامة
    ws = wb.active
    ws.title = "نظرة عامة"
    style_sheet(ws, [95])
    ws.cell(row=1, column=1, value="نموذج أولي بحثي لتحليل أحداث كرة القدم (بدون أي استخدام مالي)").font = TITLE_FONT
    overview = [
        "",
        f"العينة: {n_matches} مباراة من الدوري الإنجليزي الممتاز موسم 2026/27، من {span[0]} إلى {span[1]} (لقطة ثابتة، لا تشمل مباريات بعد هذا التاريخ).",
        "الغرض: نظام بحثي قابل للتطوير فيه قاعدة بيانات، وعوامل محسوبة من بيانات سابقة فقط، ونماذج قابلة للتعديل، وتجربة زمنية تقارن النموذج بخط أساس بسيط.",
        "ما ليس فيه: لا أسعار مراهنات، لا اختيار رهانات، لا حدود ثقة للمراهنة، لا توصيات مالية من أي نوع.",
        "كيفية التشغيل: راجع ملف README_AR.md في نفس الحزمة.",
        "مبدأ أساسي: أي عامل لمباراة يُحسب فقط من مباريات سابقة لها حسب تاريخ ووقت البداية. تنبيه: ملف المصدر مجمع بأثر رجعي وتوقيتات نشره الأصلية غير موثقة لدينا، فهذا ضبط زمني حسب البداية وليس إثبات توفر لحظي لكل قيمة.",
    ]
    for i, line in enumerate(overview, start=2):
        c = ws.cell(row=i, column=1, value=line)
        c.alignment = WRAP

    # 2) قاموس الأحداث
    ws = wb.create_sheet("قاموس الأحداث")
    style_sheet(ws, [24, 42, 42, 42, 42])
    headers = ["الحدث", "التعريف والمصدر", "التكرار المرصود في العينة",
               "عوامل مرشحة قبل المباراة", "أوجه الفشل ومتى نمتنع"]
    rows = []
    for card in EVENT_CARDS:
        if card["id"] == "corners_high":
            obs = f"متوسط {avg_corners:.2f} ركنية للمباراة في العينة (وصفي فقط)"
        else:
            k = freq.get(card["id"], 0)
            obs = f"{k} من {n_matches} مباراة = {100*k/n_matches:.1f}% (لقطة حتى {span[1]}، وليست احتمالًا مستقبليًا)"
        source = "المصدر: Football-Data.co.uk موسم 2026/27."
        rows.append([
            card["name"],
            card["definition"] + "\n" + source,
            obs,
            card["factors"],
            card["failure_modes"] + "\nالامتناع: " + card["abstain"],
        ])
    put_table(ws, 1, headers, rows)

    # 3) نتائج التجربة
    ws = wb.create_sheet("نتائج التجربة")
    style_sheet(ws, [30, 10, 10, 14, 14, 14, 14, 14])
    ws.cell(row=1, column=1,
            value="تقسيم زمني: تدريب على أول 65% من المباريات ثم اختبار على الباقي. "
                  "خط الأساس = متوسط حدوث الحدث في الموسم حتى ما قبل المباراة.").font = Font(bold=True)
    ws.cell(row=2, column=1,
            value="Brier أقل = أفضل. نموذج لا يتفوق على خط الأساس = عوامله لم تضف قدرة توقع على هذه العينة.").font = Font(italic=True)
    ws.cell(row=3, column=1,
            value="القاموس فيه 6 بطاقات أحداث؛ المختبر هنا 5 منها. حدث الركنيات وصفي فقط ولم يدخل تجربة التوقع بعد. "
                  "قراءة عادلة للنتيجة: النموذج أسوأ في 4 من 5 أحداث، وأفضل بفارق طفيف في حدث شبه ثابت (الصفراء)، "
                  "وهذا لا يثبت أن العوامل لا تنفع إطلاقًا، بل أنها لم تضف شيئًا مقنعًا على هذه العينة الصغيرة.").font = Font(italic=True)
    for rr in (1, 2, 3):
        ws.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=8)
        ws.cell(row=rr, column=1).alignment = WRAP
    headers = ["الحدث", "مباريات الاختبار", "حالات الحدوث", "Brier أساس",
               "Brier نموذج", "دقة أساس", "دقة نموذج", "حالات امتناع/بيانات قليلة"]
    rows = [[m["label"], m["n"], m["positives"], m["brier_baseline"], m["brier_model"],
             m["acc_baseline"], m["acc_model"], m["abstained"]] for m in metrics]
    put_table(ws, 4, headers, rows)

    # 4) عوامل ما قبل المباراة
    ws = wb.create_sheet("العوامل")
    style_sheet(ws, [26, 70])
    headers = ["العامل", "الوصف وقاعدة عدم التسريب"]
    rows = [
        ["h_gf5 / a_gf5", "متوسط الأهداف المسجلة في آخر 5 مباريات سابقة (مضيف/ضيف)"],
        ["h_ga5 / a_ga5", "متوسط الأهداف المستقبلة في آخر 5 مباريات سابقة"],
        ["h_y5 / a_y5", "متوسط البطاقات الصفراء في آخر 5 مباريات سابقة"],
        ["h_xg5 / a_xg5", "متوسط الأهداف المتوقعة (xG) في آخر 5 مباريات سابقة"],
        ["h_ppg / a_ppg", "متوسط النقاط في الموسم حتى ما قبل المباراة"],
        ["ref_y_avg", "متوسط مجموع البطاقات الصفراء في مباريات الحكم السابقة هذا الموسم"],
        ["علامة بيانات قليلة", "تُرفع عندما يكون للفريق أو الحكم أقل من 3 مباريات سابقة، وتُسجّل كامتناع بدل إخفاء الضعف"],
        ["قاعدة عامة", "كل عامل يُحسب حصريًا من مباريات بتاريخ ووقت سابق تمامًا لبداية المباراة"],
    ]
    put_table(ws, 1, headers, rows)

    # 5) تصميم قاعدة البيانات
    ws = wb.create_sheet("قاعدة البيانات")
    style_sheet(ws, [26, 70])
    headers = ["الجدول", "الغرض"]
    rows = [
        ["matches", "صف لكل مباراة: التاريخ، الفريقان، الحكم، النتيجة، xG، التسديدات، الركنيات، البطاقات. بدون أي أعمدة أسعار."],
        ["team_match", "صف لكل فريق في كل مباراة: يسهّل حساب عوامل آخر 5 مباريات دون تكرار المنطق"],
        ["experiment_predictions", "توقع كل نموذج وخط الأساس لكل مباراة اختبار، مع الواقع الفعلي وحالات الامتناع"],
        ["experiment_metrics", "ملخص مقاييس كل حدث على جزء الاختبار"],
        ["قابلية التوسع", "إضافة موسم أو دوري جديد = ملف CSV بنفس الأعمدة ثم تشغيل build_db.py؛ إضافة حدث = سطر في EVENTS داخل experiment.py"],
    ]
    put_table(ws, 1, headers, rows)

    # 6) جودة البيانات والمصادر
    ws = wb.create_sheet("جودة البيانات")
    style_sheet(ws, [95])
    rows_txt = [
        "المصدر الرئيسي: Football-Data.co.uk، ملف موسم 2026/27 (بيانات إحصائية مجانية).\nرابط الملف: https://football-data.co.uk/mmz4281/2627/E0.csv",
        "تحقق سابق: لا فراغات في حقول الأهداف والبطاقات والركنيات المستخدمة، ولا مباريات مكررة بنفس التاريخ والفريقين.",
        "تنبيه جوهري عن البطاقات: مقارنة سابقة مع تغذية الدوري الرسمية (FPL) على 100 مباراة متقاطعة أظهرت تطابق الأهداف كلها، لكن اختلاف مجموع الصفراء في 12 مباراة (412 مقابل 399). من توثيق المصدر نفسه: الصفراء الثانية التي تتحول لحمراء لا تُحسب صفراء في عدّه، وهو جزء من سبب الاختلاف. لذلك كل رقم بطاقات هنا خاص بهذا المصدر وليس عدًّا رسميًا موحدًا.",
        "حقول الأهداف المتوقعة: HxG وAxG كما يوردها المصدر مباشرة (توثيقه: HxG = الأهداف المتوقعة للمضيف)، بلا فراغات في ال109 مباريات، ولم نستبدل أو نولّد أي قيمة. مجموع xG المضيف 175.7 مقابل 170 هدفًا فعليًا، وهو تقارب طبيعي ومتوقع.",
        "العينة صغيرة (109 مباريات، نحو ربع موسم): أي فرق مقاس بين نموذج وخط أساس هش إحصائيًا وقد لا يتكرر.",
        "تمييز مهم: البيانات هنا تاريخية وصفية ومجمعة بأثر رجعي. الترتيب الزمني معتمد على تاريخ ووقت بداية المباراة فقط؛ لا ندّعي معرفة توقيت نشر أو مراجعة كل قيمة في المصدر. اللقطات التي تثبت أن معلومة كانت متاحة فعلًا قبل مباراة معينة (تشكيلة معلنة، خبر إصابة) تحتاج مصادر بتواريخ نشر موثقة، وهي غير متاحة في هذه النسخة.",
    ]
    for i, t in enumerate(rows_txt, start=1):
        c = ws.cell(row=i, column=1, value=t)
        c.alignment = WRAP

    # 7) عوامل غير متاحة وفرضيات
    ws = wb.create_sheet("فجوات وفرضيات")
    style_sheet(ws, [95])
    ws.cell(row=1, column=1, value="عوامل غير متاحة حاليًا (تُذكر صراحة بدل التظاهر بوجودها):").font = Font(bold=True)
    for i, t in enumerate(MISSING_FEATURES, start=2):
        ws.cell(row=i, column=1, value="• " + t).alignment = WRAP
    r = len(MISSING_FEATURES) + 4
    ws.cell(row=r, column=1, value="فرضية مقترحة للاختبار المستقبلي (غير مختبرة بعد):").font = Font(bold=True)
    ws.cell(row=r + 1, column=1,
            value="«هل تضيف صرامة الحكم وسلوك الفريقين قدرة توقع حقيقية لوجود بطاقات فوق نسبة الدوري العامة؟» "
                  "التصميم: تجميد السؤال، ثم تطبيقه على كتلة مباريات لاحقة لم تُستخدم في بناء النموذج، "
                  "وتسجيل كل الحالات بما فيها أخطاء النموذج، مع اختبار إحصائي ثنائي الجانب محدد مسبقًا.").alignment = WRAP

    # 8) المباريات الخام
    ws = wb.create_sheet("المباريات")
    style_sheet(ws, [12, 16, 16, 8, 8, 16, 8, 8, 8, 8, 8, 8, 8, 8])
    headers = ["التاريخ", "المضيف", "الضيف", "أهداف المضيف", "أهداف الضيف", "الحكم",
               "صفراء المضيف", "صفراء الضيف", "حمراء المضيف", "حمراء الضيف",
               "ركنيات المضيف", "ركنيات الضيف", "xG المضيف", "xG الضيف"]
    put_table(ws, 1, headers, [list(r) for r in match_rows])

    for sheet in wb.worksheets:
        widths = [ws_col.width or 12 for ws_col in
                  (sheet.column_dimensions[get_column_letter(i)] for i in range(1, 30))
                  if ws_col.width]
        if widths:
            autoheight(sheet, widths)

    OUT.parent.mkdir(exist_ok=True)
    wb.save(OUT)
    print(f"تم إنشاء التقرير: {OUT}")


if __name__ == "__main__":
    main()
