// يقرأ data/snapshot.json ويعرض اللقطة كاملة. لا يوجد أي خادم خلفي.
// Reads the static snapshot and renders it. No backend.
import { initAuth, setAuthLang, toggleFavorite, isFav, onFavChange, getUser } from "./auth.js";

const I18N = {
  ar: {
    title: "كرة الأحداث",
    tagline: "تحليل مفتوح المصدر لأحداث مباريات كرة القدم",
    navFixtures: "المباريات",
    navResults: "التوقع والنتيجة",
    navArchive: "الأرشيف",
    navSchedule: "الجدولة",
    navTech: "التفاصيل",
    freshness: (m) => `آخر تحديث: ${m.generated_at_utc} · بيانات حتى ${m.to} · ${m.matches} مباراة هذا الموسم`,
    freshsource: "المصادر: Football-Data (نتائج وأحداث) + openfootball (جدولة مبدئية موسومة)",
    srcLine: (s) => `مصدر الجدولة: ${s}`,
    srcProv: "openfootball — جدول مبدئي، توقيت الانطلاق غير مؤكد",
    grpTitle: "جرّب مجموعة أحداث — من العينة التاريخية فقط",
    grpHint: "اختر الأحداث لترى كم مرة تحققت معًا في مباريات هذا الموسم. هذا وصف تاريخي مشترك من العينة، وليس توقع النموذج لهذه المباراة بعينها، ولا يُضرب احتمال في آخر.",
    grpPick: "اختر حدثًا واحدًا على الأقل",
    grpAll: "تحققت المجموعة كاملة",
    grpOneFails: "فشل حدث واحد منها على الأقل",
    grpCI: "المدى التقريبي بثقة 95%",
    grpOf: (c, o) => `${c} من ${o} مباراة`,
    grpInsufficient: "لا دليل كافيًا في العينة على هذه المجموعة",
    disclaimer: `منصة بحثية تعليمية: احتمالات إحصائية لأحداث المباريات مع قياس علني للدقة. لا أسعار مراهنات ولا توصيات من أي نوع. كل نسبة احتمال قابل للخطأ.`,
    hFixtures: "المباريات القادمة",
    hResults: "التوقع مقابل النتيجة",
    hintResults: "كل توقع وثّقناه قبل انطلاق مباراته يظهر هنا بعد نهايتها مع ما حدث فعلًا. هذا هو قياس الدقة الحقيقي للمنصة على المدى الطويل.",
    demoHeading: "أمثلة توضيحية استرجاعية (مباريات لُعبت بالفعل — لا تدخل تقييم الدقة إطلاقًا)",
    techHeading: "التفاصيل التقنية",
    tapToOpen: "اضغط لعرض التحليل",
    ukTime: "بتوقيت المصدر (المنطقة غير محددة)",
    provTime: "موعد مبدئي — غير مؤكد",
    schedHeading: "جدولة المصدر — موسم 2026-27",
    hintSched: "المصدر التطوعي openfootball (CC0) يسجل النتائج حتى الجولة 5 فقط. ما بعدها مواعيده المخططة: كلها مبدئية وقد تتغير، والأوقات كما وردت في المصدر الذي لا يحدد منطقتها الزمنية، وغير مؤكدة. للتصفح فقط، بلا تحليل ولا احتمالات.",
    schedStale: (n) => `${n} جولات انقضى تاريخها بلا نتيجة مسجلة — بانتظار تحديث المصدر`,
    schedStaleTag: " (انقضى تاريخها — بانتظار المصدر)",
    schedStaleRow: "هذه الجولة انقضى تاريخها دون نتيجة مسجلة في المصدر — المواعيد أدناه هي مخطط المصدر القديم، بانتظار تحديثه.",
    ukTimeTitle: "الوقت كما ورد في المصدر — المصدر لا يحدد منطقة زمنية؛ غير مؤكد",
    archHeading: "الأرشيف — نتائج المواسم",
    hintArch: "نتائج حقيقية من مصدر المجال العام openfootball (CC0). للتصفح فقط — بلا تحليل ولا احتمالات. النتيجة تُقرأ: صاحب الأرض أولًا، وبين قوسين نتيجة الشوط الأول.",
    archScroll: "مرّر أفقيًا داخل الجدول لعرض كل الأعمدة",
    archPartial: (n) => `تغطية جزئية لهذا الموسم: ${n} مباراة مسجلة فقط — المصدر تطوعي وقد يتأخر عن الجدول الفعلي.`,
    archRound: (n) => `الجولة ${n}`,
    thDate: "التاريخ",
    thHome: "صاحب الأرض",
    thScore: "النتيجة",
    thAway: "الضيف",
    thTime: "الوقت",
    pmTitle: "البيانات المجمعة قبل المباراة",
    pmAsOf: (m) => `محسوبة من مباريات الموسم السابقة للمباراة فقط · حتى لقطة ${m.generated_at_utc}`,
    pmTeamMatches: (n) => `${n} مباراة في العينة`,
    pmGF: "متوسط التسجيل لكل مباراة (آخر 5)",
    pmGA: "متوسط الاستقبال لكل مباراة (آخر 5)",
    pmY: "متوسط الصفراء لكل مباراة (آخر 5)",
    pmXG: 'متوسط الأهداف المتوقعة <span dir="ltr">xG</span> لكل مباراة (آخر 5)',
    pmPPG: "نقاط لكل مباراة (الموسم)",
    pmReferee: "الحكم",
    pmRefNone: "غير مسجل في المصدر",
    pmRefNoneNote: "خانة فارغة في المصدر — لا تعني صفرًا",
    pmRefAvg: (y, n) => `متوسط الصفراء في مبارياته السابقة: ${y} عبر ${n} مباراة`,
    pmNoHist: "لا سجل سابقًا في العينة",
    pmLowSample: "عينة صغيرة — القيم أقل ثباتًا",
    pmKickoff: "توقيت الانطلاق",
    pmTimeProv: "غير مؤكد (مصدر مبدئي)",
    pmTimeConf: (t) => `${t} بتوقيت المصدر`,
    pmSource: "مصدر الموعد",
    pmSrcProv: "openfootball (مبدئي)",
    pmSrcFD: "Football-Data (مؤكد)",
    pmFigures: "الأرقام أدناه معدلات مرجعية للدوري — ليست توقعًا مخصصًا لهذه المباراة",
    referee: (f) => `الحكم: ${f.referee || "لم يُعلن"}`,
    retro: (f) => `عرض استرجاعي: وُلّد بعد انطلاق المباراة (${f.kickoff_london || "غير معروف"}) — ليس توقعًا مسبقًا ولا يدخل تقييم الدقة.`,
    saved: (f, m) => `توقع محفوظ قبل الانطلاق (${f.kickoff_london}) ضمن لقطة ${m.generated_at_utc} — سيُقارن بالنتيجة الفعلية بعد المباراة.`,
    current: (m) => `تقدير ضمن لقطة ${m.generated_at_utc}.`,
    leagueRate: (ev) => `معدل الدوري الحالي — حدث في ${ev.count} من ${ev.of} مباراة. مرجع عام، وليس توقعًا مخصصًا لهذه المباراة`,
    noFixtures: "لا توجد مباريات قادمة في جدولة المصدر حاليًا. تظهر الجولة التالية هنا فور نشرها وتشغيل التحديث التلقائي.",
    noResults: "لم تُقيَّم أي توقعات محفوظة بعد. أول مقارنة فعلية تظهر بعد انتهاء أول مباراة وثّقنا توقعها قبل انطلاقها.",
    resForecast: "التوقع قبل المباراة",
    resActual: "ما حدث فعلًا",
    happened: "حدث", notHappened: "لم يحدث",
    hSources: "مصادر البيانات والجلب الآلي",
    hintSources: "تُجلب البيانات وتُعاد بناء اللقطة آليًا 4 مرات أسبوعيًا (جدولة ثابتة، وليست بثًا لحظيًا). حالة كل مصدر وقت آخر توليد:",
    thSrc: ["المصدر", "التغطية", "الترخيص", "الحالة", "آخر جلب"],
    srcOk: "نجح",
    srcFailed: "فشل — تُعرض آخر لقطة ناجحة",
    srcDisabled: "موقوف",
    hEvents: "الأحداث المُعرَّفة",
    hintEvents: "ستة أحداث قابلة للتحقق، مُعرَّفة تعريفًا تشغيليًا دقيقًا في الشيفرة المصدرية.",
    hMetrics: "قياس الدقة التجريبي",
    hintMetrics: "تجربة زمنية: تدريب على أول ٧١ مباراة، تقييم على آخر ٣٨ مباراة لم تدخل التدريب. خط الأساس: توقع كل حدث بمتوسط تكراره حتى تلك اللحظة فقط، دون أي عوامل.",
    hRepro: "إعادة الإنتاج",
    hintRepro: `لا تنشر المنصة صفوفًا بمستوى المباراة الواحدة، لأن ذلك يعادل إعادة نشر بيانات المصدر الخام ولم نعثر على ترخيص صريح بإعادة نشرها. لتوليد التفاصيل محليًا: نزّل المستودع وشغّل <code>python3 src/build_db.py && python3 src/export_site.py</code>.`,
    hLimits: "المصدر والحدود",
    verdict: "الخلاصة الحالية بصراحة: على عينة الاختبار (38 مباراة) كان النموذج أسوأ من خط الأساس البسيط في 4 من 5 أحداث، وأفضل بهامش ضئيل في حدث شبه ثابت. المنصة تعرض ذلك علنًا بدل إخفائه، وقسم «التوقع مقابل النتيجة» سيوثّق الدقة الفعلية للتوقعات المحفوظة مسبقًا مع تراكمها.",
    footer: `شيفرة مفتوحة المصدر بترخيص MIT — <a href="https://github.com/kora-events-research/kora-events">المستودع على GitHub</a>. مشروع بحثي مستقل.<br>Football data provided by the Football-Data.org API <span class="hint">(التكامل قيد التفعيل — لا تُعرض بياناتهم حاليًا)</span>`,
    badgeTested: "مدروس توقعيًا",
    badgeDesc: "وصفي فقط",
    cardSub: (ev) => `حدث في ${ev.count} من ${ev.of} مباراة`,
    tbl: ["الحدث", "مباريات الاختبار", "تحقق فعليًا", "Brier خط الأساس", "Brier النموذج", "الفرق"],
    better: "أفضل", worse: "أسوأ",
    limits: [
      `البيانات: <a href="https://football-data.co.uk/">Football-Data.co.uk</a>. لا نعيد نشر ملف البيانات الخام؛ الشيفرة تنزّله من مصدره مباشرة.`,
      "لقطة ثابتة تُحدَّث دوريًا، وليست بثًا حيًا.",
      "العينة صغيرة (موسم واحد، دوري واحد)، والنتائج قابلة للتغير مع تراكم البيانات.",
      "بحث مفتوح للفهم والتجربة، وليس نظام تنبؤ مضمونًا.",
      "حقائق الجدولة والنتائج (الفريقان والتاريخ والوقت والأحداث) تُعرض مع الإسناد لمصدرها الوحيد Football-Data. كنا نكمل الجدولة من واجهة ESPN العامة، لكننا أوقفنا ذلك في 2026-11-24 بعد مراجعة شروط استخدام ديزني (disneytermsofuse.com، وتشمل منتجات ESPN) التي تحظر صراحة الوصول أو النسخ أو الاستخراج بوسائل آلية (بما فيها بناء مجموعات بيانات). لا نقرأ ولا نخزن ولا نعرض أي أسعار من أي مصدر إطلاقًا.",
    ],
    notesEn: null,
    favAdd: "أضف للمفضلة",
    favDone: "في المفضلة",
    toggle: "English",
    dir: "rtl",
    scale: [[0.75, "احتمال مرتفع جدًا"], [0.60, "مرجّح بقوة"], [0.50, "مرجّح"], [0.40, "متكافئ"], [0.25, "غير مرجّح"], [0.10, "ضعيف الاحتمال"], [0, "نادر"]],
  },
  en: {
    title: "Kora Events",
    tagline: "Open-source football match-event analytics",
    navFixtures: "Fixtures",
    navResults: "Forecast vs outcome",
    navArchive: "Archive",
    navSchedule: "Schedule",
    navTech: "Details",
    freshness: (m) => `Last updated: ${m.generated_at_utc} · data through ${m.to} · ${m.matches} matches this season`,
    freshsource: "Sources: Football-Data (results, events) + openfootball (labeled provisional schedule)",
    srcLine: (s) => `Schedule source: ${s}`,
    srcProv: "openfootball — provisional schedule, kickoff time unconfirmed",
    grpTitle: "Try an event group — historical sample only",
    grpHint: "Pick events to see how often they occurred together in this season's matches. This is a descriptive joint frequency from the sample, not the model's forecast for this match, and no probabilities are multiplied.",
    grpPick: "Select at least one event",
    grpAll: "the whole group occurred",
    grpOneFails: "at least one of them failed",
    grpCI: "approximate 95% range",
    grpOf: (c, o) => `${c} of ${o} matches`,
    grpInsufficient: "insufficient evidence in the sample for this combination",
    disclaimer: `Research and education platform: statistical probabilities for match events with open accuracy tracking. No betting odds, no recommendations of any kind. Every figure is a fallible probability.`,
    hFixtures: "Upcoming fixtures",
    hResults: "Forecast vs. outcome",
    hintResults: "Every forecast we recorded before kickoff appears here after the match with what actually happened. This is the platform's real long-run accuracy.",
    demoHeading: "Retrospective demo examples (already-played matches — never counted in accuracy evaluation)",
    techHeading: "Technical details",
    tapToOpen: "Tap to view analysis",
    ukTime: "source time (timezone unspecified)",
    provTime: "Provisional — unconfirmed",
    schedHeading: "Source schedule — 2026-27 season",
    hintSched: "The volunteer source openfootball (CC0) records results only up to round 5. Later rounds are its planned dates: all provisional and subject to change, times as recorded by the source, which specifies no timezone; unconfirmed. Browsing only, no analysis, no probabilities.",
    schedStale: (n) => `${n} rounds past their date with no recorded result — awaiting source update`,
    schedStaleTag: " (date passed — awaiting source)",
    schedStaleRow: "This round's date passed with no result recorded in the source — the dates below are the source's old plan, awaiting its update.",
    ukTimeTitle: "time as recorded in the source, which specifies no timezone; unconfirmed",
    archHeading: "Archive — season results",
    hintArch: "Real results from the public-domain source openfootball (CC0). Browsing only — no analysis, no probabilities. Scores read home team first; brackets show half time.",
    archScroll: "Swipe sideways inside the table to see all columns",
    archPartial: (n) => `Partial coverage for this season: only ${n} matches recorded — the source is volunteer-maintained and can lag the actual schedule.`,
    archRound: (n) => `Round ${n}`,
    thDate: "Date",
    thHome: "Home",
    thScore: "Score",
    thAway: "Away",
    thTime: "Time",
    pmTitle: "Collected pre-match data",
    pmAsOf: (m) => `computed from this season's matches before the fixture only · as of snapshot ${m.generated_at_utc}`,
    pmTeamMatches: (n) => `${n} matches in sample`,
    pmGF: "Goals for per match (last 5 avg)",
    pmGA: "Goals against per match (last 5 avg)",
    pmY: "Yellow cards per match (last 5 avg)",
    pmXG: 'Expected goals <span dir="ltr">xG</span> per match (last 5 avg)',
    pmPPG: "Points per match (season)",
    pmReferee: "Referee",
    pmRefNone: "not recorded in the source",
    pmRefNoneNote: "empty source field — does not mean zero",
    pmRefAvg: (y, n) => `avg total yellows in prior matches: ${y} across ${n} matches`,
    pmNoHist: "no prior record in sample",
    pmLowSample: "small sample — values less stable",
    pmKickoff: "Kickoff time",
    pmTimeProv: "unconfirmed (provisional source)",
    pmTimeConf: (t) => `${t} source time`,
    pmSource: "Fixture source",
    pmSrcProv: "openfootball (provisional)",
    pmSrcFD: "Football-Data (confirmed)",
    pmFigures: "The figures below are league reference rates — not a match-specific forecast",
    referee: (f) => `Referee: ${f.referee || "not announced"}`,
    retro: (f) => `Retrospective demo: generated after the listed kickoff (${f.kickoff_london || "unknown"}) — not a pre-kickoff forecast, never counted in accuracy.`,
    saved: (f, m) => `Forecast saved before kickoff (${f.kickoff_london}) in the ${m.generated_at_utc} snapshot — it will be compared with the actual result after the match.`,
    current: (m) => `Estimate from the ${m.generated_at_utc} snapshot.`,
    leagueRate: (ev) => `Current league rate — occurred in ${ev.count} of ${ev.of} matches. A general reference, not a match-specific forecast`,
    noFixtures: "No upcoming fixtures in the source schedule right now. The next round appears here once published and the automatic refresh runs.",
    noResults: "No saved forecasts evaluated yet. The first real comparison appears after the first match whose forecast we recorded before kickoff.",
    resForecast: "Pre-match forecast",
    resActual: "What happened",
    happened: "Happened", notHappened: "Did not happen",
    hSources: "Data sources and automatic fetching",
    hintSources: "Data is fetched and the snapshot rebuilt automatically 4 times a week (fixed schedule, not a live feed). Status of each source at the latest build:",
    thSrc: ["Source", "Coverage", "License", "Status", "Last fetch"],
    srcOk: "ok",
    srcFailed: "failed — showing last good snapshot",
    srcDisabled: "disabled",
    hEvents: "Defined events",
    hintEvents: "Six checkable events, each with a precise operational definition in the source code.",
    hMetrics: "Experimental accuracy",
    hintMetrics: "Time-ordered experiment: trained on the first 71 matches, evaluated on the final 38 that never entered training. Baseline: each event predicted by its running average up to that moment, with no factors.",
    hRepro: "Reproduce locally",
    hintRepro: `The platform does not publish match-level rows, as that would effectively republish the source's raw data and we found no explicit redistribution license. To build the detail locally: download the repo and run <code>python3 src/build_db.py && python3 src/export_site.py</code>.`,
    hLimits: "Sources and limits",
    verdict: "Honest bottom line: on the test split (38 matches) the model was worse than the simple baseline in 4 of 5 events, and marginally better on one near-constant event. The platform shows that openly, and the forecast-vs-outcome section will track real pre-kickoff accuracy as it accumulates.",
    footer: `Open-source under the MIT license — <a href="https://github.com/kora-events-research/kora-events">GitHub repository</a>. An independent research project.<br>Football data provided by the Football-Data.org API <span class="hint">(integration pending — no data from them displayed yet)</span>`,
    badgeTested: "Evaluated",
    badgeDesc: "Descriptive only",
    cardSub: (ev) => `Occurred in ${ev.count} of ${ev.of} matches`,
    tbl: ["Event", "Test matches", "Occurred", "Brier baseline", "Brier model", "Delta"],
    better: "better", worse: "worse",
    limits: [
      `Data: <a href="https://football-data.co.uk/">Football-Data.co.uk</a>. We do not republish the raw data file; the code downloads it from the source directly.`,
      "A fixed snapshot refreshed periodically, not a live feed.",
      "Small sample (one season, one league); results will shift as data accumulates.",
      "Open research for understanding and experimentation, not a guaranteed prediction system.",
      "Fixture and result facts (teams, date, time, events) are shown with attribution to their single source, Football-Data. We previously supplemented the schedule from ESPN's public scoreboard, but stopped on 2026-11-24 after reviewing Disney's Terms of Use (disneytermsofuse.com, covering ESPN products), which expressly prohibit accessing, copying or extracting content by automated means, including building datasets. We never read, store, or display any odds fields from any source.",
    ],
    notesEn: null,
    favAdd: "Add to favorites",
    favDone: "In favorites",
    toggle: "العربية",
    dir: "ltr",
    scale: [[0.75, "very high chance"], [0.60, "strongly favored"], [0.50, "favored"], [0.40, "toss-up"], [0.25, "unlikely"], [0.10, "improbable"], [0, "rare"]],
  },
};

