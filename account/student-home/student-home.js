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
// current numbers.
function getCombinedSourceStats(sourceKey) {
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

  let lsCorrect = 0;
  let lsQuestions = 0;
  if (serverModuleId && MULTI_SOURCE_MODULE_IDS.has(serverModuleId)) {
    const quizBySourceKey = state.progress?.categories?.quizzes?.bySourceKey || {};
    const homeworkBySourceKey = state.progress?.categories?.homework?.bySourceKey || {};
    lsCorrect = Number(quizBySourceKey[sourceKey]?.correct || 0) + Number(homeworkBySourceKey[sourceKey]?.correct || 0);
    lsQuestions = Number(quizBySourceKey[sourceKey]?.questions || 0) + Number(homeworkBySourceKey[sourceKey]?.questions || 0);
  } else {
    lsCorrect = Number(quizModule?.score || 0) + Number(homeworkModule?.score || 0);
    lsQuestions = Number(quizModule?.maximumScore || 0) + Number(homeworkModule?.maximumScore || 0);
  }

  const correct = pmCorrect + lsCorrect;
  const questions = pmQuestions + lsQuestions;
  return {
    correct,
    questions,
    percentage: questions ? Math.round((correct / questions) * 100) : 0,
    quizModule,
    homeworkModule
  };
}

