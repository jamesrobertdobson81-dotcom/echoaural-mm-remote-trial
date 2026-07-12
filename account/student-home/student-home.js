"use strict";

const { api, escapeHtml } = window.EchoAuralAccounts;

const moduleLinks = {
  "melody-master": "/modules/melody-master/",
  "melodic-intervals": "/modules/melodic-intervals/",
  "instrument-identifier": "/modules/instrument-identifier/",
  "texture-trainer": "/modules/texture-trainer/"
};

const CATEGORY_CONFIG = {
  practice: {
    title: "Practice",
    eyebrow: "Independent learning",
    subtitle: "Rounds you choose and complete independently.",
    detailSubtitle: "Your app scores, saved rounds and question feedback from independent practice.",
    emptyFeedback: "Choose an app and complete an independent round while logged in.",
    actionLabel: "Choose an app",
    actionHref: "/#apps"
  },
  quizzes: {
    title: "Live Quizzes",
    eyebrow: "Teacher-led learning",
    subtitle: "Results saved from Teacher Mode classroom rounds.",
    detailSubtitle: "Your app scores, saved rounds and question feedback from live classroom quizzes.",
    emptyFeedback: "Join a Teacher Mode round to begin your live-quiz record.",
    actionLabel: "Join live class",
    actionHref: "/join"
  },
  homework: {
    title: "Homework",
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
  return source === "quizzes" ? "Live quiz" : source === "homework" ? "Homework" : "Practice";
}

function emptyCategory(message) {
  return `<div class="category-empty-v2"><span class="category-empty-wave-v2" aria-hidden="true"><i></i><i></i><i></i></span><p>${escapeHtml(message)}</p></div>`;
}

function renderCategoryModules(modules = []) {
  return `
    <div class="category-module-list-v2 student-detail-module-list-v3">
      ${modules.map((module) => {
        const href = moduleLinks[module.moduleId] || "/#apps";
        return `
          <a class="category-module-row-v2 ${scoreClass(module.percentage, module.questions)}" href="${href}">
            <span class="category-module-icon-v2"><img src="${escapeHtml(module.icon)}" alt="" /></span>
            <span class="category-module-copy-v2">
              <span>${escapeHtml(module.title)}</span>
              <small>${module.questions ? `${module.questions} questions · ${module.rounds} rounds` : "Not started"}</small>
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
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;

  if (categoryKey === "homework") {
    return `
      <div class="student-learning-summary-heading-v3">
        <div class="student-learning-icon-slot-v3" aria-hidden="true"><span></span><span></span><span></span></div>
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
      <div class="student-learning-icon-slot-v3" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="student-learning-title-v3">
        <p id="${categoryKey === "practice" ? "studentPracticeHeading" : "studentQuizHeading"}">${escapeHtml(config.eyebrow)}</p>
        <h3>${escapeHtml(config.title)}</h3>
      </div>
      <strong class="student-learning-percentage-v3 ${scoreClass(overall.percentage, overall.questions)}">${hasEvidence ? `${Number(overall.percentage || 0)}%` : "—"}</strong>
    </div>

    <div class="student-learning-feedback-v3">
      <span>My feedback</span>
      <p>${escapeHtml(hasEvidence ? overall.compiledFeedback : config.emptyFeedback)}</p>
    </div>

    <div class="student-learning-footer-v3">
      <span>${Number(overall.questions || 0)} questions · ${Number(overall.rounds || 0)} rounds · ${Number(overall.modulesStarted || 0)} / 4 apps</span>
      <button class="secondary-button student-detail-button-v3" type="button" data-category-detail="${categoryKey}">Detailed feedback</button>
    </div>
  `;
}

function renderCategorySummaries(progress) {
  const categories = progress.categories || {
    practice: progress,
    quizzes: { overall: {}, modules: [], recentRounds: [], recentQuestions: [] },
    homework: { overall: {} }
  };

  document.getElementById("studentPracticeContent").innerHTML = summaryMarkup("practice", categories.practice);
  document.getElementById("studentQuizContent").innerHTML = summaryMarkup("quizzes", categories.quizzes);
  document.getElementById("studentHomeworkContent").innerHTML = summaryMarkup("homework", categories.homework || { overall: {} });
}

function detailedCategoryMarkup(categoryKey, category) {
  const config = CATEGORY_CONFIG[categoryKey];
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;

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
        <div><span>Learning area</span><strong>${escapeHtml(config.title)}</strong></div>
      </div>
    </div>

    <div class="category-detail-feedback-v5">
      <span>Compiled feedback</span>
      <p>${escapeHtml(hasEvidence ? overall.compiledFeedback : config.emptyFeedback)}</p>
    </div>

    <section class="student-detail-section-v3">
      <div class="category-detail-section-heading-v5">
        <div><p class="card-eyebrow">All applications</p><h3>Scores and next steps</h3></div>
        <a class="secondary-button student-detail-action-v3" href="${config.actionHref}">${escapeHtml(config.actionLabel)}</a>
      </div>
      ${renderCategoryModules(category?.modules || [])}
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
  els.categoryDetailContent.innerHTML = detailedCategoryMarkup(categoryKey, category);
  els.categoryDialog.showModal();
}

function chooseNextStep(progress) {
  const categories = progress.categories || {};
  const modules = [
    ...(categories.practice?.modules || []),
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
    ...(categories.practice?.recentRounds || []).map((round) => ({ ...round, source: "practice" })),
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
  const progress = await api("/api/student/progress");
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