const EVENT_LABEL_EN = {
  goal_any: "At least one goal",
  btts: "Both teams score",
  over25: "Over 2.5 goals",
  yellow_any: "At least one yellow card",
  red_any: "At least one red card",
  corners_high: "10+ corners",
};

let LANG = localStorage.getItem("kora-lang") || "ar";
let SNAP = null;

const PCT = (p) => {
  const v = p * 100;
  if (v > 99 && v < 100) return ">99%";
  if (v > 0 && v < 1) return "<1%";
  return `${Math.round(v)}%`;
};

async function boot() {
  applyLang();
  initAuth(LANG).then(() => { if (SNAP) render(SNAP); }).catch(() => {});
  onFavChange(() => { if (SNAP) render(SNAP); });
  document.addEventListener("click", (ev) => {
    const star = ev.target.closest(".fav-star");
    if (!star) return;
    ev.preventDefault();
    ev.stopPropagation();
    toggleFavorite(star.dataset.key);
  });
  setupNavSpy();
  setupLazy("sec-archive", loadArchive);
  setupLazy("sec-schedule", loadSchedule);
  try {
    const r = await fetch("data/snapshot.json", { cache: "no-store" });
    if (!r.ok) throw new Error("snapshot " + r.status);
    SNAP = await r.json();
    render(SNAP);
  } catch (e) {
    document.getElementById("fixtures").innerHTML =
      `<p class="notice">${e.message}</p>`;
  }
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  LANG = LANG === "ar" ? "en" : "ar";
  localStorage.setItem("kora-lang", LANG);
  applyLang();
});

