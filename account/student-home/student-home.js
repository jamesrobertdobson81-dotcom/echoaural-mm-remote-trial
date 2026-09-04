"use strict";

const { api, escapeHtml } = window.EchoAuralAccounts;

const moduleLinks = {
  "melody-master": "/modules/melody-master/",
  "melodic-intervals": "/modules/melodic-intervals/",
  "instrument-identifier": "/modules/instrument-identifier/",
  "texture-trainer": "/modules/texture-trainer/",
  "meter-master": "/modules/meter-master/",
  "exam-lab": "/modules/exam-lab/"
};

const DASHBOARD_ICONS = {
  progress: "/assets/icons/dashboard/progress-mode.png?v=11",
  quizzes: "/assets/icons/dashboard/join-live-session.png?v=11",
  homework: "/assets/icons/dashboard/homework.png?v=11"
};

const LEVEL_ICONS = {
  Foundation: "/assets/icons/levels/mm-transparent/foundation-transparent.png",
  Developing: "/assets/icons/levels/mm-transparent/developing-transparent.png",
  Securing: "/assets/icons/levels/mm-transparent/securing-transparent.png",
  Mastering: "/assets/icons/levels/mm-transparent/mastering-transparent.png"
};

/* Light-blue (mode-icon) level logos — Progress Mode detailed feedback only. */
const PM_DETAIL_LEVEL_ICONS = {
  Foundation: "/assets/icons/levels/pm-detail/foundation.png?v=2",
  Developing: "/assets/icons/levels/pm-detail/developing.png?v=2",
  Securing: "/assets/icons/levels/pm-detail/securing.png?v=2",
  Mastering: "/assets/icons/levels/pm-detail/mastering.png?v=2"
};

/* Maps a Live Session app (server-side module_id, see account-server.js
   PROGRESS_MODULE_DEFINITIONS) onto the musical element/area it belongs to,
   so a single element's detail popup can pull in real Live Session rounds
   alongside its Progress Mode evidence. Exam Lab is deliberately left out —
   a single Exam Lab round can span every area, so its marks can't be
   honestly attributed to one element; it still shows in full under the
   sidebar's "Live" breakdown.

   The maps below drive the element popup's per-app breakdown instead: one
   row per real EA app for that musical element (Progress Mode's own
   per-area driver grouping in app-drivers.js — already the authoritative
   "which real apps belong to which element" list used everywhere else in
   Progress Mode), each blending marks from Progress Mode + Live Sessions +
   Homework into a single score. The "Musical Language" driver sources
   (musical-language-ornamentation/articulation/dynamics/tempo) are
   deliberately left out — that question bank has no menu icon or
   standalone identity of its own anywhere else in the app, unlike every
   other driver here. */
// These already display correctly (confirmed against each app's own real
// colour) as a normal <img> — pre-baked "coloured tile + white line art"
// icons, same style as melody-master.png.
const SUB_APP_ICONS = {
  "instrument-identifier": "/assets/icons/modules/instrument-identifier.png",
  "texture-trainer": "/assets/icons/modules/texture-trainer.png",
  "meter-master": "/assets/icons/modules/meter-master.png",
  "context-coach-composer": "/assets/icons/modules/context-coach.png",
  "context-coach-period": "/assets/icons/modules/context-coach.png"
};

// The rest had no correctly-coloured pre-baked tile available (the ones in
// assets/icons/modules/ were either the wrong file entirely — Harmony
// Explorer's key-signatures row was showing the generic harmony-explorer
// logo — or baked in an old mismatched colour that a hue-rotate could only
// approximate, e.g. Melody Master's icons coming out too red instead of the
// real MM pink). Every one of these apps already has a plain white,
// transparent-background icon for this exact skill/mode on its own real
// homepage (e.g. melody-master/index.html's skill picker) — reusing that
// same file here, rendered as a small tile filled with the element's own
// exact accent colour (--eh-area) with the real icon centred on top, gives
// a pixel-correct colour instead of an approximation.
const SUB_APP_TILE_ICONS = {
  "melody-master-devices": "/assets/icons/modules/mm-transparent/melodic-devices-transparent.png",
  "melody-master-dictation": "/assets/icons/modules/mm-transparent/melodic-dictation-transparent.png",
  "melodic-intervals": "/assets/icons/modules/mm-transparent/melodic-intervals-transparent.png",
  "ensemble-recognition": "/assets/icons/modules/ii-transparent/ensembles-transparent-v3.png",
  "harmony-key-signatures": "/assets/icons/modules/he-transparent/key-signatures-transparent.png",
  "chord-identifier": "/assets/icons/modules/he-transparent/chord-identifier-transparent.png",
  "cadence-coach": "/assets/icons/modules/he-transparent/cadences-transparent.png"
};

// Canonical sub-app -> server moduleId mapping, from shared/js/pm-registry.js
// (the same source classroom/question-catalogue.js and others already
// treat as authoritative) rather than a second, hand-maintained copy here.
// Not every PM sub-app has a matching Live Session/Homework module yet
// (see account-server.js PROGRESS_MODULE_DEFINITIONS) — those genuinely
// have no evidence from those two modes, and show Progress-Mode-only marks
// until that changes; PM_REGISTRY.get(sourceKey)?.moduleId simply returns
// undefined for them, same effective behaviour as the old map's absence.
const PM_REGISTRY = window.EchoAuralPMRegistry;

// A handful of server modules cover MORE than one PM sub-app (melody-master:
// devices+dictation; musical-language: 4 topics; era-explorer: composer+
// period) — for those, a Live Session attempt's moduleId alone can't say
// which sub-app it belongs to, so getCombinedSourceStats below prefers the
// finer bySourceKey breakdown (accounts/account-server.js's
// buildProgressSummary) instead of the coarser per-module total. For every
// other (single-sub-app) module the per-module total is already exact.
const MULTI_SOURCE_MODULE_IDS = (() => {
  if (!PM_REGISTRY) return new Set();
  const counts = {};
  PM_REGISTRY.all().forEach((entry) => {
    counts[entry.moduleId] = (counts[entry.moduleId] || 0) + 1;
  });
  return new Set(Object.keys(counts).filter((moduleId) => counts[moduleId] > 1));
})();

// Combines Progress Mode + Live Session + Homework marks for one PM
// sub-app source — the shared calculation behind both the top-level area
// grid (getProgressModeSnapshot) and the per-element popup
// (elementDetailMarkup), so the two never disagree about a sub-app's
// current numbers. `scope` narrows which source(s) contribute: "overall"
// (default) blends all three, matching the original behaviour exactly;
// "progress"/"quizzes"/"homework" isolate just that one, for the
// per-tab split (each tab should show only its own evidence, not
// everything pooled together).
function getCombinedSourceStats(sourceKey, scope = "overall") {
  const Store = window.EAProgressModeStore;
  const studentId = state.student?.id;
  const pmStats = (studentId && typeof Store?.getCumulativeStats === "function")
    ? Store.getCumulativeStats(studentId, [sourceKey])[sourceKey]
    : null;
  const pmCorrect = pmStats?.correct || 0;
  const pmQuestions = pmStats?.questions || 0;

  const serverModuleId = PM_REGISTRY?.get(sourceKey)?.moduleId || null;
  const quizModules = state.progress?.categories?.quizzes?.modules || [];
  const homeworkModules = state.progress?.categories?.homework?.modules || [];
  const quizModule = serverModuleId ? quizModules.find((entry) => entry.moduleId === serverModuleId) : null;
  const homeworkModule = serverModuleId ? homeworkModules.find((entry) => entry.moduleId === serverModuleId) : null;

  let quizCorrect = 0;
  let quizQuestions = 0;
  let homeworkCorrect = 0;
  let homeworkQuestions = 0;
  if (serverModuleId && MULTI_SOURCE_MODULE_IDS.has(serverModuleId)) {
    const quizBySourceKey = state.progress?.categories?.quizzes?.bySourceKey || {};
    const homeworkBySourceKey = state.progress?.categories?.homework?.bySourceKey || {};
    quizCorrect = Number(quizBySourceKey[sourceKey]?.correct || 0);
    quizQuestions = Number(quizBySourceKey[sourceKey]?.questions || 0);
    homeworkCorrect = Number(homeworkBySourceKey[sourceKey]?.correct || 0);
    homeworkQuestions = Number(homeworkBySourceKey[sourceKey]?.questions || 0);
  } else {
    // correctQuestionCount/questions (both flat per-attempt counts, see
    // account-server.js's moduleSummaries) — not score/maximumScore, which
    // are marks sums and would let a multi-mark question outweigh a
    // single-mark one once blended with Progress Mode's own flat pool below.
    quizCorrect = Number(quizModule?.correctQuestionCount || 0);
    quizQuestions = Number(quizModule?.questions || 0);
    homeworkCorrect = Number(homeworkModule?.correctQuestionCount || 0);
    homeworkQuestions = Number(homeworkModule?.questions || 0);
  }

  let correct;
  let questions;
  if (scope === "progress") {
    correct = pmCorrect;
    questions = pmQuestions;
  } else if (scope === "quizzes") {
    correct = quizCorrect;
    questions = quizQuestions;
  } else if (scope === "homework") {
    correct = homeworkCorrect;
    questions = homeworkQuestions;
  } else {
    correct = pmCorrect + quizCorrect + homeworkCorrect;
    questions = pmQuestions + quizQuestions + homeworkQuestions;
  }

  return {
    correct,
    questions,
    percentage: questions ? Math.round((correct / questions) * 100) : 0,
    quizModule,
    homeworkModule
  };
}

// Concept-level counterpart to getCombinedSourceStats above — merges
// Progress Mode + Live Session + Homework byConcept breakdowns for one
// server moduleId. PM's half comes from modules/progress-mode/store.js's
// own local conceptStats (window.EAProgressModeStore.getConceptStats),
// populated via shared/js/concept-extractors.js the same way
// accounts/account-server.js's buildProgressSummary populates the
// LS/Homework half — same source of truth, two places it's read from,
// exactly like getCombinedSourceStats already does one level up. Same
// `scope` convention as getCombinedSourceStats: "overall" merges all
// three (unchanged default), a named source isolates just that one.
function getCombinedConceptStats(moduleId, scope = "overall") {
  if (!moduleId) return {};
  const Store = window.EAProgressModeStore;
  const studentId = state.student?.id;
  const pmByConcept = (scope === "overall" || scope === "progress")
    && studentId && typeof Store?.getConceptStats === "function"
    ? Store.getConceptStats(studentId, moduleId)
    : {};
  const quizByConcept = (scope === "overall" || scope === "quizzes")
    ? (state.progress?.categories?.quizzes?.byConcept?.[moduleId] || {})
    : {};
  const homeworkByConcept = (scope === "overall" || scope === "homework")
    ? (state.progress?.categories?.homework?.byConcept?.[moduleId] || {})
    : {};
  const merged = {};
  [pmByConcept, quizByConcept, homeworkByConcept].forEach((source) => {
    Object.keys(source).forEach((conceptValue) => {
      if (!merged[conceptValue]) merged[conceptValue] = { correct: 0, questions: 0 };
      merged[conceptValue].correct += Number(source[conceptValue]?.correct || 0);
      merged[conceptValue].questions += Number(source[conceptValue]?.questions || 0);
    });
  });
  Object.keys(merged).forEach((conceptValue) => {
    const entry = merged[conceptValue];
    entry.percentage = entry.questions ? Math.round((entry.correct / entry.questions) * 100) : 0;
  });
  return merged;
}

