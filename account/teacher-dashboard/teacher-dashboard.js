"use strict";

const { api, setMessage, escapeHtml, formatDate } = window.EchoAuralAccounts;
const state = {
  teacher: null,
  students: [],
  classProgress: null,
  classes: [],
  classMeta: {
    classLimit: 3,
    activeClasses: 0,
    seatLimit: 20,
    activeStudents: 0,
    seatsRemaining: 20
  },
  classDraft: null,
  draftStudents: [],
  generatedCredentials: null,
  resetStudent: null,
  progressStudent: null,
  studentProgressRefreshTimer: null,
  studentProgressRefreshInFlight: false,
  expandedClassIds: new Set(),
  // Real modules/progress-mode/ data, keyed by studentId — see
  // accounts/account-server.js's /api/teacher/progress-mode-summary route.
  // Separate from classProgress/categories.progress, which used to be an
  // unrelated, differently-labelled legacy system (now retired).
  progressModeSummaries: new Map()
};

const PROGRESSION_LEVEL_LABELS = ["Foundation", "Developing", "Securing", "Mastering"];
const STUDENT_PROGRESS_REFRESH_MS = 12000;

const els = {
  heroTeacherName: document.getElementById("heroTeacherName"),
  teacherCode: document.getElementById("teacherCode"),
  licenceExpiry: document.getElementById("licenceExpiry"),
  seatMetric: document.getElementById("seatMetric"),
  seatBarFill: document.getElementById("seatBarFill"),
  passwordNotice: document.getElementById("passwordNotice"),
  studentCreateForm: document.getElementById("studentCreateForm"),
  createStudentButton: document.getElementById("createStudentButton"),
  studentFormMessage: document.getElementById("studentFormMessage"),
  studentDialogMessage: document.getElementById("studentDialogMessage"),
  studentDialog: document.getElementById("studentDialog"),
  studentClassId: document.getElementById("studentClassId"),
  addStudentAction: document.getElementById("addStudentAction"),
  openStudentDialog: document.getElementById("openStudentDialog"),
  cancelStudentButton: document.getElementById("cancelStudentButton"),
  studentList: document.getElementById("studentList"),
  logoutButton: document.getElementById("logoutButton"),
  passwordDialog: document.getElementById("passwordDialog"),
  openPasswordDialog: document.getElementById("openPasswordDialog"),
  cancelPasswordButton: document.getElementById("cancelPasswordButton"),
  passwordForm: document.getElementById("passwordForm"),
  passwordMessage: document.getElementById("passwordMessage"),
  pinDialog: document.getElementById("pinDialog"),
  pinDialogStudent: document.getElementById("pinDialogStudent"),
  pinForm: document.getElementById("pinForm"),
  pinMessage: document.getElementById("pinMessage"),
  cancelPinButton: document.getElementById("cancelPinButton"),
  refreshClassProgress: document.getElementById("refreshClassProgress"),
  classLevel: document.getElementById("classLevel"),
  classPercentage: document.getElementById("classPercentage"),
  classScore: document.getElementById("classScore"),
  classQuestions: document.getElementById("classQuestions"),
  classRounds: document.getElementById("classRounds"),
  classStudents: document.getElementById("classStudents"),
  classParticipation: document.getElementById("classParticipation"),
  classFeedback: document.getElementById("classFeedback"),
  classProgressStatus: document.getElementById("classProgressStatus"),
  learningSummaryList: document.getElementById("learningSummaryList"),
  categoryDetailDialog: document.getElementById("categoryDetailDialog"),
  closeCategoryDetail: document.getElementById("closeCategoryDetail"),
  categoryDetailEyebrow: document.getElementById("categoryDetailEyebrow"),
  categoryDetailTitle: document.getElementById("categoryDetailTitle"),
  categoryDetailSubtitle: document.getElementById("categoryDetailSubtitle"),
  categoryDetailIcon: document.getElementById("categoryDetailIcon"),
  categoryDetailContent: document.getElementById("categoryDetailContent"),
  studentProgressDialog: document.getElementById("studentProgressDialog"),
  closeStudentProgress: document.getElementById("closeStudentProgress"),
  progressStudentName: document.getElementById("progressStudentName"),
  progressStudentMeta: document.getElementById("progressStudentMeta"),
  studentProgressContent: document.getElementById("studentProgressContent"),
  teacherElementBreakdownDialog: document.getElementById("teacherElementBreakdownDialog"),
  teacherElementBreakdownContent: document.getElementById("teacherElementBreakdownContent"),
  classCountMetric: document.getElementById("classCountMetric"),
  classSeatSummary: document.getElementById("classSeatSummary"),
  openClassDialog: document.getElementById("openClassDialog"),
  classDialog: document.getElementById("classDialog"),
  closeClassDialog: document.getElementById("closeClassDialog"),
  classWizardTitle: document.getElementById("classWizardTitle"),
  classWizardSubtitle: document.getElementById("classWizardSubtitle"),
  classStepIndicatorOne: document.getElementById("classStepIndicatorOne"),
  classStepIndicatorTwo: document.getElementById("classStepIndicatorTwo"),
  classDetailsStep: document.getElementById("classDetailsStep"),
  classStudentsStep: document.getElementById("classStudentsStep"),
  classDetailsForm: document.getElementById("classDetailsForm"),
  classDetailsMessage: document.getElementById("classDetailsMessage"),
  continueClassButton: document.getElementById("continueClassButton"),
  cancelClassButton: document.getElementById("cancelClassButton"),
  draftClassName: document.getElementById("draftClassName"),
  draftSeatSummary: document.getElementById("draftSeatSummary"),
  backToClassDetails: document.getElementById("backToClassDetails"),
  classStudentForm: document.getElementById("classStudentForm"),
  classStudentMessage: document.getElementById("classStudentMessage"),
  addDraftStudentButton: document.getElementById("addDraftStudentButton"),
  classDraftStudentList: document.getElementById("classDraftStudentList"),
  classWizardRemainingSeats: document.getElementById("classWizardRemainingSeats"),
  finishClassButton: document.getElementById("finishClassButton"),
  generatedLoginsDialog: document.getElementById("generatedLoginsDialog"),
  generatedLoginsTitle: document.getElementById("generatedLoginsTitle"),
  generatedLoginsMeta: document.getElementById("generatedLoginsMeta"),
  generatedLoginSheet: document.getElementById("generatedLoginSheet"),
  closeGeneratedLogins: document.getElementById("closeGeneratedLogins"),
  printGeneratedLogins: document.getElementById("printGeneratedLogins"),
  copyGeneratedLogins: document.getElementById("copyGeneratedLogins"),
  openLiveLaunchDialog: document.getElementById("openLiveLaunchDialog"),
  openHomeworkLaunchDialog: document.getElementById("openHomeworkLaunchDialog"),
  teacherLaunchDialog: document.getElementById("teacherLaunchDialog"),
  closeTeacherLaunchDialog: document.getElementById("closeTeacherLaunchDialog"),
  teacherLaunchForm: document.getElementById("teacherLaunchForm"),
  teacherLaunchEyebrow: document.getElementById("teacherLaunchEyebrow"),
  teacherLaunchTitle: document.getElementById("teacherLaunchTitle"),
  teacherLaunchSubtitle: document.getElementById("teacherLaunchSubtitle"),
  teacherLaunchSource: document.getElementById("teacherLaunchSource"),
  teacherLaunchModule: document.getElementById("teacherLaunchModule"),
  teacherLaunchApp: document.getElementById("teacherLaunchApp"),
  teacherLaunchQuestionCount: document.getElementById("teacherLaunchQuestionCount"),
  teacherLaunchPlayCount: document.getElementById("teacherLaunchPlayCount"),
  teacherLaunchLevel: document.getElementById("teacherLaunchLevel"),
  teacherLaunchPurpose: document.getElementById("teacherLaunchPurpose"),
  teacherLaunchStrategy: document.getElementById("teacherLaunchStrategy"),
  teacherLaunchPurposeSection: document.getElementById("teacherLaunchPurposeSection"),
  teacherLaunchStrategySection: document.getElementById("teacherLaunchStrategySection"),
  teacherLaunchFilterSection: document.getElementById("teacherLaunchFilterSection"),
  teacherLaunchElement: document.getElementById("teacherLaunchElement"),
  teacherLaunchSkill: document.getElementById("teacherLaunchSkill"),
  teacherLaunchAvoidRecent: document.getElementById("teacherLaunchAvoidRecent"),
  teacherLaunchLeaderboard: document.getElementById("teacherLaunchLeaderboard"),
  teacherLaunchPreview: document.getElementById("teacherLaunchPreview"),
  previewTeacherLaunch: document.getElementById("previewTeacherLaunch"),
  teacherLaunchHelper: document.getElementById("teacherLaunchHelper"),
  teacherLaunchMessage: document.getElementById("teacherLaunchMessage"),
  teacherLaunchSubmit: document.getElementById("teacherLaunchSubmit"),
  cancelTeacherLaunch: document.getElementById("cancelTeacherLaunch"),
  teacherLaunchAppSection: document.getElementById("teacherLaunchAppSection"),
  teacherLaunchQuestionSection: document.getElementById("teacherLaunchQuestionSection"),
  teacherLaunchPlaySection: document.getElementById("teacherLaunchPlaySection"),
  teacherLaunchLevelSection: document.getElementById("teacherLaunchLevelSection"),
  teacherLaunchClassSection: document.getElementById("teacherLaunchClassSection"),
  teacherLaunchClass: document.getElementById("teacherLaunchClass")
};

const TEACHER_LAUNCH_COPY = {
  live: {
    eyebrow: "Live classroom",
    title: "Start Live Session",
    subtitle: "Choose the question source and session settings, then open Teacher Mode with a room code already prepared.",
    helper: "Choose a level to focus this round, or use all levelled questions.",
    submit: "Open live room",
    autoCreate: "1"
  },
  homework: {
    eyebrow: "Homework setup",
    title: "Set homework",
    subtitle: "Choose the app and question count. This opens the same question engine preconfigured while homework publishing is added.",
    helper: "Homework assignment storage is the next layer; this keeps the question setup and existing Teacher Mode runtime stable.",
    submit: "Prepare homework set",
    autoCreate: "0"
  }
};

let teacherLaunchMode = "live";
let teacherLaunchStandardQuestionCount = "5";
let teacherLaunchStandardLevel = "all";
let teacherLaunchDraft = null;
let teacherLaunchCatalogueLoaded = false;

const TEACHER_PURPOSE_PRESETS = {
  starter: { questionCount: "5", strategy: "balanced", plays: "4" },
  main: { questionCount: "10", strategy: "class-priorities", plays: "3" },
  plenary: { questionCount: "5", strategy: "skill-focus", plays: "2" },
  diagnostic: { questionCount: "10", strategy: "balanced", plays: "2" },
  custom: { questionCount: "5", strategy: "random", plays: "4" }
};