function applyLang() {
  const T = I18N[LANG];
  document.documentElement.lang = LANG;
  document.documentElement.dir = T.dir;
  document.getElementById("lang-toggle").textContent = T.toggle;
  setAuthLang(LANG);
  document.getElementById("t-title").textContent = T.title;
  document.getElementById("t-disclaimer").innerHTML = T.disclaimer;
  document.getElementById("nl-fixtures").textContent = T.navFixtures;
  document.getElementById("nl-results").textContent = T.navResults;
  document.getElementById("nl-archive").textContent = T.navArchive;
  document.getElementById("nl-schedule").textContent = T.navSchedule;
  document.getElementById("nl-tech").textContent = T.navTech;
  document.getElementById("t-h-fixtures").textContent = T.hFixtures;
  document.getElementById("t-h-results").textContent = T.hResults;
  document.getElementById("t-hint-results").textContent = T.hintResults;
  document.getElementById("t-demo-heading").textContent = T.demoHeading;
  document.getElementById("t-arch-heading").textContent = T.archHeading;
  document.getElementById("t-hint-arch").textContent = T.hintArch;
  document.getElementById("t-arch-scroll").textContent = T.archScroll;
  document.getElementById("t-sched-heading").textContent = T.schedHeading;
  document.getElementById("t-hint-sched").textContent = T.hintSched;
  if (ARCH) { fillArchSeasons(); renderArchive(); }
  if (SCHED) { fillSchedRounds(); renderSchedule(); }
  document.getElementById("t-tech-heading").textContent = T.techHeading;
  document.getElementById("t-h-sources").textContent = T.hSources;
  document.getElementById("t-hint-sources").textContent = T.hintSources;
  document.getElementById("t-h-events").textContent = T.hEvents;
  document.getElementById("t-hint-events").textContent = T.hintEvents;
  document.getElementById("t-h-metrics").textContent = T.hMetrics;
  document.getElementById("t-hint-metrics").textContent = T.hintMetrics;
  document.getElementById("t-h-repro").textContent = T.hRepro;
  document.getElementById("t-hint-repro").innerHTML = T.hintRepro;
  document.getElementById("t-h-limits").textContent = T.hLimits;
  document.getElementById("verdict").textContent = T.verdict;
  document.getElementById("t-footer").innerHTML = T.footer;
  document.getElementById("freshsource").textContent = T.freshsource;
  if (SNAP) render(SNAP);
}

