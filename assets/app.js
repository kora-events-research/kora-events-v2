// يقرأ data/snapshot.json ويعرض اللقطة كاملة. لا يوجد أي خادم خلفي.
// Reads the static snapshot and renders it. No backend.
import { initAuth, setAuthLang, toggleFavorite, isFav, onFavChange, getUser } from "./auth.js";

const I18N = {
  ar: {
    title: "كرة الأحداث",
    tagline: "تحليل مفتوح المصدر لأحداث مباريات كرة القدم",
    freshness: (m) => `آخر تحديث: ${m.generated_at_utc} · بيانات حتى ${m.to} · ${m.matches} مباراة هذا الموسم`,
    freshsource: "المصادر: Football-Data (نتائج وأحداث) + openfootball (جدولة مبدئية موسومة) — تحديث تلقائي 4 مرات أسبوعيًا",
    srcLine: (s) => `مصدر الجدولة: ${s}`,
    srcProv: "openfootball — جدول مبدئي، توقيت الانطلاق غير مؤكد",
    grpTitle: "جرّب مجموعة أحداث — من العينة التاريخية فقط",
    grpHint: "اختر الأحداث لترى كم مرة تحققت معًا في مباريات هذا الموسم. هذا وصف تاريخي مشترك من العينة (109 مباريات)، وليس توقع النموذج لهذه المباراة بعينها، ولا يُضرب احتمال في آخر.",
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
    techHeading: "التفاصيل التقنية (تعريف الأحداث، قياس الدقة التجريبي، إعادة الإنتاج، الحدود)",
    tapToOpen: "اضغط لعرض التحليل",
    ukTime: "بتوقيت المصدر (المنطقة غير محددة)",
    provTime: "موعد مبدئي — التاريخ والتوقيت غير مؤكدين (openfootball)",
    schedHeading: "جدولة المصدر — موسم 2026-27",
    hintSched: "المصدر التطوعي openfootball (CC0) يسجل النتائج حتى الجولة 5 فقط. ما بعدها مواعيده المخططة: كلها مبدئية وقد تتغير، والأوقات كما وردت في المصدر الذي لا يحدد منطقتها الزمنية، وغير مؤكدة. الجولات التي انقضى تاريخها بلا نتيجة مسجلة بانتظار تحديث المصدر — لا يمكن التحقق منها من هذا المصدر. للتصفح فقط، بلا تحليل ولا احتمالات.",
    schedStale: (n) => `${n} جولات انقضى تاريخها بلا نتيجة مسجلة — بانتظار تحديث المصدر`,
    schedStaleTag: " (انقضى تاريخها — بانتظار المصدر)",
    schedStaleRow: "هذه الجولة انقضى تاريخها دون نتيجة مسجلة في المصدر — المواعيد أدناه هي مخطط المصدر القديم، بانتظار تحديثه.",
    ukTimeTitle: "الوقت كما ورد في المصدر — المصدر لا يحدد منطقة زمنية؛ غير مؤكد",
    archHeading: "الأرشيف — نتائج المواسم السابقة والحالية",
    hintArch: "تصفح نتائج حقيقية من مصدر المجال العام openfootball (CC0). للتصفح فقط — بلا تحليل ولا احتمالات. النتيجة تُقرأ: صاحب الأرض أولًا — الرقم الكبير نتيجة نهاية المباراة، وبين قوسين نتيجة الشوط الأول.",
    archPartial: (n) => `تغطية جزئية لهذا الموسم: ${n} مباراة مسجلة فقط — المصدر تطوعي وقد يتأخر عن الجدول الفعلي.`,
    archRound: (n) => `الجولة ${n}`,
    archSeason: "الموسم",
    referee: (f) => `الحكم: ${f.referee || "لم يُعلن"}`,
    flagLowTeam: "بيانات قليلة عن فريق",
    flagLowRef: "بيانات قليلة عن الحكم",
    flagCareful: "الإحصاءات الوصفية له أقل ثباتًا — معدلات الدوري المعروضة لا تتأثر بذلك",
    retro: (f) => `عرض استرجاعي: وُلّد بعد انطلاق المباراة (${f.kickoff_london || "غير معروف"}) — ليس توقعًا مسبقًا ولا يدخل تقييم الدقة.`,
    saved: (f, m) => `توقع محفوظ قبل الانطلاق (${f.kickoff_london}) ضمن لقطة ${m.generated_at_utc} — سيُقارن بالنتيجة الفعلية بعد المباراة.`,
    current: (m) => `تقدير ضمن لقطة ${m.generated_at_utc}.`,
    leagueRate: "معدل الدوري الحالي لهذا الحدث — مرجع عام، وليس توقعًا مخصصًا لهذه المباراة",
    noFixtures: "لا توجد مباريات قادمة في جدولة المصدر حاليًا. تظهر الجولة التالية هنا فور نشرها (عادة مساء الجمعة لمباريات نهاية الأسبوع) وتشغيل التحديث التلقائي.",
    noResults: "لم تُقيَّم أي توقعات محفوظة بعد. أول مقارنة فعلية تظهر بعد انتهاء أول مباراة وثّقنا توقعها قبل انطلاقها.",
    resForecast: "التوقع قبل المباراة",
    resActual: "ما حدث فعلًا",
    happened: "حدث", notHappened: "لم يحدث",
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
    freshness: (m) => `Last updated: ${m.generated_at_utc} · data through ${m.to} · ${m.matches} matches this season`,
    freshsource: "Sources: Football-Data (results, events) + openfootball (labeled provisional schedule) — auto-refreshed 4 times a week",
    srcLine: (s) => `Schedule source: ${s}`,
    srcProv: "openfootball — provisional schedule, kickoff time unconfirmed",
    grpTitle: "Try an event group — historical sample only",
    grpHint: "Pick events to see how often they occurred together in this season's matches. This is a descriptive joint frequency from the sample (109 matches), not the model's forecast for this match, and no probabilities are multiplied.",
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
    techHeading: "Technical details (event definitions, experimental accuracy, reproduction, limits)",
    tapToOpen: "Tap to view analysis",
    ukTime: "source time (timezone unspecified)",
    provTime: "Provisional — date and kickoff time unconfirmed (openfootball)",
    schedHeading: "Source schedule — 2026-27 season",
    hintSched: "The volunteer source openfootball (CC0) records results only up to round 5. Later rounds are its planned dates: all provisional and subject to change, times as recorded by the source, which specifies no timezone; unconfirmed. Rounds whose dates passed with no recorded result are awaiting a source update — they cannot be verified from this source. Browsing only, no analysis, no probabilities.",
    schedStale: (n) => `${n} rounds past their date with no recorded result — awaiting source update`,
    schedStaleTag: " (date passed — awaiting source)",
    schedStaleRow: "This round's date passed with no result recorded in the source — the dates below are the source's old plan, awaiting its update.",
    ukTimeTitle: "time as recorded in the source, which specifies no timezone; unconfirmed",
    archHeading: "Archive — past and current season results",
    hintArch: "Browse real results from the public-domain source openfootball (CC0). Browsing only — no analysis, no probabilities. Scores read home team first — the large number is full time, brackets show half time.",
    archPartial: (n) => `Partial coverage for this season: only ${n} matches recorded — the source is volunteer-maintained and can lag the actual schedule.`,
    archRound: (n) => `Round ${n}`,
    archSeason: "Season",
    referee: (f) => `Referee: ${f.referee || "not announced"}`,
    flagLowTeam: "Limited team data",
    flagLowRef: "Limited referee data",
    flagCareful: "its descriptive stats are less stable — the displayed league rates are unaffected",
    retro: (f) => `Retrospective demo: generated after the listed kickoff (${f.kickoff_london || "unknown"}) — not a pre-kickoff forecast, never counted in accuracy.`,
    saved: (f, m) => `Forecast saved before kickoff (${f.kickoff_london}) in the ${m.generated_at_utc} snapshot — it will be compared with the actual result after the match.`,
    current: (m) => `Estimate from the ${m.generated_at_utc} snapshot.`,
    leagueRate: "Current league rate for this event — a general reference, not a match-specific forecast",
    noFixtures: "No upcoming fixtures in the source schedule right now. The next round appears here once published (usually Friday evening for weekend matches) and the automatic refresh runs.",
    noResults: "No saved forecasts evaluated yet. The first real comparison appears after the first match whose forecast we recorded before kickoff.",
    resForecast: "Pre-match forecast",
    resActual: "What happened",
    happened: "Happened", notHappened: "Did not happen",
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
  if (SNAP) render(SNAP);
});