function formatMark(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function openTeacherLaunchDialog(mode = "live") {
  teacherLaunchMode = TEACHER_LAUNCH_COPY[mode] ? mode : "live";
  const copy = TEACHER_LAUNCH_COPY[teacherLaunchMode];

  els.teacherLaunchForm.reset();
  els.teacherLaunchApp.value = "instrument-identifier";
  setTeacherLaunchValue(els.teacherLaunchModule, "instrument-identifier");
  setTeacherLaunchValue(els.teacherLaunchQuestionCount, "5");
  setTeacherLaunchValue(els.teacherLaunchPlayCount, "4");
  setTeacherLaunchValue(els.teacherLaunchLevel, teacherLaunchMode === "live" ? "all" : "foundation");
  setTeacherLaunchValue(els.teacherLaunchPurpose, "starter");
  setTeacherLaunchValue(els.teacherLaunchStrategy, "balanced");
  els.teacherLaunchElement.value = "";
  els.teacherLaunchSkill.value = "";
  els.teacherLaunchAvoidRecent.checked = true;
  els.teacherLaunchLeaderboard.checked = true;
  invalidateTeacherLaunchPreview();
  teacherLaunchStandardQuestionCount = "5";
  teacherLaunchStandardLevel = teacherLaunchMode === "live" ? "all" : "foundation";
  setTeacherLaunchSource(teacherLaunchMode === "live" ? "mixed" : "app");
  els.teacherLaunchForm.querySelectorAll("[data-live-only]").forEach((button) => {
    button.disabled = teacherLaunchMode !== "live";
    button.classList.toggle("is-disabled", teacherLaunchMode !== "live");
  });
  els.teacherLaunchEyebrow.textContent = copy.eyebrow;
  els.teacherLaunchTitle.textContent = copy.title;
  els.teacherLaunchSubtitle.textContent = copy.subtitle;
  const submitIcon = teacherLaunchMode === "homework"
    ? "/assets/icons/dashboard/homework.png"
    : "/assets/icons/dashboard/join-live-session.png";
  els.teacherLaunchSubmit.innerHTML = `<span class="teacher-button-icon" aria-hidden="true"><img src="${submitIcon}" alt="" /></span><span>${escapeHtml(copy.submit)}</span>`;
  updateTeacherLaunchHelper();
  loadTeacherLaunchCatalogue();
  setMessage(els.teacherLaunchMessage);
  els.teacherLaunchDialog.showModal();
  window.setTimeout(() => els.teacherLaunchDialog.querySelector("[data-launch-source]:not(:disabled), [data-launch-option]:not(:disabled)")?.focus(), 0);
}

function invalidateTeacherLaunchPreview() {
  teacherLaunchDraft = null;
  els.teacherLaunchPreview.hidden = true;
  els.teacherLaunchPreview.innerHTML = "";
}

async function loadTeacherLaunchCatalogue() {
  if (teacherLaunchCatalogueLoaded) return;
  try {
    const result = await api("/api/classroom/modules");
    const skills = Array.from(new Map((result.modules || [])
      .flatMap((module) => module.skills || [])
      .map((skill) => [skill.code, skill])).values())
      .sort((left, right) => left.name.localeCompare(right.name));
    els.teacherLaunchSkill.innerHTML = '<option value="">All available skills</option>'
      + skills.map((skill) => `<option value="${escapeHtml(skill.code)}">${escapeHtml(skill.name)}</option>`).join("");
    teacherLaunchCatalogueLoaded = true;
  } catch (_error) {
    // The existing live launcher remains usable if the classroom service is offline.
  }
}

function closeTeacherLaunchDialog() {
  els.teacherLaunchDialog.close();
}

function setTeacherLaunchValue(input, value) {
  input.value = String(value || "");
  els.teacherLaunchForm.querySelectorAll(`[data-launch-option][data-target="${input.id}"]`).forEach((button) => {
    const selected = button.dataset.value === input.value;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function setTeacherLaunchSource(source) {
  const nextSource = ["app", "mixed", "targeted", "exam-lab"].includes(source) ? source : "mixed";
  const previousSource = els.teacherLaunchSource.value;
  if (nextSource === "exam-lab" && previousSource !== "exam-lab") {
    teacherLaunchStandardQuestionCount = els.teacherLaunchQuestionCount.value || "5";
    teacherLaunchStandardLevel = els.teacherLaunchLevel.value || "all";
  } else if (previousSource === "exam-lab" && nextSource !== "exam-lab") {
    setTeacherLaunchValue(els.teacherLaunchQuestionCount, teacherLaunchStandardQuestionCount);
    setTeacherLaunchValue(els.teacherLaunchLevel, teacherLaunchStandardLevel);
  }
  els.teacherLaunchSource.value = nextSource;
  els.teacherLaunchForm.querySelectorAll("[data-launch-source]").forEach((button) => {
    const selected = button.dataset.launchSource === nextSource;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const moduleId = nextSource === "app" ? (els.teacherLaunchApp.value || "instrument-identifier") : nextSource === "targeted" ? "mixed" : nextSource;
  setTeacherLaunchValue(els.teacherLaunchModule, moduleId);
  invalidateTeacherLaunchPreview();
  updateTeacherLaunchHelper();
}

function updateTeacherLaunchHelper() {
  const copy = TEACHER_LAUNCH_COPY[teacherLaunchMode] || TEACHER_LAUNCH_COPY.live;
  const selectedModule = els.teacherLaunchModule.value;
  const selectedSource = els.teacherLaunchSource.value;
  const examLab = selectedModule === "exam-lab";
  // Targeted rounds still let the teacher choose round length and playback;
  // only the level control is inapplicable because the class evidence sets it.
  const showsStandardChoices = selectedSource === "app" || selectedSource === "mixed" || selectedSource === "targeted";
  const supportsLevelFilters = !examLab && selectedSource !== "targeted";
  els.teacherLaunchHelper.textContent = examLab
    ? "ExamLab sets one server-selected exam extract for the whole class. The teacher controls all playback."
    : selectedSource === "targeted"
      ? "Targeted rounds use class weaknesses while preserving variety across question types and apps."
      : selectedSource === "mixed"
        ? "Mixed creates a random varied set of questions selected from the supported EchoAural apps."
      : `${els.teacherLaunchApp.options[els.teacherLaunchApp.selectedIndex]?.text || "The selected app"} will supply every question in this session. ${copy.helper}`;

  els.teacherLaunchAppSection.hidden = false;
  els.teacherLaunchAppSection.classList.toggle("is-inactive", selectedSource !== "app");
  els.teacherLaunchApp.disabled = selectedSource !== "app";
  els.teacherLaunchQuestionSection.hidden = !showsStandardChoices;
  els.teacherLaunchPlaySection.hidden = !showsStandardChoices;
  els.teacherLaunchLevelSection.hidden = false;
  els.teacherLaunchLevelSection.classList.toggle("is-inactive", !showsStandardChoices);
  els.teacherLaunchPurposeSection.hidden = true;
  els.teacherLaunchStrategySection.hidden = true;
  // The live-session launcher intentionally keeps the four core choices
  // focused; legacy element/skill filters remain available to other launch
  // flows without cluttering this popup.
  els.teacherLaunchFilterSection.hidden = teacherLaunchMode === "live" || examLab;
  if (els.previewTeacherLaunch) els.previewTeacherLaunch.hidden = true;
  els.teacherLaunchHelper.hidden = true;
  els.teacherLaunchClassSection.hidden = true;
  if (!els.teacherLaunchClassSection.hidden) {
    const active = activeClasses();
    els.teacherLaunchClass.innerHTML = '<option value="">All account students</option>'
      + active.map((classItem) => `<option value="${escapeHtml(classItem.id)}">${escapeHtml(classItem.className)}</option>`).join("");
  }
  if (examLab) {
    setTeacherLaunchValue(els.teacherLaunchQuestionCount, "1");
    setTeacherLaunchValue(els.teacherLaunchLevel, "all");
  }

  els.teacherLaunchForm.querySelectorAll('[data-target="teacherLaunchLevel"]').forEach((button) => {
    button.disabled = !supportsLevelFilters;
    button.classList.toggle("is-disabled", !supportsLevelFilters);
  });

  if (!supportsLevelFilters || selectedSource === "targeted") setTeacherLaunchValue(els.teacherLaunchLevel, "all");
}

function selectTeacherLaunchOption(button) {
  if (!button || button.disabled) return;
  const input = document.getElementById(button.dataset.target);
  if (!input) return;
  setTeacherLaunchValue(input, button.dataset.value);
  invalidateTeacherLaunchPreview();
  if (input === els.teacherLaunchPurpose) {
    const preset = TEACHER_PURPOSE_PRESETS[input.value] || TEACHER_PURPOSE_PRESETS.custom;
    setTeacherLaunchValue(els.teacherLaunchQuestionCount, preset.questionCount);
    setTeacherLaunchValue(els.teacherLaunchPlayCount, preset.plays);
    setTeacherLaunchValue(els.teacherLaunchStrategy, preset.strategy);
  }
  if (els.teacherLaunchSource.value !== "exam-lab" && input === els.teacherLaunchQuestionCount) teacherLaunchStandardQuestionCount = input.value;
  if (els.teacherLaunchSource.value !== "exam-lab" && input === els.teacherLaunchLevel) teacherLaunchStandardLevel = input.value;
  if (input === els.teacherLaunchModule) updateTeacherLaunchHelper();
}

function selectedQuestionSetModules() {
  if (els.teacherLaunchSource.value === "app") {
    const selected = els.teacherLaunchApp.value || "instrument-identifier";
    const source = window.EchoAuralPMRegistry?.get(selected);
    return [source?.moduleId || selected];
  }
  return ["instrument-identifier", "ensemble-recognition", "melodic-intervals", "texture-trainer", "meter-master", "cadence-coach", "musical-language", "key-signature-sprint", "chord-identifier", "era-explorer", "melody-master"];
}

function selectedQuestionSetSources() {
  if (els.teacherLaunchSource.value !== "app") return [];
  const source = window.EchoAuralPMRegistry?.get(els.teacherLaunchApp.value || "");
  return source ? [source.sourceKey] : [];
}

function buildTeacherQuestionSetSpec() {
  const level = els.teacherLaunchSource.value === "targeted" ? "all" : (els.teacherLaunchLevel.value || "all");
  return {
    version: 1,
    purpose: els.teacherLaunchPurpose.value || "custom",
    // Mixed rounds should retain the selected balancing strategy so the
    // shared class queue does not accidentally cluster several questions from
    // one app (for example three Melodic Intervals in a row). App-specific
    // rounds remain random within that app; Targeted rounds use class evidence.
    strategy: els.teacherLaunchSource.value === "targeted"
      ? "class-priorities"
      : els.teacherLaunchSource.value === "mixed"
        ? (els.teacherLaunchStrategy.value || "balanced")
        : "random",
    classId: els.teacherLaunchClass.value || "",
    questionCount: Number(els.teacherLaunchQuestionCount.value || 5),
    maxListens: Number(els.teacherLaunchPlayCount.value || 4),
    moduleIds: selectedQuestionSetModules(),
    sourceKeys: selectedQuestionSetSources(),
    musicalElements: els.teacherLaunchElement.value ? [els.teacherLaunchElement.value] : [],
    skillCodes: els.teacherLaunchSkill.value ? [els.teacherLaunchSkill.value] : [],
    levels: level === "all" ? [] : [level],
    avoidRecent: els.teacherLaunchAvoidRecent.checked,
    leaderboard: els.teacherLaunchLeaderboard.checked,
    seed: `${state.teacher?.id || "teacher"}:${Date.now()}`
  };
}

function formatPreviewDistribution(values = {}) {
  return Object.entries(values).map(([label, count]) => `${label}: ${count}`).join(" · ") || "No classified questions";
}

function renderTeacherLaunchPreview(result) {
  const preview = result.preview || {};
  els.teacherLaunchPreview.innerHTML = `
    <h3>${Number(preview.questionCount || 0)} questions · about ${Number(preview.estimatedMinutes || 1)} min</h3>
    <p>${escapeHtml(preview.rationale || "Question set ready.")}</p>
    <p><strong>Apps:</strong> ${escapeHtml(formatPreviewDistribution(preview.modules))}</p>
    <p><strong>Elements:</strong> ${escapeHtml(formatPreviewDistribution(preview.musicalElements))}</p>
    ${preview.focusSkills?.length ? `<p><strong>Skills:</strong> ${escapeHtml(preview.focusSkills.join(", "))}</p>` : ""}
    ${preview.questions?.length ? `<ol class="question-set-preview-list">${preview.questions.map((question) => `<li><strong>${escapeHtml(question.moduleTitle)}</strong><span>${escapeHtml([question.questionId, question.skillName, question.level].filter(Boolean).join(" · "))}</span></li>`).join("")}</ol>` : ""}
    ${preview.warnings?.length ? `<ul>${preview.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
  `;
  els.teacherLaunchPreview.hidden = false;
}

async function previewTeacherQuestionSet() {
  if (els.teacherLaunchStrategy.value === "skill-focus" && !els.teacherLaunchElement.value && !els.teacherLaunchSkill.value) {
    setMessage(els.teacherLaunchMessage, "Choose a musical element or specific skill for a Skill Focus set.", "error");
    return null;
  }
  setMessage(els.teacherLaunchMessage, "Building preview…");
  els.previewTeacherLaunch.disabled = true;
  try {
    const result = await api("/api/classroom/question-set/preview", {
      method: "POST",
      body: JSON.stringify({ spec: buildTeacherQuestionSetSpec() })
    });
    teacherLaunchDraft = result;
    renderTeacherLaunchPreview(result);
    setMessage(els.teacherLaunchMessage, "Question set ready. Review it, then open the live room.", "success");
    return result;
  } catch (error) {
    teacherLaunchDraft = null;
    setMessage(els.teacherLaunchMessage, error.message, "error");
    return null;
  } finally {
    els.previewTeacherLaunch.disabled = false;
  }
}

async function submitTeacherLaunch(event) {
  event.preventDefault();
  const copy = TEACHER_LAUNCH_COPY[teacherLaunchMode] || TEACHER_LAUNCH_COPY.live;
  const examLab = els.teacherLaunchModule.value === "exam-lab";
  if (teacherLaunchMode === "live" && !examLab && !teacherLaunchDraft) {
    teacherLaunchDraft = await previewTeacherQuestionSet();
    if (!teacherLaunchDraft) return;
  }
  const plannedModules = teacherLaunchDraft?.questionPlan
    ? Array.from(new Set(teacherLaunchDraft.questionPlan.map((item) => item.moduleId)))
    : [];
  const plannedModule = plannedModules.length > 1 ? "mixed" : (plannedModules[0] || els.teacherLaunchModule.value || "instrument-identifier");
  const params = new URLSearchParams({
    dashboardLaunch: "1",
    launch: teacherLaunchMode,
    module: plannedModule,
    quizLength: els.teacherLaunchQuestionCount.value || "5",
    maxListens: els.teacherLaunchPlayCount.value || "4",
    questionLevel: els.teacherLaunchLevel.value || "all",
    autoCreate: copy.autoCreate
  });

  if (els.teacherLaunchClass.value) {
    params.set("classId", els.teacherLaunchClass.value);
  }

  if (teacherLaunchDraft?.draftId) params.set("questionSetDraft", teacherLaunchDraft.draftId);

  if (els.teacherLaunchModule.value === "mixed") {
    params.set("mixedModules", plannedModules.length ? plannedModules.join(",") : selectedQuestionSetModules().join(","));
  }

  window.location.assign(`/teacher/?${params.toString()}`);
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

function renderAccount() {
  const teacher = state.teacher;
  const licence = teacher.licence || {};
  els.heroTeacherName.textContent = `${teacher.displayName}.`;
  els.teacherCode.textContent = teacher.teacherCode;
  els.licenceExpiry.textContent = formatDate(licence.expiresAt);
  els.passwordNotice.hidden = !teacher.mustChangePassword;
}


function activeClasses() {
  return state.classes.filter((item) => item.active);
}

function currentSeatAvailability() {
  const seatLimit = Number(
    state.teacher?.licence?.seatLimit ||
    state.classMeta.seatLimit ||
    20
  );

  /*
    Use the student list already returned for this teacher rather than
    trusting a missing or stale seatsRemaining field from the class endpoint.
    The server still performs the authoritative seat check when a class is
    saved.
  */
  const activeStudents = state.students.filter((student) => student.active).length;

  return {
    seatLimit: Number.isFinite(seatLimit) && seatLimit > 0 ? seatLimit : 20,
    activeStudents,
    seatsRemaining: Math.max(
      0,
      (Number.isFinite(seatLimit) && seatLimit > 0 ? seatLimit : 20) - activeStudents
    )
  };
}

function renderClassSummary() {
  const classes = activeClasses();
  const limit = Number(state.classMeta.classLimit || 3);
  const availability = currentSeatAvailability();
  const remainingSeats = availability.seatsRemaining;

  els.classCountMetric.textContent = `${classes.length} / ${limit}`;
  els.classSeatSummary.textContent = `${remainingSeats} seat${remainingSeats === 1 ? '' : 's'} available`;

  const classLimitReached = classes.length >= limit;
  const seatLimitReached = remainingSeats <= 0;

  /*
    Do not let an incomplete class-summary response permanently grey out the
    button. Local eligibility controls the presentation; the API performs the
    final transactional class and seat validation.
  */
  els.openClassDialog.disabled = classLimitReached || seatLimitReached;

  if (classLimitReached) {
    els.openClassDialog.textContent = "3 classes created";
  } else if (seatLimitReached) {
    els.openClassDialog.textContent = "No seats available";
  } else {
    els.openClassDialog.textContent = "Create class";
  }

  const canAddStudent = classes.length > 0 && !seatLimitReached;
  els.openStudentDialog.disabled = !canAddStudent;

  const addStudentLabel = !classes.length
    ? "Create a class first"
    : seatLimitReached
      ? "All student seats used"
      : "Add student";
  els.openStudentDialog.querySelector(".teacher-button-label").textContent = addStudentLabel;
}

async function loadClasses() {
  const result = await api("/api/teacher/classes");
  const fallbackSeatLimit = Number(state.teacher?.licence?.seatLimit || 20);
  const reportedSeatLimit = Number(result.seatLimit);
  const seatLimit = Number.isFinite(reportedSeatLimit) && reportedSeatLimit > 0
    ? reportedSeatLimit
    : fallbackSeatLimit;

  const reportedActiveStudents = Number(result.activeStudents);
  const activeStudents = Number.isFinite(reportedActiveStudents)
    ? reportedActiveStudents
    : state.students.filter((student) => student.active).length;

  state.classes = Array.isArray(result.classes) ? result.classes : [];
  state.classMeta = {
    classLimit: Number(result.classLimit || 3),
    activeClasses: Number(result.activeClasses || state.classes.filter((item) => item.active).length),
    seatLimit,
    activeStudents,
    seatsRemaining: Math.max(0, seatLimit - activeStudents)
  };

  renderClassSummary();
}

function cleanDraftUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 24);
}

function resetClassWizard() {
  state.classDraft = null;
  state.draftStudents = [];
  els.classDetailsForm.reset();
  els.classStudentForm.reset();
  setMessage(els.classDetailsMessage);
  setMessage(els.classStudentMessage);
  showClassWizardStep("details");
  renderDraftStudents();
}

function showClassWizardStep(step) {
  const studentStep = step === "students";
  els.classDetailsStep.hidden = studentStep;
  els.classStudentsStep.hidden = !studentStep;
  els.classStepIndicatorOne.classList.toggle("is-active", !studentStep);
  els.classStepIndicatorOne.classList.toggle("is-complete", studentStep);
  els.classStepIndicatorTwo.classList.toggle("is-active", studentStep);

  if (studentStep) {
    els.classWizardTitle.textContent = "Add students";
    els.classWizardSubtitle.textContent = "Enter every student name, username and PIN individually. Nothing is saved until you finish the class.";
    window.setTimeout(() => els.classStudentForm.elements.displayName.focus(), 0);
  } else {
    els.classWizardTitle.textContent = "Create class";
    els.classWizardSubtitle.textContent = "Add the class details first, then enter each student name, username and PIN.";
    window.setTimeout(() => els.classDetailsForm.elements.className.focus(), 0);
  }
}

function openClassSetup() {
  const classes = activeClasses();
  const classLimit = Number(state.classMeta.classLimit || 3);
  const { seatsRemaining } = currentSeatAvailability();

  if (classes.length >= classLimit) {
    setMessage(els.studentFormMessage, "This account already has the maximum of three active classes.", "error");
    return;
  }

  if (seatsRemaining <= 0) {
    setMessage(els.studentFormMessage, "All active student seats are already in use.", "error");
    return;
  }

  resetClassWizard();
  els.classDialog.showModal();
}

function renderDraftStudents() {
  const { seatsRemaining } = currentSeatAvailability();
  const draftCount = state.draftStudents.length;
  const availableForDraft = Math.max(0, Math.min(20, seatsRemaining) - draftCount);

  els.draftSeatSummary.textContent = `${draftCount} student${draftCount === 1 ? "" : "s"} added`;
  els.classWizardRemainingSeats.textContent = `${availableForDraft} more student${availableForDraft === 1 ? "" : "s"} can be added`;
  els.finishClassButton.disabled = draftCount < 1;
  els.addDraftStudentButton.disabled = availableForDraft <= 0;

  if (!draftCount) {
    els.classDraftStudentList.innerHTML = '<div class="empty-state">Add each student individually. Nothing is saved until you press Finish class.</div>';
    return;
  }

  els.classDraftStudentList.innerHTML = state.draftStudents.map((student, index) => `
    <article class="class-draft-student-v7" data-draft-index="${index}">
      <div>
        <strong>${escapeHtml(student.displayName)}</strong>
        <span>${escapeHtml(student.username)} · PIN ${escapeHtml(student.pin)}</span>
      </div>
      <button class="small-button" type="button" data-action="remove-draft-student">Remove</button>
    </article>
  `).join("");
}

function populateClassSelect(preferredClassId = "") {
  const classes = activeClasses();
  els.studentClassId.innerHTML = classes.map((classItem) => `
    <option value="${escapeHtml(classItem.id)}"${classItem.id === preferredClassId ? " selected" : ""}>
      ${escapeHtml(classItem.className)}${classItem.yearGroup ? ` · ${escapeHtml(classItem.yearGroup)}` : ""}
    </option>
  `).join("");
}

function generatedLoginsMarkup(result) {
  return `
    <table class="generated-login-table-v6">
      <thead><tr><th>Student</th><th>Teacher code</th><th>Username</th><th>PIN</th></tr></thead>
      <tbody>${result.credentials.map((credential) => `
        <tr>
          <td>${escapeHtml(credential.displayName)}</td>
          <td><code>${escapeHtml(result.teacherCode)}</code></td>
          <td><code>${escapeHtml(credential.username)}</code></td>
          <td><code>${escapeHtml(credential.pin)}</code></td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function showGeneratedLogins(result) {
  state.generatedCredentials = result;
  els.generatedLoginsTitle.textContent = `${result.credentials.length} student account${result.credentials.length === 1 ? "" : "s"} created`;
  els.generatedLoginsMeta.textContent = `${result.class.className} · Teacher code ${result.teacherCode}`;
  els.generatedLoginSheet.innerHTML = generatedLoginsMarkup(result);
  els.generatedLoginsDialog.showModal();
}

function credentialsText(result) {
  const lines = [
    "EchoAural student logins",
    `Class: ${result.class.className}`,
    `Teacher code: ${result.teacherCode}`,
    "",
    ...result.credentials.map((item) => `${item.displayName}: ${item.username} / PIN ${item.pin}`),
    "",
    "Student login: /account/student-login/"
  ];
  return lines.join("\n");
}

function printLoginSheet() {
  const result = state.generatedCredentials;
  if (!result) return;
  const popup = window.open("", "_blank", "width=900,height=720");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>EchoAural student logins</title><style>body{font-family:Inter,Arial,sans-serif;color:#10233f;margin:34px}h1{margin:0;font-size:30px}.brand{font-size:18px;font-weight:900;margin-bottom:8px}.brand span{color:#7c3aed}p{color:#62738a}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px;border-bottom:1px solid #dfe6ef;text-align:left}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7c93}code{font-size:15px;font-weight:800}.note{margin-top:24px;font-size:13px}</style></head><body><div class="brand">Echo<span>Aural</span></div><h1>${escapeHtml(result.class.className)}</h1><p>Teacher code: <strong>${escapeHtml(result.teacherCode)}</strong> · Student login: ${escapeHtml(window.location.origin)}/account/student-login/</p>${generatedLoginsMarkup(result)}<p class="note">Keep this sheet secure. Student PINs can be reset from the teacher dashboard.</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

function categoryStudent(categoryName, studentId) {
  return state.classProgress?.categories?.[categoryName]?.students?.find((student) => student.id === studentId) || null;
}

function overallStudent(studentId) {
  return state.classProgress?.students?.find((student) => student.id === studentId) || null;
}

function progressPill(progress, fallback = "No results") {
  const questions = Number(progress?.questions || 0);
  const percentage = Number(progress?.percentage || 0);
  const practiceSeconds = Number(progress?.practiceSeconds || 0);
  const label = questions
    ? `${percentage}% · ${questions}q`
    : practiceSeconds
      ? `${formatDuration(practiceSeconds)} practice`
      : fallback;
  return `<span class="student-progress-summary ${scoreClass(percentage, questions)}">${escapeHtml(label)}</span>`;
}

function studentRowMarkup(student) {
  return `
    <article class="student-row student-row-v2 class-student-row-v7 ${student.active ? "" : "inactive"}" data-student-id="${escapeHtml(student.id)}">
      <div class="student-summary-copy">
        <span class="student-name">${escapeHtml(student.displayName)}</span>
        <span class="student-username">${escapeHtml(student.username)}</span>
      </div>
      <div class="student-status">${student.active ? "Active seat" : "Inactive"}</div>
      <div class="student-actions">
        <button class="small-button" type="button" data-action="view-progress">View progress</button>
        <button class="small-button" type="button" data-action="reset-pin">Reset PIN</button>
        <button class="${student.active ? "danger-button" : "small-button"}" type="button" data-action="toggle">${student.active ? "Disable" : "Reactivate"}</button>
      </div>
    </article>
  `;
}

function classGroupMarkup(classItem, students) {
  const activeCount = students.filter((student) => student.active).length;
  const details = [classItem.yearGroup, classItem.examBoard].filter(Boolean).join(" · ");
  const classId = String(classItem.id || "");
  const expanded = state.expandedClassIds.has(classId);
  const membersId = `classMembers-${classId.replace(/[^a-z0-9_-]/gi, "") || "class"}`;

  return `
    <section class="student-class-group-v7 ${expanded ? "is-expanded" : "is-collapsed"}" data-class-id="${escapeHtml(classId)}">
      <div class="student-class-heading-v7">
        <div>
          <strong>${escapeHtml(classItem.className)}</strong>
          <span>${details ? escapeHtml(details) : "EchoAural class"}</span>
        </div>
        <div class="student-class-controls-v7">
          <b title="${activeCount} active student${activeCount === 1 ? "" : "s"}">${activeCount}</b>
          <button class="student-class-toggle-v7" type="button" data-action="toggle-class" aria-expanded="${expanded ? "true" : "false"}" aria-controls="${escapeHtml(membersId)}" aria-label="${expanded ? "Hide" : "Show"} ${escapeHtml(classItem.className)} students">${expanded ? "−" : "+"}</button>
        </div>
      </div>
      <div class="student-class-members-v7" id="${escapeHtml(membersId)}" ${expanded ? "" : "hidden"}>
        ${students.length
          ? students.map(studentRowMarkup).join("")
          : '<div class="class-empty-students-v7">No students in this class yet.</div>'}
      </div>
    </section>
  `;
}

function renderStudents() {
  const licence = state.teacher.licence || {};
  const activeStudents = state.students.filter((student) => student.active).length;
  const seatLimit = Number(licence.seatLimit || state.classMeta.seatLimit || 20);
  els.seatMetric.textContent = `${activeStudents} / ${seatLimit}`;
  els.seatBarFill.style.width = `${Math.min(100, (activeStudents / seatLimit) * 100)}%`;

  renderClassSummary();

  const classes = activeClasses();
  els.addStudentAction.hidden = classes.length === 0;
  if (!classes.length) {
    els.studentList.innerHTML = '<div class="empty-state">No classes yet. Create a class, add named student logins, then finish the class.</div>';
    return;
  }

  const markup = classes.map((classItem) => {
    const members = state.students.filter((student) => student.classId === classItem.id);
    return classGroupMarkup(classItem, members);
  });

  const unassigned = state.students.filter((student) => !student.classId);
  if (unassigned.length) {
    const unassignedId = "__unassigned";
    const expanded = state.expandedClassIds.has(unassignedId);
    const activeUnassigned = unassigned.filter((student) => student.active).length;
    markup.push(`
      <section class="student-class-group-v7 is-unassigned ${expanded ? "is-expanded" : "is-collapsed"}" data-class-id="${unassignedId}">
        <div class="student-class-heading-v7">
          <div><strong>Unassigned students</strong><span>Legacy accounts not yet attached to a class</span></div>
          <div class="student-class-controls-v7">
            <b title="${activeUnassigned} active student${activeUnassigned === 1 ? "" : "s"}">${activeUnassigned}</b>
            <button class="student-class-toggle-v7" type="button" data-action="toggle-class" aria-expanded="${expanded ? "true" : "false"}" aria-controls="classMembers-unassigned" aria-label="${expanded ? "Hide" : "Show"} unassigned students">${expanded ? "−" : "+"}</button>
          </div>
        </div>
        <div class="student-class-members-v7" id="classMembers-unassigned" ${expanded ? "" : "hidden"}>${unassigned.map(studentRowMarkup).join("")}</div>
      </section>
    `);
  }

  els.studentList.innerHTML = markup.join("");
}

function renderClassModules(modules = [], compact = false) {
  return `<div class="class-module-list-v2 ${compact ? "is-compact" : ""}">${modules.map((module) => `
    <article class="class-module-row-v2 ${scoreClass(module.percentage, module.questions)}">
      <span class="category-module-icon-v2"><img src="${escapeHtml(module.icon)}" alt="" /></span>
      <div class="class-module-copy-v2">
        <span>${escapeHtml(module.title)}</span>
        <small>${escapeHtml(module.questions ? `${module.students} students · ${module.questions} questions` : module.practiceSeconds ? `${formatDuration(module.practiceSeconds)} practice · ${module.practiceStudents} students` : "No class evidence")}</small>
      </div>
      <strong>${module.questions ? `${module.percentage}%` : "—"}</strong>
      <span class="category-module-bar-v2" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, module.percentage || 0))}%"></i></span>
      <p>${escapeHtml(module.feedback)}</p>
    </article>
  `).join("")}</div>`;
}

const CLASS_CATEGORY_CONFIG = {
  progress: {
    title: "Progress Mode",
    icon: "/assets/icons/dashboard/progress-mode.png",
    headingId: "teacherPracticeHeading",
    eyebrow: "Levelled learning",
    subtitle: "Class progress from levelled student app work.",
    detailSubtitle: "Detailed Progress Mode feedback across all EchoAural apps.",
    emptyFeedback: "Progress Mode feedback will appear after students complete levelled rounds."
  },
  quizzes: {
    title: "Live Sessions",
    icon: "/assets/icons/dashboard/join-live-session.png",
    headingId: "teacherQuizHeading",
    eyebrow: "Teacher-led learning",
    subtitle: "Saved results from live Teacher Mode rounds.",
    detailSubtitle: "Detailed live-session feedback across all EchoAural apps.",
    emptyFeedback: "Live-session feedback will appear after a logged-in Teacher Mode round."
  },
  homework: {
    title: "Homework",
    icon: "/assets/icons/dashboard/homework.png",
    headingId: "teacherHomeworkHeading",
    eyebrow: "Assigned learning",
    subtitle: "Teacher-set activities completed outside live lessons.",
    detailSubtitle: "Homework feedback will appear when assignments are introduced.",
    emptyFeedback: "No homework has been assigned yet."
  }
};

function teacherLearningTitleMarkup(title) {
  const parts = title === "Homework"
    ? ["Home", "work"]
    : title === "Progress Mode"
      ? ["Progress", "Mode"]
      : title.split(" ");
  return `<span class="teacher-learning-title-main">${escapeHtml(parts[0])}</span> <span class="teacher-learning-title-accent">${escapeHtml(parts.slice(1).join(" "))}</span>`;
}

function classCategorySummaryMarkup(categoryKey, category) {
  const config = CLASS_CATEGORY_CONFIG[categoryKey];
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  const practiceSeconds = categoryKey === "practice" ? Number(overall.practiceSeconds || 0) : 0;
  const practiceTimeText = practiceSeconds ? ` · ${formatDuration(practiceSeconds)} practice` : "";
  const studentCount = practiceSeconds && !hasEvidence
    ? Number(overall.practiceStudents || 0)
    : Number(overall.participatingStudents || 0);
  const percentage = hasEvidence ? `${Number(overall.percentage || 0)}%` : "—";
  const feedback = hasEvidence
    ? overall.compiledFeedback
    : practiceSeconds
      ? "Students have logged practice time. Progress-mode scores will appear here when they complete levelled rounds."
      : config.emptyFeedback;

  return `
    <div class="learning-summary-heading-v5">
      <div class="learning-summary-icon-slot-v5" aria-hidden="true"><span class="dashboard-line-icon-v5" style="--ea-icon:url('${config.icon}')"></span></div>
      <div class="learning-summary-title-v5">
        <p>${escapeHtml(config.eyebrow)}</p>
        <h3 id="${escapeHtml(config.headingId)}" class="teacher-learning-title">${teacherLearningTitleMarkup(config.title)}</h3>
      </div>
      <strong class="learning-summary-percentage-v5 ${scoreClass(overall.percentage, overall.questions)}">${percentage}</strong>
    </div>

    <div class="learning-summary-feedback-v5">
      <span>Compiled class feedback</span>
      <p>${escapeHtml(feedback)}</p>
    </div>

    <div class="learning-summary-footer-v5">
      <span>${Number(overall.questions || 0)} questions · ${Number(overall.rounds || 0)} rounds${practiceTimeText} · ${studentCount} students</span>
      <button class="secondary-button learning-detail-button-v5" type="button" data-category-detail="${escapeHtml(categoryKey)}"><span class="teacher-button-icon" aria-hidden="true"><img src="${escapeHtml(config.icon)}" alt="" /></span><span>Detailed feedback</span></button>
    </div>
  `;
}

// Real modules/progress-mode/ class-wide aggregate, computed client-side
// from state.progressModeSummaries (one row per student who has ever
// finished a round there — see loadProgressModeSummaries).
function progressModeClassAggregate() {
  const rows = Array.from(state.progressModeSummaries.values());
  const totalStudents = state.students.filter((student) => student.active).length;
  const participating = rows.filter((row) => row.totalQuestions > 0).length;
  let totalCorrect = 0;
  let totalQuestions = 0;
  let levelSum = 0;
  rows.forEach((row) => {
    totalCorrect += Number(row.totalCorrect || 0);
    totalQuestions += Number(row.totalQuestions || 0);
    const levelIndex = PROGRESSION_LEVEL_LABELS.indexOf(row.overallLevelLabel);
    levelSum += levelIndex >= 0 ? levelIndex : 0;
  });
  const percentage = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const averageLevelLabel = rows.length
    ? PROGRESSION_LEVEL_LABELS[Math.round(Math.min(3, levelSum / rows.length))]
    : "Foundation";
  return { rows, totalStudents, participating, totalCorrect, totalQuestions, percentage, averageLevelLabel };
}

function progressModeClassSummaryMarkup() {
  const config = CLASS_CATEGORY_CONFIG.progress;
  const data = progressModeClassAggregate();
  const hasEvidence = data.totalQuestions > 0;
  const feedback = hasEvidence
    ? `Class average level: ${data.averageLevelLabel}. ${data.participating} / ${data.totalStudents} students have played a round.`
    : config.emptyFeedback;

  return `
    <div class="learning-summary-heading-v5">
      <div class="learning-summary-icon-slot-v5" aria-hidden="true"><span class="dashboard-line-icon-v5" style="--ea-icon:url('${config.icon}')"></span></div>
      <div class="learning-summary-title-v5">
        <p>${escapeHtml(config.eyebrow)}</p>
        <h3 id="${escapeHtml(config.headingId)}" class="teacher-learning-title">${teacherLearningTitleMarkup("Progress Mode")}</h3>
      </div>
      <strong class="learning-summary-percentage-v5 ${scoreClass(data.percentage, data.totalQuestions)}">${hasEvidence ? `${data.percentage}%` : "—"}</strong>
    </div>

    <div class="learning-summary-feedback-v5">
      <span>Compiled class feedback</span>
      <p>${escapeHtml(feedback)}</p>
    </div>

    <div class="learning-summary-footer-v5">
      <span>${data.totalQuestions} questions · ${data.participating} / ${data.totalStudents} students</span>
      <button class="secondary-button learning-detail-button-v5" type="button" data-category-detail="progress"><span class="teacher-button-icon" aria-hidden="true"><img src="${escapeHtml(config.icon)}" alt="" /></span><span>Detailed feedback</span></button>
    </div>
  `;
}

// Level first, percentage as the tiebreaker — sorting by raw percentage
// alone ranked a student stuck at Foundation on a lucky small sample above
// one who had already reached Mastering (which requires clearing an 80%+
// bar at every level along the way — a hard early climb can easily average
// out lower lifetime than a shallower, more recent run of correct
// answers), while the badge shown right next to their name still displayed
// the real, higher level — a visible contradiction in a teacher-facing,
// whole-class view. Same reasoning as account/student-home/student-home.js's
// weakestArea/strongestAreas. A named, standalone comparator (not inlined
// into the .sort() call below) so it can be unit-tested directly — see
// account/teacher-dashboard/tests/roster-ranking.test.js.
function compareProgressModeRosterRows(a, b) {
  const levelA = PROGRESSION_LEVEL_LABELS.indexOf(a.overallLevelLabel);
  const levelB = PROGRESSION_LEVEL_LABELS.indexOf(b.overallLevelLabel);
  if (levelA !== levelB) return levelB - levelA;
  return progressModePercentage(b) - progressModePercentage(a);
}

// Class-wide Progress Mode detail dialog — a per-student roster breakdown,
// since (unlike quizzes/homework) there's no single shared "modules" list
// to show here; each student's own level/marks is the meaningful unit.
function progressModeClassDetailMarkup() {
  const data = progressModeClassAggregate();
  if (!data.rows.length) {
    return '<div class="progress-empty-state">Progress Mode feedback will appear after students complete levelled rounds.</div>';
  }

  const rows = data.rows
    .slice()
    .sort(compareProgressModeRosterRows)
    .map((row) => {
      const student = state.students.find((candidate) => String(candidate.id) === String(row.studentId));
      const name = student ? student.displayName : (row.displayName || row.username || "Student");
      const percentage = progressModePercentage(row);
      return `
        <div class="category-history-row-v2">
          <div><strong>${escapeHtml(name)}</strong><small>${row.roundsCompleted} round${row.roundsCompleted === 1 ? "" : "s"} · ${row.totalQuestions} questions</small></div>
          <span class="round-score-badge ${scoreClass(percentage, row.totalQuestions)}">${escapeHtml(row.overallLevelLabel)} · ${percentage}%</span>
        </div>
      `;
    }).join("");

  return `
    <div class="individual-score-v2 ${scoreClass(data.percentage, data.totalQuestions)}">
      <strong>${data.totalQuestions ? `${data.percentage}%` : "—"}</strong>
      <span>${data.totalQuestions} questions · ${data.participating} / ${data.totalStudents} students</span>
    </div>
    <div class="category-feedback-v2"><span>Compiled feedback</span><p>${escapeHtml(`Class average level: ${data.averageLevelLabel}.`)}</p></div>
    <details class="category-details-v2" open><summary>By student</summary><div class="category-history-list-v2">${rows}</div></details>
  `;
}

function renderClassCategory(targetId, categoryKey, category) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = classCategorySummaryMarkup(categoryKey, category);
}

function examLabDashboardRouteHref(route = {}) {
  if (route.status !== "live" || !route.path || route.path === "#") return "";
  const clean = String(route.path).replace(/^\.\.\//, "");
  return clean.startsWith("/") ? clean : `/modules/${clean}`;
}

function renderExamLabDashboardSessions(sessions = []) {
  if (!sessions.length) return `
    <section class="exam-lab-dashboard-section-v9">
      <div class="category-detail-section-heading-v5"><div><p class="card-eyebrow">Exam Lab</p><h3>Session diagnosis</h3></div></div>
      <div class="progress-empty-state">Finished Exam Lab sessions will appear here after an account-based live session ends.</div>
    </section>`;

  return `<section class="exam-lab-dashboard-section-v9">
    <div class="category-detail-section-heading-v5"><div><p class="card-eyebrow">Exam Lab</p><h3>Session diagnosis</h3></div><span>${sessions.length} saved session${sessions.length === 1 ? "" : "s"}</span></div>
    <div class="exam-lab-session-list-v9">${sessions.map((session, sessionIndex) => {
      const questions = (session.questions || []).map((question) => `
        <article class="exam-lab-heatmap-row-v9 ${scoreClass(question.successPercentage, 1)}">
          <div><strong>Question ${Number(question.number || 0)} · ${formatMark(question.marks)} ${Number(question.marks) === 1 ? "mark" : "marks"}</strong><span>${escapeHtml(question.prompt)}</span></div>
          <em>${Number(question.successPercentage || 0)}%</em>
          <p>${Number(question.fullyCorrect || 0)} fully correct · ${Number(question.partiallyCorrect || 0)} partially correct · ${Number(question.incorrect || 0)} incorrect · ${Number(question.unanswered || 0)} unanswered</p>
          <small>Skills: ${escapeHtml((question.skills || []).join(", ") || "Listening analysis")}</small>
        </article>`).join("");
      const skills = (session.skills || []).map((skill) => `
        <article class="exam-lab-dashboard-skill-v9 ${scoreClass(skill.percentage, 1)}">
          <div><strong>${escapeHtml(skill.skill)}</strong><span>${escapeHtml((skill.affectedStudents || []).length ? `Affected: ${skill.affectedStudents.join(", ")}` : "Secure across submitted work")}</span></div>
          <em>${Number(skill.percentage || 0)}%</em>
        </article>`).join("");
      const individuals = (session.individuals || []).map((student) => `
        <details class="exam-lab-dashboard-student-v9">
          <summary><span>${escapeHtml(student.name)} <small>${escapeHtml(student.className || "")}</small></span><strong>${student.submitted ? `${formatMark(student.score)} / ${formatMark(student.maximumScore)} · ${Number(student.percentage || 0)}%` : "Not submitted"}</strong></summary>
          <div>${(student.outcomes || []).map((outcome) => `
            <article>
              <div><strong>Question ${Number(outcome.number || 0)}</strong><span>${escapeHtml(outcome.answer || "No answer")}</span></div>
              <em>${formatMark(outcome.marks)} / ${formatMark(outcome.maximumScore)}</em>
              <p>${escapeHtml(outcome.feedback || "")}</p>
              ${outcome.correctResponse ? `<small><strong>Accepted response:</strong> ${escapeHtml(outcome.correctResponse)}</small>` : ""}
              ${(outcome.missingMarkPoints || []).length ? `<small><strong>Missing:</strong> ${escapeHtml(outcome.missingMarkPoints.join("; "))}</small>` : ""}
            </article>`).join("")}</div>
        </details>`).join("");
      const recommendations = (session.recommendations || []).map((recommendation) => {
        const route = recommendation.route || {};
        const href = examLabDashboardRouteHref(route);
        return `<article class="exam-lab-dashboard-recommendation-v9">
          <div><strong>${escapeHtml(route.module || "No live practice route yet")}</strong><span>${escapeHtml((recommendation.skills || []).join(", ") || "Listening skill gap")}</span></div>
          <p>${escapeHtml((recommendation.reasons || []).join(" "))}</p>
          <small>Affected students: ${escapeHtml((recommendation.affectedStudents || []).join(", ") || "None")}</small>
          ${href ? `<a href="${escapeHtml(href)}">Open practice route</a>` : "<em>No live practice route yet</em>"}
        </article>`;
      }).join("");
      return `<details class="exam-lab-dashboard-session-v9" ${sessionIndex === 0 ? "open" : ""}>
        <summary>
          <span><strong>${escapeHtml(session.title || "Exam Lab Live Session")}</strong><small>${escapeHtml(formatDateTime(session.completedAt))} · ${escapeHtml(session.className || "Unassigned students")}</small></span>
          <em>${Number(session.classAverage || 0)}% class average</em>
        </summary>
        <div class="exam-lab-session-body-v9">
          <div class="exam-lab-session-summary-v9">
            <div><span>Students</span><strong>${Number(session.submittedStudents || 0)} / ${Number(session.participatingStudents || 0)} submitted</strong></div>
            <div><span>Marks</span><strong>${formatMark(session.totalMarks)} available</strong></div>
            <div><span>Average</span><strong>${Number(session.classAverage || 0)}%</strong></div>
          </div>
          ${session.sourceTitle ? `<p class="exam-lab-dashboard-source-v9">Source: ${escapeHtml(session.sourceTitle)}</p>` : ""}
          <section><h4>Question heatmap</h4><div class="exam-lab-heatmap-list-v9">${questions}</div></section>
          <section><h4>Skill analysis</h4><div class="exam-lab-dashboard-skill-list-v9">${skills}</div></section>
          <section><h4>Individual results</h4><div class="exam-lab-dashboard-student-list-v9">${individuals}</div></section>
          <details class="exam-lab-dashboard-homework-v9"><summary>Review recommended homework</summary><p>No work is assigned automatically. Review the affected students and routes below.</p><div>${recommendations || "<p>No additional route is recommended.</p>"}</div></details>
        </div>
      </details>`;
    }).join("")}</div>
  </section>`;
}

function detailedCategoryMarkup(categoryKey, category) {
  const config = CLASS_CATEGORY_CONFIG[categoryKey];
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  const practiceSeconds = categoryKey === "practice" ? Number(overall.practiceSeconds || 0) : 0;
  const feedbackText = hasEvidence
    ? overall.compiledFeedback
    : practiceSeconds
      ? "Students have logged practice time. Progress-mode scores will appear here when they complete levelled rounds."
      : config.emptyFeedback;

  if (categoryKey === "homework") {
    return `
      <div class="homework-detail-placeholder-v5">
        <span class="homework-status-pill-v3">Coming next</span>
        <h3>No homework assigned</h3>
        <p>Homework assignments, deadlines, submissions, app-by-app averages and compiled feedback will appear here when the homework system is added.</p>
      </div>
    `;
  }

  return `
    <div class="category-detail-overview-v5">
      <div class="category-detail-score-v5 ${scoreClass(overall.percentage, overall.questions)}">
        <span>${escapeHtml(overall.level || "No evidence")}</span>
        <strong>${hasEvidence ? `${Number(overall.percentage || 0)}%` : "—"}</strong>
        <small>${formatMark(overall.score)} / ${formatMark(overall.maximumScore)} marks</small>
      </div>

      <div class="category-detail-metrics-v5">
        <div><span>Questions</span><strong>${Number(overall.questions || 0)}</strong></div>
        <div><span>Rounds</span><strong>${Number(overall.rounds || 0)}</strong></div>
        <div><span>Students</span><strong>${Number(overall.participatingStudents || 0)} / ${Number(overall.activeStudents || 0)}</strong></div>
        <div><span>Participation</span><strong>${Number(overall.participation || 0)}%</strong></div>
      </div>
    </div>

    <div class="category-detail-feedback-v5">
      <span>Compiled class feedback</span>
      <p>${escapeHtml(feedbackText)}</p>
    </div>

    <section class="category-detail-apps-v5">
      <div class="category-detail-section-heading-v5">
        <div><p class="card-eyebrow">All applications</p><h3>Detailed app feedback</h3></div>
        <span>${escapeHtml(config.title)}</span>
      </div>
      ${renderClassModules(category?.modules || [], false)}
    </section>
    ${categoryKey === "quizzes" ? renderExamLabDashboardSessions(state.classProgress?.examLabSessions || []) : ""}
  `;
}

function openCategoryDetail(categoryKey) {
  const config = CLASS_CATEGORY_CONFIG[categoryKey];
  if (!config || !els.categoryDetailDialog) return;

  const isProgressDetail = categoryKey === "progress";
  const categories = state.classProgress?.categories || {};
  const category = categoryKey === "homework"
    ? (categories.homework || { overall: {} })
    : (categories[categoryKey] || { overall: {}, modules: [] });

  els.categoryDetailEyebrow.textContent = config.eyebrow;
  els.categoryDetailTitle.textContent = config.title;
  els.categoryDetailSubtitle.textContent = config.detailSubtitle;
  els.categoryDetailIcon?.style.setProperty("--ea-icon", `url('${config.icon}')`);
  els.categoryDetailContent.innerHTML = isProgressDetail
    ? progressModeClassDetailMarkup()
    : detailedCategoryMarkup(categoryKey, category);
  els.categoryDetailDialog.showModal();
}

function renderClassProgress() {
  const progress = state.classProgress;
  if (!progress) return;
  const overall = progress.overall;
  els.classLevel.textContent = overall.level;
  els.classPercentage.textContent = overall.questions ? `${overall.percentage}%` : "—";
  els.classScore.textContent = `${formatMark(overall.score)} / ${formatMark(overall.maximumScore)} marks`;
  els.classQuestions.textContent = String(overall.questions);
  els.classRounds.textContent = String(overall.rounds);
  els.classStudents.textContent = `${overall.participatingStudents} / ${overall.activeStudents}`;
  els.classParticipation.textContent = `${overall.participation}%`;
  els.classFeedback.textContent = overall.compiledFeedback;

  const categories = progress.categories || { quizzes: { overall: {}, modules: [] } };
  const progressModeTarget = document.getElementById("teacherPracticeContent");
  if (progressModeTarget) progressModeTarget.innerHTML = progressModeClassSummaryMarkup();
  renderClassCategory("teacherQuizContent", "quizzes", categories.quizzes);
  renderClassCategory("teacherHomeworkContent", "homework", categories.homework || { overall: {} });
  renderStudents();
}

// Real modules/progress-mode/ data for this teacher's whole roster — a
// best-effort mirror the module itself POSTs after each round (see
// modules/progress-mode/script.js's postProgressSummaryBestEffort), so a
// student who has never played it simply has no row here, not an error.
async function loadProgressModeSummaries() {
  try {
    const result = await api("/api/teacher/progress-mode-summary");
    const map = new Map();
    (result?.students || []).forEach((row) => map.set(String(row.studentId), row));
    state.progressModeSummaries = map;
  } catch (error) {
    state.progressModeSummaries = new Map();
  }
}

function progressModeStudentSummary(studentId) {
  return state.progressModeSummaries.get(String(studentId)) || null;
}

function progressModePercentage(row) {
  return row && row.totalQuestions ? Math.round((row.totalCorrect / row.totalQuestions) * 100) : 0;
}

function progressModePill(row) {
  const questions = Number(row?.totalQuestions || 0);
  const percentage = progressModePercentage(row);
  const label = questions ? `${row.overallLevelLabel} · ${percentage}%` : "No progress";
  return `<span class="student-progress-summary ${scoreClass(percentage, questions)}">${escapeHtml(label)}</span>`;
}

async function loadClassProgress(showStatus = false) {
  if (showStatus) els.classProgressStatus.textContent = "Refreshing class results…";
  const [classProgress] = await Promise.all([
    api("/api/teacher/progress/class"),
    loadProgressModeSummaries()
  ]);
  state.classProgress = classProgress;
  renderClassProgress();
  els.classProgressStatus.textContent = showStatus ? "Class results refreshed." : "";
}

function individualProgressionLevelLabel(module) {
  const stage = module?.progressionStage || {};
  const labelIndex = PROGRESSION_LEVEL_LABELS.findIndex((label) => (
    label.toLowerCase() === String(stage.label || "").trim().toLowerCase()
  ));
  const numericLevel = Number.isFinite(Number(stage.currentLevel))
    ? Number(stage.currentLevel)
    : labelIndex;
  const levelIndex = Math.max(
    0,
    Math.min(PROGRESSION_LEVEL_LABELS.length - 1, Number.isFinite(numericLevel) ? numericLevel : 0)
  );

  return PROGRESSION_LEVEL_LABELS[levelIndex] || "Foundation";
}

function renderIndividualModules(categoryKey, modules = []) {
  return `<div class="individual-module-list-v2">${modules.map((module) => {
    const levelLabel = categoryKey === "progress" ? individualProgressionLevelLabel(module) : "";
    return `
    <div class="individual-module-row-v2 ${scoreClass(module.percentage, module.questions)}">
      <img src="${escapeHtml(module.icon)}" alt="" />
      <div>
        <strong>${escapeHtml(module.title)}</strong>
        <small>${escapeHtml(module.questions ? `${module.questions} questions · ${module.rounds} rounds` : module.practiceSeconds ? `${formatDuration(module.practiceSeconds)} practice · no scored results` : "No evidence yet")}</small>
        ${levelLabel ? `<em class="individual-module-level-v2">${escapeHtml(levelLabel)}</em>` : ""}
      </div>
      <span>${module.questions ? `${module.percentage}%` : "—"}</span>
      <p>${escapeHtml(module.questions ? module.nextStep : module.practiceSeconds ? "Practice time logged. Progress results will appear after a progress round." : "No evidence yet.")}</p>
    </div>
  `;
  }).join("")}</div>`;
}

function renderIndividualRounds(rounds = []) {
  if (!rounds.length) return '<div class="progress-empty-state">No completed rounds yet.</div>';
  return `<div class="category-history-list-v2">${rounds.map((round) => `
    <div class="category-history-row-v2">
      <div><strong>${escapeHtml(round.title)}</strong><small>${escapeHtml(formatDateTime(round.completedAt))} · ${round.questions} questions</small></div>
      <span class="round-score-badge ${scoreClass(round.percentage, round.questions)}">${formatMark(round.score)}/${formatMark(round.maximumScore)} · ${round.percentage}%</span>
      ${round.feedback ? `<p>${escapeHtml(round.feedback)}</p>` : ""}
    </div>
  `).join("")}</div>`;
}

function renderIndividualQuestions(questions = []) {
  if (!questions.length) return '<div class="progress-empty-state">No question feedback yet.</div>';
  return `<div class="category-history-list-v2">${questions.map((question) => {
    const detail = question.answerData?.title || question.answerData?.correctInstrument || question.answerData?.correctAnswer || question.questionId || "Question";
    const full = Number(question.score) >= Number(question.maximumScore) && Number(question.maximumScore) > 0;
    return `
      <div class="category-history-row-v2">
        <div><strong>${escapeHtml(question.moduleTitle)}</strong><small>${escapeHtml(detail)} · ${escapeHtml(formatDateTime(question.completedAt))}</small></div>
        <span class="question-mark ${full ? "is-full" : "is-review"}">${formatMark(question.score)}/${formatMark(question.maximumScore)}</span>
        <p>${escapeHtml(question.feedback || (full ? "Secure response." : "Review this question and try it again."))}</p>
      </div>
    `;
  }).join("")}</div>`;
}

function individualCategory(title, subtitle, category, featured = false, icon = "/assets/icons/dashboard/progress-mode.png", categoryKey = "") {
  const overall = category?.overall || {};
  const hasEvidence = Number(overall.questions || 0) > 0;
  return `
    <section class="individual-category-panel-v2 ${featured ? "is-featured" : ""}">
      <div class="ea-panel-heading-v2">
        <div class="ea-panel-heading-wave dashboard-panel-icon-v5" aria-hidden="true"><span class="dashboard-line-icon-v5" style="--ea-icon:url('${icon}')"></span></div>
        <div><p>${escapeHtml(subtitle)}</p><h3>${escapeHtml(title)}</h3></div>
      </div>
      ${title === "Homework" ? `
        <div class="homework-placeholder-v2 compact-homework-v2"><p class="card-eyebrow">Coming next</p><h3>No homework assigned</h3><p>Assigned work and submissions will appear here.</p></div>
      ` : `
        <div class="individual-score-v2 ${scoreClass(overall.percentage, overall.questions)}">
          <strong>${hasEvidence ? `${overall.percentage}%` : "—"}</strong>
          <span>${Number(overall.questions || 0)} questions · ${Number(overall.rounds || 0)} rounds</span>
        </div>
        <div class="category-feedback-v2"><span>Compiled feedback</span><p>${escapeHtml(hasEvidence ? overall.compiledFeedback : "No evidence in this section yet.")}</p></div>
        ${renderIndividualModules(categoryKey, category?.modules || [])}
        <details class="category-details-v2" open><summary>Recent rounds</summary>${renderIndividualRounds(category?.recentRounds || [])}</details>
        <details class="category-details-v2"><summary>Question feedback</summary>${renderIndividualQuestions(category?.recentQuestions || [])}</details>
      `}
    </section>
  `;
}

// Individual student's real modules/progress-mode/ panel, using that
// student's own `areas` breakdown from state.progressModeSummaries (richer
// than the class-wide roster view, which only has each student's totals).
function individualProgressModeCategory(studentId) {
  const row = progressModeStudentSummary(studentId);
  const hasEvidence = !!row && row.totalQuestions > 0;
  const percentage = progressModePercentage(row);
  const areas = hasEvidence && Array.isArray(row.areas) ? row.areas : [];

  return `
    <section class="individual-category-panel-v2">
      <div class="ea-panel-heading-v2">
        <div class="ea-panel-heading-wave dashboard-panel-icon-v5" aria-hidden="true"><span class="dashboard-line-icon-v5" style="--ea-icon:url('/assets/icons/dashboard/progress-mode.png')"></span></div>
        <div><p>Levelled learning</p><h3>Progress Mode</h3></div>
      </div>
      <div class="individual-score-v2 ${scoreClass(percentage, hasEvidence ? row.totalQuestions : 0)}">
        <strong>${hasEvidence ? `${percentage}%` : "—"}</strong>
        <span>${hasEvidence ? `${row.totalQuestions} questions · ${row.roundsCompleted} rounds` : "No evidence yet"}</span>
      </div>
      <div class="category-feedback-v2"><span>Overall level</span><p>${escapeHtml(hasEvidence ? row.overallLevelLabel : "Not started")}</p></div>
      ${areas.length ? `<div class="individual-module-list-v2">${areas.map((area) => {
        const areaPercentage = area.questions ? Math.round((area.correct / area.questions) * 100) : 0;
        return `
        <div class="individual-module-row-v2 ${scoreClass(areaPercentage, area.questions)}">
          <img src="/assets/icons/dashboard/progress-mode.png" alt="" />
          <div>
            <strong>${escapeHtml(area.label)}</strong>
            <small>${area.questions ? `${area.correct}/${area.questions} marks` : "No evidence yet"}</small>
            <em class="individual-module-level-v2">${escapeHtml(area.levelLabel)}</em>
          </div>
          <span>${area.questions ? `${areaPercentage}%` : "—"}</span>
        </div>
      `;
      }).join("")}</div>` : ""}
    </section>
  `;
}

const TEACHER_ELEMENT_ICONS = {
  melody: "/assets/icons/modules/melody-master.png",
  texture: "/assets/icons/modules/texture-trainer.png",
  harmony: "/assets/icons/modules/harmony-explorer.png",
  instrumentation: "/assets/icons/modules/instrument-identifier.png",
  rhythm: "/assets/icons/modules/meter-master.png",
  context: "/assets/icons/modules/context-coach.png"
};

const TEACHER_ELEMENT_LABELS = {
  melody: "Melody",
  texture: "Texture",
  harmony: "Harmony",
  instrumentation: "Instrumentation",
  rhythm: "Rhythm",
  context: "Context"
};

const TEACHER_MODULE_ELEMENTS = {
  "melody-master": "melody",
  "melody-master-dictation": "melody",
  "melody-master-devices": "melody",
  "melodic-intervals": "melody",
  "texture-trainer": "texture",
  "instrument-identifier": "instrumentation",
  "ensemble-recognition": "instrumentation",
  "meter-master": "rhythm",
  "key-signature-sprint": "harmony",
  "harmony-key-signatures": "harmony",
  "chord-identifier": "harmony",
  "cadence-coach": "harmony",
  "era-explorer": "context",
  "context-coach-composer": "context",
  "context-coach-period": "context",
  "exam-lab": "context",
  "musical-language-articulation": "melody",
  "musical-language-ornamentation": "melody",
  "musical-language-dynamics": "texture",
  "musical-language-tempo": "rhythm",
  "musical-language": "melody"
};

const TEACHER_SUBAPP_ICONS = {
  "melody-master": "/assets/icons/modules/mm-transparent/melodic-dictation-transparent.png",
  "melodic-devices": "/assets/icons/modules/mm-transparent/melodic-devices-transparent.png",
  "melodic-intervals": "/assets/icons/modules/mm-transparent/melodic-intervals-transparent.png",
  "texture-trainer": "/assets/icons/modules/texture-trainer.png",
  "instrument-identifier": "/assets/icons/modules/instrument-identifier.png",
  "ensemble-recognition": "/assets/icons/modules/ii-transparent/ensembles-transparent-v3.png",
  "key-signatures": "/assets/icons/modules/he-transparent/key-signatures-transparent.png",
  "chord-identifier": "/assets/icons/modules/he-transparent/chord-identifier-transparent.png",
  "cadence-coach": "/assets/icons/modules/he-transparent/cadences-transparent.png",
  "meter-master": "/assets/icons/modules/meter-master.png",
  "exam-lab": "/assets/icons/modules/exam-lab.png",
  "context-coach-composer": "/assets/icons/modules/cc-transparent/composers-transparent.png",
  "context-coach-period": "/assets/icons/modules/cc-transparent/eras-transparent.png"
};

const TEACHER_PM_SOURCE_MODULES = {
  "melody-master-dictation": "melody-master",
  "melody-master-devices": "melodic-devices",
  "melodic-intervals": "melodic-intervals",
  "instrument-identifier": "instrument-identifier",
  "ensemble-recognition": "ensemble-recognition",
  "texture-trainer": "texture-trainer",
  "chord-identifier": "chord-identifier",
  "harmony-key-signatures": "key-signatures",
  "cadence-coach": "cadence-coach",
  "meter-master": "meter-master",
  "musical-language-ornamentation": "vocabulary-melody",
  "musical-language-articulation": "vocabulary-melody",
  "musical-language-dynamics": "vocabulary-texture",
  "musical-language-tempo": "vocabulary-rhythm",
  "context-coach-composer": "context-coach-composer",
  "context-coach-period": "context-coach-period"
};

function teacherProgressNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function teacherElementTotals(progress) {
  const totals = new Map();
  Object.keys(TEACHER_ELEMENT_LABELS).forEach((areaKey) => totals.set(areaKey, {
    score: 0,
    maximumScore: 0,
    questions: 0,
    modules: []
  }));

  Object.entries(progress?.categories || {}).forEach(([categoryKey, category]) => {
    (category?.modules || []).forEach((module) => {
      const areaKey = TEACHER_MODULE_ELEMENTS[module.moduleId];
      if (!areaKey) return;
      const target = totals.get(areaKey);
      const score = teacherProgressNumber(module.score);
      const maximumScore = teacherProgressNumber(module.maximumScore);
      const questions = teacherProgressNumber(module.questions);
      target.score += score;
      target.maximumScore += maximumScore;
      target.questions += questions;
      const vocabularyModule = module.moduleId === "musical-language"
        || String(module.moduleId).startsWith("musical-language-");
      const displayModuleId = vocabularyModule ? `vocabulary-${areaKey}` : module.moduleId;
      const existing = target.modules.find((entry) => entry.moduleId === displayModuleId);
      if (existing) {
        existing.score += score;
        existing.maximumScore += maximumScore;
        existing.questions += questions;
        existing.percentage = existing.maximumScore ? Math.round((existing.score / existing.maximumScore) * 100) : 0;
      } else target.modules.push({
        categoryKey: "overall",
        title: vocabularyModule
          ? "Vocabulary"
          : module.moduleId === "texture-trainer"
            ? "Devices"
            : module.moduleId === "meter-master"
              ? "Devices"
            : (module.title || module.moduleId),
        moduleId: displayModuleId,
        icon: vocabularyModule ? "/assets/icons/modules/score-decoder.png" : (TEACHER_SUBAPP_ICONS[module.moduleId] || module.icon),
        score,
        maximumScore,
        questions,
        percentage: maximumScore ? Math.round((score / maximumScore) * 100) : 0,
        level: module.level || "Not started"
      });
    });
  });

  // Progress Mode is stored separately from the server's round history. Add
  // its area totals to the element cards so the headline percentages cover
  // all three modes. Do not add a synthetic "Progress Mode" sub-app row:
  // the breakdown is intentionally an overall-by-app view, not a mode view.
  const progressMode = progressModeStudentSummary(state.progressStudent?.id);
  (progressMode?.sources || []).forEach((source) => {
    const areaKey = String(source.areaKey || "");
    const target = totals.get(areaKey);
    if (!target) return;
    const score = teacherProgressNumber(source.correct);
    const maximumScore = teacherProgressNumber(source.questions);
    const sourceKey = String(source.sourceKey || "");
    const displayModuleId = TEACHER_PM_SOURCE_MODULES[sourceKey] || sourceKey;
    const existing = target.modules.find((module) => module.moduleId === displayModuleId);
    if (existing) {
      existing.score += score;
      existing.maximumScore += maximumScore;
      existing.questions += maximumScore;
      existing.percentage = existing.maximumScore ? Math.round((existing.score / existing.maximumScore) * 100) : 0;
      return;
    }
    const vocabulary = displayModuleId === "vocabulary-melody"
      || displayModuleId === "vocabulary-texture"
      || displayModuleId === "vocabulary-rhythm";
    target.modules.push({
      categoryKey: "overall",
      title: vocabulary ? "Vocabulary" : (source.label || sourceKey),
      moduleId: displayModuleId,
      icon: vocabulary ? "/assets/icons/modules/score-decoder.png" : (TEACHER_SUBAPP_ICONS[displayModuleId] || TEACHER_ELEMENT_ICONS[areaKey]),
      score,
      maximumScore,
      questions: maximumScore,
      percentage: maximumScore ? Math.round((score / maximumScore) * 100) : 0,
      level: "Overall"
    });
  });
  (progressMode?.areas || []).forEach((area) => {
    const target = totals.get(String(area.areaKey));
    if (!target) return;
    const questions = teacherProgressNumber(area.questions);
    const correct = teacherProgressNumber(area.correct);
    target.score += correct;
    target.maximumScore += questions;
    target.questions += questions;
  });

  // Context Coach is presented as its two student-facing sub-apps rather
  // than the legacy Exam Lab bucket. Keep both rows visible even when the
  // student has not attempted either one yet.
  const context = totals.get("context");
  if (context) {
    context.modules = context.modules.filter((module) => module.moduleId !== "exam-lab");
    [
      ["context-coach-composer", "Composers"],
      ["context-coach-period", "Eras & Periods"]
    ].forEach(([moduleId, title]) => {
      if (!context.modules.some((module) => module.moduleId === moduleId)) {
        context.modules.push({
          categoryKey: "overall",
          title,
          moduleId,
          icon: TEACHER_SUBAPP_ICONS[moduleId],
          score: 0,
          maximumScore: 0,
          questions: 0,
          percentage: 0,
          level: "Not started"
        });
      }
    });
  }

  const instrumentation = totals.get("instrumentation");
  if (instrumentation && !instrumentation.modules.some((module) => module.moduleId === "ensemble-recognition")) {
    instrumentation.modules.push({
      categoryKey: "overall",
      title: "Ensembles",
      moduleId: "ensemble-recognition",
      icon: TEACHER_SUBAPP_ICONS["ensemble-recognition"],
      score: 0,
      maximumScore: 0,
      questions: 0,
      percentage: 0,
      level: "Not started"
    });
  }

  const harmony = totals.get("harmony");
  if (harmony) {
    const harmonyApps = [
      ["key-signatures", "Keys"],
      ["chord-identifier", "Chords"],
      ["cadence-coach", "Cadences"]
    ];
    harmonyApps.forEach(([moduleId, title]) => {
      if (!harmony.modules.some((module) => module.moduleId === moduleId)) {
        harmony.modules.push({
          categoryKey: "overall",
          title,
          moduleId,
          icon: TEACHER_SUBAPP_ICONS[moduleId],
          score: 0,
          maximumScore: 0,
          questions: 0,
          percentage: 0,
          level: "Not started"
        });
      }
    });
  }

  ["melody", "texture", "rhythm"].forEach((areaKey) => {
    const area = totals.get(areaKey);
    if (!area || area.modules.some((module) => module.moduleId === `vocabulary-${areaKey}`)) return;
    area.modules.push({
      categoryKey: "overall",
      title: "Vocabulary",
      moduleId: `vocabulary-${areaKey}`,
      icon: "/assets/icons/modules/score-decoder.png",
      score: 0,
      maximumScore: 0,
      questions: 0,
      percentage: 0,
      level: "Not started"
    });
  });
  const melody = totals.get("melody");
  if (melody && !melody.modules.some((module) => module.moduleId === "melodic-devices")) {
    melody.modules.unshift({
      categoryKey: "overall",
      title: "Devices",
      moduleId: "melodic-devices",
      icon: TEACHER_SUBAPP_ICONS["melodic-devices"],
      score: 0,
      maximumScore: 0,
      questions: 0,
      percentage: 0,
      level: "Not started"
    });
  }
  return totals;
}

function renderTeacherElementBreakdown(areaKey, totals) {
  const detail = els.teacherElementBreakdownContent;
  if (!detail) return;
  const area = totals.get(areaKey) || { modules: [] };
  detail.innerHTML = `
    <div class="pm-detail teacher-pm-detail-v10">
      <div class="teacher-element-detail-toolbar-v10">
        <button type="button" class="teacher-element-breakdown-close-v10" data-element-breakdown-close>← Back to elements</button>
      </div>
      <div class="pm-element-columns">
        <section class="pm-panel pm-element-header">
          <span class="pm-element-header-icon" aria-hidden="true"><img src="${TEACHER_ELEMENT_ICONS[areaKey]}" alt="" /></span>
          <div class="pm-element-header-copy">
            <strong class="pm-element-header-title">${escapeHtml(TEACHER_ELEMENT_LABELS[areaKey] || areaKey)}</strong>
            <span class="pm-element-header-meta">${area.maximumScore ? `${Math.round((area.score / area.maximumScore) * 100)}% overall` : "No evidence yet"}</span>
          </div>
        </section>
        <section class="pm-panel">
          <div class="pm-section-heading"><h3>Overall performance by app</h3><p class="pm-section-note">Progress Mode, Live Sessions and Homework combined</p></div>
          <div class="pm-area-list" data-area="${escapeHtml(areaKey)}">
            ${area.modules.length ? area.modules.map((module) => `
              <div class="pm-subapp-row">
                <span class="pm-subapp-row-icon pm-subapp-row-icon-tile"><img src="${escapeHtml(module.icon || TEACHER_ELEMENT_ICONS[areaKey])}" alt="" /></span>
                <div class="pm-subapp-row-body">
                  <div class="pm-subapp-row-main">
                    <span class="pm-subapp-row-label" title="${escapeHtml(module.title)}">${escapeHtml(module.title)}</span>
                    <span class="pm-subapp-row-bar"><i style="width:${module.questions ? module.percentage : 0}%"></i></span>
                    <strong class="pm-subapp-row-pct">${module.questions ? `${module.percentage}%` : "—"}</strong>
                  </div>
                  <p class="pm-subapp-row-feedback">${module.questions ? `${formatMark(module.score)} / ${formatMark(module.maximumScore)} marks overall` : "No attempts yet — complete a round to start building feedback here."}</p>
                </div>
              </div>
            `).join("") : '<p class="pm-callout-empty">No apps found for this element.</p>'}
          </div>
        </section>
      </div>
    </div>
  `;
  detail.querySelector("[data-element-breakdown-close]")?.addEventListener("click", () => {
    els.teacherElementBreakdownDialog.close();
  });
  els.teacherElementBreakdownDialog.showModal();
}

function renderStudentProgress(progress) {
  state.studentProgressPayload = progress;
  const totals = teacherElementTotals(progress);
  const areaKeys = ["melody", "texture", "harmony", "instrumentation", "rhythm", "context"];

  els.studentProgressContent.innerHTML = `
    <section class="teacher-element-progress-view-v10">
      <div class="teacher-element-progress-grid-v10">
        ${areaKeys.map((areaKey) => {
          const area = totals.get(areaKey) || {};
          const questions = Number(area.maximumScore || area.questions || 0);
          const correct = Number(area.score || 0);
          const percentage = questions ? Math.round((correct / questions) * 100) : 0;
          const level = percentage >= 85 ? "Mastering" : percentage >= 70 ? "Securing" : percentage >= 50 ? "Developing" : "Foundation";
          return `
            <button type="button" class="teacher-element-progress-card-v10 ${scoreClass(percentage, questions)}" data-element-progress="${areaKey}" aria-label="View ${TEACHER_ELEMENT_LABELS[areaKey]} sub-app breakdown">
              <div class="teacher-element-progress-card-heading-v10">
                <span class="teacher-element-progress-icon-v10"><img src="${TEACHER_ELEMENT_ICONS[areaKey]}" alt="" /></span>
                <h4>${TEACHER_ELEMENT_LABELS[areaKey]}</h4>
              </div>
              <strong class="teacher-element-progress-percentage-v10">${questions ? `${percentage}%` : "—"}</strong>
              <div class="teacher-element-progress-bar-v10" aria-hidden="true"><span style="width:${questions ? percentage : 0}%"></span></div>
              <span class="teacher-element-progress-level-v10">${escapeHtml(level)}</span>
              <small>${questions ? `${correct} / ${questions} marks` : "No evidence yet"}</small>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;

  els.studentProgressContent.querySelectorAll("[data-element-progress]").forEach((card) => {
    card.addEventListener("click", () => {
      renderTeacherElementBreakdown(card.dataset.elementProgress, totals);
    });
  });
}

async function openStudentProgress(student) {
  state.progressStudent = student;
  els.progressStudentName.textContent = student.displayName;
  els.progressStudentMeta.textContent = `Username: ${student.username}`;
  els.studentProgressContent.innerHTML = '<div class="progress-empty-state">Loading student feedback…</div>';
  els.studentProgressDialog.showModal();
  await refreshOpenStudentProgress(false);
  scheduleStudentProgressRefresh();
}

async function refreshOpenStudentProgress(silent = true) {
  const student = state.progressStudent;
  if (!student?.id || !els.studentProgressDialog.open || state.studentProgressRefreshInFlight) return;
  state.studentProgressRefreshInFlight = true;

  try {
    const result = await api(`/api/teacher/students/${student.id}/progress`);
    els.progressStudentMeta.textContent = `Username: ${result.student.username} · ${result.student.active ? "Active account" : "Inactive account"}`;
    renderStudentProgress(result.progress);
  } catch (error) {
    if (!silent) els.studentProgressContent.innerHTML = `<div class="progress-empty-state">${escapeHtml(error.message)}</div>`;
    else console.warn(error);
  } finally {
    state.studentProgressRefreshInFlight = false;
  }
}

function scheduleStudentProgressRefresh() {
  clearStudentProgressRefresh();
  if (!state.progressStudent?.id || !els.studentProgressDialog.open) return;
  state.studentProgressRefreshTimer = window.setInterval(() => {
    refreshOpenStudentProgress(true);
  }, STUDENT_PROGRESS_REFRESH_MS);
}

function clearStudentProgressRefresh() {
  if (!state.studentProgressRefreshTimer) return;
  window.clearInterval(state.studentProgressRefreshTimer);
  state.studentProgressRefreshTimer = null;
}

function closeStudentProgressDialog() {
  clearStudentProgressRefresh();
  if (els.teacherElementBreakdownDialog?.open) els.teacherElementBreakdownDialog.close();
  state.progressStudent = null;
  els.studentProgressDialog.close();
}

async function loadDashboard() {
  try {
    const me = await api("/api/auth/me?role=teacher");
    if (me.role !== "teacher") throw new Error("Teacher login required.");
    state.teacher = me.teacher;
    renderAccount();

    const [studentResult] = await Promise.all([
      api("/api/teacher/students"),
      loadClasses()
    ]);

    state.students = studentResult.students || [];
    state.teacher.licence.seatLimit = studentResult.seatLimit;
    renderStudents();
    await loadClassProgress(false);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.replace("/account/teacher-login/");
      return;
    }
    els.studentList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    els.classProgressStatus.textContent = error.message;
  }
}

els.studentCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(els.studentFormMessage);
  setMessage(els.studentDialogMessage);
  els.createStudentButton.disabled = true;
  els.createStudentButton.textContent = "Adding…";

  try {
    await api("/api/teacher/students", {
      method: "POST",
      body: JSON.stringify({
        classId: els.studentCreateForm.classId.value,
        displayName: els.studentCreateForm.displayName.value,
        username: els.studentCreateForm.username.value,
        pin: els.studentCreateForm.pin.value
      })
    });

    els.studentCreateForm.reset();
    const [studentResult] = await Promise.all([
      api("/api/teacher/students"),
      loadClasses()
    ]);
    state.students = studentResult.students || [];
    renderStudents();
    await loadClassProgress(false);
    setMessage(els.studentFormMessage, "Student account created.", "success");
    els.studentDialog.close();
  } catch (error) {
    setMessage(els.studentDialogMessage, error.message, "error");
  } finally {
    els.createStudentButton.textContent = "Add student";
    renderClassSummary();
  }
});

els.studentList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (button?.dataset.action === "toggle-class") {
    const classGroup = button.closest("[data-class-id]");
    const classId = classGroup?.dataset.classId;
    if (!classId) return;
    if (state.expandedClassIds.has(classId)) state.expandedClassIds.delete(classId);
    else state.expandedClassIds.add(classId);
    renderStudents();
    return;
  }

  const row = event.target.closest("[data-student-id]");
  if (!button || !row) return;
  const student = state.students.find((item) => item.id === row.dataset.studentId);
  if (!student) return;

  if (button.dataset.action === "view-progress") {
    await openStudentProgress(student);
    return;
  }

  if (button.dataset.action === "reset-pin") {
    state.resetStudent = student;
    els.pinDialogStudent.textContent = `Choose a new PIN for ${student.displayName}.`;
    setMessage(els.pinMessage);
    els.pinForm.reset();
    els.pinDialog.showModal();
    return;
  }

  if (button.dataset.action === "toggle") {
    button.disabled = true;
    try {
      await api(`/api/teacher/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !student.active })
      });
      const [result] = await Promise.all([
        api("/api/teacher/students"),
        loadClasses()
      ]);
      state.students = result.students || [];
      renderStudents();
      await loadClassProgress(false);
    } catch (error) {
      setMessage(els.studentFormMessage, error.message, "error");
      button.disabled = false;
    }
  }
});

els.pinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.resetStudent) return;
  setMessage(els.pinMessage);
  try {
    await api(`/api/teacher/students/${state.resetStudent.id}/reset-pin`, {
      method: "POST",
      body: JSON.stringify({ pin: els.pinForm.pin.value })
    });
    els.pinDialog.close();
    setMessage(els.studentFormMessage, `PIN reset for ${state.resetStudent.displayName}.`, "success");
    state.resetStudent = null;
  } catch (error) {
    setMessage(els.pinMessage, error.message, "error");
  }
});


els.openClassDialog.addEventListener("click", openClassSetup);
els.closeClassDialog.addEventListener("click", () => els.classDialog.close());
els.cancelClassButton.addEventListener("click", () => els.classDialog.close());
els.classDialog.addEventListener("click", (event) => {
  if (event.target === els.classDialog) els.classDialog.close();
});

els.classDetailsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setMessage(els.classDetailsMessage);

  const className = String(els.classDetailsForm.elements.className.value || "").trim();
  if (!className) {
    setMessage(els.classDetailsMessage, "Enter a class name.", "error");
    return;
  }

  state.classDraft = {
    className,
    yearGroup: String(els.classDetailsForm.elements.yearGroup.value || "").trim(),
    examBoard: String(els.classDetailsForm.elements.examBoard.value || "").trim()
  };

  els.draftClassName.textContent = state.classDraft.className;
  showClassWizardStep("students");
  renderDraftStudents();
});