/* ---------- nav spy + lazy section loading ---------- */
function setupNavSpy() {
  const links = [...document.querySelectorAll(".nav-link")];
  const secs = links
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) =>
          l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id)
        );
      });
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  secs.forEach((s) => obs.observe(s));
  if (links[0] && !links.some((l) => l.classList.contains("active")))
    links[0].classList.add("active");
}

function setupLazy(secId, loader) {
  const sec = document.getElementById(secId);
  let started = false;
  const start = () => { if (!started) { started = true; loader(); } };
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { start(); obs.disconnect(); } },
      { rootMargin: "300px 0px" }
    );
    obs.observe(sec);
  } else {
    start();
  }
}

function evLabel(id, ev) {
  return LANG === "en" && EVENT_LABEL_EN[id] ? EVENT_LABEL_EN[id] : ev.label;
}

function scaleWord(p, T) {
  for (const [th, w] of T.scale) if (p >= th) return w;
  return T.scale[T.scale.length - 1][1];
}

function probRows(f, s, T) {
  return Object.entries(f.probs)
    .map(([e, p]) => {
      return `<div class="probrow">
        <div class="probrow-top">
          <span class="lbl">${evLabel(e, s.events[e])}</span>
          <span class="scale">${scaleWord(p.prob, T)}</span>
          <span class="num">${PCT(p.prob)}</span>
        </div>
        <div class="bar"><span style="width:${Math.round(p.prob * 100)}%"></span></div>
        <div class="sub">${T.leagueRate(s.events[e])}</div>
      </div>`;
    })
    .join("");
}

