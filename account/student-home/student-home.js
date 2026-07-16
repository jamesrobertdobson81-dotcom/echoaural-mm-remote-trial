"use strict";

const { api, escapeHtml } = window.EchoAuralAccounts;

const moduleLinks = {
  "melody-master": "/modules/melody-master/",
  "melodic-intervals": "/modules/melodic-intervals/",
  "instrument-identifier": "/modules/instrument-identifier/",
  "texture-trainer": "/modules/texture-trainer/"
};

const DASHBOARD_ICONS = {
  practice: "/assets/icons/dashboard/practice-mode.svg",
  progress: "/assets/icons/dashboard/progress-mode.svg",
  quizzes: "/assets/icons/dashboard/join-live-session.svg",
  homework: "/assets/icons/dashboard/homework.svg"
};

const CATEGORY_CONFIG = {
  progress: {
    title: "Progress Mode",
    icon: DASHBOARD_ICONS.progress,
    eyebrow: "Levelled learning",
    subtitle: "Foundation, Developing, Securing and Mastering progress.",
    detailSubtitle: "Your levelled app scores, saved rounds and question feedback.",
    emptyFeedback: "Complete a Progress Mode round to begin your levelled record."
  },
  practice: {
    title: "Practice Mode",
    icon: DASHBOARD_ICONS.practice,
    eyebrow: "Independent learning",
    subtitle: "Time spent practising independently.",
    detailSubtitle: "Your logged EchoAural practice time.",
    emptyFeedback: "Open Practice Mode while logged in to start logging time.",
    actionLabel: "Practise II",
    actionHref: "/modules/instrument-identifier/?eaMode=practice&eaDashboard=/account/student-home/"
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

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  if (!totalSeconds) return "0 min";
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
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
  if (source === "homework") return "Homework";
  return "Practice Mode";
}

function categoryHeadingId(categoryKey) {
  if (categoryKey === "progress") return "studentProgressModeHeading";
  if (categoryKey === "practice") return "studentPracticeHeading";
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
        const practiceSeconds = Number(module.practiceSeconds || 0);
        const progressionLabel = categoryKey === "progress" ? progressionLevelLabel(module) : "";
        const moduleMeta = module.questions
          ? `${module.questions} questions · ${module.rounds} rounds`
          : practiceSeconds
            ? `${formatDuration(practiceSeconds)} practice · no scored results`
            : "Not started";
        const emptyNextStep = practiceSeconds
          ? "Practice time logged. Progress results will appear after a progress round."
          : "Complete a first round to begin.";
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
            <p>${escapeHtml(module.questions ? module.nextStep : emptyNextStep)}</p>
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
  const practiceSeconds = categoryKey === "practice" ? Number(overall.practiceSeconds || 0) : 0;
  const practiceSessions = Number(overall.practiceSessions || 0);
  const practiceTimeText = practiceSeconds ? ` · ${formatDuration(practiceSeconds)} practice` : "";
  const feedbackText = hasEvidence
    ? overall.compiledFeedback
    : practiceSeconds
      ? "Practice time has been logged. Progress results are kept in Progress Mode."
      : config.emptyFeedback;

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

  if (categoryKey === "practice") {
    return `
      <div class="student-learning-summary-heading-v3">
        <div class="student-learning-icon-slot-v3" aria-hidden="true">${iconMarkup}</div>
        <div class="student-learning-title-v3">
          <p id="${categoryHeadingId(categoryKey)}">${escapeHtml(config.eyebrow)}</p>
          <h3>${escapeHtml(config.title)}</h3>
        </div>
        <strong class="student-learning-percentage-v3 is-empty">${escapeHtml(formatDuration(practiceSeconds))}</strong>
      </div>

      <div class="student-learning-feedback-v3">
        <span>Time spent</span>
        <p>${escapeHtml(practiceSeconds ? "Practice Mode time is logged without saving scores to your progress record." : config.emptyFeedback)}</p>
      </div>

      <div class="student-learning-footer-v3">
        <span>${practiceSessions} session${practiceSessions === 1 ? "" : "s"} · time only</span>
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
      <span>${Number(overall.questions || 0)} questions · ${Number(overall.rounds || 0)} rounds${practiceTimeText} · ${Number(overall.modulesStarted || 0)} / 4 apps</span>
      <button class="secondary-button student-detail-button-v3" type="button" data-category-detail="${categoryKey}">Detailed feedback</button>
    </div>
  `;
}

function emptyLearningCategory() {
  return { overall: {}, modules: [], recentRounds: [], recentQuestions: [] };
}

function categoryHasScoredEvidence(category) {
  const overall = category?.overall || {};
  return (
    Number(overall.questions || 0) > 0 ||
    Number(overall.maximumScore || 0) > 0 ||
    (category?.modules || []).some((module) => Number(module.questions || 0) > 0) ||
    (category?.recentRounds || []).some((round) => Number(round.questions || 0) > 0)
  );
}

function practiceTimeOnlyCategory(category) {
  const overall = category?.overall || {};
  const practiceSeconds = Number(overall.practiceSeconds || 0);
  const practiceSessions = Number(overall.practiceSessions || 0);

  return {
    overall: {
      score: 0,
      maximumScore: 0,
      percentage: 0,
      rounds: 0,
      questions: 0,
      practiceSeconds,
      practiceSessions,
      modulesStarted: 0,
      level: "Not started",
      compiledFeedback: practiceSeconds
        ? "Practice Mode time is logged without saving scores to your progress record."
        : CATEGORY_CONFIG.practice.emptyFeedback
    },
    modules: (category?.modules || []).map((module) => ({
      ...module,
      score: 0,
      maximumScore: 0,
      percentage: 0,
      rounds: 0,
      questions: 0,
      level: "Not started",
      strength: "No scored practice record",
      nextStep: Number(module.practiceSeconds || 0)
        ? "Practice time logged. Progress results will appear after a progress round."
        : "Open Practice Mode while logged in to start logging time.",
      feedback: Number(module.practiceSeconds || 0)
        ? "Practice time logged without saved scores."
        : CATEGORY_CONFIG.practice.emptyFeedback
    })),
    recentRounds: [],
    recentQuestions: []
  };
}

function normaliseProgressData(progress) {
  const rawCategories = progress.categories || {};
  const hasExplicitProgressCategory = Object.prototype.hasOwnProperty.call(rawCategories, "progress");
  const categories = {
    progress: rawCategories.progress || emptyLearningCategory(),
    practice: rawCategories.practice || progress || emptyLearningCategory(),
    quizzes: rawCategories.quizzes || emptyLearningCategory(),
    homework: rawCategories.homework || { overall: {} }
  };

  if (!hasExplicitProgressCategory && categoryHasScoredEvidence(categories.practice)) {
    categories.progress = categories.practice;
    categories.practice = practiceTimeOnlyCategory(categories.practice);
  }

  return { ...progress, categories };
}

function renderCategorySummaries(progress) {
  const categories = progress.categories;

  document.getElementById("studentProgressModeContent").innerHTML = summaryMarkup("progress", categories.progress || { overall: {} });
  document.getElementById("studentPracticeContent").innerHTML = summaryMarkup("practice", categories.practice);
  document.getElementById("studentQuizContent").innerHTML = summaryMarkup("quizzes", categories.quizzes);
  document.getElementById("studentHomeworkContent").innerHTML = summaryMarkup("homework", categories.homework || { overall: {} });
}

function detailedCategoryMarkup(categoryKey, category) {
  const config = CATEGORY_CONFIG[categoryKey];
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  const practiceSeconds = categoryKey === "practice" ? Number(overall.practiceSeconds || 0) : 0;
  const feedbackText = hasEvidence
    ? overall.compiledFeedback
    : practiceSeconds
      ? "Practice time has been logged. Progress results will appear after a progress round."
      : config.emptyFeedback;

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
        <div><span>Apps started</span><strong>${Number(overall.modulesStarted || 0)} / 4</strong></div>
        <div><span>${categoryKey === "practice" ? "Practice time" : "Learning area"}</span><strong>${categoryKey === "practice" ? escapeHtml(formatDuration(overall.practiceSeconds)) : escapeHtml(config.title)}</strong></div>
      </div>
    </div>

    <div class="category-detail-feedback-v5">
      <span>Compiled feedback</span>
      <p>${escapeHtml(feedbackText)}</p>
    </div>

    <section class="student-detail-section-v3">
      <div class="category-detail-section-heading-v5">
        <div><p class="card-eyebrow">All applications</p><h3>Scores and next steps</h3></div>
        ${config.actionHref ? `<a class="secondary-button student-detail-action-v3" href="${config.actionHref}">${escapeHtml(config.actionLabel)}</a>` : ""}
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

function openCategoryDetail(categoryKey) {
  const config = CATEGORY_CONFIG[categoryKey];
  if (!config || !state.progress) return;

  const categories = state.progress.categories || {};
  const category = categoryKey === "homework"
    ? (categories.homework || { overall: {} })
    : (categories[categoryKey] || { overall: {}, modules: [], recentRounds: [], recentQuestions: [] });

  els.categoryDetailEyebrow.textContent = config.eyebrow;
  els.categoryDetailTitle.textContent = config.title;
  els.categoryDetailSubtitle.textContent = config.detailSubtitle;
  els.categoryDetailIcon?.style.setProperty("--ea-icon", `url('${config.icon}')`);
  els.categoryDetailContent.innerHTML = detailedCategoryMarkup(categoryKey, category);
  els.categoryDialog.showModal();
}

function chooseNextStep(progress) {
  const categories = progress.categories || {};
  const modules = [
    ...(categories.progress?.modules || []),
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
    ...(categories.progress?.recentRounds || []).map((round) => ({ ...round, source: "progress" })),
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
  els.overallModules.textContent = `${overall.modulesStarted} / 4`;
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

function closeStudentAppMenus(exceptButton = null) {
  document.querySelectorAll("[data-student-app-menu-button]").forEach((button) => {
    if (button === exceptButton) return;
    button.setAttribute("aria-expanded", "false");
    const menu = document.getElementById(button.getAttribute("aria-controls"));
    if (menu) menu.hidden = true;
  });
}

function toggleStudentAppMenu(button) {
  const menu = document.getElementById(button.getAttribute("aria-controls"));
  if (!menu) return;
  const willOpen = button.getAttribute("aria-expanded") !== "true";
  closeStudentAppMenus(button);
  button.setAttribute("aria-expanded", String(willOpen));
  menu.hidden = !willOpen;
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
  const menuButton = event.target.closest("[data-student-app-menu-button]");
  if (menuButton) {
    toggleStudentAppMenu(menuButton);
    return;
  }

  if (!event.target.closest(".student-action-wrap-v3")) {
    closeStudentAppMenus();
  }

  const detailButton = event.target.closest("[data-category-detail]");
  if (detailButton) openCategoryDetail(detailButton.dataset.categoryDetail);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeStudentAppMenus();
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