els.backToClassDetails.addEventListener("click", () => {
  showClassWizardStep("details");
});

els.classStudentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setMessage(els.classStudentMessage);

  const displayName = String(els.classStudentForm.elements.displayName.value || "").trim();
  const username = cleanDraftUsername(els.classStudentForm.elements.username.value);
  const pin = String(els.classStudentForm.elements.pin.value || "").trim();

  if (!displayName) {
    setMessage(els.classStudentMessage, "Enter the student’s name.", "error");
    return;
  }
  if (username.length < 2) {
    setMessage(els.classStudentMessage, "Use a username of at least two characters.", "error");
    return;
  }
  if (!/^[0-9]{4,6}$/.test(pin)) {
    setMessage(els.classStudentMessage, "Use a four-to-six digit PIN.", "error");
    return;
  }

  const usernameUsed = state.students.some((student) => student.username.toLowerCase() === username)
    || state.draftStudents.some((student) => student.username === username);
  if (usernameUsed) {
    setMessage(els.classStudentMessage, `The username "${username}" is already in use.`, "error");
    return;
  }

  const capacity = Math.min(20, Number(state.classMeta.seatsRemaining || 0));
  if (state.draftStudents.length >= capacity) {
    setMessage(els.classStudentMessage, "No more active student seats are available for this class.", "error");
    return;
  }

  state.draftStudents.push({ displayName, username, pin });
  els.classStudentForm.reset();
  renderDraftStudents();
  window.setTimeout(() => els.classStudentForm.elements.displayName.focus(), 0);
});