/* Pre-match variables panel: every variable actually computed for a
   fixture (rolling team form, referee history), with coverage, source
   and as-of. Missing is shown as missing, never as zero. No post-match
   statistic appears here; values come from matches before the fixture. */
function pmTeamBlock(name, st, T) {
  const v = (x) => x === null || x === undefined
    ? `<span class="pm-missing">${T.pmRefNone}</span>` : x;
  return `<div class="pm-team">
    <div class="pm-team-head"><span class="pm-team-name">${name}</span><span class="pm-note">${T.pmTeamMatches(st.played)}${st.played < 3 ? " · " + T.pmLowSample : ""}</span></div>
    <div class="pm-stat"><span>${T.pmGF}</span><b>${v(st.gf5)}</b></div>
    <div class="pm-stat"><span>${T.pmGA}</span><b>${v(st.ga5)}</b></div>
    <div class="pm-stat"><span>${T.pmY}</span><b>${v(st.y5)}</b></div>
    <div class="pm-stat"><span>${T.pmXG}</span><b>${v(st.xg5)}</b></div>
    <div class="pm-stat"><span>${T.pmPPG}</span><b>${v(st.ppg)}</b></div>
  </div>`;
}

function prematchPanel(f, s, T) {
  const m = m_of(s);
  const pm = f.prematch;
  const kickVal = f.provisional
    ? `<span class="pm-missing">${T.pmTimeProv}</span>`
    : T.pmTimeConf(f.time);
  const refVal = f.referee
    ? f.referee
    : `<span class="pm-missing">${T.pmRefNone}</span>`;
  const refNote = f.referee
    ? (pm && pm.referee_y_avg !== null && pm.referee_y_avg !== undefined
        ? T.pmRefAvg(pm.referee_y_avg, f.ref_prior_matches)
        : T.pmNoHist)
    : T.pmRefNoneNote;
  const srcVal = f.provisional ? T.pmSrcProv : T.pmSrcFD;
  const teams = pm
    ? `<div class="pm-teams">${pmTeamBlock(f.home, pm.home, T)}${pmTeamBlock(f.away, pm.away, T)}</div>`
    : "";
  return `<div class="prematch">
    <div class="prematch-head"><span>${T.pmTitle}</span><span class="asof">${T.pmAsOf(m)}</span></div>
    ${teams}
    <div class="prematch-grid">
      <div class="pm-row"><span class="pm-label">${T.pmReferee}</span><span class="pm-value">${refVal}</span><span class="pm-note">${refNote}</span></div>
      <div class="pm-row"><span class="pm-label">${T.pmKickoff}</span><span class="pm-value">${kickVal}</span></div>
      <div class="pm-row"><span class="pm-label">${T.pmSource}</span><span class="pm-value">${srcVal}</span></div>
    </div>
    <div class="pm-figures">${T.pmFigures}</div>
  </div>`;
}