function applyLang() {
  const T = I18N[LANG];
  document.documentElement.lang = LANG;
  document.documentElement.dir = T.dir;
  document.getElementById("lang-toggle").textContent = T.toggle;
  setAuthLang(LANG);
  document.getElementById("t-title").textContent = T.title;
  document.getElementById("t-tagline").textContent = T.tagline;
  document.getElementById("t-disclaimer").innerHTML = T.disclaimer;
  document.getElementById("t-h-fixtures").textContent = T.hFixtures;
  document.getElementById("t-h-results").textContent = T.hResults;
  document.getElementById("t-hint-results").textContent = T.hintResults;
  document.getElementById("t-demo-heading").textContent = T.demoHeading;
  document.getElementById("t-arch-heading").textContent = T.archHeading;
  document.getElementById("t-hint-arch").textContent = T.hintArch;
  document.getElementById("t-sched-heading").textContent = T.schedHeading;
  document.getElementById("t-hint-sched").textContent = T.hintSched;
  if (ARCH) { fillArchSelectors(); renderArchive(); }
  if (SCHED) { fillSchedRounds(); renderSchedule(); }
  document.getElementById("t-tech-heading").textContent = T.techHeading;
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
        <div class="sub">${T.leagueRate}</div>
      </div>`;
    })
    .join("");
}

function fixtureCard(f, s, T) {
  const flags = [];
  if (f.low_team_data) flags.push(T.flagLowTeam);
  // v2: referee-history warning removed — displayed rates are league-wide,
  // not referee-conditioned (it belonged to the discontinued model).
  const tail = f.kickoff_passed === true
    ? `<div class="flags">${T.retro(f)}</div>`
    : f.kickoff_passed === false
      ? `<div class="sub preko">${T.saved(f, m_of(s))}</div>`
      : `<div class="sub">${T.current(m_of(s))}</div>`;
  return `<details class="fixture-card">
    <summary>
      <span class="teams">${f.home} — ${f.away}</span>
      <span class="when">${f.provisional ? `${f.date} · <span class="prov-badge">${T.provTime}</span>` : `${f.date} · ${f.time} ${T.ukTime}`}</span>
      <span class="tap">${T.tapToOpen}</span>
      <button type="button" class="fav-star" data-key="${f.date}|${f.home}|${f.away}" aria-label="${T.favAdd}">${isFav(`${f.date}|${f.home}|${f.away}`) ? "★" : "☆"}</button>
    </summary>
    <div class="fixture-body">
      <div class="sub">${T.referee(f)}</div>
      ${flags.length ? `<div class="flags">⚠ ${flags.join(" · ")} — ${T.flagCareful}</div>` : ""}
      ${probRows(f, s, T)}
      <div class="sub src">${T.srcLine(f.src === "espn" ? "ESPN" : f.src === "openfootball" ? T.srcProv : f.src === "football-data.org" ? "Football-Data.org" : "Football-Data")}</div>
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
  document.querySelector(".demo-block").hidden = retro.length === 0;

  // التوقع مقابل النتيجة: يظهر فقط عند وجود تقييمات فعلية
  const resSec = document.getElementById("results-section");
  const results = s.results || [];
  resSec.hidden = results.length === 0;
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
        <div class="when">${r.date}</div>
        <div class="sub">${T.resForecast} (${r.forecast_at})${r.model_info ? " · " + r.model_info : ""} · ${T.resActual}:</div>
        ${rows}
      </div>`;
    }).join("");
  }

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
const archBlock = document.querySelector(".arch-block");

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
  document.getElementById("archive").innerHTML = md.matches
    .map(
      (m) => `<div class="arch-row" aria-label="${m.home} vs ${m.away}, full time ${m.ft[0]}-${m.ft[1]}${m.ht ? `, half time ${m.ht[0]}-${m.ht[1]}` : ""}"><span class="arch-date">${m.date}</span>` +
        `<span class="arch-home">${m.home}</span>` +
        `<span class="arch-score"><bdi dir="ltr">${m.ft[0]}–${m.ft[1]}</bdi>${m.ht ? ` <span class="arch-ht"><bdi dir="ltr">(${m.ht[0]}–${m.ht[1]})</bdi></span>` : ""}</span>` +
        `<span class="arch-away">${m.away}</span></div>`
    )
    .join("");
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

function fillArchSelectors() {
  const sel = document.getElementById("arch-season");
  sel.innerHTML = ARCH.seasons
    .map((s) => `<option value="${s.season}">${s.season}</option>`)
    .join("");
  sel.value = archSeason;
  fillArchMd();
}

archBlock.addEventListener("toggle", async () => {
  if (!archBlock.open || ARCH) return;
  try {
    const r = await fetch("data/archive.json", { cache: "no-store" });
    if (!r.ok) throw new Error("archive " + r.status);
    ARCH = await r.json();
    archSeason = ARCH.seasons[ARCH.seasons.length - 1].season;
    document.getElementById("arch-controls").hidden = false;
    fillArchSelectors();
    renderArchive();
  } catch (e) {
    document.getElementById("archive").innerHTML =
      `<p class="notice">${e.message}</p>`;
  }
});
document.getElementById("arch-season").addEventListener("change", (e) => {
  archSeason = e.target.value;
  archMd = null;
  fillArchMd();
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
const schedBlock = document.querySelector(".sched-block");

function renderSchedule() {
  const T = I18N[LANG];
  const r = SCHED.rounds.find((x) => x.round === schedRound) || SCHED.rounds.find((x) => !x.stale) || SCHED.rounds[0];

  document.getElementById("schedule").innerHTML =
    (r.stale ? `<p class="notice sched-stale-note">${T.schedStaleRow}</p>` : "") +
    r.matches
      .map(
        (m) => `<div class="arch-row" aria-label="${m.home} vs ${m.away}, ${m.date}${m.time_uk ? ", " + m.time_uk + " " + T.ukTimeTitle : ""}"><span class="arch-date">${m.date}</span>` +
          `<span class="arch-home">${m.home}</span>` +
          `<span class="sched-time" title="${T.ukTimeTitle}">${m.time_uk ? `<bdi dir="ltr">${m.time_uk}</bdi>` : "—"}</span>` +
          `<span class="arch-away">${m.away}</span></div>`
      )
      .join("");
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

schedBlock.addEventListener("toggle", async () => {
  if (!schedBlock.open || SCHED) return;
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
});
document.getElementById("sched-round").addEventListener("change", (e) => {
  schedRound = e.target.value;
  renderSchedule();
});

boot();