els.classDraftStudentList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove-draft-student"]');
  const row = event.target.closest("[data-draft-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.draftIndex);
  if (!Number.isInteger(index)) return;
  state.draftStudents.splice(index, 1);
  renderDraftStudents();
});

els.finishClassButton.addEventListener("click", async () => {
  if (!state.classDraft || !state.draftStudents.length) return;

  setMessage(els.classStudentMessage);
  els.finishClassButton.disabled = true;
  els.finishClassButton.textContent = "Creating class…";

  try {
    const result = await api("/api/teacher/classes", {
      method: "POST",
      body: JSON.stringify({
        ...state.classDraft,
        students: state.draftStudents
      })
    });

    const [studentResult] = await Promise.all([
      api("/api/teacher/students"),
      loadClasses()
    ]);
    state.students = studentResult.students || [];
    renderStudents();
    await loadClassProgress(false);

    els.classDialog.close();
    showGeneratedLogins(result);
    resetClassWizard();
  } catch (error) {
    setMessage(els.classStudentMessage, error.message, "error");
  } finally {
    els.finishClassButton.textContent = "Finish class";
    renderDraftStudents();
  }
});

els.closeGeneratedLogins.addEventListener("click", () => els.generatedLoginsDialog.close());
els.generatedLoginsDialog.addEventListener("click", (event) => {
  if (event.target === els.generatedLoginsDialog) els.generatedLoginsDialog.close();
});
els.printGeneratedLogins.addEventListener("click", printLoginSheet);
els.copyGeneratedLogins.addEventListener("click", async () => {
  if (!state.generatedCredentials) return;
  try {
    await navigator.clipboard.writeText(credentialsText(state.generatedCredentials));
    els.copyGeneratedLogins.textContent = "Copied";
    window.setTimeout(() => { els.copyGeneratedLogins.textContent = "Copy all logins"; }, 1200);
  } catch (_error) {
    els.copyGeneratedLogins.textContent = "Copy failed";
  }
});