function fixtureCard(f, s, T) {
  const tail = f.kickoff_passed === true
    ? `<div class="flags">${T.retro(f)}</div>`
    : f.kickoff_passed === false
      ? `<div class="sub preko">${T.saved(f, m_of(s))}</div>`
      : `<div class="sub">${T.current(m_of(s))}</div>`;
  const metaChips = f.provisional
    ? `<span class="chip date">${f.date}</span><span class="chip prov">${T.provTime}</span>`
    : `<span class="chip date">${f.date}</span><span class="chip ok">${f.time} ${T.ukTime}</span>`;
  return `<details class="fixture-card">
    <summary>
      <span class="teams">${f.home} — ${f.away}</span>
      <span class="card-meta">${metaChips}</span>
      <span class="tap">${T.tapToOpen}</span>
      <button type="button" class="fav-star" data-key="${f.date}|${f.home}|${f.away}" aria-label="${T.favAdd}">${isFav(`${f.date}|${f.home}|${f.away}`) ? "★" : "☆"}</button>
    </summary>
    <div class="fixture-body">
      ${prematchPanel(f, s, T)}
      ${probRows(f, s, T)}
      <div class="sub src">${T.srcLine(f.src === "openfootball" ? T.srcProv : f.src === "football-data.org" ? "Football-Data.org" : "Football-Data")}</div>
      <div class="grp">
        <div class="grp-title">${T.grpTitle}</div>
        <div class="grp-hint">${T.grpHint}</div>
        ${Object.keys(f.probs).map((e) =>
          `<label class="grp-ev"><input type="checkbox" class="grp-check" value="${e}"> ${evLabel(e, s.events[e])}</label>`
        ).join("")}
        <div class="grp-out"><span class="sub">${T.grpPick}</span></div>
      </div>
      ${tail}
    </div>
  </details>`;
}

const m_of = (s) => s.meta;