// Concept-level counterpart to getCombinedSourceStats above — merges Live
// Session + Homework byConcept breakdowns (accounts/account-server.js's
// buildProgressSummary) for one server moduleId. Progress Mode has no
// concept-level tracking of its own yet (see the concept-feedback plan's
// scope boundary), so this is Live-Session/Homework only, unlike the
// PM+LS+Homework blend above.
function getCombinedConceptStats(moduleId) {
  if (!moduleId) return {};
  const quizByConcept = state.progress?.categories?.quizzes?.byConcept?.[moduleId] || {};
  const homeworkByConcept = state.progress?.categories?.homework?.byConcept?.[moduleId] || {};
  const merged = {};
  [quizByConcept, homeworkByConcept].forEach((source) => {
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
  "context-coach-period": "Periods"
};

const CATEGORY_CONFIG = {
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

const PROGRESSION_LEVEL_LABELS = ["Foundation", "Developing", "Securing", "Mastering"];

function progressionLevelIndexFromLabel(label) {
  const normalised = String(label || "").trim().toLowerCase();
  return PROGRESSION_LEVEL_LABELS.findIndex((item) => item.toLowerCase() === normalised);
}

function localProgressionLevelIndex(moduleId) {
  const state = window.EAProgressionStore?.getModule?.(moduleId);
  const level = Number(state?.unlockedLevel);
  if (!Number.isFinite(level)) return null;
  return Math.max(0, Math.min(PROGRESSION_LEVEL_LABELS.length - 1, level));
}

function progressionLevelLabel(module) {
  const stage = module?.progressionStage || {};
  const serverLevel = Number.isFinite(Number(stage.currentLevel))
    ? Number(stage.currentLevel)
    : progressionLevelIndexFromLabel(stage.label);
  const localLevel = localProgressionLevelIndex(module?.moduleId);
  const levelIndex = Math.max(
    0,
    Number.isFinite(serverLevel) ? serverLevel : 0,
    Number.isFinite(localLevel) ? localLevel : 0
  );
  return PROGRESSION_LEVEL_LABELS[Math.max(0, Math.min(PROGRESSION_LEVEL_LABELS.length - 1, levelIndex))] || "Foundation";
}

function renderCategoryModules(categoryKey, modules = []) {
  return `
    <div class="category-module-list-v2 student-detail-module-list-v3">
      ${modules.map((module) => {
        const href = moduleLinks[module.moduleId] || "/#apps";
        const progressionLabel = categoryKey === "progress" ? progressionLevelLabel(module) : "";
        const moduleMeta = module.questions
          ? `${module.questions} questions · ${module.rounds} rounds`
          : "Not started";
        return `
          <a class="category-module-row-v2 ${scoreClass(module.percentage, module.questions)}" href="${href}">
            <span class="category-module-icon-v2"><img src="${escapeHtml(module.icon)}" alt="" /></span>
            <span class="category-module-copy-v2">
              <span>${escapeHtml(module.title)}</span>
              <small>${escapeHtml(moduleMeta)}</small>
              ${progressionLabel ? `<em class="student-module-level-tile-v3">${escapeHtml(progressionLabel)}</em>` : ""}
            </span>
            <strong>${module.questions ? `${module.percentage}%` : "—"}</strong>
            <span class="category-module-bar-v2" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, module.percentage || 0))}%"></i></span>
            <p>${escapeHtml(module.questions ? module.nextStep : "Complete a first round to begin.")}</p>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function renderRoundList(rounds = []) {
  if (!rounds.length) return emptyCategory("No completed rounds in this section yet.");
  return `<div class="category-history-list-v2">${rounds.map((round) => `
    <div class="category-history-row-v2">
      <div>
        <strong>${escapeHtml(round.title)}</strong>
        <small>${escapeHtml(formatDateTime(round.completedAt))} · ${round.questions} questions</small>
      </div>
      <span class="round-score-badge ${scoreClass(round.percentage, round.questions)}">${formatMark(round.score)}/${formatMark(round.maximumScore)} · ${round.percentage}%</span>
      ${round.feedback ? `<p>${escapeHtml(round.feedback)}</p>` : ""}
    </div>
  `).join("")}</div>`;
}

function renderQuestionList(questions = []) {
  if (!questions.length) return emptyCategory("Question feedback will appear after a completed round.");
  return `<div class="category-history-list-v2 question-history-v2">${questions.map((question) => {
    const detail = question.answerData?.title || question.answerData?.correctInstrument || question.answerData?.correctAnswer || question.questionId || "Question";
    const full = Number(question.score) >= Number(question.maximumScore) && Number(question.maximumScore) > 0;
    return `
      <div class="category-history-row-v2">
        <div>
          <strong>${escapeHtml(question.moduleTitle)}</strong>
          <small>${escapeHtml(detail)} · ${escapeHtml(formatDateTime(question.completedAt))}</small>
        </div>
        <span class="question-mark ${full ? "is-full" : "is-review"}">${formatMark(question.score)}/${formatMark(question.maximumScore)}</span>
        <p>${escapeHtml(question.feedback || (full ? "Secure response." : "Review this question and try it again."))}</p>
      </div>
    `;
  }).join("")}</div>`;
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
function getProgressModeSnapshot() {
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
      const combined = getCombinedSourceStats(sourceKey);
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
      const feedback = Feedback.buildAreaFeedback(combinedStats, sources, AreaLabels[areaKey]);
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

  return {
    ready: true,
    hasEvidence,
    percentage: hasEvidence ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    correct: totalCorrect,
    questions: totalQuestions,
    rounds: snapshot.roundsCompleted,
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
function weakestArea(areas) {
  const started = areas.filter((area) => area.questions > 0);
  if (!started.length) return null;
  return started.slice().sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.percentage - b.percentage;
  })[0];
}

function strongestAreas(areas, count = 2) {
  const started = areas.filter((area) => area.questions > 0);
  return started.slice().sort((a, b) => b.percentage - a.percentage).slice(0, count);
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

function levelFromAccuracy(percentage, questions) {
  if (!Number(questions || 0)) return { level: 0, levelLabel: "Foundation" };
  if (percentage >= 85) return { level: 3, levelLabel: "Mastering" };
  if (percentage >= 70) return { level: 2, levelLabel: "Securing" };
  if (percentage >= 50) return { level: 1, levelLabel: "Developing" };
  return { level: 0, levelLabel: "Foundation" };
}

function getCategoryDashboardSnapshot(categoryKey) {
  const category = state.progress?.categories?.[categoryKey] || {};
  const overall = category.overall || {};
  const appModules = category.modules || [];
  const areaOrder = window.EAProgressModeAreaOrder || ["melody", "texture", "harmony", "instrumentation", "rhythm", "context"];
  const areaLabels = window.EAProgressModeAreaLabels || {};
  const areaIcons = window.EAProgressModeAreaIcons || {};
  const areas = areaOrder.map((areaKey) => {
    const modules = appModules.filter((module) => SERVER_MODULE_ELEMENTS[module.moduleId] === areaKey);
    const questions = modules.reduce((sum, module) => sum + Number(module.questions || 0), 0);
    const score = modules.reduce((sum, module) => sum + Number(module.score || 0), 0);
    const maximumScore = modules.reduce((sum, module) => sum + Number(module.maximumScore || 0), 0);
    const percentage = maximumScore > 0 ? Math.round((score / maximumScore) * 100) : 0;
    const level = levelFromAccuracy(percentage, questions);
    const focusModule = modules
      .filter((module) => Number(module.questions || 0) > 0)
      .sort((a, b) => Number(a.percentage || 0) - Number(b.percentage || 0))[0];
    return {
      areaKey,
      label: areaLabels[areaKey] || historyElementLabel(areaKey),
      icon: areaIcons[areaKey] || DASHBOARD_VIEWS[categoryKey].icon,
      questions,
      correct: score,
      percentage,
      level: level.level,
      levelLabel: level.levelLabel,
      feedbackText: focusModule?.feedback || focusModule?.nextStep || ""
    };
  });
  const questions = Number(overall.questions || 0);
  const percentage = Number(overall.percentage || 0);
  const level = levelFromAccuracy(percentage, questions);
  return {
    ready: true,
    hasEvidence: questions > 0,
    percentage,
    correct: Number(overall.score || 0),
    questions,
    rounds: Number(overall.rounds || 0),
    areasStarted: Number(overall.modulesStarted || appModules.filter((module) => Number(module.questions || 0) > 0).length),
    level: level.level,
    levelLabel: level.levelLabel,
    dailyStreak: 0,
    areas,
    feedbackText: overall.compiledFeedback || CATEGORY_CONFIG[categoryKey].emptyFeedback
  };
}

function renderEahomeHero(pm, viewKey = "overall") {
  const weak = weakestArea(pm.areas);
  const pct = pm.hasEvidence ? pm.percentage : 0;
  const isProgressView = viewKey === "overall" || viewKey === "progress";
  const subtext = isProgressView
    ? (!pm.hasEvidence
        ? "Complete your first Progress Mode round to start building your listening record."
        : weak
          ? `Solid progress across your completed listening work. Focus on ${escapeHtml(weak.label)} next.`
          : "Solid progress across your completed listening work.")
    : (!pm.hasEvidence
        ? escapeHtml(CATEGORY_CONFIG[viewKey].emptyFeedback)
        : escapeHtml(pm.feedbackText));

  const levelIcon = LEVEL_ICONS[pm.levelLabel] || LEVEL_ICONS.Foundation;

  return `
    <div class="eahome-hero-copy">
      <div class="eahome-hero-feedback">
        <div class="eahome-hero-level">
          <span class="eahome-hero-feedback-icon" aria-hidden="true"><img src="${levelIcon}" alt="" /></span>
          <strong class="eahome-hero-level-label">${escapeHtml(pm.levelLabel || "Foundation")}</strong>
        </div>
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
        <button class="eahome-cta-primary" type="button" data-category-detail="homework">
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

function renderCategoryModulesGrid(categoryKey, snapshot) {
  if (!snapshot.areas.length) return emptyCategory(CATEGORY_CONFIG[categoryKey].emptyFeedback);
  return snapshot.areas.map((module) => {
    const badge = moduleStatusBadge(module);
    return `
      <button class="eahome-module-card ${badge.cls}" type="button" data-category-detail="${escapeHtml(categoryKey)}">
        <span class="eahome-module-header">
          <span class="eahome-module-icon" aria-hidden="true"><img src="${escapeHtml(module.icon)}" alt="" /></span>
          <span class="eahome-module-title">${escapeHtml(module.label)}</span>
        </span>
        <strong class="eahome-module-pct">${module.questions ? `${module.percentage}%` : "—"}</strong>
        <span class="eahome-module-bar" aria-hidden="true"><i style="width:${module.questions ? module.percentage : 0}%"></i></span>
        <span class="eahome-module-badge">${badge.label}</span>
      </button>
    `;
  }).join("");
}

function moduleStatusBadge(area) {
  const label = area.levelLabel || "Foundation";
  return { cls: "is-level-" + label.toLowerCase(), label };
}

function renderEahomeModulesGrid(pm) {
  if (!pm.areas.length) return emptyCategory(CATEGORY_CONFIG.progress.emptyFeedback);
  return pm.areas.map((area) => {
    const badge = moduleStatusBadge(area);
    return `
      <button class="eahome-module-card ${badge.cls}" type="button" data-category-detail="progress" data-area="${escapeHtml(area.areaKey)}">
        <span class="eahome-module-header">
          <span class="eahome-module-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
          <span class="eahome-module-title">${escapeHtml(area.label)}</span>
        </span>
        <strong class="eahome-module-pct">${area.questions ? `${area.percentage}%` : "—"}</strong>
        <span class="eahome-module-bar" aria-hidden="true"><i style="width:${area.questions ? area.percentage : 0}%"></i></span>
        <span class="eahome-module-badge">${badge.label}</span>
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
    ? rounds.map((round) => `
        <button class="eahome-activity-row" type="button" data-category-detail="${round.source}">
          <span class="eahome-activity-check" aria-hidden="true">✓</span>
          <span class="eahome-activity-copy">
            <strong>${escapeHtml(sourceLabel(round.source))}${round.title ? ` · ${escapeHtml(round.title)}` : ""}</strong>
            <small>${escapeHtml(formatRelativeTime(round.completedAt))}${round.questions ? ` · ${Number(round.questions)} questions` : ""}</small>
          </span>
          <em class="${scoreClass(round.percentage, round.questions || 1)}">${Number(round.percentage || 0)}%</em>
        </button>
      `).join("")
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
  const weak = weakestArea(pm.areas);
  const nextStepTitle = weak ? `Revisit ${escapeHtml(weak.label)}` : "Get started";
  const isLevelStuck = weak && weak.level < MASTERING_LEVEL_INDEX && weak.percentage >= LEVEL_STUCK_ACCURACY_THRESHOLD;
  const nextStepBody = !pm.hasEvidence
    ? "Complete a Progress Mode round to see a personalised focus area here."
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

function renderCategoryRightColumn(categoryKey, progress) {
  return `
    ${categoryKey === "homework" ? renderHomeworkTasks(progress) : ""}
    <section class="eahome-side-card">
      ${renderEahomeRecentActivity(progress, categoryKey)}
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

function renderEahomeDashboard(progress) {
  const viewKey = DASHBOARD_VIEWS[state.activeView] ? state.activeView : "overall";
  const snapshot = viewKey === "overall" || viewKey === "progress"
    ? getProgressModeSnapshot()
    : getCategoryDashboardSnapshot(viewKey);
  updateDashboardChrome(viewKey);
  els.eahomeHero.innerHTML = renderEahomeHero(snapshot, viewKey);
  els.eahomeModulesGrid.innerHTML = viewKey === "overall" || viewKey === "progress"
    ? renderEahomeModulesGrid(snapshot)
    : renderCategoryModulesGrid(viewKey, snapshot);
  els.eahomeStatsRow.innerHTML = renderEahomeStatsRow(snapshot, viewKey);
  els.eahomeRightColumn.innerHTML = viewKey === "overall" || viewKey === "progress"
    ? renderEahomeRightColumn(snapshot, progress, viewKey)
    : renderCategoryRightColumn(viewKey, progress);
}

// ---------- Detailed feedback dialog ----------

function detailedCategoryMarkup(categoryKey, category) {
  const config = CATEGORY_CONFIG[categoryKey];
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  const feedbackText = hasEvidence ? overall.compiledFeedback : config.emptyFeedback;

  if (categoryKey === "homework") {
    return `
      <div class="homework-detail-placeholder-v5">
        <span class="homework-status-pill-v3">Coming next</span>
        <h3>No homework assigned</h3>
        <p>Teacher-set activities, deadlines, submitted scores and homework feedback will appear here when the homework system is added.</p>
      </div>
    `;
  }

  return `
    <div class="category-detail-overview-v5 student-category-detail-overview-v3">
      <div class="category-detail-score-v5 ${scoreClass(overall.percentage, overall.questions)}">
        <span>${escapeHtml(overall.level || "Not started")}</span>
        <strong>${hasEvidence ? `${Number(overall.percentage || 0)}%` : "—"}</strong>
        <small>${formatMark(overall.score)} / ${formatMark(overall.maximumScore)} marks</small>
      </div>

      <div class="category-detail-metrics-v5">
        <div><span>Questions</span><strong>${Number(overall.questions || 0)}</strong></div>
        <div><span>Rounds</span><strong>${Number(overall.rounds || 0)}</strong></div>
        <div><span>Apps started</span><strong>${Number(overall.modulesStarted || 0)} / 6</strong></div>
        <div><span>Learning area</span><strong>${escapeHtml(config.title)}</strong></div>
      </div>
    </div>

    <div class="category-detail-feedback-v5">
      <span>Compiled feedback</span>
      <p>${escapeHtml(feedbackText)}</p>
    </div>

    <section class="student-detail-section-v3">
      <div class="category-detail-section-heading-v5">
        <div><p class="card-eyebrow">All applications</p><h3>Scores and next steps</h3></div>
        ${config.actionHref ? `<a class="secondary-button student-detail-action-v3" href="${categoryActionHref(categoryKey, config)}">${escapeHtml(config.actionLabel)}</a>` : ""}
      </div>
      ${renderCategoryModules(categoryKey, category?.modules || [])}
    </section>

    <section class="student-detail-section-v3">
      <div class="category-detail-section-heading-v5">
        <div><p class="card-eyebrow">Learning memory</p><h3>Recent rounds</h3></div>
        <span>${escapeHtml(config.title)}</span>
      </div>
      ${renderRoundList(category?.recentRounds || [])}
    </section>

    <details class="category-details-v2 student-detail-questions-v3" open>
      <summary>Recent question feedback</summary>
      ${renderQuestionList(category?.recentQuestions || [])}
    </details>
  `;
}

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
// area" list in progressModeDetailMarkup() below, just scoped to one
// element's own apps instead of all six areas.
function elementDetailMarkup(areaKey) {
  const pm = getProgressModeSnapshot();
  const area = pm.areas.find((entry) => entry.areaKey === areaKey);
  if (!area) return emptyCategory("No evidence for this element yet.");

  const Drivers = window.EAProgressModeDrivers || {};
  const Feedback = window.EAProgressModeFeedback;

  const subAppKeys = Object.keys(Drivers)
    .filter((key) => Drivers[key].area === areaKey && (SUB_APP_ICONS[key] || SUB_APP_TILE_ICONS[key]));
  const vocab = VOCAB_SUB_APPS[areaKey];

  const subApps = subAppKeys.map((sourceKey) => {
    const combined = getCombinedSourceStats(sourceKey);
    const { correct, questions, percentage, quizModule } = combined;
    // Primary sentence, most-specific-available first:
    // 1. Concept-level (e.g. "you recognise first inversion chords well,
    //    but need to focus on extended chords") — only exists for the 5
    //    modules with clean concept data (accounts/account-server.js's
    //    byConcept); most sub-apps won't have this yet.
    // 2. Sub-app-level (SOURCE_PHRASES via buildSourceFeedback) — always
    //    available, names the actual skill rather than a bare percentage.
    // 3. Generic percentage fallback, for a sub-app with too little sample
    //    for either phrase bank yet.
    // When the Live Session server also has its own hand-authored,
    // data-derived sentence for this module (e.g. melody-master's
    // pitch-vs-contour analysis), append it as a second sentence rather
    // than discarding one or the other.
    const serverModuleId = PM_REGISTRY?.get(sourceKey)?.moduleId || null;
    const conceptStats = serverModuleId ? getCombinedConceptStats(serverModuleId) : {};
    const conceptFeedback = serverModuleId ? Feedback?.buildConceptFeedback(serverModuleId, conceptStats) : null;
    const primary = conceptFeedback
      || Feedback?.buildSourceFeedback(sourceKey, correct, questions)
      || (questions
        ? `${percentage}% accuracy across ${questions} mark${questions === 1 ? "" : "s"} so far.`
        : "No attempts yet — complete a round to start building feedback here.");
    const secondary = quizModule?.questions && quizModule.feedback ? ` ${quizModule.feedback}` : "";
    const feedbackText = primary + secondary;
    return {
      sourceKey,
      icon: SUB_APP_ICONS[sourceKey] || SUB_APP_TILE_ICONS[sourceKey],
      isTile: Boolean(SUB_APP_TILE_ICONS[sourceKey]),
      label: SUB_APP_SHORT_LABEL[sourceKey] || Drivers[sourceKey].label,
      fullLabel: Drivers[sourceKey].label,
      correct,
      questions,
      percentage,
      feedbackText
    };
  });

  // Musical Language's topics now blend in Live Session evidence too (via
  // the sourceKey-level breakdown — see getCombinedSourceStats), not just
  // Progress Mode marks, now that classroom/progress-recorder.js tags each
  // question with its specific topic instead of only the shared
  // "musical-language" moduleId.
  if (vocab) {
    const vocabStats = vocab.sourceKeys.map((key) => getCombinedSourceStats(key));
    const vocabCorrect = vocabStats.reduce((sum, entry) => sum + entry.correct, 0);
    const vocabQuestions = vocabStats.reduce((sum, entry) => sum + entry.questions, 0);
    const vocabPercentage = vocabQuestions ? Math.round((vocabCorrect / vocabQuestions) * 100) : 0;
    subApps.push({
      sourceKey: "vocab-" + areaKey,
      icon: VOCAB_ICON,
      isTile: true,
      label: "Vocabulary",
      fullLabel: vocab.label,
      correct: vocabCorrect,
      questions: vocabQuestions,
      percentage: vocabPercentage,
      feedbackText: vocabQuestions
        ? `${vocabPercentage}% accuracy across ${vocabQuestions} mark${vocabQuestions === 1 ? "" : "s"} so far.`
        : "No attempts yet — complete a round to start building feedback here."
    });
  }

  const subAppsHtml = subApps.length
    ? subApps.map((app) => {
        // The vocabulary icon (score-decoder.png) is a wide landscape image,
        // unlike every other tile source (all square) — object-fit:contain
        // would letterbox it down to a small centred blob with lots of flat
        // tile showing around it, which is also why the gradient looked
        // like it "wasn't there". pm-subapp-row-icon-vocab crops it to fill
        // the tile instead, same as the square ones already do.
        const iconHtml = app.isTile
          ? `<span class="pm-subapp-row-icon pm-subapp-row-icon-tile${app.sourceKey.startsWith("vocab-") ? " pm-subapp-row-icon-vocab" : ""}"><img src="${escapeHtml(app.icon)}" alt="" /></span>`
          : `<span class="pm-subapp-row-icon"><img src="${escapeHtml(app.icon)}" alt="" /></span>`;
        return `
        <div class="pm-subapp-row">
          ${iconHtml}
          <div class="pm-subapp-row-body">
            <div class="pm-subapp-row-main">
              <span class="pm-subapp-row-label" title="${escapeHtml(app.fullLabel)}">${escapeHtml(app.label)}</span>
              <span class="pm-subapp-row-bar"><i style="width:${app.questions ? app.percentage : 0}%"></i></span>
              <strong class="pm-subapp-row-pct">${app.questions ? `${app.percentage}%` : "—"}</strong>
            </div>
            <p class="pm-subapp-row-feedback">${escapeHtml(app.feedbackText)}</p>
          </div>
        </div>
      `;
      }).join("")
    : `<p class="pm-callout-empty">No apps found for ${escapeHtml(area.label)}.</p>`;

  // The header's summary line is Progress Mode's own tracked level for
  // this area (the real, levelled metric) — distinct from the per-app
  // blended scores below, which pull from all three modes.
  const toolbarMeta = area.questions
    ? `${area.percentage}% overall · ${escapeHtml(area.levelLabel)}`
    : "No evidence yet";

  return `
    <div class="pm-detail">
      <div class="pm-element-columns">
        <section class="pm-panel pm-element-header">
          <span class="pm-element-header-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
          <div class="pm-element-header-copy">
            <strong class="pm-element-header-title">${escapeHtml(area.label)}</strong>
            <span class="pm-element-header-meta">${toolbarMeta}</span>
          </div>
        </section>
        <section class="pm-panel">
          <div class="pm-section-heading"><h3>Performance by app</h3></div>
          <div class="pm-area-list" data-area="${escapeHtml(areaKey)}">${subAppsHtml}</div>
        </section>
      </div>
    </div>
  `;
}

function progressModeDetailMarkup() {
  const Store = window.EAProgressModeStore;
  const AreaOrder = window.EAProgressModeAreaOrder;

  if (!Store || !AreaOrder || !state.student) {
    return emptyCategory(CATEGORY_CONFIG.progress.emptyFeedback);
  }

  const pm = getProgressModeSnapshot();
  if (!pm.hasEvidence) {
    return emptyCategory(CATEGORY_CONFIG.progress.emptyFeedback);
  }

  const studentId = state.student.id;
  const overallLevelIcon = PM_DETAIL_LEVEL_ICONS[pm.levelLabel] || PM_DETAIL_LEVEL_ICONS.Foundation;

  const areaRows = pm.areas.map((area) => `
    <div class="pm-area-row" data-area="${escapeHtml(area.areaKey)}">
      <span class="pm-area-row-icon" aria-hidden="true"><img src="${escapeHtml(area.icon)}" alt="" /></span>
      <span class="pm-area-row-label">${escapeHtml(area.label)}</span>
      <span class="pm-area-row-bar"><i style="width:${area.questions ? area.percentage : 0}%"></i></span>
      <strong class="pm-area-row-pct">${area.questions ? `${area.percentage}%` : "—"}</strong>
    </div>
  `).join("");

  const doingWell = strongestAreas(pm.areas, 2).filter((area) => area.percentage >= 60);
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

  const weak = weakestArea(pm.areas);
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

  const Drivers = window.EAProgressModeDrivers;
  const recentHistory = typeof Store.getRecentHistory === "function"
    ? Store.getRecentHistory(studentId, Object.keys(Drivers || {}), 6)
    : [];
  const recentHtml = recentHistory.length
    ? recentHistory.map((entry) => `
        <div class="pm-evidence-row">
          <span class="pm-evidence-icon" aria-hidden="true">▶</span>
          <div class="pm-evidence-copy">
            <strong>Progress Mode · ${escapeHtml(Drivers?.[entry.sourceKey]?.label || entry.sourceKey)}</strong>
            <small>${escapeHtml(formatRelativeTime(entry.timestamp))}</small>
          </div>
          <strong class="pm-evidence-pct">${entry.percentage}%</strong>
        </div>
      `).join("")
    : `<p class="pm-callout-empty">Your recent rounds will appear here.</p>`;

  return `
    <div class="pm-detail">
      <header class="pm-detail-toolbar">
        <div class="pm-toolbar-left">
          <div class="pm-toolbar-segment pm-toolbar-level">
            <span class="pm-toolbar-icon" aria-hidden="true"><img src="${escapeHtml(overallLevelIcon)}" alt="" /></span>
            <div class="pm-toolbar-copy">
              <strong class="pm-toolbar-level-label">${escapeHtml(pm.levelLabel)}</strong>
              <span class="pm-toolbar-meta">${pm.rounds} round${pm.rounds === 1 ? "" : "s"} · ${pm.correct}/${pm.questions} marks · ${pm.areasStarted}/${AreaOrder.length} areas</span>
            </div>
          </div>
        </div>

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
        </div>
      </header>

      <div class="pm-detail-columns">
        <div class="pm-detail-main-col">
          <section class="pm-panel">
            <h3>Performance by listening area</h3>
            <div class="pm-area-list">${areaRows}</div>
          </section>

          <section class="pm-panel">
            <div class="pm-section-heading">
              <h3>Recent evidence</h3>
            </div>
            <div class="pm-evidence-list">${recentHtml}</div>
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

function openCategoryDetail(categoryKey, areaKey) {
  const config = CATEGORY_CONFIG[categoryKey];
  if (!config || !state.progress) return;

  // Clicking a "Your learning modules" card passes its area — that scopes
  // the popup down to one musical element's evidence across all three
  // modes, instead of the full multi-area Progress Mode breakdown.
  const isElementDetail = categoryKey === "progress" && Boolean(areaKey);
  const isProgressDetail = categoryKey === "progress";

  const categories = state.progress.categories || {};
  const category = categoryKey === "homework"
    ? (categories.homework || { overall: {} })
    : (categories[categoryKey] || { overall: {}, modules: [], recentRounds: [], recentQuestions: [] });

  els.categoryDialog.classList.toggle("is-pm-detail", isProgressDetail);
  els.categoryDialog.classList.toggle("is-element-detail", isElementDetail);
  els.categoryDetailEyebrow.textContent = config.eyebrow;
  els.categoryDetailTitle.textContent = config.title;
  els.categoryDetailSubtitle.textContent = config.detailSubtitle;
  els.categoryDetailIcon?.style.setProperty("--ea-icon", `url('${config.icon}')`);
  // Progress Mode's own brand mark (icon + two-tone "ProgressMode"
  // wordmark) lives centred in the dialog's heading strip instead of
  // inside the panel below. For a single element, that identity now lives
  // in the merged .pm-element-header panel instead, so the heading strip
  // above it stays empty — just the close button. Cleared for every other
  // category too, where the generic title-wrap above already covers it.
  if (els.pmHeadingBrand) {
    els.pmHeadingBrand.innerHTML = isProgressDetail && !isElementDetail
      ? `<span class="pm-heading-brand-icon" aria-hidden="true"><img src="${escapeHtml(config.icon)}" alt="" /></span>
         <strong class="pm-heading-brand-title"><span class="pm-detail-brand-main">Progress</span><span class="pm-detail-brand-mode">Mode</span></strong>`
      : "";
  }
  els.categoryDetailContent.innerHTML = isElementDetail
    ? elementDetailMarkup(areaKey)
    : isProgressDetail
      ? progressModeDetailMarkup()
      : detailedCategoryMarkup(categoryKey, category);
  els.categoryDialog.showModal();
}

async function loadProgress(showStatus = false) {
  if (showStatus) els.progressStatus.textContent = "Refreshing your results…";
  const progress = normaliseProgressData(await api("/api/student/progress"));
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