// An extra "Music Vocabulary" row for the element popup — the Musical
// Language question sources (musical-language-*) are real marks the
// student has earned, just excluded from the per-app loop above since
// that bank has no menu icon of its own (see SUB_APP_TILE_ICONS note).
// Surfaced here instead as one combined row per area, using the score
// decoder icon (Score Decoder is Musical Language's own real product name
// — see modules/musical-language/index.html) tinted with that element's
// own accent colour. Three of the four Musical Language elements have a
// home: Melody (articulation + ornaments), Texture (dynamics), Rhythm
// (tempo) — nothing currently maps to harmony/instrumentation/context.
const VOCAB_SUB_APPS = {
  melody: { label: "Music Vocabulary · Articulation & Ornaments", sourceKeys: ["musical-language-articulation", "musical-language-ornamentation"] },
  texture: { label: "Music Vocabulary · Dynamics", sourceKeys: ["musical-language-dynamics"] },
  rhythm: { label: "Music Vocabulary · Tempo", sourceKeys: ["musical-language-tempo"] }
};
const VOCAB_ICON = "/assets/icons/modules/score-decoder.png";

// Condensed one-word labels for the sub-app rows — the full names
// (Drivers[key].label, e.g. "Melody Master · Melodic Devices") are still
// used elsewhere (recent evidence, etc); this is display-only for these
// tiles so they read as a tight row of tiles rather than wrapped sentences.
const SUB_APP_SHORT_LABEL = {
  "melody-master-devices": "Devices",
  "melody-master-dictation": "Dictation",
  "melodic-intervals": "Intervals",
  "instrument-identifier": "Instruments",
  "ensemble-recognition": "Ensembles",
  "texture-trainer": "Devices",
  "chord-identifier": "Chords",
  "harmony-key-signatures": "Keys",
  "cadence-coach": "Cadences",
  "meter-master": "Devices",
  "context-coach-composer": "Composers",
  "context-coach-period": "Periods",
  "musical-language-articulation": "Articulation",
  "musical-language-ornamentation": "Ornaments",
  "musical-language-dynamics": "Dynamics",
  "musical-language-tempo": "Tempo",
  "structure-spotter": "Structure"
};

const CATEGORY_CONFIG = {
  // Added so the "Overall" tab's area cards can open a detail popup at all
  // — DASHBOARD_ICONS/DASHBOARD_VIEWS already had an "overall" entry, but
  // CATEGORY_CONFIG (consulted by openCategoryDetail) never did; every area
  // card used to be hardcoded to categoryKey="progress" regardless of which
  // tab rendered it, which silently papered over this gap until that
  // hardcoding was fixed (see renderEahomeModulesGrid).
  overall: {
    title: "Overall Progress",
    icon: DASHBOARD_ICONS.progress,
    eyebrow: "All your learning",
    subtitle: "Progress Mode, Live Sessions and Homework combined.",
    detailSubtitle: "Your combined levels and personalised feedback, by musical area.",
    emptyFeedback: "Complete a round in Progress Mode, a Live Session or Homework to begin your record.",
    actionLabel: "Start Progress Mode",
    actionHref: "/modules/progress-mode/index.html"
  },
  progress: {
    title: "Progress Mode",
    icon: DASHBOARD_ICONS.progress,
    eyebrow: "Levelled learning",
    subtitle: "Foundation, Developing, Securing and Mastering progress.",
    detailSubtitle: "Your levels and personalised feedback, by musical area.",
    emptyFeedback: "Complete a Progress Mode round to begin your levelled record.",
    actionLabel: "Start Progress Mode",
    actionHref: "/modules/progress-mode/index.html"
  },
  quizzes: {
    title: "Live Sessions",
    icon: DASHBOARD_ICONS.quizzes,
    eyebrow: "Teacher-led learning",
    subtitle: "Results saved from Teacher Mode classroom rounds.",
    detailSubtitle: "Your app scores, saved rounds and question feedback from live classroom sessions.",
    emptyFeedback: "Join a Teacher Mode round to begin your live-session record.",
    actionLabel: "Join live class",
    actionHref: "/join"
  },
  homework: {
    title: "Homework",
    icon: DASHBOARD_ICONS.homework,
    eyebrow: "Assigned learning",
    subtitle: "Teacher-set activities will appear here.",
    detailSubtitle: "Homework assignments, deadlines and submitted scores will appear here when homework is added.",
    emptyFeedback: "No homework has been assigned yet."
  }
};

const SERVER_MODULE_ELEMENTS = {
  "melody-master": "melody",
  "melodic-intervals": "melody",
  "instrument-identifier": "instrumentation",
  "texture-trainer": "texture",
  "meter-master": "rhythm",
  "exam-lab": "mixed"
};

const DASHBOARD_VIEWS = {
  overall: { title: "Overall Progress", titleMain: "Overall", titleAccent: "Progress", icon: "/assets/icons/dashboard/overall-progress.png" },
  progress: { title: "Progress Mode", titleMain: "Progress", titleAccent: "Mode", icon: DASHBOARD_ICONS.progress },
  quizzes: { title: "Live Sessions", titleMain: "Live", titleAccent: "Sessions", icon: DASHBOARD_ICONS.quizzes },
  homework: { title: "Homework", titleMain: "Home", titleAccent: "work", icon: DASHBOARD_ICONS.homework }
};

const state = {
  progress: null,
  student: null,
  activeView: "overall"
};

const els = {
  progressStatus: document.getElementById("progressStatus"),
  eahomeHero: document.getElementById("eahomeHero"),
  eahomeModulesGrid: document.getElementById("eahomeModulesGrid"),
  eahomeStatsRow: document.getElementById("eahomeStatsRow"),
  eahomeRightColumn: document.getElementById("eahomeRightColumn"),
  topbarIcon: document.getElementById("eahomeTopbarIcon"),
  topbarTitleMain: document.getElementById("eahomeTopbarTitleMain"),
  topbarTitleAccent: document.getElementById("eahomeTopbarTitleAccent"),
  categoryDialog: document.getElementById("studentCategoryDetailDialog"),
  categoryDetailEyebrow: document.getElementById("studentCategoryDetailEyebrow"),
  categoryDetailTitle: document.getElementById("studentCategoryDetailTitle"),
  categoryDetailSubtitle: document.getElementById("studentCategoryDetailSubtitle"),
  categoryDetailIcon: document.getElementById("studentCategoryDetailIcon"),
  categoryDetailContent: document.getElementById("studentCategoryDetailContent"),
  pmHeadingBrand: document.getElementById("studentPmHeadingBrand"),
  questionHistoryDialog: document.getElementById("studentQuestionHistoryDialog"),
  questionHistorySearch: document.getElementById("questionHistorySearch"),
  questionHistoryMode: document.getElementById("questionHistoryMode"),
  questionHistoryDate: document.getElementById("questionHistoryDate"),
  questionHistoryElement: document.getElementById("questionHistoryElement"),
  questionHistoryApp: document.getElementById("questionHistoryApp"),
  questionHistorySummary: document.getElementById("questionHistorySummary"),
  questionHistoryResults: document.getElementById("questionHistoryResults")
};

