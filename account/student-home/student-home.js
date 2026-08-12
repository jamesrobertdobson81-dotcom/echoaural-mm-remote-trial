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
  Foundation: "/assets/icons/levels/foundation.png",
  Developing: "/assets/icons/levels/developing.png",
  Securing: "/assets/icons/levels/securing.png",
  Mastering: "/assets/icons/levels/mastering.png"
};

/* Light-blue (mode-icon) level logos — Progress Mode detailed feedback only. */
const PM_DETAIL_LEVEL_ICONS = {
  Foundation: "/assets/icons/levels/pm-detail/foundation.png?v=2",
  Developing: "/assets/icons/levels/pm-detail/developing.png?v=2",
  Securing: "/assets/icons/levels/pm-detail/securing.png?v=2",
  Mastering: "/assets/icons/levels/pm-detail/mastering.png?v=2"
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

const state = {
  progress: null,
  student: null
};

const els = {
  overallLevel: document.getElementById("overallLevel"),
  overallPercentage: document.getElementById("overallPercentage"),
  overallScore: document.getElementById("overallScore"),
  overallQuestions: document.getElementById("overallQuestions"),
  overallRounds: document.getElementById("overallRounds"),
  overallModules: document.getElementById("overallModules"),
  compiledFeedback: document.getElementById("compiledFeedback"),
  studentNextStep: document.getElementById("studentNextStep"),
  recentLearningList: document.getElementById("recentLearningList"),
  progressStatus: document.getElementById("progressStatus"),
  categoryDialog: document.getElementById("studentCategoryDetailDialog"),
  categoryDetailEyebrow: document.getElementById("studentCategoryDetailEyebrow"),
  categoryDetailTitle: document.getElementById("studentCategoryDetailTitle"),
  categoryDetailSubtitle: document.getElementById("studentCategoryDetailSubtitle"),
  categoryDetailIcon: document.getElementById("studentCategoryDetailIcon"),
  categoryDetailContent: document.getElementById("studentCategoryDetailContent")
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

function scoreClass(percentage, questions) {
  if (!questions) return "is-empty";
  if (percentage >= 85) return "is-secure";
  if (percentage >= 70) return "is-strong";
  if (percentage >= 50) return "is-developing";
  return "is-focus";
}

function sourceLabel(source) {
  if (source === "progress") return "Progress";
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

function summaryMarkup(categoryKey, category) {
  const config = CATEGORY_CONFIG[categoryKey];
  const iconMarkup = `<span class="student-dashboard-line-icon-v3" style="--ea-icon:url('${config.icon}')" aria-hidden="true"></span>`;
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  const feedbackText = hasEvidence ? overall.compiledFeedback : config.emptyFeedback;

  if (categoryKey === "homework") {
    return `
      <div class="student-learning-summary-heading-v3">
        <div class="student-learning-icon-slot-v3" aria-hidden="true">${iconMarkup}</div>
        <div class="student-learning-title-v3">
          <p id="studentHomeworkHeading">${escapeHtml(config.eyebrow)}</p>
          <h3>${escapeHtml(config.title)}</h3>
        </div>
        <strong class="student-learning-percentage-v3 is-empty">—</strong>
      </div>
      <div class="student-learning-feedback-v3">
        <span>Coming next</span>
        <p>${escapeHtml(config.emptyFeedback)}</p>
      </div>
      <div class="student-learning-footer-v3">
        <span>Assignments, deadlines and submitted scores</span>
        <button class="secondary-button student-detail-button-v3" type="button" data-category-detail="homework">Details</button>
      </div>
    `;
  }

  return `
    <div class="student-learning-summary-heading-v3">
      <div class="student-learning-icon-slot-v3" aria-hidden="true">${iconMarkup}</div>
      <div class="student-learning-title-v3">
        <p id="${categoryHeadingId(categoryKey)}">${escapeHtml(config.eyebrow)}</p>
        <h3>${escapeHtml(config.title)}</h3>
      </div>
      <strong class="student-learning-percentage-v3 ${scoreClass(overall.percentage, overall.questions)}">${hasEvidence ? `${Number(overall.percentage || 0)}%` : "—"}</strong>
    </div>

    <div class="student-learning-feedback-v3">
      <span>My feedback</span>
      <p>${escapeHtml(feedbackText)}</p>
    </div>

    <div class="student-learning-footer-v3">
      <span>${Number(overall.questions || 0)} questions · ${Number(overall.rounds || 0)} rounds · ${Number(overall.modulesStarted || 0)} / 6 apps</span>
      <button class="secondary-button student-detail-button-v3" type="button" data-category-detail="${categoryKey}">Detailed feedback</button>
    </div>
  `;
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

// Progress Mode's own summary tile — reads modules/progress-mode/'s real
// localStorage data directly (see progressModeDetailMarkup below for the
// same pattern, in more detail) rather than the server-side `categories`
// object, which no longer carries a "progress" entry (that used to be an
// unrelated, differently-labelled legacy system — see account-server.js's
// buildProgressCategories). A small amount of duplication with
// progressModeDetailMarkup's own data gathering is deliberate: this tile
// only needs a handful of totals, not the full per-area/per-source detail.
function progressModeSummaryMarkup() {
  const config = CATEGORY_CONFIG.progress;
  const iconMarkup = `<span class="student-dashboard-line-icon-v3" style="--ea-icon:url('${config.icon}')" aria-hidden="true"></span>`;

  const Store = window.EAProgressModeStore;
  const Drivers = window.EAProgressModeDrivers;
  const AreaOrder = window.EAProgressModeAreaOrder;
  let hasEvidence = false;
  let percentage = 0;
  let questions = 0;
  let rounds = 0;
  let areasStarted = 0;
  let levelLabel = "";

  if (Store && Drivers && AreaOrder && state.student) {
    const snapshot = Store.getSnapshot(state.student.id, AreaOrder);
    if (snapshot.roundsCompleted) {
      const cumulative = Store.getCumulativeStats(state.student.id, Object.keys(Drivers));
      let correct = 0;
      Object.keys(Drivers).forEach((sourceKey) => {
        correct += cumulative[sourceKey].correct;
        questions += cumulative[sourceKey].questions;
      });
      areasStarted = AreaOrder.filter((areaKey) =>
        Object.keys(Drivers).some((sourceKey) => Drivers[sourceKey].area === areaKey && cumulative[sourceKey].questions > 0)
      ).length;
      rounds = snapshot.roundsCompleted;
      hasEvidence = questions > 0;
      percentage = hasEvidence ? Math.round((correct / questions) * 100) : 0;
      levelLabel = snapshot.overallLevelLabel;
    }
  }

  const feedbackText = hasEvidence
    ? `${levelLabel} overall, ${areasStarted} / ${AreaOrder.length} musical areas started.`
    : config.emptyFeedback;

  return `
    <div class="student-learning-summary-heading-v3">
      <div class="student-learning-icon-slot-v3" aria-hidden="true">${iconMarkup}</div>
      <div class="student-learning-title-v3">
        <p id="${categoryHeadingId("progress")}">${escapeHtml(config.eyebrow)}</p>
        <h3>${escapeHtml(config.title)}</h3>
      </div>
      <strong class="student-learning-percentage-v3 ${scoreClass(percentage, hasEvidence ? questions : 0)}">${hasEvidence ? `${percentage}%` : "—"}</strong>
    </div>

    <div class="student-learning-feedback-v3">
      <span>My feedback</span>
      <p>${escapeHtml(feedbackText)}</p>
    </div>

    <div class="student-learning-footer-v3">
      <span>${hasEvidence ? `${questions} questions · ${rounds} rounds · ${areasStarted} / ${AreaOrder.length} areas` : "0 questions · 0 rounds · 0 areas"}</span>
      <button class="secondary-button student-detail-button-v3" type="button" data-category-detail="progress">Detailed feedback</button>
    </div>
  `;
}

function renderCategorySummaries(progress) {
  const categories = progress.categories;

  document.getElementById("studentProgressModeContent").innerHTML = progressModeSummaryMarkup();
  document.getElementById("studentQuizContent").innerHTML = summaryMarkup("quizzes", categories.quizzes);
  document.getElementById("studentHomeworkContent").innerHTML = summaryMarkup("homework", categories.homework || { overall: {} });
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
// its "Detailed feedback" is built here by calling directly into its own
// store.js/app-drivers.js/feedback.js instead of using `category`.
function progressModeDetailMarkup() {
  const Store = window.EAProgressModeStore;
  const Drivers = window.EAProgressModeDrivers;
  const AreaOrder = window.EAProgressModeAreaOrder;
  const AreaLabels = window.EAProgressModeAreaLabels;
  const AreaIcons = window.EAProgressModeAreaIcons || {};
  const Feedback = window.EAProgressModeFeedback;

  if (!Store || !Drivers || !AreaOrder || !AreaLabels || !Feedback || !state.student) {
    return emptyCategory(CATEGORY_CONFIG.progress.emptyFeedback);
  }

  const studentId = state.student.id;
  const snapshot = Store.getSnapshot(studentId, AreaOrder);

  if (!snapshot.roundsCompleted) {
    return emptyCategory(CATEGORY_CONFIG.progress.emptyFeedback);
  }

  const areaToSources = {};
  AreaOrder.forEach((areaKey) => { areaToSources[areaKey] = []; });
  Object.keys(Drivers).forEach((sourceKey) => { areaToSources[Drivers[sourceKey].area].push(sourceKey); });

  const cumulative = Store.getCumulativeStats(studentId, Object.keys(Drivers));
  let totalCorrect = 0;
  let totalQuestions = 0;

  const tiles = AreaOrder.map((areaKey) => {
    const sources = areaToSources[areaKey];
    let correct = 0;
    let questions = 0;
    sources.forEach((sourceKey) => {
      correct += cumulative[sourceKey].correct;
      questions += cumulative[sourceKey].questions;
    });
    totalCorrect += correct;
    totalQuestions += questions;

    const areaState = snapshot.areas[areaKey];
    const tracksConcepts = sources.some((sourceKey) => Boolean(Drivers[sourceKey].getSignature));
    const overallProgress = Store.getAreaOverallProgressPercentage(studentId, areaKey, tracksConcepts);
    const feedback = Feedback.buildAreaFeedback(
      Store,
      studentId,
      areaKey,
      sources,
      AreaLabels[areaKey]
    );
    const detailText = typeof feedback === "string"
      ? feedback
      : (feedback?.detail || feedback?.text || "");
    const iconSrc = AreaIcons[areaKey] || DASHBOARD_ICONS.progress;

    const metaParts = [`${correct}/${questions} marks`];
    if (areaState.level < Store.LEVEL_IDS.length - 1) {
      metaParts.push(`${questions ? Math.round((correct / questions) * 100) : 0}% accuracy`);
    }

    // Per-source breakdown, not just the pooled area figure above — a
    // pooled average can hide one genuinely weak sub-skill behind several
    // strong ones (this is also what floor-gates level advancement now, see
    // store.js), so showing it here lets a student see exactly which
    // sub-skill within the area needs the work, not just that the area as a
    // whole is "Developing".
    const sourceRows = sources
      .filter((sourceKey) => cumulative[sourceKey].questions > 0)
      .map((sourceKey) => {
        const stat = cumulative[sourceKey];
        return `
          <li>
            <span>${escapeHtml(Drivers[sourceKey].label)}</span>
            <strong>${stat.correct}/${stat.questions} · ${stat.percentage}%</strong>
          </li>
        `;
      })
      .join("");

    return `
      <article class="pm-detail-tile" data-area="${escapeHtml(areaKey)}">
        <div class="pm-detail-tile-top">
          <span class="pm-detail-icon" aria-hidden="true"><img src="${escapeHtml(iconSrc)}" alt="" /></span>
          <div class="pm-detail-tile-copy">
            <h4>${escapeHtml(AreaLabels[areaKey])}</h4>
            <small>${escapeHtml(metaParts.join(" · "))}</small>
          </div>
          <span class="pm-detail-level">${escapeHtml(areaState.levelLabel)}</span>
        </div>
        <div class="pm-detail-bar" aria-hidden="true"><i style="width:${overallProgress}%"></i></div>
        ${detailText ? `<p class="pm-detail-feedback-focus">${escapeHtml(detailText)}</p>` : ""}
        ${sourceRows ? `<ul class="pm-detail-sources">${sourceRows}</ul>` : ""}
      </article>
    `;
  }).join("");

  const areasStarted = AreaOrder.filter((areaKey) =>
    areaToSources[areaKey].some((sourceKey) => cumulative[sourceKey].questions > 0)
  ).length;
  const overallLevelIcon = PM_DETAIL_LEVEL_ICONS[snapshot.overallLevelLabel] || PM_DETAIL_LEVEL_ICONS.Foundation;
  const progressModeIcon = DASHBOARD_ICONS.progress;

  return `
    <div class="pm-detail">
      <header class="pm-detail-overall">
        <div class="pm-detail-brand">
          <span class="pm-detail-brand-icon" aria-hidden="true"><img src="${escapeHtml(progressModeIcon)}" alt="" /></span>
          <div class="pm-detail-brand-copy">
            <span class="pm-detail-brand-eyebrow">Levelled learning</span>
            <strong class="pm-detail-brand-title"><span class="pm-detail-brand-main">Progress</span><span class="pm-detail-brand-mode">Mode</span></strong>
          </div>
        </div>
        <div class="pm-detail-overall-status">
          <span class="pm-detail-overall-icon" aria-hidden="true"><img src="${escapeHtml(overallLevelIcon)}" alt="" /></span>
          <div class="pm-detail-overall-copy">
            <strong class="pm-detail-overall-level">${escapeHtml(snapshot.overallLevelLabel)}</strong>
            <small class="pm-detail-overall-meta">${snapshot.roundsCompleted} round${snapshot.roundsCompleted === 1 ? "" : "s"} · ${totalCorrect} / ${totalQuestions} marks · ${areasStarted} / ${AreaOrder.length} areas started</small>
          </div>
        </div>
      </header>

      <section class="pm-detail-areas" aria-label="Levels and feedback by musical area">
        <div class="pm-detail-areas-heading">
          <div>
            <p class="pm-detail-eyebrow">By musical area</p>
            <h3>Levels and feedback</h3>
          </div>
          <a class="pm-detail-action" href="${categoryActionHref("progress", CATEGORY_CONFIG.progress)}">Start Progress Mode</a>
        </div>
        <div class="pm-detail-grid">${tiles}</div>
      </section>
    </div>
  `;
}

function openCategoryDetail(categoryKey) {
  const config = CATEGORY_CONFIG[categoryKey];
  if (!config || !state.progress) return;

  const categories = state.progress.categories || {};
  const category = categoryKey === "homework"
    ? (categories.homework || { overall: {} })
    : (categories[categoryKey] || { overall: {}, modules: [], recentRounds: [], recentQuestions: [] });

  const isProgressDetail = categoryKey === "progress";
  els.categoryDialog.classList.toggle("is-pm-detail", isProgressDetail);
  els.categoryDetailEyebrow.textContent = config.eyebrow;
  els.categoryDetailTitle.textContent = config.title;
  els.categoryDetailSubtitle.textContent = config.detailSubtitle;
  els.categoryDetailIcon?.style.setProperty("--ea-icon", `url('${config.icon}')`);
  els.categoryDetailContent.innerHTML = isProgressDetail
    ? progressModeDetailMarkup()
    : detailedCategoryMarkup(categoryKey, category);
  els.categoryDialog.showModal();
}

function chooseNextStep(progress) {
  const categories = progress.categories || {};
  const modules = [
    ...(categories.quizzes?.modules || [])
  ].filter((module) => Number(module.questions || 0) > 0);

  if (!modules.length) return "Choose an app and complete your first listening round.";

  modules.sort((a, b) => Number(a.percentage || 0) - Number(b.percentage || 0));
  const focus = modules[0];
  return `${focus.title}: ${focus.nextStep || "Complete another focused round."}`;
}

function renderRecentLearning(progress) {
  const categories = progress.categories || {};
  const rounds = [
    ...(categories.quizzes?.recentRounds || []).map((round) => ({ ...round, source: "quizzes" }))
  ]
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .slice(0, 6);

  if (!rounds.length) {
    els.recentLearningList.innerHTML = '<div class="student-memory-empty-v3">Your completed rounds will appear here.</div>';
    return;
  }

  els.recentLearningList.innerHTML = rounds.map((round) => `
    <button class="student-memory-row-v3" type="button" data-category-detail="${round.source}">
      <span class="student-memory-source-v3">${escapeHtml(sourceLabel(round.source))}</span>
      <strong>${escapeHtml(round.title)}</strong>
      <small>${escapeHtml(formatDateTime(round.completedAt))} · ${Number(round.questions || 0)} questions</small>
      <em class="${scoreClass(round.percentage, round.questions)}">${Number(round.percentage || 0)}%</em>
    </button>
  `).join("");
}

function renderOverall(progress) {
  const overall = progress.overall;
  els.overallLevel.textContent = overall.level;
  els.overallPercentage.textContent = overall.questions ? `${overall.percentage}%` : "—";
  els.overallScore.textContent = `${formatMark(overall.score)} / ${formatMark(overall.maximumScore)} marks`;
  els.overallQuestions.textContent = String(overall.questions);
  els.overallRounds.textContent = String(overall.rounds);
  els.overallModules.textContent = `${overall.modulesStarted} / 6`;
  els.compiledFeedback.textContent = overall.compiledFeedback;
  els.studentNextStep.textContent = chooseNextStep(progress);
  renderRecentLearning(progress);
}

async function loadProgress(showStatus = false) {
  if (showStatus) els.progressStatus.textContent = "Refreshing your results…";
  const progress = normaliseProgressData(await api("/api/student/progress"));
  state.progress = progress;
  renderOverall(progress);
  renderCategorySummaries(progress);
  els.progressStatus.textContent = showStatus ? "Results refreshed." : "";
}

(async () => {
  try {
    const current = await api("/api/auth/me?role=student");
    if (current.role !== "student") throw new Error("Student login required.");
    state.student = current.student;
    document.getElementById("studentHeroName").textContent = `${current.student.displayName}.`;
    document.getElementById("studentAccountName").textContent = current.student.displayName;
    document.getElementById("studentTeacherName").textContent = current.student.teacherName;
    document.getElementById("studentTeacherCode").textContent = current.student.teacherCode;
    document.getElementById("progressModeLink").href = categoryActionHref("progress", CATEGORY_CONFIG.progress);
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

document.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-category-detail]");
  if (detailButton) openCategoryDetail(detailButton.dataset.categoryDetail);
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