els.openStudentDialog.addEventListener("click", () => {
  const classes = activeClasses();
  const { seatsRemaining: remainingSeats } = currentSeatAvailability();

  if (!classes.length) {
    openClassSetup();
    return;
  }
  if (remainingSeats <= 0) return;

  els.studentCreateForm.reset();
  populateClassSelect(classes[0].id);
  setMessage(els.studentDialogMessage);
  els.studentDialog.showModal();
  window.setTimeout(() => els.studentCreateForm.displayName.focus(), 0);
});
els.cancelStudentButton.addEventListener("click", () => els.studentDialog.close());
els.studentDialog.addEventListener("click", (event) => {
  if (event.target === els.studentDialog) els.studentDialog.close();
});

els.learningSummaryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-detail]");
  if (!button) return;
  openCategoryDetail(button.dataset.categoryDetail);
});

els.openLiveLaunchDialog.addEventListener("click", () => openTeacherLaunchDialog("live"));
els.openHomeworkLaunchDialog.addEventListener("click", () => openTeacherLaunchDialog("homework"));
els.closeTeacherLaunchDialog.addEventListener("click", closeTeacherLaunchDialog);
els.cancelTeacherLaunch.addEventListener("click", closeTeacherLaunchDialog);
els.teacherLaunchDialog.addEventListener("click", (event) => {
  const source = event.target.closest("[data-launch-source]");
  if (source) {
    if (!source.disabled) setTeacherLaunchSource(source.dataset.launchSource);
    return;
  }
  const option = event.target.closest("[data-launch-option]");
  if (option) {
    selectTeacherLaunchOption(option);
    return;
  }
  if (event.target === els.teacherLaunchDialog) closeTeacherLaunchDialog();
});
els.teacherLaunchApp.addEventListener("change", () => {
  if (els.teacherLaunchSource.value !== "app") return;
  setTeacherLaunchValue(els.teacherLaunchModule, els.teacherLaunchApp.value);
  invalidateTeacherLaunchPreview();
  updateTeacherLaunchHelper();
});
els.teacherLaunchClass.addEventListener("change", invalidateTeacherLaunchPreview);
els.teacherLaunchElement.addEventListener("change", invalidateTeacherLaunchPreview);
els.teacherLaunchSkill.addEventListener("change", invalidateTeacherLaunchPreview);
els.teacherLaunchAvoidRecent.addEventListener("change", invalidateTeacherLaunchPreview);
els.teacherLaunchLeaderboard.addEventListener("change", invalidateTeacherLaunchPreview);
els.previewTeacherLaunch?.addEventListener("click", previewTeacherQuestionSet);
els.teacherLaunchForm.addEventListener("submit", submitTeacherLaunch);