function formatMark(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function formatDateTime(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateTime(value);
}

function scoreClass(percentage, questions) {
  if (!questions) return "is-empty";
  if (percentage >= 85) return "is-secure";
  if (percentage >= 70) return "is-strong";
  if (percentage >= 50) return "is-developing";
  return "is-focus";
}

function sourceLabel(source) {
  if (source === "progress") return "Progress Mode";
  if (source === "quizzes") return "Live session";
  return "Homework";
}

function categoryHeadingId(categoryKey) {
  if (categoryKey === "progress") return "studentProgressModeHeading";
  if (categoryKey === "quizzes") return "studentQuizHeading";
  return "studentHomeworkHeading";
}

function emptyCategory(message) {
  return `<div class="category-empty-v2"><span class="category-empty-wave-v2" aria-hidden="true"><i></i><i></i><i></i></span><p>${escapeHtml(message)}</p></div>`;
}

function emptyLearningCategory() {
  return { overall: {}, modules: [], recentRounds: [], recentQuestions: [] };
}

function normaliseProgressData(progress) {
  const rawCategories = progress.categories || {};
  const categories = {
    quizzes: rawCategories.quizzes || emptyLearningCategory(),
    homework: rawCategories.homework || { overall: {} }
  };

  return { ...progress, categories };
}

// Single source of real Progress Mode numbers, shared by the hero, the
// modules grid, the stats row and the detailed-feedback popup — each of
// those used to duplicate this computation independently (see git history);
// pulling it into one place means every surface always agrees with the
// others, and there is exactly one spot to read when checking what's real.
// `scope`: "overall" (default) blends Progress Mode + Live Session +
// Homework, matching the original, single-audience behaviour of this
// function exactly. "progress"/"quizzes"/"homework" narrow every number
// (and the written-feedback sentences built from them) to just that one
// source, for the per-tab split — each tab should show only its own
// evidence, not everything pooled together.
// Builds the resolveConceptItem(sourceKey) closure buildAreaFeedback's 4th
// param expects (feedback.js deliberately has no PM_REGISTRY/
// getCombinedConceptStats dependency of its own — see its comment on
// buildAreaFeedback). Same serverModuleId -> CONCEPT_PHRASES ->
// getCombinedConceptStats chain buildCardSummary already resolves
// (student-home.js's own precedent, see buildCardSummary above), reduced to
// Feedback.pickTopConcept's single "most informative value" pick instead of
// buildCardSummary's flat name list. Caches per moduleId within one
// snapshot build so sourceKeys sharing a moduleId (e.g. musical-language's
// several topics) don't recompute the same combined concept stats twice.
function makeConceptItemResolver(scope) {
  const Feedback = window.EAProgressModeFeedback;
  const cache = new Map();
  return (sourceKey) => {
    const serverModuleId = PM_REGISTRY?.get(sourceKey)?.moduleId || null;
    if (!serverModuleId || !Feedback?.CONCEPT_PHRASES?.[serverModuleId]) return null;
    if (!cache.has(serverModuleId)) {
      const conceptStats = getCombinedConceptStats(serverModuleId, scope);
      cache.set(serverModuleId, Feedback.pickTopConcept(serverModuleId, conceptStats));
    }
    return cache.get(serverModuleId);
  };
}

function getProgressModeSnapshot(scope = "overall") {
  const Store = window.EAProgressModeStore;
  const Drivers = window.EAProgressModeDrivers;
  const AreaOrder = window.EAProgressModeAreaOrder;
  const AreaLabels = window.EAProgressModeAreaLabels;
  const AreaIcons = window.EAProgressModeAreaIcons || {};
  const Feedback = window.EAProgressModeFeedback;

  const empty = {
    ready: false, hasEvidence: false, percentage: 0, correct: 0, questions: 0, rounds: 0,
    areasStarted: 0, levelLabel: "", dailyStreak: 0,
    streakSnapshot: { correctCurrent: 0, correctBest: 0, dailyCurrent: 0, dailyBest: 0 },
    roundsThisWeek: 0, weeklyGoal: 5, areas: []
  };
  if (!Store || !Drivers || !AreaOrder || !AreaLabels || !state.student) return empty;

  const studentId = state.student.id;
  const snapshot = Store.getSnapshot(studentId, AreaOrder);
  const areaToSources = {};
  AreaOrder.forEach((areaKey) => { areaToSources[areaKey] = []; });
  Object.keys(Drivers).forEach((sourceKey) => { areaToSources[Drivers[sourceKey].area].push(sourceKey); });

  const resolveConceptItem = makeConceptItemResolver(scope);

  let totalCorrect = 0;
  let totalQuestions = 0;
  const areas = AreaOrder.map((areaKey) => {
    const sources = areaToSources[areaKey];
    // Combined PM + Live Session + Homework, per source — see
    // getCombinedSourceStats. This is what makes the area paragraph below
    // reflect real classroom evidence, not just solo Progress Mode practice.
    const combinedStats = {};
    let correct = 0;
    let questions = 0;
    sources.forEach((sourceKey) => {
      const combined = getCombinedSourceStats(sourceKey, scope);
      combinedStats[sourceKey] = combined;
      correct += combined.correct;
      questions += combined.questions;
    });
    totalCorrect += correct;
    totalQuestions += questions;

    // Level/overallProgress stay Progress-Mode-only, deliberately — level
    // advancement is gated on PM's own concept-tracking mechanism (see
    // store.js's MIN_DISTINCT_CONCEPTS_PER_LEVEL), which Live Session
    // evidence doesn't feed into. Only the correct/questions/feedback
    // shown alongside it are combined.
    const areaState = snapshot.areas[areaKey];
    const tracksConcepts = sources.some((sourceKey) => Boolean(Drivers[sourceKey].getSignature));
    const overallProgress = Store.getAreaOverallProgressPercentage(studentId, areaKey, tracksConcepts);
    const percentage = questions ? Math.round((correct / questions) * 100) : 0;

    let feedbackText = "";
    if (Feedback && questions) {
      const feedback = Feedback.buildAreaFeedback(combinedStats, sources, AreaLabels[areaKey], resolveConceptItem);
      feedbackText = typeof feedback === "string" ? feedback : (feedback?.detail || feedback?.text || "");
    }

    return {
      areaKey,
      sources,
      label: AreaLabels[areaKey],
      icon: AreaIcons[areaKey] || DASHBOARD_ICONS.progress,
      correct,
      questions,
      percentage,
      level: areaState.level,
      levelLabel: areaState.levelLabel,
      overallProgress,
      feedbackText
    };
  });

  const areasStarted = areas.filter((area) => area.questions > 0).length;
  const hasEvidence = totalQuestions > 0;
  const streakSnapshot = typeof Store.getStreakSnapshot === "function"
    ? Store.getStreakSnapshot(studentId)
    : empty.streakSnapshot;
  const roundsThisWeek = typeof Store.getRoundsThisWeek === "function" ? Store.getRoundsThisWeek(studentId) : 0;

  // "Rounds completed" — snapshot.roundsCompleted is Progress Mode's own
  // local round count (from Store.getSnapshot), correct for scope
  // "progress" but not a stand-in for Live Session/Homework rounds, which
  // live server-side instead. Real bug this replaces: previously this
  // field was ALWAYS PM-only, even for what's meant to be the fully-blended
  // "overall" scope.
  const quizRounds = Number(state.progress?.categories?.quizzes?.overall?.rounds || 0);
  const homeworkRounds = Number(state.progress?.categories?.homework?.overall?.rounds || 0);
  let rounds;
  if (scope === "quizzes") rounds = quizRounds;
  else if (scope === "homework") rounds = homeworkRounds;
  else if (scope === "progress") rounds = snapshot.roundsCompleted;
  else rounds = snapshot.roundsCompleted + quizRounds + homeworkRounds;

  return {
    ready: true,
    hasEvidence,
    percentage: hasEvidence ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    correct: totalCorrect,
    questions: totalQuestions,
    rounds,
    areasStarted,
    levelLabel: snapshot.overallLevelLabel,
    dailyStreak: streakSnapshot.dailyCurrent || 0,
    streakSnapshot,
    roundsThisWeek,
    weeklyGoal: Store.WEEKLY_ROUNDS_GOAL || 5,
    areas
  };
}

// Level first, percentage as the tiebreaker — sorting by percentage alone
// missed a real case: an area can sit on a solid accuracy (e.g. 78%) and
// still be stuck at Foundation because store.js's level-advancement gates
// require enough sampled VOLUME/variety at the current level too, not just
// clearing the accuracy bar. That student needs more reps in that area,
// not necessarily "worse" performance elsewhere — level captures that,
// percentage alone doesn't.
//
// `useLevel` (default true): area.level/levelLabel/overallProgress are
// ALWAYS Progress Mode's own real, gated level — getProgressModeSnapshot
// reads them unscoped from Store.getSnapshot() regardless of which scope
// was requested (see its own comment) — only correct/questions/percentage/
// feedbackText are actually narrowed to the requested scope. So on the
// Quizzes/Homework tabs, sorting by level would pick "weakest"/"strongest"
// using a PM-only signal that has nothing to do with quiz or homework
// performance, contradicting the correctly-scoped percentage shown right
// next to it. Callers already compute this exact distinction under other
// names (showLevelBadge/showLevelChrome/showPmChrome — true only for
// "overall"/"progress" scope) — pass that same boolean through here so the
// AREA PICKED, not just the copy describing it, respects scope.
function weakestArea(areas, useLevel = true) {
  const started = areas.filter((area) => area.questions > 0);
  if (!started.length) return null;
  return started.slice().sort((a, b) => {
    if (useLevel && a.level !== b.level) return a.level - b.level;
    return a.percentage - b.percentage;
  })[0];
}

// Level first, percentage as the tiebreaker — same reasoning as
// weakestArea above, mirrored rather than inverted-and-forgotten. Missing
// this let a real case through: an area can be sitting on a strong raw
// accuracy while a DIFFERENT area has already reached a higher level
// (Mastering requires clearing an 80%+ bar at every level along the way,
// not just today's cumulative average — a hard climb from Foundation can
// easily average out lower lifetime than a shallower area's easier, more
// recent run of correct answers). Sorting on percentage alone could call
// a Securing-level area "strongest" over one already at Mastering.
// `useLevel` — see weakestArea's own comment; same scope-awareness need.
function strongestAreas(areas, count = 2, useLevel = true) {
  const started = areas.filter((area) => area.questions > 0);
  return started.slice().sort((a, b) => {
    if (useLevel && a.level !== b.level) return b.level - a.level;
    return b.percentage - a.percentage;
  }).slice(0, count);
}

function categoryActionHref(categoryKey, config) {
  if (categoryKey === "progress" && config.actionHref && state.student) {
    const params = new URLSearchParams({
      studentId: state.student.id,
      studentName: state.student.displayName || state.student.username || ""
    });
    return `${config.actionHref}?${params.toString()}`;
  }
  return config.actionHref;
}

// Same launch as categoryActionHref("progress", ...) plus focusArea/
// questions — read by modules/progress-mode/script.js's own
// applyLaunchFocusParams on load to pre-select that area in the existing
// "Focus area" advanced-settings pill (a normal focus round still draws a
// minority of its questions from every area, not just this one — see
// FOCUS_BREADTH_INTERVAL's own comment in script.js — so "10 questions in
// this area" here means a round biased toward it, the same meaning the
// app's own focus-area picker already has, not a literal 100%-one-area
// mode). Falls back to the plain progress-mode link with no area if
// there's no weakest area yet (e.g. no evidence at all).
function focusRoundHref(area) {
  if (!state.student) return CATEGORY_CONFIG.progress.actionHref;
  const params = new URLSearchParams({
    studentId: state.student.id,
    studentName: state.student.displayName || state.student.username || ""
  });
  if (area) {
    params.set("focusArea", area.areaKey);
    params.set("questions", "10");
  }
  return `${CATEGORY_CONFIG.progress.actionHref}?${params.toString()}`;
}

// ---------- New dashboard surfaces (hero / modules grid / stats / recent
// activity / right column) — all real data, via getProgressModeSnapshot()
// and the same server-side `progress` object loadProgress already fetches.
// ----------

function renderEahomeHero(pm, viewKey = "overall") {
  // The Foundation/Developing/Securing/Mastering level badge is inherently
  // Progress-Mode-only (see getProgressModeSnapshot's own comment on
  // level/overallProgress) — showing it on the Live Sessions/Homework tabs
  // would misrepresent a PM-only concept as if those sources tracked it too.
  // Computed before weakestArea/strongestAreas below (not just after, as it
  // used to be) because it now also gates the SORT itself, not only the
  // copy — see weakestArea's own comment on why level must never decide
  // "weakest"/"strongest" outside the scopes where it actually means
  // anything.
  const showLevelBadge = viewKey === "overall" || viewKey === "progress";
  const weak = weakestArea(pm.areas, showLevelBadge);
  const strongest = strongestAreas(pm.areas, 1, showLevelBadge)[0];
  const pct = pm.hasEvidence ? pm.percentage : 0;
  // Every scope now produces the same `pm.areas`/`weakestArea` shape (see
  // getProgressModeSnapshot's `scope` parameter), so the weakest-area
  // framing below works identically for any tab — no more special-casing
  // Progress Mode against a differently-shaped quizzes/homework snapshot.
  const emptyText = viewKey === "overall"
    ? "Complete a round in Progress Mode, a Live Session or Homework to start building your record."
    : CATEGORY_CONFIG[viewKey].emptyFeedback;
  // A real, specific summary drawn from every musical element area, not a
  // bare area name — weak.feedbackText is already the same
  // Feedback.buildAreaFeedback paragraph (strength/weakness/developing,
  // with its own "how to improve" tip) the per-area detail popup and
  // snapshotDetailMarkup's own "Focus next" callout already show, just
  // reused here instead of a second, generic hero-only template. Only
  // prefixed with a strongest-area callout when that's a genuinely
  // different area — naming the same area as both strongest and weakest
  // would read as contradictory.
  const weakSummary = weak
    ? (weak.feedbackText || `Your ${weak.label} accuracy is ${weak.percentage}%. A focused round here will help most.`)
    : "";
  // strongestAreas now picks by level first (see its own comment) — the
  // number shown alongside it needs to be the SAME metric, or "Strongest in
  // Texture (69%)" would still visibly contradict that area's own Mastering
  // badge/progress bar elsewhere, which both read overallProgress (92%
  // here), not raw all-time accuracy. Only meaningful on the PM-relevant
  // scopes; quizzes/homework have no level concept, so they keep showing
  // plain accuracy.
  const strongestPct = strongest ? (showLevelBadge ? strongest.overallProgress : strongest.percentage) : 0;
  const subtext = !pm.hasEvidence
    ? emptyText
    : weak
      ? (strongest && strongest.areaKey !== weak.areaKey
          ? `Strongest in ${escapeHtml(strongest.label)} (${strongestPct}%). ${escapeHtml(weakSummary)}`
          : escapeHtml(weakSummary))
      : "Solid progress across your completed work.";
  const levelIcon = LEVEL_ICONS[pm.levelLabel] || LEVEL_ICONS.Foundation;

  return `
    <div class="eahome-hero-copy">
      <div class="eahome-hero-feedback">
        ${showLevelBadge ? `
        <div class="eahome-hero-level">
          <span class="eahome-hero-feedback-icon" aria-hidden="true"><img src="${levelIcon}" alt="" /></span>
          <strong class="eahome-hero-level-label">${escapeHtml(pm.levelLabel || "Foundation")}</strong>
        </div>` : ""}
        <p>${subtext}</p>
      </div>
      <div class="eahome-hero-actions">
        <a class="eahome-cta-primary" href="${categoryActionHref("progress", CATEGORY_CONFIG.progress)}">
          <span class="eahome-cta-icon" aria-hidden="true"><img src="/assets/icons/dashboard/progress-mode.png" alt="" /></span>
          Continue Progress Mode
        </a>
        <a class="eahome-cta-primary" href="/join">
          <span class="eahome-cta-icon" aria-hidden="true"><img src="/assets/icons/dashboard/join-live-session.png" alt="" /></span>
          Join Live Session
        </a>
        <button class="eahome-cta-primary" type="button" data-dashboard-view="homework">
          <span class="eahome-cta-icon" aria-hidden="true"><img src="/assets/icons/dashboard/homework.png" alt="" /></span>
          Complete Homework
        </button>
      </div>
    </div>
    <div class="eahome-hero-ring-wrap" role="img" aria-label="${pct} percent ${escapeHtml(DASHBOARD_VIEWS[viewKey].title.toLowerCase())}">
      <div class="eahome-hero-ring" style="--pct:${pct}"></div>
      <div class="eahome-hero-ring-value">
        <strong>${pm.hasEvidence ? pct : "—"}${pm.hasEvidence ? "%" : ""}</strong>
        <span>${escapeHtml(viewKey === "overall" ? "overall progress" : DASHBOARD_VIEWS[viewKey].title.toLowerCase())}</span>
      </div>
    </div>
  `;
}

function moduleStatusBadge(area) {
  const label = area.levelLabel || "Foundation";
  return { cls: "is-level-" + label.toLowerCase(), label };
}

function capitalise(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// This page is deliberately viewport-height-scoped (see --eh-vhs: the
// module cards' own min-height already scales off 100vh) — the whole point
// is that "Your elements" fits in one screen with no scrolling. A full
// buildAreaFeedback paragraph can run to 1-3 sentences and 200+ characters
// once it's pairing a strength against a weakness — real prose, fine in the
// hero/callouts/detail popup (each shows at most one or two at a time), but
// unworkable once all 6 areas show a summary at once here. Rather than
// truncate that prose (the previous approach — cutting it at a character
// limit lost whatever fell after the cut, often the improvement half of the
// sentence entirely), this builds a short, purpose-made summary directly:
// name up to 2 things going well and 1 thing to focus on, using the
// shortest real display name available for each signal — a concept name
// (e.g. "Monophonic", "Root position") when the source has concept-level
// data, otherwise the sub-app's own short label (e.g. "Devices"). Concept
// names are pooled in ahead of source names specifically because 3 of the
// 6 areas (Texture, Rhythm, and to a lesser extent Instrumentation) have
// only 1-2 real sub-app sources each — without drilling into concepts,
// there would rarely be enough distinct signals to name 2 strengths at all.
function buildCardSummary(sources, scope) {
  const Drivers = window.EAProgressModeDrivers || {};
  const Feedback = window.EAProgressModeFeedback;
  const earlyMin = Feedback?.EARLY_SIGNAL_MIN_QUESTIONS ?? 3;
  const weaknessMin = Feedback?.WEAKNESS_THRESHOLD ?? 60;

  const items = [];
  // A moduleId can be shared by more than one sourceKey in the same area —
  // all 4 musical-language topics share one moduleId, and so pool into one
  // combined concept map — so it's only queried once per moduleId, not once
  // per sourceKey, to avoid counting the same concepts twice. But sharing a
  // moduleId doesn't mean sharing a sourceKey: getCombinedSourceStats is
  // still scoped per sourceKey correctly, so if that one concept query came
  // back empty (real, e.g. no concept-tagged data yet), each sourceKey that
  // shares the module still gets its own chance at the source-level
  // fallback below rather than silently contributing nothing.
  const moduleConceptItemCounts = new Map();
  (sources || []).forEach((sourceKey) => {
    const serverModuleId = PM_REGISTRY?.get(sourceKey)?.moduleId || null;
    const conceptPhrases = serverModuleId ? Feedback?.CONCEPT_PHRASES?.[serverModuleId] : null;
    if (conceptPhrases) {
      if (!moduleConceptItemCounts.has(serverModuleId)) {
        const conceptStats = getCombinedConceptStats(serverModuleId, scope);
        let addedHere = 0;
        Object.keys(conceptStats).forEach((conceptValue) => {
          if (!conceptPhrases[conceptValue]) return;
          const stat = conceptStats[conceptValue];
          if (stat.questions < earlyMin) return;
          items.push({ name: capitalise(conceptValue), percentage: stat.percentage, questions: stat.questions });
          addedHere += 1;
        });
        moduleConceptItemCounts.set(serverModuleId, addedHere);
      }
      if (moduleConceptItemCounts.get(serverModuleId) > 0) return;
    }
    const combined = getCombinedSourceStats(sourceKey, scope);
    if (combined.questions >= earlyMin) {
      items.push({
        name: SUB_APP_SHORT_LABEL[sourceKey] || Drivers[sourceKey]?.label || sourceKey,
        percentage: combined.percentage,
        questions: combined.questions
      });
    }
  });

  if (!items.length) return null;

  items.sort((a, b) => b.percentage - a.percentage);
  // With 2+ signals, always name the weakest as the focus and take up to 2
  // of the rest (strongest first) as "doing well" — with exactly one
  // signal, there's nothing to contrast it against, so it's framed as
  // whichever side of WEAKNESS_THRESHOLD it actually falls on instead.
  let strengths;
  let focus;
  if (items.length === 1) {
    if (items[0].percentage >= weaknessMin) { strengths = [items[0]]; focus = null; }
    else { strengths = []; focus = items[0]; }
  } else {
    focus = items[items.length - 1];
    strengths = items.slice(0, items.length - 1).slice(0, 2);
  }

  const strengthNames = strengths.map((item) => item.name);
  const parts = [];
  if (strengthNames.length) parts.push(`Doing well: ${strengthNames.join(" & ")}.`);
  if (focus) parts.push(`Focus on ${focus.name}.`);
  return parts.join(" ");
}

// Shared area-card grid for all 4 tabs (`viewKey`: "overall"/"progress"/
// "quizzes"/"homework"). Progress Mode's mastery-progress bar (level-based,
// see getProgressModeSnapshot's own comment on why it's Progress-Mode-only)
// only makes sense for "overall"/"progress" — Live Sessions/Homework show
// their own scoped accuracy instead, with no level badge (there's no
// Live-Session/Homework notion of "level" to attach one to).
function renderEahomeModulesGrid(pm, viewKey = "overall") {
  if (!pm.areas.length) return emptyCategory(viewKey === "overall" ? "Complete a round to begin your record." : CATEGORY_CONFIG[viewKey].emptyFeedback);
  const showMastery = viewKey === "overall" || viewKey === "progress";
  return pm.areas.map((area) => {
    const pct = showMastery ? area.overallProgress : area.percentage;
    const badge = showMastery ? moduleStatusBadge(area) : null;
    // Real per-area summary, purpose-built to be short rather than a
    // shortened version of the longer prose used elsewhere (the hero, the
    // "Focus next"/"Strong in X" callouts, the detail popup one click away
    // — all of which still use the full Feedback.buildAreaFeedback text via
    // area.feedbackText, untouched). See buildCardSummary above.
    const cardSummary = area.questions ? buildCardSummary(area.sources, viewKey) : null;
    const summary = cardSummary
      || (area.questions
        ? `${pct}% so far — keep going to unlock personalised feedback here.`
        : "Complete a round to start building feedback here.");
    return `
      <button class="eahome-module-card ${badge ? badge.cls : ""}" type="button" data-category-detail="${escapeHtml(viewKey)}" data-area="${escapeHtml(area.areaKey)}">
        <span class="eahome-module-header">
          <span class="eahome-module-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
          <span class="eahome-module-title">${escapeHtml(area.label)}</span>
        </span>
        <strong class="eahome-module-pct">${area.questions ? `${pct}%` : "—"}</strong>
        <span class="eahome-module-bar" aria-hidden="true"><i style="width:${area.questions ? pct : 0}%"></i></span>
        <p class="eahome-module-feedback">${escapeHtml(summary)}</p>
        ${badge ? `<span class="eahome-module-badge">${badge.label}</span>` : ""}
      </button>
    `;
  }).join("");
}

function renderEahomeStatsRow(pm, viewKey = "overall") {
  const items = [
    { icon: "/assets/icons/dashboard/questions-answered.png", value: pm.questions, label: "Questions answered" },
    { icon: "/assets/icons/dashboard/rounds-completed.png", value: pm.rounds, label: "Rounds completed" },
    { icon: "/assets/icons/progress-mode/weekly-goal.png", value: pm.hasEvidence ? `${pm.percentage}%` : "—", label: "Accuracy" }
  ];
  if (viewKey === "overall" || viewKey === "progress") {
    items.push({ icon: "/assets/icons/progress-mode/daily-streak.png", value: pm.dailyStreak, label: "Day streak" });
  }
  return `
    <h2>Your stats</h2>
    <div class="eahome-stats-grid${items.length === 3 ? " is-three" : ""}">
      ${items.map((item) => `
        <div class="eahome-stat-tile">
          <span class="eahome-stat-icon" aria-hidden="true"><img src="${item.icon}" alt="" /></span>
          <div class="eahome-stat-copy">
            <strong>${item.value}</strong>
            <span>${item.label}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEahomeRecentActivity(progress, viewKey = "overall") {
  const categories = progress.categories || {};

  // Progress Mode itself never reaches the server (localStorage-only, see
  // the note above loadProgress) — its own whole-round history
  // (Store.getRecentRounds, one entry per round at that round's overall
  // percentage — a round can mix several sub-apps, so there's no single
  // "title" the way a Live Session/Homework round has) is pulled in here
  // and merged with the server's quizzes/homework rounds so this list is a
  // true "last 10 rounds" across all three sources, not just Live Sessions.
  const Store = window.EAProgressModeStore;
  const pmRounds = (state.student && typeof Store?.getRecentRounds === "function")
    ? Store.getRecentRounds(state.student.id, 10)
    : [];

  const allRounds = [
    ...(categories.quizzes?.recentRounds || []).map((round) => ({ ...round, source: "quizzes" })),
    ...(categories.homework?.recentRounds || []).map((round) => ({ ...round, source: "homework" })),
    ...pmRounds.map((entry) => ({
      source: "progress",
      title: "",
      percentage: entry.percentage,
      questions: 0,
      completedAt: entry.timestamp
    }))
  ];
  const rounds = allRounds
    .filter((round) => viewKey === "overall" || round.source === viewKey)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .slice(0, 10);

  const listHtml = rounds.length
    ? rounds.map((round) => {
        // Live Session rounds carry the room's configured length alongside
        // how many questions the student actually has entries for (see
        // account-server.js's recentRounds) — a teacher-paced room can end
        // with a student having answered fewer than configured (see the
        // Live Session question-count fix). Surfacing "9 of 10" here
        // instead of a bare "9" keeps that visible in this list too, not
        // just the old, now-retired detail view that used to show it.
        const configured = Number(round.configuredQuestions || 0);
        const questionsLabel = round.questions
          ? (configured > round.questions ? `${round.questions} of ${configured} questions` : `${Number(round.questions)} questions`)
          : "";
        return `
        <button class="eahome-activity-row" type="button" data-category-detail="${round.source}">
          <span class="eahome-activity-check" aria-hidden="true">✓</span>
          <span class="eahome-activity-copy">
            <strong>${escapeHtml(sourceLabel(round.source))}${round.title ? ` · ${escapeHtml(round.title)}` : ""}</strong>
            <small>${escapeHtml(formatRelativeTime(round.completedAt))}${questionsLabel ? ` · ${questionsLabel}` : ""}</small>
          </span>
          <em class="${scoreClass(round.percentage, round.questions || 1)}">${Number(round.percentage || 0)}%</em>
        </button>
      `;
      }).join("")
    : '<div class="student-memory-empty-v3">Your completed rounds will appear here.</div>';

  return `
    <div class="eahome-section-heading">
      <h2>Recent activity</h2>
      ${viewKey === "progress" ? "" : '<button type="button" class="eahome-link-button" data-question-history-open>View all</button>'}
    </div>
    <div class="eahome-activity-list">${listHtml}</div>
  `;
}

function historyDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function historyElementLabel(elementKey) {
  if (elementKey === "mixed") return "Mixed elements";
  return window.EAProgressModeAreaLabels?.[elementKey]
    || (elementKey ? elementKey.charAt(0).toUpperCase() + elementKey.slice(1) : "Uncategorised");
}

function historyQuestionDetail(question) {
  const data = question.answerData || {};
  return data.title
    || data.question
    || data.prompt
    || data.correctInstrument
    || data.correctAnswer
    || question.questionId
    || "Question";
}

function getQuestionHistoryEntries() {
  const categories = state.progress?.categories || {};
  const serverEntries = ["quizzes", "homework"].flatMap((mode) => {
    const category = categories[mode] || {};
    const questions = category.questionHistory || category.recentQuestions || [];
    return questions.map((question) => ({
      id: `${mode}:${question.id || question.questionId || question.completedAt}`,
      mode,
      element: SERVER_MODULE_ELEMENTS[question.moduleId] || "mixed",
      subAppKey: question.moduleId || question.moduleTitle || "unknown",
      subAppLabel: question.moduleTitle || question.moduleId || "EchoAural",
      questionId: question.questionId || "",
      detail: historyQuestionDetail(question),
      feedback: question.feedback || "",
      score: Number(question.score || 0),
      maximumScore: Number(question.maximumScore || 0),
      completedAt: question.completedAt
    }));
  });

  const Store = window.EAProgressModeStore;
  const Drivers = window.EAProgressModeDrivers || {};
  const pmEntries = state.student && typeof Store?.getQuestionHistory === "function"
    ? Store.getQuestionHistory(state.student.id).map((question, index) => {
        const driver = Drivers[question.sourceKey] || {};
        return {
          id: `progress:${question.timestamp || index}:${question.sourceKey}`,
          mode: "progress",
          element: driver.area || "mixed",
          subAppKey: question.sourceKey || "progress-mode",
          subAppLabel: driver.label || question.sourceKey || "Progress Mode",
          questionId: question.questionId || "",
          detail: question.questionId || "Progress Mode question",
          feedback: question.correct ? "Correct response." : "Review this question and try it again.",
          score: Number(question.score || 0),
          maximumScore: Number(question.maximumScore || 1),
          completedAt: question.timestamp
        };
      })
    : [];

  return [...serverEntries, ...pmEntries]
    .filter((entry) => entry.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

function historyModeLabel(mode) {
  if (mode === "progress") return "Progress Mode";
  if (mode === "quizzes") return "Live Session";
  return "Homework";
}

function setHistorySelectOptions(select, options, allLabel) {
  const selected = select.value;
  select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>${options.map((option) =>
    `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
  ).join("")}`;
  if (options.some((option) => option.value === selected)) select.value = selected;
}

function refreshHistoryAppOptions(entries) {
  const mode = els.questionHistoryMode.value;
  const element = els.questionHistoryElement.value;
  const available = entries.filter((entry) => (!mode || entry.mode === mode) && (!element || entry.element === element));
  const apps = [...new Map(available.map((entry) => [entry.subAppKey, entry.subAppLabel])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  setHistorySelectOptions(els.questionHistoryApp, apps, "All sub-apps");
}

function renderQuestionHistory() {
  const entries = getQuestionHistoryEntries();
  refreshHistoryAppOptions(entries);
  const search = els.questionHistorySearch.value.trim().toLowerCase();
  const mode = els.questionHistoryMode.value;
  const date = els.questionHistoryDate.value;
  const element = els.questionHistoryElement.value;
  const app = els.questionHistoryApp.value;
  const filtered = entries.filter((entry) => {
    const searchable = `${entry.subAppLabel} ${entry.detail} ${entry.feedback} ${entry.questionId}`.toLowerCase();
    return (!search || searchable.includes(search))
      && (!mode || entry.mode === mode)
      && (!date || historyDateKey(entry.completedAt) === date)
      && (!element || entry.element === element)
      && (!app || entry.subAppKey === app);
  });

  els.questionHistorySummary.textContent = `${filtered.length} of ${entries.length} saved question${entries.length === 1 ? "" : "s"}`;
  els.questionHistoryResults.innerHTML = filtered.length ? filtered.map((entry) => {
    const full = entry.maximumScore > 0 && entry.score >= entry.maximumScore;
    return `
      <article class="eahome-history-row">
        <div class="eahome-history-row-main">
          <div class="eahome-history-row-tags">
            <span class="is-${escapeHtml(entry.mode)}">${escapeHtml(historyModeLabel(entry.mode))}</span>
            <span>${escapeHtml(historyElementLabel(entry.element))}</span>
          </div>
          <h3>${escapeHtml(entry.subAppLabel)}</h3>
          <p>${escapeHtml(entry.detail)}</p>
          <small>${escapeHtml(formatDateTime(entry.completedAt))}${entry.feedback ? ` · ${escapeHtml(entry.feedback)}` : ""}</small>
        </div>
        <strong class="eahome-history-mark ${full ? "is-full" : "is-review"}">${formatMark(entry.score)}/${formatMark(entry.maximumScore)}</strong>
      </article>
    `;
  }).join("") : '<div class="eahome-history-empty">No questions match these filters.</div>';
}

function openQuestionHistory() {
  const entries = getQuestionHistoryEntries();
  els.questionHistorySearch.value = "";
  els.questionHistoryMode.value = state.activeView === "overall" ? "" : state.activeView;
  els.questionHistoryDate.value = "";
  const elements = [...new Set(entries.map((entry) => entry.element))]
    .map((value) => ({ value, label: historyElementLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  setHistorySelectOptions(els.questionHistoryElement, elements, "All elements");
  els.questionHistoryElement.value = "";
  els.questionHistoryApp.value = "";
  renderQuestionHistory();
  els.questionHistoryDialog.showModal();
  els.questionHistorySearch.focus();
}

// Below this, weak.feedbackText's existing "your accuracy is low" framing
// still fits. At/above it, a student sitting on a decent score but still
// stuck below Mastering isn't struggling — they just haven't banked enough
// reps/variety at their current level yet (see weakestArea's own note) —
// so the copy should say "play more rounds", not "you need to improve".
const LEVEL_STUCK_ACCURACY_THRESHOLD = 70;
const MASTERING_LEVEL_INDEX = 3;

function renderEahomeRightColumn(pm, progress, viewKey = "overall") {
  // "Stuck at a level" framing is a Progress-Mode-only concept (level
  // advancement isn't tracked for Live Sessions/Homework at all — see
  // getProgressModeSnapshot's own comment) — only apply it for the
  // overall/progress scopes, where `weak.level`/`weak.levelLabel` actually
  // correspond to the percentage being shown alongside them. Computed
  // before weakestArea below so it can also gate the SELECTION itself, not
  // just this function's downstream copy choice — see weakestArea's own
  // comment.
  const showLevelChrome = viewKey === "overall" || viewKey === "progress";
  const weak = weakestArea(pm.areas, showLevelChrome);
  const nextStepTitle = weak ? `Revisit ${escapeHtml(weak.label)}` : "Get started";
  const isLevelStuck = showLevelChrome && weak && weak.level < MASTERING_LEVEL_INDEX && weak.percentage >= LEVEL_STUCK_ACCURACY_THRESHOLD;
  const emptyStepBody = viewKey === "overall"
    ? "Complete a round in Progress Mode, a Live Session or Homework to see a personalised focus area here."
    : viewKey === "progress"
      ? "Complete a Progress Mode round to see a personalised focus area here."
      : CATEGORY_CONFIG[viewKey].emptyFeedback;
  const nextStepBody = !pm.hasEvidence
    ? emptyStepBody
    : weak
      ? (isLevelStuck
          ? `${escapeHtml(weak.label)} is still at ${escapeHtml(weak.levelLabel)} despite ${weak.percentage}% accuracy — a focused round here banks the reps needed to level up.`
          : (weak.feedbackText || `Your ${escapeHtml(weak.label)} accuracy is ${weak.percentage}%. A focused round here will help most.`))
      : "Keep going — every area is off to a solid start.";

  return `
    <section class="eahome-side-card eahome-next-step-card">
      <div class="eahome-side-card-heading">
        <h3>Your next step</h3>
        <span class="eahome-side-card-icon" aria-hidden="true"><img src="/assets/icons/dashboard/next-steps.png" alt="" /></span>
      </div>
      <p class="eahome-eyebrow-pink">Focus next</p>
      <h4>${nextStepTitle}</h4>
      <p class="eahome-side-card-body">${escapeHtml(nextStepBody)}</p>
      <a class="eahome-cta-primary eahome-cta-block eahome-cta-frosted" href="${focusRoundHref(weak)}">
        <span class="eahome-cta-icon" aria-hidden="true"><img src="/assets/icons/dashboard/next-steps.png" alt="" /></span>
        Start Focus Round
      </a>
    </section>

    ${viewKey === "homework" ? renderHomeworkTasks(progress) : ""}
    <section class="eahome-side-card">
      ${renderEahomeRecentActivity(progress, viewKey)}
    </section>
  `;
}

function renderHomeworkTasks(progress) {
  const homework = progress.categories?.homework || {};
  const tasks = homework.assignments || homework.tasks || [];
  const taskRows = tasks.length ? tasks.map((task) => {
    const title = task.title || task.moduleTitle || task.name || "Homework task";
    const moduleId = task.moduleId || task.module_id || "";
    const href = task.href || task.actionHref || moduleLinks[moduleId] || "";
    const dueAt = task.dueAt || task.due_at || task.deadline || null;
    const status = String(task.status || (task.completedAt || task.submittedAt ? "Completed" : "To do"));
    const content = `
      <span class="eahome-homework-task-icon" aria-hidden="true"><img src="${escapeHtml(task.icon || DASHBOARD_ICONS.homework)}" alt="" /></span>
      <span class="eahome-homework-task-copy">
        <strong>${escapeHtml(title)}</strong>
        <small>${dueAt ? `Due ${escapeHtml(formatDateTime(dueAt))}` : "No deadline set"}</small>
      </span>
      <em class="${status.toLowerCase().includes("complete") ? "is-complete" : ""}">${escapeHtml(status)}</em>`;
    return href
      ? `<a class="eahome-homework-task-row" href="${escapeHtml(href)}">${content}</a>`
      : `<div class="eahome-homework-task-row">${content}</div>`;
  }).join("") : `
    <div class="eahome-homework-task-empty">
      <span class="eahome-homework-task-empty-icon" aria-hidden="true"><img src="${escapeHtml(DASHBOARD_ICONS.homework)}" alt="" /></span>
      <strong>No homework tasks</strong>
      <p>Your teacher has not set any homework tasks yet.</p>
    </div>`;

  return `
    <section class="eahome-side-card eahome-homework-tasks-card">
      <div class="eahome-section-heading">
        <h2>Homework tasks</h2>
        ${tasks.length ? `<span class="eahome-homework-task-count">${tasks.length}</span>` : ""}
      </div>
      <div class="eahome-homework-task-list">${taskRows}</div>
    </section>
  `;
}

function updateDashboardChrome(viewKey) {
  const view = DASHBOARD_VIEWS[viewKey];
  state.activeView = viewKey;
  els.topbarIcon.src = view.icon;
  els.topbarTitleMain.textContent = view.titleMain;
  els.topbarTitleAccent.textContent = view.titleAccent;
  els.eahomeHero.setAttribute("aria-label", `${view.title} listening progress`);
  document.title = `${view.title} | EchoAural Student Dashboard`;
  document.querySelectorAll("[data-dashboard-view]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.dashboardView === viewKey);
    if (item.dataset.dashboardView === viewKey) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

// All 4 tabs share one rendering path now — the only thing that varies is
// `viewKey`, which getProgressModeSnapshot/renderEahomeModulesGrid/etc use
// to scope which source(s) of evidence to show (see their own comments).
// "overall" blends Progress Mode + Live Session + Homework; "progress",
// "quizzes" and "homework" each isolate just their own evidence.
function renderEahomeDashboard(progress) {
  const viewKey = DASHBOARD_VIEWS[state.activeView] ? state.activeView : "overall";
  const snapshot = getProgressModeSnapshot(viewKey);
  updateDashboardChrome(viewKey);
  els.eahomeHero.innerHTML = renderEahomeHero(snapshot, viewKey);
  els.eahomeModulesGrid.innerHTML = renderEahomeModulesGrid(snapshot, viewKey);
  els.eahomeStatsRow.innerHTML = renderEahomeStatsRow(snapshot, viewKey);
  els.eahomeRightColumn.innerHTML = renderEahomeRightColumn(snapshot, progress, viewKey);
}

// ---------- Detailed feedback dialog ----------

// Progress Mode (modules/progress-mode/) is a self-contained, localStorage-
// only feature — its rounds never reach the server-side progress API this
// dialog otherwise reads from (see the script includes in index.html), so
// its "Detailed feedback" is built here from getProgressModeSnapshot() and
// store.js/feedback.js directly, matching the "Detailed feedback" mock-up:
// an overall ring + stat row, a bar per listening area, what's going well
// (real: the 1-2 highest-percentage started areas' own real feedback text),
// focus next (real: the weakest area, same as the hero/right-column), and
// recent evidence (real: Store.getRecentHistory, merged across sources).
//
// Two things from the supplied mock-up are deliberately NOT reproduced,
// rather than faked: the "Last 30 days / 7 days" time-range toggle (no
// date-scoped accuracy exists anywhere in store.js — only all-time
// cumulative stats and a rolling 7-day *round count* — building real
// date-filtered per-area accuracy would be a genuinely new feature, not a
// restyle), and the "Teacher note" card (there is no real teacher-note
// system in EchoAural at all; inventing one here would show a student a
// fabricated message under their real teacher's name).
// One musical element's real apps, each blending Progress Mode + Live
// Session + Homework marks into a single per-app score — reuses the same
// .pm-panel/.pm-area-row visual language as the "Performance by listening
// area" list in snapshotDetailMarkup() below, just scoped to one
// element's own apps instead of all six areas.
// `scope`: same convention as getProgressModeSnapshot/getCombinedSourceStats
// — "overall" (default) blends all three sources, "progress"/"quizzes"/
// "homework" isolate just that one tab's own evidence.
function elementDetailMarkup(areaKey, scope = "overall") {
  const pm = getProgressModeSnapshot(scope);
  const area = pm.areas.find((entry) => entry.areaKey === areaKey);
  if (!area) return emptyCategory("No evidence for this element yet.");

  const Drivers = window.EAProgressModeDrivers || {};
  const Feedback = window.EAProgressModeFeedback;
  // Same reliability tiers feedback.js itself gates written feedback on
  // (see its own EARLY_SIGNAL_MIN_QUESTIONS/FEEDBACK_MIN_QUESTIONS) — reused
  // here so a row's bar/percentage can never contradict its own feedback
  // sentence (e.g. showing an empty "—" bar next to a real, substantive
  // sentence, or a bare percentage from a 1-2 question sample that reads as
  // more confident than the wording actually is).
  const earlySignalMin = Feedback?.EARLY_SIGNAL_MIN_QUESTIONS ?? 3;
  const confidentMin = Feedback?.FEEDBACK_MIN_QUESTIONS ?? 8;

  const subAppKeys = Object.keys(Drivers)
    .filter((key) => Drivers[key].area === areaKey && (SUB_APP_ICONS[key] || SUB_APP_TILE_ICONS[key]));
  const vocab = VOCAB_SUB_APPS[areaKey];

  const subApps = subAppKeys.map((sourceKey) => {
    const combined = getCombinedSourceStats(sourceKey, scope);
    const { correct, questions, percentage, quizModule, homeworkModule } = combined;
    // Primary sentence, most-specific-available first:
    // 1. Concept-level (e.g. "you recognise first inversion chords well,
    //    but need to focus on extended chords") — only exists for the 5
    //    modules with clean concept data (accounts/account-server.js's
    //    byConcept); most sub-apps won't have this yet.
    // 2. Sub-app-level (SOURCE_PHRASES via buildSourceFeedback) — always
    //    available, names the actual skill rather than a bare percentage.
    // 3. Generic percentage fallback, for a sub-app with too little sample
    //    for either phrase bank yet.
    // When the Live Session/Homework server also has its own hand-authored,
    // data-derived sentence for this module (e.g. melody-master's
    // pitch-vs-contour analysis), append it as a second sentence rather
    // than discarding one or the other — scoped to whichever source(s) this
    // tab is actually showing, not always quizModule regardless of scope
    // (a real bug: homeworkModule's own feedback was never reachable here).
    const serverModuleId = PM_REGISTRY?.get(sourceKey)?.moduleId || null;
    const conceptStats = serverModuleId ? getCombinedConceptStats(serverModuleId, scope) : {};
    const conceptFeedback = serverModuleId ? Feedback?.buildConceptFeedback(serverModuleId, conceptStats) : null;
    const primary = conceptFeedback
      || Feedback?.buildSourceFeedback(sourceKey, correct, questions)
      || (questions
        ? `${percentage}% accuracy across ${questions} mark${questions === 1 ? "" : "s"} so far.`
        : "No attempts yet — complete a round to start building feedback here.");
    const secondaryModule = scope === "homework" ? homeworkModule
      : scope === "quizzes" ? quizModule
      : scope === "progress" ? null
      : (quizModule || homeworkModule);
    const secondary = secondaryModule?.questions && secondaryModule.feedback ? ` ${secondaryModule.feedback}` : "";
    const feedbackText = primary + secondary;
    // True whenever the sentence above says something real rather than the
    // generic "not enough yet" placeholder — concept-level feedback always
    // counts (it has its own, separate sample-size gate), otherwise this
    // sub-app's own mark count has to clear the same bar buildSourceFeedback
    // itself requires before it stops returning the placeholder.
    const hasRealSignal = Boolean(conceptFeedback) || questions >= earlySignalMin;
    return {
      sourceKey,
      icon: SUB_APP_ICONS[sourceKey] || SUB_APP_TILE_ICONS[sourceKey],
      isTile: Boolean(SUB_APP_TILE_ICONS[sourceKey]),
      label: SUB_APP_SHORT_LABEL[sourceKey] || Drivers[sourceKey].label,
      fullLabel: Drivers[sourceKey].label,
      correct,
      questions,
      percentage,
      feedbackText,
      hasRealSignal
    };
  });

  // Musical Language's topics now blend in Live Session evidence too (via
  // the sourceKey-level breakdown — see getCombinedSourceStats), not just
  // Progress Mode marks, now that classroom/progress-recorder.js tags each
  // question with its specific topic instead of only the shared
  // "musical-language" moduleId.
  if (vocab) {
    // Real, pre-existing gap fixed here: this row previously always showed
    // a bare "X% accuracy across Y marks" string, regardless of how good
    // or bad that score was — it never called the feedback system at all,
    // unlike every other row above. Fixed by reusing buildAreaFeedback,
    // which already knows how to turn a {sourceKey: stats} map into a real
    // sentence (pairing a strength/weakness across 1-2 sources, or a solo
    // sentence when there's only one) — exactly this row's own shape, just
    // with 1-2 musical-language sourceKeys instead of a full area's worth.
    const vocabCombinedStats = {};
    vocab.sourceKeys.forEach((key) => { vocabCombinedStats[key] = getCombinedSourceStats(key, scope); });
    const vocabCorrect = vocab.sourceKeys.reduce((sum, key) => sum + vocabCombinedStats[key].correct, 0);
    const vocabQuestions = vocab.sourceKeys.reduce((sum, key) => sum + vocabCombinedStats[key].questions, 0);
    const vocabPercentage = vocabQuestions ? Math.round((vocabCorrect / vocabQuestions) * 100) : 0;
    const vocabFeedback = vocabQuestions && Feedback
      ? Feedback.buildAreaFeedback(vocabCombinedStats, vocab.sourceKeys, "Vocabulary")
      : "";
    subApps.push({
      sourceKey: "vocab-" + areaKey,
      icon: VOCAB_ICON,
      isTile: true,
      label: "Vocabulary",
      fullLabel: vocab.label,
      correct: vocabCorrect,
      questions: vocabQuestions,
      percentage: vocabPercentage,
      feedbackText: vocabFeedback
        || (vocabQuestions
          ? `${vocabPercentage}% accuracy across ${vocabQuestions} mark${vocabQuestions === 1 ? "" : "s"} so far.`
          : "No attempts yet — complete a round to start building feedback here."),
      hasRealSignal: vocabQuestions >= earlySignalMin
    });
  }

  const subAppsHtml = subApps.length
    ? subApps.map((app) => {
        // The vocabulary icon (score-decoder.png) is a wide landscape image,
        // unlike every other tile source (all square) — object-fit:contain
        // would letterbox it down to a small centred blob with lots of flat
        // tile showing around it, which is also why the gradient looked
        // like it "wasn't there". pm-el-row-icon-vocab crops it to fill the
        // tile instead, same as the square ones already do.
        const iconHtml = app.isTile
          ? `<span class="pm-el-row-icon pm-el-row-icon-tile${app.sourceKey.startsWith("vocab-") ? " pm-el-row-icon-vocab" : ""}"><img src="${escapeHtml(app.icon)}" alt="" /></span>`
          : `<span class="pm-el-row-icon"><img src="${escapeHtml(app.icon)}" alt="" /></span>`;

        // Three reliability tiers, matching exactly what the feedback
        // sentence itself is willing to say (see hasRealSignal/confidentMin
        // above) — a row's stats are never shown looking more (or less)
        // certain than its own wording.
        const notStarted = !app.hasRealSignal;
        const showStats = app.hasRealSignal && app.questions > 0;
        const tierTag = notStarted ? "Not started" : (app.questions >= confidentMin ? "" : "Early signs");
        const statsHtml = showStats
          ? `
            <span class="pm-el-row-bar" aria-hidden="true"><i style="width:${app.percentage}%"></i></span>
            <strong class="pm-el-row-pct">${app.percentage}%</strong>
            <span class="pm-el-row-count">${app.questions} mark${app.questions === 1 ? "" : "s"}</span>
          `
          : `<span class="pm-el-row-count pm-el-row-count-only">${app.questions ? `${app.questions} mark${app.questions === 1 ? "" : "s"} so far` : "No marks yet"}</span>`;

        return `
        <div class="pm-el-row${notStarted ? " pm-el-row-not-started" : ""}">
          ${iconHtml}
          <div class="pm-el-row-body">
            <div class="pm-el-row-top">
              <span class="pm-el-row-label" title="${escapeHtml(app.fullLabel)}">${escapeHtml(app.label)}</span>
              ${tierTag ? `<span class="pm-el-row-tag${notStarted ? " pm-el-row-tag-muted" : ""}">${tierTag}</span>` : ""}
              <span class="pm-el-row-stats">${statsHtml}</span>
            </div>
            <p class="pm-el-row-feedback">${escapeHtml(app.feedbackText)}</p>
          </div>
        </div>
      `;
      }).join("")
    : `<p class="pm-callout-empty">No apps found for ${escapeHtml(area.label)}.</p>`;

  // The header's summary line includes Progress Mode's own tracked level
  // for this area only when a level is actually meaningful for the active
  // scope — Live Sessions/Homework have no notion of "level" (see
  // getProgressModeSnapshot's own comment on level/overallProgress being
  // Progress-Mode-only), so showing that badge there would misrepresent it.
  const showLevel = scope === "overall" || scope === "progress";
  const headerStatsHtml = area.questions
    ? `<span class="pm-el-header-pct">${area.percentage}% overall</span><span class="pm-el-header-sep" aria-hidden="true">·</span><span>${area.questions} mark${area.questions === 1 ? "" : "s"}</span>`
    : `<span class="pm-el-header-empty">No evidence yet</span>`;

  return `
    <div class="pm-detail">
      <div class="pm-element-columns">
        <section class="pm-el-header" data-area="${escapeHtml(areaKey)}">
          <span class="pm-el-header-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
          <div class="pm-el-header-copy">
            <strong class="pm-el-header-title">${escapeHtml(area.label)}</strong>
            <div class="pm-el-header-meta">${headerStatsHtml}</div>
          </div>
          ${showLevel ? `<span class="pm-el-level-pill">${escapeHtml(area.levelLabel)}</span>` : ""}
        </section>
        <section class="pm-panel">
          <div class="pm-section-heading"><h3>Performance by app</h3></div>
          <div class="pm-el-row-list" data-area="${escapeHtml(areaKey)}">${subAppsHtml}</div>
        </section>
      </div>
    </div>
  `;
}

// Generalized from a Progress-Mode-only detail view into the "no specific
// area clicked" landing view for ANY tab (`scope`: "overall" default,
// "progress"/"quizzes"/"homework" for the per-tab split). Progress-Mode-
// specific pieces (level badge, streak stats) only render when scope is
// "overall"/"progress" — Live Sessions/Homework have no equivalent concept
// for either (see getProgressModeSnapshot's own comments).
function snapshotDetailMarkup(scope = "overall") {
  const Store = window.EAProgressModeStore;
  const AreaOrder = window.EAProgressModeAreaOrder;
  const emptyText = scope === "overall"
    ? "Complete a round in Progress Mode, a Live Session or Homework to start building your record."
    : CATEGORY_CONFIG[scope]?.emptyFeedback || "No evidence yet.";

  if (!Store || !AreaOrder || !state.student) {
    return emptyCategory(emptyText);
  }

  const pm = getProgressModeSnapshot(scope);
  // Exam Lab has no musical area/sourceKey (it's a cross-skill assessment
  // type, not a PM sub-app — see PM_REGISTRY), so it never contributes to
  // pm.hasEvidence/pm.areas at all. Checked separately here, scoped to the
  // Live Sessions tab specifically (where it already lived before this
  // change), so a student with real Exam Lab rounds but nothing else isn't
  // wrongly shown the empty state.
  const examLabModule = scope === "quizzes"
    ? (state.progress?.categories?.quizzes?.modules || []).find((entry) => entry.moduleId === "exam-lab")
    : null;
  const hasExamLabEvidence = Boolean(examLabModule?.questions);
  if (!pm.hasEvidence && !hasExamLabEvidence) {
    return emptyCategory(emptyText);
  }

  const showPmChrome = scope === "overall" || scope === "progress";
  const overallLevelIcon = PM_DETAIL_LEVEL_ICONS[pm.levelLabel] || PM_DETAIL_LEVEL_ICONS.Foundation;

  // Progress/Overall scope keeps showing mastery-progress (level-based,
  // Progress-Mode-only); Live Sessions/Homework show their own scoped
  // accuracy instead, since they have no notion of "level" to display.
  const areaRows = pm.areas.map((area) => {
    const pct = showPmChrome ? area.overallProgress : area.percentage;
    return `
    <div class="pm-area-row" data-area="${escapeHtml(area.areaKey)}">
      <span class="pm-area-row-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
      <span class="pm-area-row-label">${escapeHtml(area.label)}</span>
      <span class="pm-area-row-bar"><i style="width:${area.questions ? pct : 0}%"></i></span>
      <strong class="pm-area-row-pct">${area.questions ? `${pct}%` : "—"}</strong>
    </div>
  `;
  }).join("");

  const doingWell = strongestAreas(pm.areas, 2, showPmChrome).filter((area) => area.percentage >= 60);
  const doingWellHtml = doingWell.length
    ? doingWell.map((area) => `
        <div class="pm-callout-item">
          <span class="pm-callout-check" aria-hidden="true">✓</span>
          <div>
            <strong>Strong in ${escapeHtml(area.label)}</strong>
            <p>${escapeHtml(area.feedbackText || `You're performing well in ${area.label}, at ${area.percentage}% accuracy.`)}</p>
          </div>
        </div>
      `).join("")
    : `<p class="pm-callout-empty">Keep going — your strongest areas will show up here.</p>`;

  const weak = weakestArea(pm.areas, showPmChrome);
  const focusNextHtml = weak
    ? `
      <div class="pm-callout-item">
        <span class="pm-callout-icon" aria-hidden="true"><img src="${escapeHtml(weak.icon)}" alt="" /></span>
        <div>
          <strong>${escapeHtml(weak.label)}</strong>
          <p>${escapeHtml(weak.feedbackText || `Your ${weak.label} accuracy is ${weak.percentage}%. A focused round here will help most.`)}</p>
        </div>
      </div>
    `
    : `<p class="pm-callout-empty">Complete a round in every area to see a recommendation here.</p>`;

  // Reuses the same scope-filtered activity list the main dashboard already
  // shows (Progress Mode + Live Session + Homework rounds, correctly
  // narrowed by scope) rather than a second, Progress-Mode-only recent-
  // history computation.
  const recentActivityHtml = renderEahomeRecentActivity(state.progress || {}, scope);

  // Exam Lab supplementary card — account-server.js already computes a
  // real, data-derived feedback/nextStep sentence for it (moduleSummaries'
  // own exam-lab branch), reused here rather than inventing a second one.
  const examLabHtml = examLabModule
    ? `
      <section class="pm-panel">
        <div class="pm-section-heading"><h3>Exam Lab</h3></div>
        <div class="pm-subapp-row">
          <span class="pm-subapp-row-icon"><img src="${escapeHtml(examLabModule.icon || "/assets/icons/modules/exam-lab.png")}" alt="" /></span>
          <div class="pm-subapp-row-body">
            <div class="pm-subapp-row-main">
              <span class="pm-subapp-row-label">Exam Lab</span>
              <span class="pm-subapp-row-bar"><i style="width:${examLabModule.questions ? examLabModule.percentage : 0}%"></i></span>
              <strong class="pm-subapp-row-pct">${examLabModule.questions ? `${examLabModule.percentage}%` : "—"}</strong>
            </div>
            <p class="pm-subapp-row-feedback">${escapeHtml(examLabModule.feedback || examLabModule.nextStep || "")}</p>
          </div>
        </div>
      </section>
    `
    : "";

  return `
    <div class="pm-detail">
      <header class="pm-detail-toolbar">
        <div class="pm-toolbar-left">
          <div class="pm-toolbar-segment pm-toolbar-level">
            ${showPmChrome ? `<span class="pm-toolbar-icon" aria-hidden="true"><img src="${escapeHtml(overallLevelIcon)}" alt="" /></span>` : ""}
            <div class="pm-toolbar-copy">
              ${showPmChrome ? `<strong class="pm-toolbar-level-label">${escapeHtml(pm.levelLabel)}</strong>` : ""}
              <span class="pm-toolbar-meta">${pm.rounds} round${pm.rounds === 1 ? "" : "s"} · ${pm.correct}/${pm.questions} marks · ${pm.areasStarted}/${AreaOrder.length} areas</span>
            </div>
          </div>
        </div>

        ${showPmChrome ? `
        <span class="pm-toolbar-divider" aria-hidden="true"></span>

        <div class="pm-toolbar-right">
          <div class="pm-toolbar-stats">
            <div class="pm-toolbar-stat">
              <span class="pm-toolbar-stat-icon" aria-hidden="true"><img src="/assets/icons/progress-mode/streak.png" alt=""></span>
              <div class="pm-toolbar-copy">
                <strong>${pm.streakSnapshot.correctCurrent}</strong>
                <span>Streak · best ${pm.streakSnapshot.correctBest}</span>
              </div>
            </div>
            <div class="pm-toolbar-stat">
              <span class="pm-toolbar-stat-icon" aria-hidden="true"><img src="/assets/icons/progress-mode/daily-streak.png" alt=""></span>
              <div class="pm-toolbar-copy">
                <strong>${pm.streakSnapshot.dailyCurrent}</strong>
                <span>Day streak · best ${pm.streakSnapshot.dailyBest}</span>
              </div>
            </div>
            <div class="pm-toolbar-stat">
              <span class="pm-toolbar-stat-icon" aria-hidden="true"><img src="/assets/icons/progress-mode/weekly-goal.png" alt=""></span>
              <div class="pm-toolbar-copy">
                <strong>${pm.roundsThisWeek}/${pm.weeklyGoal}</strong>
                <span>This week</span>
              </div>
            </div>
          </div>
        </div>` : ""}
      </header>

      <div class="pm-detail-columns">
        <div class="pm-detail-main-col">
          <section class="pm-panel">
            <h3>Performance by listening area</h3>
            <div class="pm-area-list">${areaRows}</div>
          </section>

          ${examLabHtml}

          <section class="pm-panel">
            ${recentActivityHtml}
          </section>
        </div>

        <div class="pm-detail-side-col">
          <section class="pm-panel pm-panel-positive">
            <h3>What you're doing well</h3>
            ${doingWellHtml}
          </section>

          <section class="pm-panel pm-panel-focus">
            <h3>Focus next</h3>
            ${focusNextHtml}
            <a class="eahome-cta-primary eahome-cta-block" href="${focusRoundHref(weak)}">Start recommended round</a>
          </section>
        </div>
      </div>
    </div>
  `;
}

// categoryKey doubles as `scope` now — "overall"/"progress"/"quizzes"/
// "homework", the same vocabulary getProgressModeSnapshot and friends use
// (see their own comments). Every category now renders through the same
// rich elementDetailMarkup/snapshotDetailMarkup pair, just scoped
// differently, so this function no longer branches on categoryKey to pick
// between a "rich" path and a separate, coarser one.
function openCategoryDetail(categoryKey, areaKey) {
  const config = CATEGORY_CONFIG[categoryKey];
  if (!config || !state.progress) return;

  const scope = categoryKey;
  // Clicking a "Your learning modules" card passes its area — that scopes
  // the popup down to one musical element's evidence, instead of the full
  // multi-area breakdown. Fires for any tab now, not just Progress Mode.
  const isElementDetail = Boolean(areaKey);
  const isProgressDetail = categoryKey === "progress";

  els.categoryDialog.classList.toggle("is-pm-detail", true);
  els.categoryDialog.classList.toggle("is-element-detail", isElementDetail);
  els.categoryDetailEyebrow.textContent = config.eyebrow;
  els.categoryDetailTitle.textContent = config.title;
  els.categoryDetailSubtitle.textContent = config.detailSubtitle;
  els.categoryDetailIcon?.style.setProperty("--ea-icon", `url('${config.icon}')`);
  // Progress Mode's own brand mark (icon + two-tone "ProgressMode"
  // wordmark) lives centred in the dialog's heading strip instead of
  // inside the panel below. For a single element, that identity now lives
  // in the merged .pm-el-header panel instead, so the heading strip
  // above it stays empty — just the close button. Cleared for every other
  // category too (this is Progress Mode's own product branding — showing
  // it while looking at Live Sessions/Homework would be wrong branding,
  // not just a layout detail).
  if (els.pmHeadingBrand) {
    els.pmHeadingBrand.innerHTML = isProgressDetail && !isElementDetail
      ? `<span class="pm-heading-brand-icon" aria-hidden="true"><img src="${escapeHtml(config.icon)}" alt="" /></span>
         <strong class="pm-heading-brand-title"><span class="pm-detail-brand-main">Progress</span><span class="pm-detail-brand-mode">Mode</span></strong>`
      : "";
  }
  els.categoryDetailContent.innerHTML = isElementDetail
    ? elementDetailMarkup(areaKey, scope)
    : snapshotDetailMarkup(scope);
  els.categoryDialog.showModal();
}

// Best-effort: hydrates this student's real Progress Mode state into the
// local Store before the dashboard renders, from the SAME two server
// mirrors modules/progress-mode/script.js's own syncStateFromServer already
// merges on identity resolution — reused here via the identical Store
// functions, not a second copy of the merge logic:
// - progress_mode_summaries (cumulative correct/questions per source) via
//   Store.mergeIncomingSummary — feeds getCombinedSourceStats' correct/
//   questions/percentage and hasEvidence below.
// - progress_mode_sync_state (per-area level/levelProgress) via
//   Store.mergeIncomingAreaState — feeds areaState.level/levelLabel and
//   getAreaOverallProgressPercentage below. Missing this piece was a real
//   bug in the first pass at this fix: cumulative stats alone made
//   hasEvidence true, but every area still showed a stale Foundation/0%
//   badge because level state lives in this separate table, synced by a
//   separate endpoint, that only the Progress Mode app itself was reading.
// Without BOTH, a student who last played Progress Mode on a different
// device would see wrong or missing results here even though the teacher
// dashboard already has their real scores. Never throws — a failed fetch
// just leaves the dashboard showing whatever's in local storage, same as
// before this existed.
async function hydrateProgressModeFromServer() {
  const Store = window.EAProgressModeStore;
  if (!Store) return;

  try {
    const summary = await api("/api/student/progress-mode-summary");
    if (summary && summary.ok) Store.mergeIncomingSummary(state.student.id, summary);
  } catch (error) {
    console.warn("Could not hydrate Progress Mode summary from server.", error);
  }

  try {
    const stateResponse = await api("/api/student/progress-mode-state");
    if (stateResponse && stateResponse.ok) {
      const areas = stateResponse.areas || {};
      Object.keys(areas).forEach((areaKey) => {
        Store.mergeIncomingAreaState(state.student.id, areaKey, areas[areaKey]);
      });
    }
  } catch (error) {
    console.warn("Could not hydrate Progress Mode area state from server.", error);
  }
}

async function loadProgress(showStatus = false) {
  if (showStatus) els.progressStatus.textContent = "Refreshing your results…";
  const [progressData] = await Promise.all([
    api("/api/student/progress"),
    hydrateProgressModeFromServer()
  ]);
  const progress = normaliseProgressData(progressData);
  state.progress = progress;
  renderEahomeDashboard(progress);
  els.progressStatus.textContent = showStatus ? "Results refreshed." : "";
}

(async () => {
  try {
    const current = await api("/api/auth/me?role=student");
    if (current.role !== "student") throw new Error("Student login required.");
    state.student = current.student;
    const displayName = current.student.displayName || current.student.username || "Student";
    document.getElementById("studentAccountName").textContent = displayName;
    document.getElementById("eahomeAvatarInitial").textContent = displayName.trim().charAt(0).toUpperCase() || "S";
    document.getElementById("studentTeacherName").textContent = current.student.teacherName;
    document.getElementById("studentTeacherCode").textContent = current.student.teacherCode;
    await window.EAProgressionStore?.ready?.();
    await loadProgress(false);
  } catch (error) {
    console.warn(error);
    window.location.replace("/account/student-login/");
  }
})();

document.getElementById("refreshProgressButton").addEventListener("click", async () => {
  const button = document.getElementById("refreshProgressButton");
  button.disabled = true;
  try {
    await loadProgress(true);
  } catch (error) {
    els.progressStatus.textContent = error.message || "Could not refresh results.";
  } finally {
    button.disabled = false;
  }
});

document.getElementById("studentLogoutButton").addEventListener("click", async () => {
  try {
    await api("/api/auth/student/logout", { method: "POST" });
  } finally {
    window.location.assign("/account/student-login/");
  }
});

const profileToggle = document.getElementById("eahomeProfileToggle");
const profileMenu = document.getElementById("eahomeProfileMenu");
profileToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = !profileMenu.hidden;
  profileMenu.hidden = isOpen;
  profileToggle.setAttribute("aria-expanded", String(!isOpen));
});
document.addEventListener("click", (event) => {
  if (!profileMenu.hidden && !profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
    profileMenu.hidden = true;
    profileToggle.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("click", (event) => {
  const dashboardViewButton = event.target.closest("[data-dashboard-view]");
  if (dashboardViewButton) {
    event.preventDefault();
    const viewKey = dashboardViewButton.dataset.dashboardView;
    if (DASHBOARD_VIEWS[viewKey] && state.progress) {
      state.activeView = viewKey;
      renderEahomeDashboard(state.progress);
      document.getElementById("eahomeTop")?.scrollIntoView({ block: "start" });
    }
    return;
  }
  if (event.target.closest("[data-question-history-open]")) {
    openQuestionHistory();
    return;
  }
  const detailButton = event.target.closest("[data-category-detail]");
  if (detailButton) openCategoryDetail(detailButton.dataset.categoryDetail, detailButton.dataset.area || null);
});

[els.questionHistorySearch, els.questionHistoryDate].forEach((control) => {
  control.addEventListener("input", renderQuestionHistory);
});
[els.questionHistoryMode, els.questionHistoryElement, els.questionHistoryApp].forEach((control) => {
  control.addEventListener("change", renderQuestionHistory);
});

document.getElementById("closeStudentQuestionHistory").addEventListener("click", () => {
  els.questionHistoryDialog.close();
});

els.questionHistoryDialog.addEventListener("click", (event) => {
  if (event.target === els.questionHistoryDialog) els.questionHistoryDialog.close();
});

document.getElementById("closeStudentCategoryDetail").addEventListener("click", () => {
  els.categoryDialog.close();
});

els.categoryDialog.addEventListener("click", (event) => {
  if (event.target === els.categoryDialog) els.categoryDialog.close();
});

window.addEventListener("pageshow", () => {
  if (document.visibilityState === "visible") loadProgress(false).catch(() => {});
});