function render(s) {
  const m = s.meta;
  const T = I18N[LANG];
  document.getElementById("freshness").textContent = T.freshness(m);

  const notes = (LANG === "en" && T.notesEn) ? T.notesEn : m.notes;
  document.getElementById("limits-list").innerHTML =
    [...notes, ...T.limits].map((n) => `<li>${n}</li>`).join("");

  // فصل صارم: مباريات قادمة حقيقية مقابل أمثلة استرجاعية توضيحية
  const upcoming = s.fixtures.filter((f) => f.kickoff_passed !== true);
  const retro = s.fixtures.filter((f) => f.kickoff_passed === true);
  document.getElementById("fixtures").innerHTML = upcoming.length
    ? upcoming.map((f) => fixtureCard(f, s, T)).join("")
    : `<div class="notice small">${T.noFixtures}</div>`;
  document.getElementById("fixtures-demo").innerHTML =
    retro.map((f) => fixtureCard(f, s, T)).join("");
  document.getElementById("sec-demo").hidden = retro.length === 0;

  // التوقع مقابل النتيجة: يظهر فقط عند وجود تقييمات فعلية
  const resSec = document.getElementById("sec-results");
  const results = s.results || [];
  resSec.hidden = results.length === 0;
  document.getElementById("nl-results").style.display = results.length ? "" : "none";
  if (results.length) {
    document.getElementById("results").innerHTML = results.map((r) => {
      const rows = Object.entries(r.events).map(([e, v]) =>
        `<div class="probrow">
          <div class="probrow-top">
            <span class="lbl">${evLabel(e, s.events[e])}</span>
            <span class="num">${PCT(v.forecast)}</span>
            <span class="scale ${v.actual ? "hit" : "miss"}">${v.actual ? T.happened : T.notHappened}</span>
          </div>
        </div>`).join("");
      return `<div class="fixture-card result-card">
        <div class="teams">${r.home} — ${r.away}</div>
        <div class="sub">${r.date}</div>
        <div class="sub">${T.resForecast} (${r.forecast_at})${r.model_info ? " · " + r.model_info : ""} · ${T.resActual}:</div>
        ${rows}
      </div>`;
    }).join("");
  }

  const srcStatus = { ok: T.srcOk, failed: T.srcFailed, disabled: T.srcDisabled };
  document.getElementById("sources").innerHTML = (m.sources || []).length
    ? `<div class="scroll-x src-table"><table>
      <tr>${T.thSrc.map((h) => `<th>${h}</th>`).join("")}</tr>
      ${m.sources.map((x) => `<tr>
        <td>${x.name}</td><td dir="auto">${x.coverage}</td><td dir="auto">${x.license}</td>
        <td><span class="chip ${x.status === "ok" ? "ok" : x.status === "failed" ? "prov" : "date"}">${srcStatus[x.status] || x.status}</span></td>
        <td dir="ltr">${x.fetched_at || "—"}</td></tr>`).join("")}</table></div>
    <div class="src-cards">
      ${m.sources.map((x) => `<div class="src-card">
        <div class="src-card-head"><b>${x.name}</b><span class="chip ${x.status === "ok" ? "ok" : x.status === "failed" ? "prov" : "date"}">${srcStatus[x.status] || x.status}</span></div>
        <div class="src-row"><span>${T.thSrc[1]}</span><div dir="auto">${x.coverage}</div></div>
        <div class="src-row"><span>${T.thSrc[4]}</span><div dir="ltr">${x.fetched_at || "—"}</div></div>
        <details class="src-lic"><summary>${T.thSrc[2]}</summary><div dir="auto">${x.license}</div></details>
        <div class="src-url" dir="ltr"><a href="${x.url}" rel="noopener">${x.url}</a></div>
      </div>`).join("")}</div>`
    : "";

  document.getElementById("events").innerHTML = Object.entries(s.events)
    .map(([id, ev]) => {
      const badge = ev.descriptive
        ? `<span class="badge desc">${T.badgeDesc}</span>`
        : `<span class="badge tested">${T.badgeTested}</span>`;
      return `<div class="card">${badge}<h3>${evLabel(id, ev)}</h3>
        <div class="pct">${ev.pct}%</div>
        <div class="sub">${T.cardSub(ev)}</div></div>`;
    })
    .join("");

  document.getElementById("metrics").innerHTML = `<div class="scroll-x"><table>
    <tr>${T.tbl.map((h) => `<th>${h}</th>`).join("")}</tr>
    ${s.experiment
      .map((r) => {
        const d = r.brier_model - r.brier_baseline;
        const cls = d <= 0 ? "better" : "worse";
        const txt = d <= 0 ? T.better : T.worse;
        return `<tr><td>${evLabel(r.event, r)}</td><td>${r.n}</td><td>${r.positives}</td>
          <td>${r.brier_baseline}</td><td>${r.brier_model}</td>
          <td class="${cls}">${txt}</td></tr>`;
      })
      .join("")}</table></div>`;
}