els.closeCategoryDetail.addEventListener("click", () => els.categoryDetailDialog.close());
els.categoryDetailDialog.addEventListener("click", (event) => {
  if (event.target === els.categoryDetailDialog) els.categoryDetailDialog.close();
});

els.openPasswordDialog.addEventListener("click", () => {
  els.passwordForm.reset();
  setMessage(els.passwordMessage);
  els.passwordDialog.showModal();
});
els.cancelPasswordButton.addEventListener("click", () => els.passwordDialog.close());
els.cancelPinButton.addEventListener("click", () => els.pinDialog.close());
els.closeStudentProgress.addEventListener("click", closeStudentProgressDialog);
els.studentProgressDialog.addEventListener("click", (event) => {
  if (event.target === els.studentProgressDialog) closeStudentProgressDialog();
});
els.studentProgressDialog.addEventListener("close", () => {
  clearStudentProgressRefresh();
  state.progressStudent = null;
});
els.teacherElementBreakdownDialog.addEventListener("click", (event) => {
  if (event.target === els.teacherElementBreakdownDialog) els.teacherElementBreakdownDialog.close();
});
window.addEventListener("focus", () => {
  refreshOpenStudentProgress(true);
});
els.refreshClassProgress.addEventListener("click", async () => {
  els.refreshClassProgress.disabled = true;
  try { await loadClassProgress(true); }
  catch (error) { els.classProgressStatus.textContent = error.message || "Could not refresh results."; }
  finally { els.refreshClassProgress.disabled = false; }
});

els.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentPassword = els.passwordForm.currentPassword.value;
  const newPassword = els.passwordForm.newPassword.value;
  const confirmPassword = els.passwordForm.confirmPassword.value;
  if (newPassword !== confirmPassword) {
    setMessage(els.passwordMessage, "The new passwords do not match.", "error");
    return;
  }

  try {
    await api("/api/auth/teacher/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    state.teacher.mustChangePassword = false;
    els.passwordNotice.hidden = true;
    setMessage(els.passwordMessage, "Password updated.", "success");
    window.setTimeout(() => els.passwordDialog.close(), 650);
  } catch (error) {
    setMessage(els.passwordMessage, error.message, "error");
  }
});

els.logoutButton.addEventListener("click", async () => {
  try { await api("/api/auth/teacher/logout", { method: "POST" }); }
  finally { window.location.assign("/account/teacher-login/"); }
});

loadDashboard();