function wilson(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96, p = k / n;
  const den = 1 + z * z / n;
  const ctr = (p + z * z / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / den;
  return [Math.max(0, ctr - half), Math.min(1, ctr + half)];
}

document.addEventListener("change", (ev) => {
  if (!ev.target.classList.contains("grp-check") || !SNAP) return;
  const T = I18N[LANG];
  const box = ev.target.closest(".grp");
  const out = box.querySelector(".grp-out");
  const sel = [...box.querySelectorAll(".grp-check:checked")].map((c) => c.value).sort();
  if (sel.length === 0) {
    out.innerHTML = `<span class="sub">${T.grpPick}</span>`;
    return;
  }
  const j = SNAP.joints ? SNAP.joints[sel.join("|")] : null;
  if (!j || j.of === 0) {
    out.innerHTML = `<span class="sub">${T.grpInsufficient}</span>`;
    return;
  }
  const pct = j.count / j.of;
  const [lo, hi] = wilson(j.count, j.of);
  out.innerHTML =
    `<div class="grp-row"><span>${T.grpAll}</span><b>${PCT(pct)}</b><span class="sub">${T.grpOf(j.count, j.of)}</span></div>` +
    `<div class="grp-row"><span>${T.grpOneFails}</span><b>${PCT(1 - pct)}</b></div>` +
    `<div class="grp-row sub">${T.grpCI}: ${PCT(lo)} – ${PCT(hi)}</div>`;
});

// --- Historical results archive (openfootball CC0 rows only; FD stays
// aggregates-only by publication policy) ---
let ARCH = null;
let archSeason = null;
let archMd = null;

function archRoundNum(label) {
  const m = String(label).match(/(\d+)\s*$/);
  return m ? m[1] : label;
}

function renderArchive() {
  const T = I18N[LANG];
  const s = ARCH.seasons.find((x) => x.season === archSeason);
  if (!s) return;
  const md = s.matchdays.find((x) => x.matchday === archMd) || s.matchdays[0];
  document.getElementById("arch-coverage").textContent =
    s.season === "2026-27" ? T.archPartial(s.played) : "";
  const rows = md.matches
    .map((m) => {
      const homeWin = m.ft[0] > m.ft[1];
      const awayWin = m.ft[1] > m.ft[0];
      return `<tr aria-label="${m.home} vs ${m.away}, full time ${m.ft[0]}-${m.ft[1]}${m.ht ? `, half time ${m.ht[0]}-${m.ht[1]}` : ""}">` +
        `<td class="rt-date">${m.date}</td>` +
        `<td class="rt-home${homeWin ? " rt-winner" : ""}">${m.home}</td>` +
        `<td class="rt-score"><bdi dir="ltr">${m.ft[0]}–${m.ft[1]}</bdi>${m.ht ? ` <span class="rt-ht"><bdi dir="ltr">(${m.ht[0]}–${m.ht[1]})</bdi></span>` : ""}</td>` +
        `<td class="rt-away${awayWin ? " rt-winner" : ""}">${m.away}</td></tr>`;
    })
    .join("");
  document.getElementById("archive").innerHTML =
    `<div class="table-scroll"><table class="result-table"><thead><tr>` +
    `<th>${T.thDate}</th><th class="rt-home">${T.thHome}</th><th>${T.thScore}</th><th>${T.thAway}</th>` +
    `</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fillArchMd() {
  const T = I18N[LANG];
  const s = ARCH.seasons.find((x) => x.season === archSeason);
  const sel = document.getElementById("arch-md");
  sel.innerHTML = s.matchdays
    .map((md) => `<option value="${md.matchday}">${T.archRound(archRoundNum(md.matchday))}</option>`)
    .join("");
  sel.value = archMd && s.matchdays.some((x) => x.matchday === archMd)
    ? archMd
    : s.matchdays[s.matchdays.length - 1].matchday;
  archMd = sel.value;
}

function fillArchSeasons() {
  const box = document.getElementById("arch-seasons");
  box.innerHTML = ARCH.seasons
    .map((s) => `<button type="button" role="tab" class="season-pill${s.season === archSeason ? " active" : ""}" data-season="${s.season}">${s.season}</button>`)
    .join("");
  fillArchMd();
}

async function loadArchive() {
  try {
    const r = await fetch("data/archive.json", { cache: "no-store" });
    if (!r.ok) throw new Error("archive " + r.status);
    ARCH = await r.json();
    archSeason = ARCH.seasons[ARCH.seasons.length - 1].season;
    document.getElementById("arch-controls").hidden = false;
    fillArchSeasons();
    renderArchive();
  } catch (e) {
    document.getElementById("archive").innerHTML =
      `<p class="notice">${e.message}</p>`;
  }
}

document.getElementById("arch-seasons").addEventListener("click", (e) => {
  const b = e.target.closest(".season-pill");
  if (!b) return;
  archSeason = b.dataset.season;
  archMd = null;
  fillArchSeasons();
  renderArchive();
});
document.getElementById("arch-md").addEventListener("change", (e) => {
  archMd = e.target.value;
  renderArchive();
});

// --- Full-season upcoming schedule (openfootball CC0 rows only; browsing,
// no analysis). All dates/times provisional by design. ---
let SCHED = null;
let schedRound = null;

function renderSchedule() {
  const T = I18N[LANG];
  const r = SCHED.rounds.find((x) => x.round === schedRound) || SCHED.rounds.find((x) => !x.stale) || SCHED.rounds[0];
  const rows = r.matches
    .map(
      (m) => `<tr aria-label="${m.home} vs ${m.away}, ${m.date}${m.time_uk ? ", " + m.time_uk + " " + T.ukTimeTitle : ""}">` +
        `<td class="rt-date">${m.date}</td>` +
        `<td class="rt-home">${m.home}</td>` +
        `<td class="rt-time" title="${T.ukTimeTitle}">${m.time_uk ? `<bdi dir="ltr">${m.time_uk}</bdi>` : "—"}</td>` +
        `<td class="rt-away">${m.away}</td></tr>`
    )
    .join("");
  document.getElementById("schedule").innerHTML =
    (r.stale ? `<p class="notice sched-stale-note">${T.schedStaleRow}</p>` : "") +
    `<div class="table-scroll"><table class="result-table"><thead><tr>` +
    `<th>${T.thDate}</th><th class="rt-home">${T.thHome}</th><th>${T.thTime}</th><th>${T.thAway}</th>` +
    `</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fillSchedRounds() {
  const T = I18N[LANG];
  const sel = document.getElementById("sched-round");
  sel.innerHTML = SCHED.rounds
    .map((r) => `<option value="${r.round}">${T.archRound(archRoundNum(r.round))}${r.stale ? T.schedStaleTag : ""}</option>`)
    .join("");
  const cov = document.getElementById("sched-coverage");
  cov.textContent = SCHED.stale_rounds ? T.schedStale(SCHED.stale_rounds) : "";
  cov.hidden = !SCHED.stale_rounds;
  const firstFuture = SCHED.rounds.find((x) => !x.stale);
  sel.value = schedRound && SCHED.rounds.some((x) => x.round === schedRound)
    ? schedRound
    : (firstFuture || SCHED.rounds[0]).round;
  schedRound = sel.value;
}

async function loadSchedule() {
  try {
    const r = await fetch("data/schedule.json", { cache: "no-store" });
    if (!r.ok) throw new Error("schedule " + r.status);
    SCHED = await r.json();
    document.getElementById("sched-controls").hidden = false;
    fillSchedRounds();
    renderSchedule();
  } catch (e) {
    document.getElementById("schedule").innerHTML =
      `<p class="notice">${e.message}</p>`;
  }
}

document.getElementById("sched-round").addEventListener("change", (e) => {
  schedRound = e.target.value;
  renderSchedule();
});

boot();
