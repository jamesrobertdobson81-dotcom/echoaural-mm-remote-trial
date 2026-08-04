const SOURCE_MELODY_CLIPS = (typeof melodyClips !== "undefined" && Array.isArray(melodyClips) && melodyClips.length)
  ? melodyClips
  : [];

const LEVELLED_MELODY_CLIPS = (typeof melodyMasterLevelledClips !== "undefined" && Array.isArray(melodyMasterLevelledClips) && melodyMasterLevelledClips.length)
  ? melodyMasterLevelledClips
  : [];

const ALL_MELODY_CLIPS = (LEVELLED_MELODY_CLIPS.length ? LEVELLED_MELODY_CLIPS : SOURCE_MELODY_CLIPS).slice();
const MELODIC_DEVICES_DATA_URL = "data/melody-master-melodic-devices-50.json";

const DICTATION_LEVELS = [
  { id: "Foundation", index: 0 },
  { id: "Developing", index: 1 },
  { id: "Securing", index: 2 },
  { id: "Mastering", index: 3 }
];

let currentQuestionIndex = 0;
let MM001_SOURCE = {};
let MM001 = {};
let MM001_DICTATION = {};

const DEFAULT_DICTATION_LAYOUT = {
  noteImage: "assets/icons/notes/semiquaver-sibelius.png",
  noteImageFallback: "assets/icons/notes/semiquaver-sibelis.png",
  topLinePitch: "F5",
  staffTopY: 30.05,
  staffStepY: 5.05,
  homeY: 2.0,
  snapToleranceY: 10,
  // Display size is based on the score image itself, not viewport pixels.
  // The draggable note artwork is deliberately wider, and only slightly taller,
  // so its notehead/proportions match the printed Sibelius noteheads at every score zoom level.
  noteWidthPercent: 3.95,
  noteHeightPercent: 47.0,
  noteStretchX: 1.95,
  visualAnchorY: 79.55,
  noteCountLabel: "notes",
  staffPitches: ["F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4"],
  slots: [
    { x: 70.6, pitch: "G4" },
    { x: 73.6, pitch: "G4" },
    { x: 76.6, pitch: "A4" },
    { x: 79.6, pitch: "B4" },
    { x: 82.6, pitch: "C5" },
    { x: 85.6, pitch: "D5" }
  ]
};

function getFallbackClip() {
  return {
    id: "MM001",
    file: "questions/MM001/MM001-audio.mp3",
    questionImage: "questions/MM001/MM001-question.png",
    answerImage: "questions/MM001/MM001-answer.png",
    composer: "W. A. Mozart",
    work: "Sonata facile, K.545",
    movement: "2nd movement",
    question: "Complete the six missing semiquavers.",
    answerPitches: ["G4", "G4", "A4", "B4", "C5", "D5"],
    noteImage: "assets/icons/notes/semiquaver-sibelius.png",
    noteImageFallback: "assets/icons/notes/semiquaver-sibelis.png",
    dictationLayout: DEFAULT_DICTATION_LAYOUT
  };
}

function buildQuestionData(source = {}) {
  return {
    id: source.id || "MM001",
    audio: source.file || source.audio || "questions/MM001/MM001-audio.mp3",
    questionImage: source.questionImage || "questions/MM001/MM001-question.png",
    answerImage: source.answerImage || "questions/MM001/MM001-answer.png",
    title: source.title || source.id || "MM001",
    composer: source.composer || "W. A. Mozart",
    work: source.work || "Sonata facile, K.545",
    movement: source.movement || "2nd movement",
    performer: source.performer || source.hiddenMetadata?.rights?.performer || "",
    instrumentation: source.instrumentation || source.hiddenMetadata?.source?.instrumentation || "",
    rights: source.rights || source.licence || source.license || source.hiddenMetadata?.rights?.licenceType || "",
    source: source.source || source.work || "",
    task: source.task || source.question || "Complete the melody."
  };
}

function buildDictationLayout(source = {}) {
  const sourceLayout = source.dictationLayout || {};
  return {
    ...DEFAULT_DICTATION_LAYOUT,
    ...sourceLayout,
    noteImage: source.noteImage || sourceLayout.noteImage || DEFAULT_DICTATION_LAYOUT.noteImage,
    noteImageFallback: source.noteImageFallback || sourceLayout.noteImageFallback || DEFAULT_DICTATION_LAYOUT.noteImageFallback,
    slots: Array.isArray(sourceLayout.slots) ? sourceLayout.slots : DEFAULT_DICTATION_LAYOUT.slots
  };
}

function setActiveQuestion(index = 0) {
  const safeIndex = Math.max(0, Math.min(index, Math.max(ALL_MELODY_CLIPS.length - 1, 0)));
  currentQuestionIndex = safeIndex;
  MM001_SOURCE = ALL_MELODY_CLIPS[safeIndex] || getFallbackClip();
  MM001 = buildQuestionData(MM001_SOURCE);
  MM001_DICTATION = buildDictationLayout(MM001_SOURCE);
}

function getNoteCountLabel(total = 0) {
  return MM001_DICTATION.noteCountLabel || `${total || dictationSlots.length || 0} notes`;
}

setActiveQuestion(0);

let audio = null;
let isLoaded = false;
let isShowingAnswer = false;
let hasPlayedAudio = false;
let isQuestionComplete = false;
let scoreFocusTimer = null;
let perfectAnswerRevealTimer = null;
let questionHandoffTimer = null;
let dictationSlots = [];
let dragState = null;
let lastAttemptDiagnostic = null;

const DEFAULT_QUIZ_SETTINGS = {
  questionCount: 3,
  playLimit: 3
};

let quizSettings = { ...DEFAULT_QUIZ_SETTINGS };
let roundQuestionIndices = [];
let roundQuestionPosition = 0;
let isRoundActive = false;
let playsUsedThisQuestion = 0;
let isAudioPlaying = false;
let playRemainingAtStartOfCurrentPlayback = null;
let roundResults = [];
let hasSubmittedCurrentQuestion = false;
let isRoundFeedbackOpen = false;
let roundFeedbackOverlay = null;
let activeRoundSkill = "dictation";
let melodicDeviceQuestions = [];
let melodicDevicesLoadPromise = null;
let currentDeviceQuestion = null;
let currentDeviceQuestionIndex = 0;
let selectedDeviceAnswer = "";


const appShell = document.querySelector(".app-shell");
const quizPanel = document.getElementById("gameScreen");
const settingsToggle = document.getElementById("settingsToggle");
const advancedSettings = document.getElementById("advancedSettings");

const startButton = document.getElementById("startButton");
const playButton = document.getElementById("playButton");
const checkAnswerButton = document.getElementById("checkAnswerButton");
const showAnswerButton = document.getElementById("showAnswerButton");
const resetButton = document.getElementById("restartButton");

const questionText = document.getElementById("questionText");
const feedback = document.getElementById("feedback");
const scoreText = document.getElementById("scoreText");
const streakText = document.getElementById("streakText");
const xpText = document.getElementById("xpText");
const roundText = document.getElementById("roundText");
const progressInner = document.getElementById("progressInner");
const answerCard = document.getElementById("answerCard");
const scoreShell = document.getElementById("scoreShell");
const scoreImage = document.getElementById("scoreImage");
const scoreTrackInfo = document.getElementById("scoreTrackInfo");
const scoreCloseButton = document.getElementById("scoreCloseButton");
const scoreOverlay = document.getElementById("scoreOverlay");
const scoreImageFrame = document.querySelector(".score-image-frame");
const dictationWorkspace = document.getElementById("answers");
const dictationConsole = document.querySelector(".dictation-console");
let noteScaleResizeObserver = null;
let noteScaleFrameId = null;

function getSelectedRadioValue(name, fallback) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : fallback;
}

function normaliseDictationLevel(value) {
  const clean = String(value || "").trim().toLowerCase();
  return DICTATION_LEVELS.find(level => level.id.toLowerCase() === clean)?.id || DICTATION_LEVELS[0].id;
}

function getSelectedDictationLevel() {
  return normaliseDictationLevel(getSelectedRadioValue("mmLevel", DICTATION_LEVELS[0].id));
}

function isMelodyProgressionMode() {
  return Boolean(window.EAMelodyMasterProgression?.isActive);
}

function isMixedDifficultyMode() {
  const mixedInput = document.querySelector('input[name="mmMixedDifficulty"]');
  return !isMelodyProgressionMode() && Boolean(mixedInput?.checked);
}

function getDictationQuestionIndexes(levelName = getSelectedDictationLevel()) {
  if (isMixedDifficultyMode()) {
    return ALL_MELODY_CLIPS.map((_clip, index) => index);
  }

  const indexes = ALL_MELODY_CLIPS
    .map((clip, index) => (
      String(clip?.level || clip?.hiddenMetadata?.level || "").trim().toLowerCase() === String(levelName).toLowerCase()
        ? index
        : -1
    ))
    .filter(index => index >= 0);

  return indexes.length || !LEVELLED_MELODY_CLIPS.length
    ? indexes
    : ALL_MELODY_CLIPS.map((_clip, index) => index);
}

function selectDictationMode() {
  const dictationInput = document.querySelector('input[name="quizMode"][value="dictation"]');
  if (dictationInput) dictationInput.checked = true;
}

function getQuizSettingsFromControls() {
  const selectedQuestionCount = Number(getSelectedRadioValue("questionCount", DEFAULT_QUIZ_SETTINGS.questionCount));
  const selectedPlayLimit = Number(getSelectedRadioValue("playLimit", DEFAULT_QUIZ_SETTINGS.playLimit));
  const availableQuestions = Math.max(
    isDevicesSkillSelected()
      ? getDeviceQuestionIndexes().length || melodicDeviceQuestions.length || 1
      : getDictationQuestionIndexes().length || ALL_MELODY_CLIPS.length || 1,
    1
  );

  return {
    questionCount: Math.max(1, Math.min(Number.isFinite(selectedQuestionCount) ? selectedQuestionCount : DEFAULT_QUIZ_SETTINGS.questionCount, availableQuestions)),
    playLimit: Math.max(1, Number.isFinite(selectedPlayLimit) ? selectedPlayLimit : DEFAULT_QUIZ_SETTINGS.playLimit)
  };
}

function shuffleArray(items = []) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildRoundQuestionIndices(questionCount = DEFAULT_QUIZ_SETTINGS.questionCount) {
  const indexes = getDictationQuestionIndexes();
  const pool = indexes.length ? indexes : Array.from({ length: ALL_MELODY_CLIPS.length || 1 }, (_item, index) => index);
  const count = Math.max(1, Math.min(Number(questionCount) || DEFAULT_QUIZ_SETTINGS.questionCount, pool.length));
  return shuffleArray(pool).slice(0, count);
}

function getRoundTotal() {
  return roundQuestionIndices.length || quizSettings.questionCount || DEFAULT_QUIZ_SETTINGS.questionCount;
}

function getRoundLabel() {
  if (isRoundActive) {
    return `Question ${roundQuestionPosition + 1} of ${getRoundTotal()}`;
  }

  return "Ready";
}

function resetPlayCounterForQuestion() {
  playsUsedThisQuestion = 0;
}

function getRemainingPlays() {
  return Math.max(0, (quizSettings.playLimit || DEFAULT_QUIZ_SETTINGS.playLimit) - playsUsedThisQuestion);
}

function getPlayLimitLabel() {
  const playLimit = quizSettings.playLimit || DEFAULT_QUIZ_SETTINGS.playLimit;
  return `${playLimit} ${playLimit === 1 ? "play" : "plays"}`;
}

function getSelectedQuizMode() {
  return getSelectedRadioValue("quizMode", "dictation");
}

function isDevicesSkillSelected() {
  return getSelectedQuizMode() === "devices";
}

function isDevicesRound() {
  return activeRoundSkill === "devices";
}

function normaliseDeviceAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[’']/g, "'")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[^a-z0-9/#\s-]/g, "")
    .replace(/\s+/g, " ");
}

function normaliseDeviceLevel(value) {
  return normaliseDictationLevel(value);
}

function getSelectedDeviceLevel() {
  return normaliseDeviceLevel(getSelectedRadioValue("mmLevel", DICTATION_LEVELS[0].id));
}

function prepareMelodicDeviceQuestion(rawQuestion = {}) {
  const choices = Array.isArray(rawQuestion.choices)
    ? rawQuestion.choices.map((choice) => String(choice || "").trim()).filter(Boolean)
    : String(rawQuestion.options || rawQuestion.Options || "")
      .split("|")
      .map((choice) => choice.trim())
      .filter(Boolean);
  const correctAnswer = String(rawQuestion.correctAnswer || rawQuestion["Correct Answer"] || "").trim();
  const acceptedAnswers = Array.isArray(rawQuestion.acceptedAnswers)
    ? rawQuestion.acceptedAnswers
    : String(rawQuestion["Accepted Answers"] || correctAnswer)
      .split(";")
      .map((answer) => answer.trim())
      .filter(Boolean);
  const audioId = String(rawQuestion.audioId || rawQuestion["Audio ID"] || "").trim();
  const sourceAudio = String(rawQuestion.audio || rawQuestion["Audio Path"] || "").trim();
  const audioPath = sourceAudio
    ? sourceAudio.replace(/^audio_clips\//, "audio/melodic-devices/")
    : `audio/melodic-devices/${audioId}.mp3`;

  return {
    id: String(rawQuestion.id || rawQuestion["Question ID"] || "").trim(),
    audioId,
    audio: audioPath,
    sourceId: String(rawQuestion.sourceId || rawQuestion["Existing MM Source ID"] || "").trim(),
    level: normaliseDeviceLevel(rawQuestion.level || rawQuestion.Difficulty || "Foundation"),
    mode: String(rawQuestion.mode || rawQuestion["Question Mode"] || "Melodic devices").trim(),
    category: String(rawQuestion.category || rawQuestion["Device Category"] || "Melodic devices").trim(),
    question: String(rawQuestion.question || rawQuestion.Question || "Choose the best answer.").trim(),
    choices,
    correctAnswer,
    acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : [correctAnswer],
    answerSignature: normaliseDeviceAnswer(correctAnswer),
    acceptedSignatures: (acceptedAnswers.length ? acceptedAnswers : [correctAnswer]).map(normaliseDeviceAnswer),
    marks: Math.max(1, Number(rawQuestion.marks || rawQuestion.Marks || 1) || 1),
    feedback: String(rawQuestion.feedback || rawQuestion["Feedback / Teaching Point"] || "").trim(),
    composer: String(rawQuestion.composer || rawQuestion.Composer || "").trim(),
    work: String(rawQuestion.work || rawQuestion.Work || "").trim(),
    movement: String(rawQuestion.movement || rawQuestion["Movement / Section"] || "").trim(),
    performer: String(rawQuestion.performer || rawQuestion["Performer / Ensemble"] || "").trim(),
    instrumentation: String(rawQuestion.instrumentation || rawQuestion.Instrumentation || "").trim(),
    sourceProvider: String(rawQuestion.sourceProvider || rawQuestion["Source / Provider"] || "").trim(),
    licenceType: String(rawQuestion.licenceType || rawQuestion["Licence Type"] || "").trim()
  };
}

async function loadMelodicDeviceQuestions() {
  if (!melodicDevicesLoadPromise) {
    melodicDevicesLoadPromise = fetch(MELODIC_DEVICES_DATA_URL, { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Melodic Devices questions failed to load (${response.status}).`);
        return response.json();
      })
      .then((data) => {
        const questions = Array.isArray(data.questions) ? data.questions : [];
        melodicDeviceQuestions = questions.map(prepareMelodicDeviceQuestion).filter((question) => (
          question.id && question.audio && question.choices.length && question.correctAnswer
        ));
        return melodicDeviceQuestions;
      });
  }

  return melodicDevicesLoadPromise;
}

function getDeviceQuestionPool(levelName = getSelectedDeviceLevel()) {
  const requestedLevel = normaliseDeviceLevel(levelName);
  const matching = melodicDeviceQuestions.filter((question) => question.level === requestedLevel);
  if (matching.length) return matching;

  if (requestedLevel === "Mastering") {
    const securing = melodicDeviceQuestions.filter((question) => question.level === "Securing");
    if (securing.length) return securing;
  }

  return melodicDeviceQuestions.slice();
}

function getDeviceQuestionIndexes(levelName = getSelectedDeviceLevel()) {
  const pool = isMixedDifficultyMode()
    ? melodicDeviceQuestions
    : getDeviceQuestionPool(levelName);
  const ids = new Set(pool.map((question) => question.id));

  return melodicDeviceQuestions
    .map((question, index) => (ids.has(question.id) ? index : -1))
    .filter((index) => index >= 0);
}

function buildDeviceRoundQuestionIndices(questionCount = DEFAULT_QUIZ_SETTINGS.questionCount) {
  const pool = getDeviceQuestionIndexes();
  const count = Math.max(1, Math.min(Number(questionCount) || DEFAULT_QUIZ_SETTINGS.questionCount, pool.length || 1));
  const available = shuffleArray(pool);
  const selected = [];

  while (available.length && selected.length < count) {
    const previousAudioId = selected.length
      ? melodicDeviceQuestions[selected[selected.length - 1]]?.audioId
      : "";
    let nextPosition = available.findIndex((index) => melodicDeviceQuestions[index]?.audioId !== previousAudioId);
    if (nextPosition < 0) nextPosition = 0;
    selected.push(available.splice(nextPosition, 1)[0]);
  }

  return selected;
}

function updateSettingsAvailability() {
  const selectedMode = getSelectedQuizMode();
  const hasSettings = selectedMode === "dictation" || selectedMode === "intervals" || selectedMode === "devices";

  if (settingsToggle) settingsToggle.disabled = !hasSettings;
  if (!advancedSettings) return;

  advancedSettings.classList.toggle("is-disabled", !hasSettings);
  advancedSettings.querySelectorAll("[data-mode-settings]").forEach((group) => {
    const groupMode = group.getAttribute("data-mode-settings");
    group.hidden = groupMode !== selectedMode;
  });

  if (!hasSettings) {
    advancedSettings.style.display = "none";
    advancedSettings.classList.remove("is-open");
    advancedSettings.setAttribute("aria-hidden", "true");
    if (settingsToggle) settingsToggle.setAttribute("aria-expanded", "false");
  }
}

function isFinalRoundQuestion() {
  return isRoundActive && roundQuestionPosition >= getRoundTotal() - 1;
}

function getProgressionButtonLabel() {
  return isFinalRoundQuestion() ? "See Feedback" : "Next Question";
}

function getPlayRemainingText(remaining) {
  return `${remaining} ${remaining === 1 ? "play" : "plays"} left`;
}

function setAnswerRevealButtonVisible(isVisible = false) {
  if (!showAnswerButton || window.MELODY_MASTER_CLASSROOM_MODE) return;

  const shouldShow = Boolean(isVisible);
  showAnswerButton.classList.toggle("is-visible", shouldShow);
  showAnswerButton.style.display = shouldShow ? "inline-flex" : "none";
  showAnswerButton.setAttribute("aria-hidden", shouldShow ? "false" : "true");

  if (shouldShow) {
    showAnswerButton.removeAttribute("tabindex");
    showAnswerButton.textContent = isShowingAnswer ? "Show Question" : "Reveal Answer";
    if (quizPanel) quizPanel.classList.add("is-answer-submitted");
  } else {
    showAnswerButton.setAttribute("tabindex", "-1");
    showAnswerButton.textContent = "Reveal Answer";
    if (quizPanel) quizPanel.classList.remove("is-answer-submitted");
  }
}

function syncSubmissionButtonLabel() {
  if (!checkAnswerButton || window.MELODY_MASTER_CLASSROOM_MODE) return;
  checkAnswerButton.textContent = hasSubmittedCurrentQuestion ? "Check again" : "Submit your answers";
}

function syncPlayButtonLabel() {
  if (!playButton || playButton.dataset.mode === "next") return;

  if (isAudioPlaying) {
    const remainingDuringPlayback = Number.isFinite(playRemainingAtStartOfCurrentPlayback)
      ? playRemainingAtStartOfCurrentPlayback
      : getRemainingPlays();
    playButton.textContent = getPlayRemainingText(remainingDuringPlayback);
    playButton.disabled = true;
    return;
  }

  const remaining = getRemainingPlays();

  if (remaining <= 0 && hasPlayedAudio) {
    playButton.textContent = getPlayRemainingText(0);
    playButton.disabled = true;
    return;
  }

  const remainingText = getPlayRemainingText(remaining);
  playButton.textContent = hasPlayedAudio
    ? `Replay Excerpt (${remainingText})`
    : `Play Excerpt (${remainingText})`;
  playButton.disabled = remaining <= 0;
}

function setQuizVisualState(state) {
  if (!quizPanel) return;
  quizPanel.classList.remove("is-ready", "is-active", "is-complete");
  quizPanel.classList.add(`is-${state}`);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTrackInfoTitle() {
  const title = MM001.title && MM001.title !== MM001.id ? MM001.title : "";
  if (title) return title;

  const parts = [MM001.composer, MM001.work, MM001.movement]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.length ? parts.join(" – ") : "Melody Master Dictation";
}

function renderScoreTrackInfo() {
  if (!scoreTrackInfo) return;

  const title = getTrackInfoTitle();
  const details = [MM001.performer, MM001.source, MM001.rights]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  scoreTrackInfo.innerHTML = `
    <span class="score-track-info-kicker">Track information</span>
    <strong>${escapeHTML(title)}</strong>
    ${details.length ? `<small>${escapeHTML(details.join(" · "))}</small>` : ""}
  `;

  scoreTrackInfo.removeAttribute("aria-hidden");
}

function clearScoreTrackInfo() {
  if (!scoreTrackInfo) return;
  scoreTrackInfo.innerHTML = "";
  scoreTrackInfo.setAttribute("aria-hidden", "true");
}

function setFeedback(message, state = "") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = state;
}

function setTextListContent(container, values = []) {
  if (!container) return;
  const items = container.querySelectorAll("span");
  values.forEach((value, index) => {
    if (items[index]) items[index].textContent = value;
  });
}

function syncMelodyShellLabels(skill = activeRoundSkill) {
  const panelTitle = document.querySelector(".panel-section-heading-centre h2 span");
  const kicker = document.querySelector(".console-question-kicker .eyebrow");
  const cues = document.querySelector(".mm-ready-cues");
  const instructions = document.querySelector(".dictation-instructions");
  const isDevices = skill === "devices";

  if (panelTitle) panelTitle.textContent = isDevices ? "Devices" : "Dictation";
  if (kicker) kicker.textContent = isDevices ? "MELODIC DEVICES" : "MELODIC DICTATION";
  setTextListContent(cues, isDevices ? ["Contour", "Movement", "Devices"] : ["Pitch", "Contour", "Dictation"]);
  setTextListContent(instructions, isDevices ? ["PLAY & LISTEN", "CHOOSE ANSWER", "CHECK FEEDBACK"] : ["PLAY & LISTEN", "DRAG THE NOTES", "CHECK YOUR ANSWERS"]);
}

function clearScoreFocus() {
  if (!scoreShell) return;

  scoreShell.classList.remove("is-audio-focus", "is-drop-target");

  // Do not interrupt the tighter drag zoom if the audio focus timer expires mid-drag.
  if (!dragState) {
    scoreShell.classList.remove("is-note-focus");
  }

  if (scoreFocusTimer) {
    clearTimeout(scoreFocusTimer);
    scoreFocusTimer = null;
  }
}

function getMissingNoteFocusPoint(slot = null) {
  const slots = Array.isArray(MM001_DICTATION.slots) ? MM001_DICTATION.slots : [];
  const xValues = slots.map((item) => Number(item.x)).filter(Number.isFinite);
  const pitchValues = slots
    .map((item) => item.pitch)
    .filter(Boolean)
    .map(getPitchYPercent)
    .filter(Number.isFinite);

  const average = (values, fallback) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;

  return {
    x: Number.isFinite(Number(slot && slot.x)) ? Number(slot.x) : average(xValues, 78),
    y: average(pitchValues, 46)
  };
}

function setScoreFocusPoint(slot = null) {
  if (!scoreShell) return;

  const focusPoint = getMissingNoteFocusPoint(slot);
  scoreShell.style.setProperty("--mm-focus-x", `${focusPoint.x}%`);
  scoreShell.style.setProperty("--mm-focus-y", `${focusPoint.y}%`);
}

function getCurrentScoreFrameWidth() {
  const frame = scoreImageFrame || (scoreOverlay && scoreOverlay.parentElement);
  if (!frame) return 0;

  // clientWidth reports the actual laid-out score width without double-counting CSS zoom transforms.
  return frame.clientWidth || frame.offsetWidth || frame.getBoundingClientRect().width || 0;
}

function updateNoteScaleForScoreSize() {
  if (!scoreOverlay) return;

  const noteWidthPercent = Number(MM001_DICTATION.noteWidthPercent) || 3.95;
  const noteHeightPercent = Number(MM001_DICTATION.noteHeightPercent) || 47.0;
  const noteStretchX = Number(MM001_DICTATION.noteStretchX) || 1.95;

  // The score PNG and overlay share the same frame. Sizing the note as a percentage
  // of that frame keeps the notehead matched to the printed Sibelius noteheads
  // when the score is normal, wide-expanded, or zoomed for dragging.
  scoreOverlay.style.setProperty("--mm-drag-note-width-percent", `${noteWidthPercent}%`);
  scoreOverlay.style.setProperty("--mm-drag-note-height-percent", `${noteHeightPercent}%`);
  scoreOverlay.style.setProperty("--mm-drag-note-stretch-x", `${noteStretchX}`);
}

function queueNoteScaleUpdate() {
  if (noteScaleFrameId) cancelAnimationFrame(noteScaleFrameId);

  noteScaleFrameId = requestAnimationFrame(() => {
    noteScaleFrameId = null;
    updateNoteScaleForScoreSize();
  });

  // Width transitions happen over several frames, so refresh during and after expansion.
  window.setTimeout(updateNoteScaleForScoreSize, 80);
  window.setTimeout(updateNoteScaleForScoreSize, 280);
  window.setTimeout(updateNoteScaleForScoreSize, 560);
}

function initialiseNoteScaleObserver() {
  if (typeof ResizeObserver === "undefined" || !scoreImageFrame || noteScaleResizeObserver) return;

  noteScaleResizeObserver = new ResizeObserver(queueNoteScaleUpdate);
  noteScaleResizeObserver.observe(scoreImageFrame);
  if (scoreShell) noteScaleResizeObserver.observe(scoreShell);
}

function cacheScoreExpansionOrigin() {
  if (!dictationWorkspace || !quizPanel) return;

  const rect = dictationWorkspace.getBoundingClientRect();
  const layout = document.querySelector(".three-panel-layout");
  const layoutRect = layout ? layout.getBoundingClientRect() : quizPanel.getBoundingClientRect();
  const leftPanel = document.querySelector(".setup-panel");
  const rightPanel = document.querySelector(".info-panel");
  const leftPanelRect = leftPanel ? leftPanel.getBoundingClientRect() : layoutRect;
  const rightPanelRect = rightPanel ? rightPanel.getBoundingClientRect() : layoutRect;

  // Expanded score target: keep the same expanded width, but pin the final
  // left edge to the left edge of the settings console box.
  const threePanelOuterWidth = Math.max(320, rightPanelRect.right - leftPanelRect.left);
  const safeViewportWidth = Math.max(320, window.innerWidth - 28);
  const expandedWidth = Math.min(threePanelOuterWidth, safeViewportWidth);

  // Align the expanded tile centre with the centre of the Dictation title
  // at the top of the middle console. The close button remains positioned
  // at the centre-top of the PNG tile, so the X sits vertically underneath
  // the Dictation heading.
  const dictationHeading = document.querySelector(".quiz-panel .panel-section-heading-centre h2")
    || document.querySelector(".quiz-panel .panel-section-heading-centre")
    || quizPanel;
  const headingRect = dictationHeading.getBoundingClientRect();
  const scoreTileLeftNudgePx = 92;
  const expandedCentre = headingRect.left + (headingRect.width / 2) - scoreTileLeftNudgePx;

  const panelBottom = Math.max(leftPanelRect.bottom, rightPanelRect.bottom, layoutRect.bottom - 14);
  const bottomOffset = Math.max(10, window.innerHeight - panelBottom);

  // Use the same Dictation-title centre for the pre-expansion state too,
  // so the X remains vertically aligned beneath the heading.
  quizPanel.style.setProperty("--mm-score-expand-centre-x", `${expandedCentre}px`);
  quizPanel.style.setProperty("--mm-score-expand-top", `${rect.top}px`);
  quizPanel.style.setProperty("--mm-score-expand-start-width", `${rect.width}px`);
  quizPanel.style.setProperty("--mm-score-expand-start-height", `${rect.height}px`);
  quizPanel.style.setProperty("--mm-score-expanded-left", `${expandedCentre}px`);
  quizPanel.style.setProperty("--mm-score-expanded-width", `${expandedWidth}px`);
  quizPanel.style.setProperty("--mm-score-expanded-bottom", `${bottomOffset}px`);
}

function expandScoreForPlay() {
  cacheScoreExpansionOrigin();

  if (quizPanel) {
    quizPanel.classList.add("is-score-pre-expanding");
    void quizPanel.offsetWidth;
    quizPanel.classList.add("is-score-expanded");
  }

  if (scoreShell) scoreShell.classList.add("is-score-expanded");
  queueNoteScaleUpdate();
}

function collapseScoreExpansion() {
  if (scoreShell) scoreShell.classList.remove("is-score-expanded");

  if (quizPanel) {
    quizPanel.classList.remove("is-score-expanded", "is-score-pre-expanding");
    quizPanel.style.removeProperty("--mm-score-expand-centre-x");
    quizPanel.style.removeProperty("--mm-score-expand-top");
    quizPanel.style.removeProperty("--mm-score-expand-start-width");
    quizPanel.style.removeProperty("--mm-score-expand-start-height");
    quizPanel.style.removeProperty("--mm-score-expanded-left");
    quizPanel.style.removeProperty("--mm-score-expanded-width");
    quizPanel.style.removeProperty("--mm-score-expanded-bottom");
  }

  queueNoteScaleUpdate();
}


function refreshExpandedScorePosition() {
  if (!quizPanel || !quizPanel.classList.contains("is-score-expanded")) return;
  cacheScoreExpansionOrigin();
}

window.addEventListener("resize", refreshExpandedScorePosition);

function startScoreFocus() {
  if (!scoreShell) return;

  clearScoreFocus();
  setScoreFocusPoint();
  void scoreShell.offsetWidth;
  scoreShell.classList.add("is-audio-focus");

  const audioDurationMs = audio && Number.isFinite(audio.duration) && audio.duration > 0
    ? (audio.duration * 1000) + 500
    : 12000;

  const focusDurationMs = Math.min(Math.max(audioDurationMs, 4500), 18000);
  scoreFocusTimer = setTimeout(clearScoreFocus, focusDurationMs);
}

function pitchToDiatonicNumber(pitch) {
  const match = String(pitch || "").trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return pitchToDiatonicNumber("F5");

  const letterIndex = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const letter = match[1].toUpperCase();
  const octave = Number(match[3]);

  return (octave * 7) + letterIndex[letter];
}

function getPitchYPercent(pitch) {
  const topLinePitch = MM001_DICTATION.topLinePitch || "F5";
  const stepsBelowTopLine = pitchToDiatonicNumber(topLinePitch) - pitchToDiatonicNumber(pitch);

  return Number(MM001_DICTATION.staffTopY) + (stepsBelowTopLine * Number(MM001_DICTATION.staffStepY));
}

function getStaffPitchOptions() {
  const configuredPitches = Array.isArray(MM001_DICTATION.staffPitches)
    ? MM001_DICTATION.staffPitches
    : DEFAULT_DICTATION_LAYOUT.staffPitches;

  // Keep existing question data unchanged, but make treble ledger-line
  // positions above and below the stave available across the deck for future questions.
  const upperLedgerPitches = ["C6", "B5", "A5", "G5"];
  const lowerLedgerPitches = ["D4", "C4", "B3", "A3", "G3"];
  const uniquePitches = [...new Set([...configuredPitches, ...upperLedgerPitches, ...lowerLedgerPitches])]
    .sort((a, b) => pitchToDiatonicNumber(b) - pitchToDiatonicNumber(a));

  return uniquePitches.map((pitch) => ({
    pitch,
    y: getPitchYPercent(pitch)
  }));
}

function getLedgerLinePitchesForPitch(pitch) {
  const pitchNumber = pitchToDiatonicNumber(pitch);

  const firstUpperLedgerNumber = pitchToDiatonicNumber("A5");
  const secondUpperLedgerNumber = pitchToDiatonicNumber("C6");
  const firstLowerLedgerNumber = pitchToDiatonicNumber("C4");
  const secondLowerLedgerNumber = pitchToDiatonicNumber("A3");

  if (pitchNumber >= secondUpperLedgerNumber) return ["A5", "C6"];
  if (pitchNumber >= firstUpperLedgerNumber) return ["A5"];

  if (pitchNumber <= secondLowerLedgerNumber) return ["C4", "A3"];
  if (pitchNumber <= firstLowerLedgerNumber) return ["C4"];

  return [];
}

function updateSlotLedgerLines(slot, pitch) {
  if (!slot || !slot.ledgerLines) return;

  const requiredLines = getLedgerLinePitchesForPitch(pitch);

  Object.entries(slot.ledgerLines).forEach(([linePitch, lineElement]) => {
    if (!lineElement) return;

    const shouldShow = requiredLines.includes(linePitch);
    lineElement.classList.toggle("is-visible", shouldShow);
    lineElement.style.left = `${slot.x}%`;
    lineElement.style.top = `${getPitchYPercent(linePitch)}%`;
  });
}

function clearSlotLedgerLines(slot) {
  if (!slot || !slot.ledgerLines) return;

  Object.values(slot.ledgerLines).forEach((lineElement) => {
    if (!lineElement) return;
    lineElement.classList.remove("is-visible");
  });
}

function getStaffBounds() {
  const positions = getStaffPitchOptions().map((option) => option.y);
  const top = Math.min(...positions);
  const bottom = Math.max(...positions);
  const step = Number(MM001_DICTATION.staffStepY) || 5;

  return {
    top,
    bottom,
    releaseTop: top - (step * 0.65),
    releaseBottom: bottom + (step * 0.65)
  };
}

function getNearestStaffPitch(yPercent) {
  return getStaffPitchOptions().reduce((nearest, option) => {
    const distance = Math.abs(option.y - yPercent);
    return distance < nearest.distance
      ? { ...option, distance }
      : nearest;
  }, { pitch: "B4", y: getPitchYPercent("B4"), distance: Number.POSITIVE_INFINITY });
}

function getNearestStaffPitchForSlot(slot, yPercent) {
  const snapYOffset = Number(slot && slot.snapYOffset ? slot.snapYOffset : 0);
  return getNearestStaffPitch(Number(yPercent) + snapYOffset);
}

function getDefaultVisualAnchorY(iconPath = "") {
  const iconName = String(iconPath || "").split("/").pop().toLowerCase();

  // Align the actual notehead centre with the selected stave line/space.
  // The note PNG canvases are not identical: semiquaver artwork sits lower in its frame,
  // while quaver/dotted-quaver/crotchet share a slightly higher notehead centre.
  if (iconName.includes("semiquaver")) return 86.75;
  if (iconName.includes("dottedquaver")) return 79.55;
  if (iconName.includes("quaver")) return 79.55;
  if (iconName.includes("crotchet")) return 79.70;

  return Number(MM001_DICTATION.visualAnchorY || DEFAULT_DICTATION_LAYOUT.visualAnchorY || 79.55);
}

function getSlotVisualAnchorY(slot = {}) {
  const iconPath = slot.icon || MM001_DICTATION.noteImage;

  // Keep notehead alignment derived from the note-art type, not from per-question
  // calibration values. This makes solo Melody Master and Teacher Mode student
  // view use the same pitch grid for every question. Question-specific visual
  // anchors can make the note look correct while recording the wrong pitch, which
  // is what broke MM013 after its PNG canvas was normalised.
  return getDefaultVisualAnchorY(iconPath);
}

function getLedgerLineOffsetX(iconPath = "") {
  const iconName = String(iconPath || "").split("/").pop().toLowerCase();

  // Different note-value PNGs have different canvas centres.
  // Semiquavers are now the calibration reference. Quavers need only a tiny nudge,
  // while crotchet-style noteheads sit much further right inside their PNG canvas.
  if (iconName.includes("dottedcrotchet")) return 7;
  if (iconName.includes("minim")) return 6;
  if (iconName.includes("crotchet")) return 7;
  if (iconName.includes("dottedquaver")) return 2;
  if (iconName.includes("semiquaver")) return 0;
  if (iconName.includes("quaver")) return 1;

  return 0;
}

function getNoteheadMaskPath(iconPath = "") {
  const iconName = String(iconPath || "").split("/").pop().toLowerCase() || "semiquaver-sibelius.png";
  const safeIconName = iconName.endsWith(".png") ? iconName : "semiquaver-sibelius.png";
  return `assets/icons/notes/notehead-masks/${safeIconName.replace(".png", "-notehead-mask.png")}`;
}

function getPreparedSlots() {
  return MM001_DICTATION.slots.map((slot, index) => {
    const pitch = slot.pitch || (MM001_SOURCE.answerPitches && MM001_SOURCE.answerPitches[index]) || "A4";
    const noteName = slot.noteName || slot.rhythm || "note";

    return {
      id: `mm-note-${index + 1}`,
      index,
      label: String(index + 1),
      x: Number(slot.x),
      pitch,
      y: Number(slot.y || getPitchYPercent(pitch)),
      homeY: Number(slot.homeY || MM001_DICTATION.homeY),
      icon: slot.icon || MM001_DICTATION.noteImage,
      iconFallback: slot.iconFallback || MM001_DICTATION.noteImageFallback,
      acceptedPitches: Array.isArray(slot.acceptedPitches) ? slot.acceptedPitches : [pitch],
      visualAnchorY: getSlotVisualAnchorY(slot),
      noteName,
      placed: false,
      snapYOffset: Number(slot.snapYOffset || 0),
      selectedPitch: null,
      selectedY: null,
      token: null,
      hotspot: null,
      ledgerLines: null
    };
  });
}

function createNoteImage(token, slot = null) {
  const img = document.createElement("img");
  img.src = (slot && slot.icon) || MM001_DICTATION.noteImage;
  img.alt = "";
  img.draggable = false;

  img.addEventListener("error", () => {
    if (img.dataset.triedFallback === "true") {
      img.style.display = "none";
      token.classList.add("note-image-missing");
      return;
    }

    img.dataset.triedFallback = "true";
    img.src = (slot && slot.iconFallback) || MM001_DICTATION.noteImageFallback;
  });

  return img;
}

function renderDictationNotes() {
  if (!scoreOverlay) return;

  scoreOverlay.innerHTML = "";
  scoreOverlay.className = "score-overlay dictation-note-overlay";
  scoreOverlay.classList.toggle("is-answer-visible", isShowingAnswer);
  scoreOverlay.classList.toggle("is-notes-hidden-before-play", !hasPlayedAudio);

  dictationSlots = getPreparedSlots();

  dictationSlots.forEach((slot) => {
    const ledgerLines = {};
    ["A5", "C6", "C4", "A3"].forEach((linePitch) => {
      const line = document.createElement("span");
      line.className = "dictation-ledger-line";
      line.dataset.slotIndex = String(slot.index);
      line.dataset.ledgerPitch = linePitch;
      line.style.left = `${slot.x}%`;
      line.style.top = `${getPitchYPercent(linePitch)}%`;
      line.style.setProperty("--mm-ledger-offset-x", `${getLedgerLineOffsetX(slot.icon || MM001_DICTATION.noteImage)}px`);
      scoreOverlay.appendChild(line);
      ledgerLines[linePitch] = line;
    });

    const hotspot = document.createElement("span");
    hotspot.className = "dictation-hotspot";
    hotspot.style.left = `${slot.x}%`;
    hotspot.style.top = `${slot.y}%`;
    hotspot.dataset.slotIndex = String(slot.index);
    scoreOverlay.appendChild(hotspot);

    const token = document.createElement("button");
    token.type = "button";
    token.className = "note-token draggable-semiquaver is-home-note";
    token.style.left = `${slot.x}%`;
    token.style.top = `${slot.homeY}%`;
    token.style.setProperty("--mm-token-anchor-y", `-${Number(slot.visualAnchorY || 76)}%`);
    token.style.setProperty("--mm-notehead-mask", `url("${getNoteheadMaskPath(slot.icon || MM001_DICTATION.noteImage)}")`);
    token.dataset.slotIndex = String(slot.index);
    token.setAttribute("aria-label", `Note ${slot.label}: drag down to ${slot.pitch}`);

    token.appendChild(createNoteImage(token, slot));
    scoreOverlay.appendChild(token);

    slot.hotspot = hotspot;
    slot.token = token;
    slot.ledgerLines = ledgerLines;

    token.addEventListener("pointerdown", startNoteDrag);
    token.addEventListener("keydown", handleNoteKeydown);
  });

  updateDictationProgress();
  queueNoteScaleUpdate();
}

function handleNoteKeydown(event) {
  if (!isLoaded || isShowingAnswer || !hasPlayedAudio) return;

  const slot = dictationSlots[Number(event.currentTarget.dataset.slotIndex)];
  if (!slot) return;

  const staffPitches = getStaffPitchOptions();
  const currentPitchIndex = staffPitches.findIndex((option) => option.pitch === slot.selectedPitch);

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();

    if (slot.placed) {
      returnNoteHome(slot);
    } else {
      const middlePitch = staffPitches[Math.floor(staffPitches.length / 2)];
      placeNoteAtPitch(slot, middlePitch);
    }

    updateDictationProgress();
  }

  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && slot.placed) {
    event.preventDefault();

    const fallbackIndex = Math.floor(staffPitches.length / 2);
    const safeCurrentIndex = currentPitchIndex >= 0 ? currentPitchIndex : fallbackIndex;
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = Math.min(staffPitches.length - 1, Math.max(0, safeCurrentIndex + direction));

    placeNoteAtPitch(slot, staffPitches[nextIndex]);
    updateDictationProgress();
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    returnNoteHome(slot);
    updateDictationProgress();
  }
}

function getOverlayPercentFromPointer(event) {
  const rect = scoreOverlay.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(96, Math.max(4, y))
  };
}

function startNoteDrag(event) {
  if (!isLoaded || isShowingAnswer || !hasPlayedAudio || !scoreOverlay) return;

  const slot = dictationSlots[Number(event.currentTarget.dataset.slotIndex)];
  if (!slot || !slot.token) return;

  event.preventDefault();
  setScoreFocusPoint(slot);
  scoreShell.classList.add("is-note-focus");
  queueNoteScaleUpdate();

  const pointer = getOverlayPercentFromPointer(event);
  const currentY = Number.parseFloat(slot.token.style.top || slot.homeY);

  dragState = {
    pointerId: event.pointerId,
    slot,
    offsetY: pointer.y - currentY
  };

  slot.token.setPointerCapture(event.pointerId);
  if (hasSubmittedCurrentQuestion) {
    isQuestionComplete = true;
    setPlayButtonMode("next");
    setAnswerRevealButtonVisible(true);
  } else {
    isQuestionComplete = false;
    setPlayButtonMode(hasPlayedAudio ? "replay" : "play");
  }
  slot.token.classList.add("is-dragging");
  slot.token.classList.remove("correct", "wrong", "answer-flash-correct", "answer-flash-wrong", "perfect-answer-notehead-flash");
  if (slot.hotspot) slot.hotspot.classList.remove("is-filled");
  scoreOverlay.classList.add("is-dragging");
  scoreShell.classList.add("is-drop-target");

  slot.token.addEventListener("pointermove", moveNoteDrag);
  slot.token.addEventListener("pointerup", endNoteDrag);
  slot.token.addEventListener("pointercancel", cancelNoteDrag);
}

function moveNoteDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  event.preventDefault();

  const { slot } = dragState;
  const pointer = getOverlayPercentFromPointer(event);
  const staffBounds = getStaffBounds();
  const targetY = pointer.y - (Number(dragState.offsetY) || 0);
  const clampedY = Math.min(staffBounds.bottom, Math.max(slot.homeY, targetY));
  const nearestStaffPitch = getNearestStaffPitchForSlot(slot, clampedY);
  const isOverStave = clampedY >= staffBounds.releaseTop && clampedY <= staffBounds.releaseBottom;

  slot.token.style.left = `${slot.x}%`;
  slot.token.style.top = `${clampedY}%`;

  if (slot.hotspot) {
    slot.hotspot.style.top = `${nearestStaffPitch.y}%`;
    slot.hotspot.classList.toggle("is-hot", isOverStave);
  }

  updateSlotLedgerLines(slot, nearestStaffPitch.pitch);
}

function endNoteDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const { slot } = dragState;
  const currentY = Number.parseFloat(slot.token.style.top || slot.homeY);
  const staffBounds = getStaffBounds();
  const nearestStaffPitch = getNearestStaffPitchForSlot(slot, currentY);
  const shouldPlaceOnStave = currentY >= staffBounds.releaseTop && currentY <= staffBounds.releaseBottom;

  cleanupDragListeners(slot.token, event.pointerId);

  if (shouldPlaceOnStave) {
    placeNoteAtPitch(slot, nearestStaffPitch);
  } else {
    returnNoteHome(slot);
  }

  updateDictationProgress();
  dragState = null;
}

function cancelNoteDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const { slot } = dragState;
  cleanupDragListeners(slot.token, event.pointerId);
  returnNoteHome(slot);
  updateDictationProgress();
  dragState = null;
}

function cleanupDragListeners(token, pointerId) {
  if (!token) return;

  try {
    token.releasePointerCapture(pointerId);
  } catch (error) {
    // Pointer capture may already have been released by the browser.
  }

  token.classList.remove("is-dragging");
  token.removeEventListener("pointermove", moveNoteDrag);
  token.removeEventListener("pointerup", endNoteDrag);
  token.removeEventListener("pointercancel", cancelNoteDrag);

  if (scoreOverlay) scoreOverlay.classList.remove("is-dragging");
  if (scoreShell) scoreShell.classList.remove("is-drop-target", "is-note-focus");

  dictationSlots.forEach((slot) => slot.hotspot && slot.hotspot.classList.remove("is-hot"));
}

function placeNoteAtPitch(slot, staffPitch) {
  if (!slot || !slot.token || !staffPitch) return;

  slot.placed = true;
  slot.selectedPitch = staffPitch.pitch;
  slot.selectedY = staffPitch.y;
  slot.token.style.left = `${slot.x}%`;
  slot.token.style.top = `${staffPitch.y}%`;
  slot.token.classList.remove("is-home-note", "correct", "wrong", "answer-flash-correct", "answer-flash-wrong", "perfect-answer-notehead-flash");
  slot.token.classList.add("is-placed");
  slot.token.setAttribute("aria-label", `Note ${slot.label}: placed on ${staffPitch.pitch}. Press delete to reset.`);

  if (slot.hotspot) {
    slot.hotspot.style.left = `${slot.x}%`;
    slot.hotspot.style.top = `${staffPitch.y}%`;
    slot.hotspot.classList.remove("is-hot");
    slot.hotspot.classList.add("is-filled");
  }

  updateSlotLedgerLines(slot, staffPitch.pitch);
}

function placeNote(slot) {
  placeNoteAtPitch(slot, getNearestStaffPitchForSlot(slot, slot.y));
}

function returnNoteHome(slot) {
  if (!slot || !slot.token) return;

  slot.placed = false;
  slot.selectedPitch = null;
  slot.selectedY = null;
  slot.token.style.left = `${slot.x}%`;
  slot.token.style.top = `${slot.homeY}%`;
  slot.token.classList.remove("is-placed", "correct", "wrong", "is-dragging", "answer-flash-correct", "answer-flash-wrong", "perfect-answer-notehead-flash");
  slot.token.classList.add("is-home-note");
  slot.token.setAttribute("aria-label", `Note ${slot.label}: drag down to ${slot.pitch}`);

  if (slot.hotspot) {
    slot.hotspot.classList.remove("is-filled", "is-hot");
  }

  clearSlotLedgerLines(slot);
}

function resetDictationNotes() {
  dictationSlots.forEach(returnNoteHome);
  updateDictationProgress();
}

function clearPerfectAnswerRevealTimer() {
  if (!perfectAnswerRevealTimer) return;

  window.clearTimeout(perfectAnswerRevealTimer);
  perfectAnswerRevealTimer = null;
}

function clearQuestionHandoffTimer() {
  if (!questionHandoffTimer) return;

  window.clearTimeout(questionHandoffTimer);
  questionHandoffTimer = null;
}

function revealAnswerScoreAfterPerfectCheck() {
  clearPerfectAnswerRevealTimer();

  const checkedQuestionId = MM001.id;

  perfectAnswerRevealTimer = window.setTimeout(() => {
    perfectAnswerRevealTimer = null;

    // If the user has already moved on or reset, do not reveal the old answer score.
    if (!isLoaded || !isQuestionComplete || MM001.id !== checkedQuestionId) return;

    isShowingAnswer = true;
    scoreImage.src = MM001.answerImage;
    scoreImage.alt = `${MM001.id} answer score`;
    scoreShell.classList.add("showing-answer");

    // Keep the score/overlay in the same position and magnification.
    // The printed answer score appears underneath; only the noteheads from the filled-in notes
    // continue flashing green so students can compare their placement with the real grouping.
    if (scoreOverlay) {
      scoreOverlay.classList.add("is-answer-visible", "is-perfect-answer-reveal");
      scoreOverlay.classList.remove("is-notes-hidden-before-play");
    }

    dictationSlots.forEach((slot) => {
      if (!slot.token) return;
      slot.token.classList.add("perfect-answer-notehead-flash");
      slot.token.classList.remove("wrong", "answer-flash-wrong");
    });

    if (showAnswerButton) showAnswerButton.textContent = "Show Question";
    renderAnswerPanelAnswer();

    // Play the excerpt one final time once the printed answer score is visible.
    try {
      if (!audio) audio = new Audio(MM001.audio);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      audio.onended = clearScoreFocus;

      const finalPlayAttempt = audio.play();
      if (finalPlayAttempt && typeof finalPlayAttempt.catch === "function") {
        finalPlayAttempt.catch(() => {
          // Some browsers may block delayed autoplay. Keep the visual answer reveal working.
        });
      }
    } catch (error) {
      // Keep the visual answer reveal working even if the final replay cannot start.
    }
  }, 2000);
}

function getPlacedCount() {
  return dictationSlots.filter((slot) => slot.placed).length;
}

function updateDictationProgress() {
  const total = dictationSlots.length || 6;
  const placedCount = getPlacedCount();
  const progress = total > 0 ? Math.round((placedCount / total) * 100) : 0;

  if (isShowingAnswer) return;

  if (progressInner) progressInner.style.width = `${progress}%`;
  if (scoreText) scoreText.textContent = isLoaded ? `Placed: ${placedCount} / ${total}` : "Score: 0 / 6";
  if (streakText) streakText.textContent = placedCount === total ? "Ready to check" : "Pitch snap";
  if (xpText) xpText.textContent = isLoaded ? getNoteCountLabel(total) : "6 semiquavers";
  if (checkAnswerButton) {
    checkAnswerButton.disabled = placedCount !== total;
    syncSubmissionButtonLabel();
  }
}

function setPlayButtonMode(mode) {
  if (!playButton) return;

  playButton.disabled = false;

  if (mode === "next") {
    const label = getProgressionButtonLabel();
    playButton.textContent = label;
    playButton.dataset.mode = "next";
    playButton.setAttribute("aria-label", label === "See Feedback" ? "See round feedback" : "Next question");
    return;
  }

  playButton.dataset.mode = mode === "replay" ? "replay" : "play";
  playButton.removeAttribute("aria-label");
  syncPlayButtonLabel();
}

function removeRoundFeedbackOverlay() {
  if (roundFeedbackOverlay && roundFeedbackOverlay.parentNode) {
    roundFeedbackOverlay.parentNode.removeChild(roundFeedbackOverlay);
  }
  roundFeedbackOverlay = null;
}

function closeRoundFeedbackWindow() {
  isRoundFeedbackOpen = false;
  removeRoundFeedbackOverlay();
  if (appShell) appShell.classList.remove("is-round-feedback-open");
  if (quizPanel) quizPanel.classList.remove("is-round-feedback-open");
  document.body.classList.remove("mm-round-review-open");
}

let eaProgressRoundId = "";
let eaLastRoundSave = Promise.resolve({ saved: false, reason: "not-started" });

function resetMelodyMasterProgressRound() {
  eaProgressRoundId = window.EchoAuralTracking
    ? window.EchoAuralTracking.createClientRoundId(isDevicesRound() ? "melody-master-devices" : "melody-master")
    : `${isDevicesRound() ? "melody-master-devices" : "melody-master"}-${Date.now()}`;
}

function saveMelodyMasterProgress() {
  if (!window.EchoAuralTracking || !roundResults.filter(Boolean).length) {
    eaLastRoundSave = Promise.resolve({ saved: false, reason: "no-round" });
    return eaLastRoundSave;
  }
  if (!eaProgressRoundId) resetMelodyMasterProgressRound();
  const summary = getRoundScoreSummary();
  const totals = getRoundAggregateMarks();
  const metadata = {
    pitchAwarded: totals.pitchAwarded,
    pitchAvailable: totals.pitchAvailable,
    contourAwarded: totals.shapeAwarded,
    contourAvailable: totals.shapeAvailable
  };

  if (isDevicesRound()) {
    metadata.skill = "melodic-devices";
    metadata.deviceAwarded = summary.awarded;
    metadata.deviceAvailable = summary.totalPossible;
    metadata.deviceLevel = getSelectedDeviceLevel();
  } else {
    metadata.skill = "dictation";
  }

  const progression = window.EAMelodyMasterProgression;

  if (progression && progression.isActive) {
    metadata.source = "student_progression";
    metadata.learningMode = "progression";
    metadata.progressionStage = progression.level?.name || "";
    metadata.progressionLevel = progression.currentLevel ?? "";
    metadata.passMark = progression.level?.passMark ?? "";
  }

  const questions = roundResults.filter(Boolean).map((result, index) => {
    if (result.skill === "melodic-devices") {
      return {
        questionId: result.questionId || `MDV-Q${index + 1}`,
        score: Number(result.awardedMarks) || 0,
        maximumScore: Number(result.maxMarks) || 0,
        feedback: result.shortComment || "Review the melodic device in the excerpt.",
        answerData: {
          skill: "melodic-devices",
          category: result.category || "",
          selectedAnswer: result.selectedAnswer || "",
          correctAnswer: result.correctAnswer || ""
        }
      };
    }

    return {
      questionId: result.questionId || `MM-Q${index + 1}`,
      score: Number(result.awardedMarks) || 0,
      maximumScore: Number(result.maxMarks) || 0,
      feedback: result.shortComment || (result.awardedMarks === result.maxMarks ? "Secure melodic dictation response." : "Review the marked pitch and contour evidence."),
      answerData: {
        pitchMarksAwarded: Number(result.pitchMarksAwarded) || 0,
        pitchMarksAvailable: Number(result.pitchMarksAvailable) || 0,
        shapeMarksAwarded: Number(result.shapeMarksAwarded) || 0,
        shapeMarksAvailable: Number(result.shapeMarksAvailable) || 0,
        firstWrongNote: result.firstWrongNote || null,
        firstContourError: result.firstContourError || "",
        firstIntervalSizeError: result.firstIntervalSizeError || ""
      }
    };
  });
  eaLastRoundSave = window.EchoAuralTracking.saveRound({
    moduleId: "melody-master",
    clientRoundId: eaProgressRoundId,
    score: summary.awarded,
    maximumScore: summary.totalPossible,
    roundFeedback: getCompiledRoundFeedback(summary),
    metadata,
    questions
  });

  return eaLastRoundSave;
}

function finishRound() {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();
  clearScoreFocus();
  closeRoundFeedbackWindow();

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;

  window.location.href = "index.html";
}

function goToNextQuestion() {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  if (isRoundActive && roundQuestionPosition >= getRoundTotal() - 1) {
    showRoundFeedbackWindow();
    return;
  }

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;

  if (isRoundActive) {
    roundQuestionPosition += 1;
  }

  const totalQuestions = isDevicesRound()
    ? melodicDeviceQuestions.length || 1
    : ALL_MELODY_CLIPS.length || 1;
  const nextIndex = isRoundActive
    ? (roundQuestionIndices[roundQuestionPosition] || 0)
    : (isDevicesRound()
      ? ((currentDeviceQuestionIndex + 1) % totalQuestions)
      : ((currentQuestionIndex + 1) % totalQuestions));

  if (quizPanel) quizPanel.classList.add("is-question-handoff-out");
  clearScoreFocus();

  questionHandoffTimer = window.setTimeout(() => {
    questionHandoffTimer = null;

    if (quizPanel) {
      quizPanel.classList.remove("is-question-handoff-out");
      quizPanel.classList.add("is-question-handoff-in");
    }

    if (isDevicesRound()) {
      currentDeviceQuestionIndex = nextIndex;
      loadMelodicDeviceQuestion({ autoPlay: true, transitionIn: true });
    } else {
      setActiveQuestion(nextIndex);
      loadQuestion({ autoPlay: true, transitionIn: true, expandOnLoad: true });
    }

    window.setTimeout(() => {
      if (quizPanel) quizPanel.classList.remove("is-question-handoff-in");
    }, 900);
  }, 420);
}

function closeExpandedScoreTile() {
  clearScoreFocus();
  collapseScoreExpansion();
}

function loadMelodicDeviceQuestion(options = {}) {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  const shouldAutoPlay = Boolean(options && options.autoPlay === true);
  const isTransitionIn = Boolean(options && options.transitionIn === true);

  closeRoundFeedbackWindow();

  const index = isRoundActive
    ? (roundQuestionIndices[roundQuestionPosition] || 0)
    : currentDeviceQuestionIndex;
  currentDeviceQuestionIndex = Math.max(0, Math.min(index, Math.max(melodicDeviceQuestions.length - 1, 0)));
  currentDeviceQuestion = melodicDeviceQuestions[currentDeviceQuestionIndex] || melodicDeviceQuestions[0] || null;

  if (!currentDeviceQuestion) {
    setFeedback("Melodic Devices questions could not be loaded.", "bad");
    return;
  }

  activeRoundSkill = "devices";
  syncMelodyShellLabels("devices");
  isLoaded = true;
  isShowingAnswer = false;
  hasPlayedAudio = false;
  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  selectedDeviceAnswer = "";
  lastAttemptDiagnostic = null;
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  resetPlayCounterForQuestion();

  setQuizVisualState("active");
  if (quizPanel && !isTransitionIn) quizPanel.classList.remove("is-question-handoff-out", "is-question-handoff-in");

  questionText.textContent = currentDeviceQuestion.question;
  roundText.textContent = isRoundActive ? getRoundLabel() : "Ready";
  scoreText.textContent = `Score: 0 / ${currentDeviceQuestion.marks}`;
  streakText.textContent = currentDeviceQuestion.category || "Melodic devices";
  xpText.textContent = `${currentDeviceQuestion.level} · ${getPlayLimitLabel()}`;
  progressInner.style.width = "0%";

  clearScoreTrackInfo();
  collapseScoreExpansion();
  audio = new Audio(currentDeviceQuestion.audio);
  audio.volume = 1;

  startButton.style.display = "none";
  playButton.style.display = "inline-flex";
  setPlayButtonMode("play");
  checkAnswerButton.disabled = true;
  checkAnswerButton.style.display = "none";
  setAnswerRevealButtonVisible(false);
  if (showAnswerButton) showAnswerButton.style.display = "none";

  renderMelodicDevicesWorkspace(currentDeviceQuestion);
  renderMelodicDevicesAnswerPanelIntro(currentDeviceQuestion);

  setFeedback(shouldAutoPlay ? "First play starting. Listen for the melodic device, then choose the best answer." : "");

  if (shouldAutoPlay) {
    playAudio({ autoStarted: true });
  } else {
    syncPlayButtonLabel();
  }
}

function handleMelodicDeviceAudioFinished() {
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;

  if (isQuestionComplete) {
    setPlayButtonMode("next");
    return;
  }

  setPlayButtonMode("replay");

  const remaining = getRemainingPlays();
  if (remaining > 0) {
    setFeedback(`${getPlayRemainingText(remaining)}. You may replay the excerpt, or choose your answer when ready.`);
  } else {
    setFeedback("0 plays left. Choose the best answer.", "bad");
  }
}

function playMelodicDeviceAudio(options = {}) {
  if (playButton && playButton.dataset.mode === "next") {
    goToNextQuestion();
    return;
  }

  if (isQuestionComplete) {
    goToNextQuestion();
    return;
  }

  if (isAudioPlaying) return;
  if (!currentDeviceQuestion) loadMelodicDeviceQuestion();
  if (!currentDeviceQuestion) return;

  const autoStarted = Boolean(options && options.autoStarted === true);

  if (playsUsedThisQuestion >= (quizSettings.playLimit || DEFAULT_QUIZ_SETTINGS.playLimit)) {
    syncPlayButtonLabel();
    setFeedback("0 plays left. Choose the best answer.", "bad");
    return;
  }

  if (!audio) audio = new Audio(currentDeviceQuestion.audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;

  playRemainingAtStartOfCurrentPlayback = getRemainingPlays();
  isAudioPlaying = true;
  syncPlayButtonLabel();
  audio.onended = handleMelodicDeviceAudioFinished;

  let playAttempt;

  try {
    playAttempt = audio.play();
  } catch (error) {
    isAudioPlaying = false;
    playRemainingAtStartOfCurrentPlayback = null;
    syncPlayButtonLabel();
    setFeedback(`Audio could not play. Check that the audio file is available at ${currentDeviceQuestion.audio}.`, "bad");
    return;
  }

  hasPlayedAudio = true;
  playsUsedThisQuestion += 1;

  const playMessage = autoStarted ? "First play" : "Replay";
  setFeedback(`${playMessage} ${playsUsedThisQuestion} of ${quizSettings.playLimit}. Listen carefully. The replay control will unlock when the audio finishes.`);

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      playsUsedThisQuestion = Math.max(0, playsUsedThisQuestion - 1);
      isAudioPlaying = false;
      playRemainingAtStartOfCurrentPlayback = null;
      syncPlayButtonLabel();
      setFeedback(`Audio could not play. Check that the audio file is available at ${currentDeviceQuestion.audio}.`, "bad");
    });
  }
}

function resetMelodicDeviceQuestion() {
  if (!currentDeviceQuestion) {
    loadMelodicDeviceQuestion();
    return;
  }

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  hasPlayedAudio = false;
  selectedDeviceAnswer = "";
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  resetPlayCounterForQuestion();
  setPlayButtonMode("play");
  progressInner.style.width = "0%";
  scoreText.textContent = `Score: 0 / ${currentDeviceQuestion.marks}`;
  streakText.textContent = currentDeviceQuestion.category || "Melodic devices";
  xpText.textContent = `${currentDeviceQuestion.level} · ${getPlayLimitLabel()}`;
  renderMelodicDevicesWorkspace(currentDeviceQuestion);
  renderMelodicDevicesAnswerPanelIntro(currentDeviceQuestion);
  setFeedback("Reset. Press Replay Excerpt when you are ready to hear it again.");
}

function submitMelodicDeviceAnswer(choice = "") {
  if (!currentDeviceQuestion || isQuestionComplete) return;

  selectedDeviceAnswer = String(choice || "").trim();
  const answerSignature = normaliseDeviceAnswer(selectedDeviceAnswer);
  const acceptedSignatures = currentDeviceQuestion.acceptedSignatures.length
    ? currentDeviceQuestion.acceptedSignatures
    : [currentDeviceQuestion.answerSignature];
  const isCorrect = acceptedSignatures.includes(answerSignature) || answerSignature === currentDeviceQuestion.answerSignature;
  const awardedMarks = isCorrect ? currentDeviceQuestion.marks : 0;
  const result = {
    skill: "melodic-devices",
    questionId: currentDeviceQuestion.id,
    awardedMarks,
    maxMarks: currentDeviceQuestion.marks,
    pitchMarksAwarded: awardedMarks,
    pitchMarksAvailable: currentDeviceQuestion.marks,
    shapeMarksAwarded: 0,
    shapeMarksAvailable: 0,
    selectedAnswer: selectedDeviceAnswer,
    correctAnswer: currentDeviceQuestion.correctAnswer,
    category: currentDeviceQuestion.category,
    shortComment: isCorrect
      ? "Secure melodic-device recognition."
      : (currentDeviceQuestion.feedback || `Listen again for ${currentDeviceQuestion.correctAnswer}.`)
  };

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  hasSubmittedCurrentQuestion = true;
  isQuestionComplete = true;

  if (isRoundActive) roundResults[roundQuestionPosition] = result;

  document.querySelectorAll(".melodic-devices-option").forEach((button) => {
    const buttonChoice = button.dataset.choice || "";
    const buttonSignature = normaliseDeviceAnswer(buttonChoice);
    button.disabled = true;
    button.classList.toggle("correct", buttonSignature === currentDeviceQuestion.answerSignature);
    button.classList.toggle("wrong", buttonSignature === answerSignature && !isCorrect);
    button.setAttribute("aria-checked", buttonSignature === answerSignature ? "true" : "false");
  });

  progressInner.style.width = "100%";
  scoreText.textContent = `Mark: ${awardedMarks} / ${currentDeviceQuestion.marks}`;
  streakText.textContent = isCorrect ? "Correct" : "Review";
  xpText.textContent = currentDeviceQuestion.category || "Submitted";
  setPlayButtonMode("next");
  setFeedback(
    isCorrect
      ? `Correct: ${currentDeviceQuestion.correctAnswer}. Press ${getProgressionButtonLabel()}.`
      : `Not quite. Correct answer: ${currentDeviceQuestion.correctAnswer}. Press ${getProgressionButtonLabel()}.`,
    isCorrect ? "good" : "bad"
  );
  renderMelodicDevicesAnswerPanelSubmitted(result, currentDeviceQuestion);
}


function loadQuestion(options = {}) {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  const shouldAutoPlay = Boolean(options && options.autoPlay === true);
  const isTransitionIn = Boolean(options && options.transitionIn === true);
  const shouldExpandOnLoad = Boolean(options && options.expandOnLoad === true);

  closeRoundFeedbackWindow();
  activeRoundSkill = "dictation";
  hideMelodicDevicesWorkspace();

  isLoaded = true;
  isShowingAnswer = false;
  hasPlayedAudio = false;
  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  lastAttemptDiagnostic = null;
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  resetPlayCounterForQuestion();

  setQuizVisualState("active");

  if (quizPanel && !isTransitionIn) quizPanel.classList.remove("is-question-handoff-out", "is-question-handoff-in");

  const totalSlots = MM001_DICTATION.slots.length || dictationSlots.length || 6;

  questionText.textContent = "Complete the melody.";
  roundText.textContent = isRoundActive ? getRoundLabel() : "Ready";
  scoreText.textContent = `Placed: 0 / ${totalSlots}`;
  streakText.textContent = "Pitch snap";
  xpText.textContent = `${getNoteCountLabel(totalSlots)} · ${getPlayLimitLabel()}`;
  progressInner.style.width = "0%";

  scoreImage.src = MM001.questionImage;
  scoreImage.alt = `${MM001.id} question score with missing notes`;
  renderScoreTrackInfo();

  audio = new Audio(MM001.audio);
  audio.volume = 1;

  startButton.style.display = "none";
  playButton.style.display = "inline-flex";
  setPlayButtonMode("play");
  checkAnswerButton.style.display = "";
  checkAnswerButton.disabled = true;
  syncSubmissionButtonLabel();
  setAnswerRevealButtonVisible(false);

  scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus", "is-score-expanded");
  if (!shouldExpandOnLoad) {
    collapseScoreExpansion();
  }

  renderDictationNotes();

  if (shouldExpandOnLoad) {
    expandScoreForPlay();
  }

  setFeedback(shouldAutoPlay ? "First play starting. Listen for the missing notes, then use Replay Excerpt if needed." : "");
  renderAnswerPanelIntro();

  if (shouldAutoPlay) {
    playAudio({ autoStarted: true });
  } else {
    syncPlayButtonLabel();
  }
}

function handleAudioFinished() {
  if (isDevicesRound()) {
    handleMelodicDeviceAudioFinished();
    return;
  }

  clearScoreFocus();
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;

  if (isQuestionComplete) {
    setPlayButtonMode("next");
    return;
  }

  setPlayButtonMode("replay");

  const remaining = getRemainingPlays();
  if (remaining > 0) {
    setFeedback(`${getPlayRemainingText(remaining)}. You may replay the excerpt, or submit your answers when ready.`);
  } else {
    setFeedback(`0 plays left. Complete your answer, then press Submit your answers.`, "bad");
  }
}

function playAudio(options = {}) {
  if (isDevicesRound()) {
    playMelodicDeviceAudio(options);
    return;
  }

  if (playButton && playButton.dataset.mode === "next") {
    goToNextQuestion();
    return;
  }

  if (isQuestionComplete) {
    goToNextQuestion();
    return;
  }

  if (isAudioPlaying) return;

  const autoStarted = Boolean(options && options.autoStarted === true);

  if (!isLoaded) loadQuestion({ expandOnLoad: true });

  if (playsUsedThisQuestion >= (quizSettings.playLimit || DEFAULT_QUIZ_SETTINGS.playLimit)) {
    syncPlayButtonLabel();
    setFeedback(`0 plays left. Complete your answer, then press Submit your answers.`, "bad");
    return;
  }

  if (!audio) {
    audio = new Audio(MM001.audio);
  }

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;

  playRemainingAtStartOfCurrentPlayback = getRemainingPlays();
  isAudioPlaying = true;
  syncPlayButtonLabel();

  audio.onended = handleAudioFinished;

  let playAttempt;

  try {
    // Keep the audio call as the first media action after Start Quiz/Replay so browsers
    // still treat it as user-initiated playback.
    playAttempt = audio.play();
  } catch (error) {
    isAudioPlaying = false;
    playRemainingAtStartOfCurrentPlayback = null;
    clearScoreFocus();
    syncPlayButtonLabel();
    setFeedback(`Audio could not play. Check that the audio file is available at ${MM001.audio}.`, "bad");
    return;
  }

  hasPlayedAudio = true;
  playsUsedThisQuestion += 1;
  if (scoreOverlay) scoreOverlay.classList.remove("is-notes-hidden-before-play");
  expandScoreForPlay();
  startScoreFocus();

  const playMessage = autoStarted ? "First play" : "Replay";
  setFeedback(`${playMessage} ${playsUsedThisQuestion} of ${quizSettings.playLimit}. Listen carefully. The replay control will unlock when the audio finishes.`);

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      playsUsedThisQuestion = Math.max(0, playsUsedThisQuestion - 1);
      isAudioPlaying = false;
      playRemainingAtStartOfCurrentPlayback = null;
      syncPlayButtonLabel();
      clearScoreFocus();
      setFeedback(`Audio could not play. Check that the audio file is available at ${MM001.audio}.`, "bad");
    });
  }
}

function showAnswer() {
  clearPerfectAnswerRevealTimer();

  if (!isLoaded) loadQuestion({ expandOnLoad: true });

  if (!hasSubmittedCurrentQuestion && !window.MELODY_MASTER_CLASSROOM_MODE) {
    setFeedback("Submit your answers first, then reveal the model answer.", "bad");
    return;
  }

  clearScoreFocus();
  isShowingAnswer = !isShowingAnswer;

  if (isShowingAnswer) {
    scoreImage.src = MM001.answerImage;
    scoreImage.alt = `${MM001.id} answer score`;
    scoreShell.classList.add("showing-answer");
    if (scoreOverlay) {
      scoreOverlay.classList.add("is-answer-visible");
      scoreOverlay.classList.remove("is-perfect-answer-reveal");
    }
    if (showAnswerButton) showAnswerButton.textContent = "Show Question";
    progressInner.style.width = "100%";
    setFeedback("Showing the model answer. Press Show Question to return to your notes.", "good");
    renderAnswerPanelAnswer();
  } else {
    scoreImage.src = MM001.questionImage;
    scoreImage.alt = `${MM001.id} question score with missing notes`;
    scoreShell.classList.remove("showing-answer");
    if (scoreOverlay) {
      scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");
      scoreOverlay.classList.toggle("is-notes-hidden-before-play", !hasPlayedAudio);
    }
    if (showAnswerButton) showAnswerButton.textContent = hasSubmittedCurrentQuestion ? "Reveal Answer" : "Show Answer";
    updateDictationProgress();
    setFeedback(hasSubmittedCurrentQuestion ? "Back to your notes. You can adjust them, press Check again, or move to the next question." : "Back to the question score. Your draggable notes are still in place.");
    if (hasSubmittedCurrentQuestion && lastAttemptDiagnostic && !window.MELODY_MASTER_CLASSROOM_MODE) {
      const total = dictationSlots.length || 6;
      const correctCount = lastAttemptDiagnostic.noteDetails.filter((note) => note.isCorrect).length;
      renderAnswerPanelSubmitted(correctCount, total);
      setPlayButtonMode("next");
      setAnswerRevealButtonVisible(true);
    } else {
      renderAnswerPanelIntro();
    }
  }
}

function resetDictation() {
  if (isDevicesRound()) {
    resetMelodicDeviceQuestion();
    return;
  }

  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  if (!isLoaded) {
    loadQuestion({ expandOnLoad: true });
    return;
  }

  clearScoreFocus();

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  isShowingAnswer = false;
  hasPlayedAudio = false;
  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  scoreImage.src = MM001.questionImage;
  scoreImage.alt = `${MM001.id} question score with missing notes`;
  renderScoreTrackInfo();
  scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus", "is-score-expanded");
  collapseScoreExpansion();
  if (scoreOverlay) {
    scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");
    scoreOverlay.classList.add("is-notes-hidden-before-play");
  }
  syncSubmissionButtonLabel();
  setAnswerRevealButtonVisible(false);
  resetPlayCounterForQuestion();
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  setPlayButtonMode("play");
  progressInner.style.width = "0%";
  resetDictationNotes();
  expandScoreForPlay();
  setFeedback("Reset. The question remains expanded. Press Replay Excerpt when you are ready to hear it again.");
  renderAnswerPanelIntro();
}

function checkAnswer() {
  if (isDevicesRound()) return;

  clearPerfectAnswerRevealTimer();

  const total = dictationSlots.length || 6;
  const placedCount = getPlacedCount();

  if (placedCount !== total) {
    const actionLabel = hasSubmittedCurrentQuestion ? "checking again" : "submitting";
    setFeedback(`Place all ${total} notes onto the stave before ${actionLabel}.`, "bad");
    return;
  }

  const isFirstSubmissionForQuestion = !hasSubmittedCurrentQuestion;

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;

  let correctCount = 0;
  const correctFlags = [];

  dictationSlots.forEach((slot, index) => {
    if (!slot.token) return;

    const acceptedPitches = Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
      ? slot.acceptedPitches
      : [slot.pitch];
    const isCorrect = acceptedPitches.includes(slot.selectedPitch);
    correctFlags[index] = isCorrect;
    if (isCorrect) correctCount += 1;

    slot.token.classList.remove("correct", "wrong", "answer-flash-correct", "answer-flash-wrong", "perfect-answer-notehead-flash");
    void slot.token.offsetWidth;
    slot.token.classList.add(
      isCorrect ? "correct" : "wrong",
      isCorrect ? "answer-flash-correct" : "answer-flash-wrong"
    );
  });

  lastAttemptDiagnostic = buildAttemptDiagnostic(correctFlags);
  lastAttemptDiagnostic.gcseMarking = buildGCSEMarkingEvaluation(correctFlags, lastAttemptDiagnostic);

  const gcseMarking = lastAttemptDiagnostic.gcseMarking;

  if (isRoundActive && isFirstSubmissionForQuestion) {
    roundResults[roundQuestionPosition] = {
      questionId: MM001.id,
      awardedMarks: gcseMarking.awardedMarks,
      maxMarks: gcseMarking.maxMarks,
      pitchMarksAwarded: gcseMarking.pitchMarksAwarded,
      pitchMarksAvailable: gcseMarking.pitchMarksAvailable,
      shapeMarksAwarded: gcseMarking.shapeMarksAwarded,
      shapeMarksAvailable: gcseMarking.shapeMarksAvailable,
      firstWrongNote: gcseMarking.firstWrongNote ? gcseMarking.firstWrongNote.noteNumber : null,
      firstContourError: gcseMarking.firstContourError || "",
      firstIntervalSizeError: gcseMarking.firstIntervalSizeError || "",
      shortComment: gcseMarking.shortComment || ""
    };
  }

  progressInner.style.width = "100%";
  scoreText.textContent = `Mark: ${gcseMarking.awardedMarks} / ${gcseMarking.maxMarks}`;
  streakText.textContent = correctCount === total ? "Complete" : `${correctCount}/${total} pitches`;
  xpText.textContent = gcseMarking.shapeCreditAvailable
    ? (gcseMarking.shapeMarkAwarded ? "Shape credited" : "Shape not credited")
    : "Submitted";

  hasSubmittedCurrentQuestion = true;
  isQuestionComplete = true;
  syncSubmissionButtonLabel();
  setAnswerRevealButtonVisible(true);
  setPlayButtonMode("next");

  const scoreStatusText = isFirstSubmissionForQuestion
    ? "This score has been entered for the round."
    : "Practice check only: your round score has not changed.";
  const nextActionText = `You can adjust the notes and press Check again, reveal the answer, or press ${getProgressionButtonLabel()}.`;

  if (correctCount === total) {
    setFeedback(`Full credit: ${gcseMarking.awardedMarks} / ${gcseMarking.maxMarks}. ${scoreStatusText} ${nextActionText}`, "good");
  } else {
    setFeedback(`Mark: ${gcseMarking.awardedMarks} / ${gcseMarking.maxMarks}. ${gcseMarking.shortComment} ${scoreStatusText} ${nextActionText}`, "bad");
  }

  renderAnswerPanelSubmitted(correctCount, total);
}


function getIntervalNameFromDiatonicSteps(stepDistance = 0) {
  const intervalNumber = Math.abs(Number(stepDistance) || 0) + 1;
  const names = {
    1: "repeated notes",
    2: "stepwise motion",
    3: "third leaps",
    4: "fourth leaps",
    5: "fifth leaps",
    6: "sixth leaps",
    7: "seventh leaps",
    8: "octave leaps"
  };

  return names[intervalNumber] || `large leaps`;
}

function getDirectionLabel(delta = 0) {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "same";
}

function getMelodySkillForNote(index = 0, pitch = "", previousPitch = "") {
  if (index === 0 || !previousPitch) {
    return {
      key: "starting-pitch",
      label: "starting pitch",
      detail: "first note placement"
    };
  }

  const stepDistance = Math.abs(pitchToDiatonicNumber(pitch) - pitchToDiatonicNumber(previousPitch));
  const label = getIntervalNameFromDiatonicSteps(stepDistance);

  return {
    key: stepDistance <= 1 ? label.replaceAll(" ", "-") : `leap-${stepDistance + 1}`,
    label,
    detail: `${previousPitch} → ${pitch}`
  };
}

function summariseDiagnosticGroups(groups = []) {
  return groups
    .filter((group) => group.total > 0)
    .sort((a, b) => {
      const aRate = a.correct / Math.max(a.total, 1);
      const bRate = b.correct / Math.max(b.total, 1);
      if (bRate !== aRate) return bRate - aRate;
      return b.total - a.total;
    });
}

function createDiagnosticMetric(key, label, detail = "") {
  return {
    key,
    label,
    detail,
    total: 0,
    correct: 0,
    wrong: 0,
    wrongNotes: [],
    issues: []
  };
}

function addDiagnosticResult(metric, isCorrect, noteNumber, issue = "") {
  if (!metric) return;
  metric.total += 1;
  if (isCorrect) {
    metric.correct += 1;
    return;
  }
  metric.wrong += 1;
  if (noteNumber) metric.wrongNotes.push(noteNumber);
  if (issue) metric.issues.push(issue);
}

function buildAttemptDiagnostic(correctFlags = []) {
  const groupMap = new Map();
  const noteDetails = [];
  const contourMetric = createDiagnosticMetric("contour", "melodic contour", "up/down/same shape between notes");
  const intervalSizeMetric = createDiagnosticMetric("interval-size", "interval size", "distance between one note and the next");
  const relativeIntervalMetric = createDiagnosticMetric("relative-interval", "relative interval", "direction and size from the previous note");
  const contourIssues = [];
  const intervalIssues = [];
  const anchorShiftIssues = [];

  dictationSlots.forEach((slot, index) => {
    const pitch = slot.pitch || "";
    const selectedPitch = slot.selectedPitch || "—";
    const previousPitch = index > 0 ? (dictationSlots[index - 1].pitch || "") : "";
    const skill = getMelodySkillForNote(index, pitch, previousPitch);
    const isCorrect = Boolean(correctFlags[index]);

    if (!groupMap.has(skill.key)) {
      groupMap.set(skill.key, {
        key: skill.key,
        label: skill.label,
        total: 0,
        correct: 0,
        wrong: 0,
        details: [],
        wrongNotes: []
      });
    }

    const group = groupMap.get(skill.key);
    group.total += 1;
    if (isCorrect) {
      group.correct += 1;
    } else {
      group.wrong += 1;
      group.wrongNotes.push(index + 1);
    }
    group.details.push(skill.detail);

    noteDetails.push({
      noteNumber: index + 1,
      isCorrect,
      selectedPitch,
      correctPitch: pitch,
      label: skill.label,
      detail: skill.detail
    });
  });

  for (let index = 1; index < dictationSlots.length; index += 1) {
    const previousSlot = dictationSlots[index - 1];
    const slot = dictationSlots[index];
    const previousCorrectPitch = previousSlot.pitch || "";
    const currentCorrectPitch = slot.pitch || "";
    const previousSelectedPitch = previousSlot.selectedPitch || "";
    const currentSelectedPitch = slot.selectedPitch || "";
    const noteNumber = index + 1;

    if (!previousSelectedPitch || !currentSelectedPitch) continue;

    const correctDelta = pitchToDiatonicNumber(currentCorrectPitch) - pitchToDiatonicNumber(previousCorrectPitch);
    const selectedDelta = pitchToDiatonicNumber(currentSelectedPitch) - pitchToDiatonicNumber(previousSelectedPitch);
    const correctDirection = Math.sign(correctDelta);
    const selectedDirection = Math.sign(selectedDelta);
    const correctSize = Math.abs(correctDelta);
    const selectedSize = Math.abs(selectedDelta);
    const contourCorrect = correctDirection === selectedDirection;
    const intervalSizeCorrect = correctSize === selectedSize;
    const relativeIntervalCorrect = correctDelta === selectedDelta;
    const correctIntervalName = getIntervalNameFromDiatonicSteps(correctSize);
    const selectedIntervalName = getIntervalNameFromDiatonicSteps(selectedSize);
    const correctDirectionLabel = getDirectionLabel(correctDelta);
    const selectedDirectionLabel = getDirectionLabel(selectedDelta);

    let contourIssue = "";
    if (!contourCorrect) {
      contourIssue = `note ${noteNumber}: expected ${correctDirectionLabel}, placed ${selectedDirectionLabel}`;
      contourIssues.push(contourIssue);
    }

    let sizeIssue = "";
    if (!intervalSizeCorrect) {
      const sizeWord = selectedSize < correctSize ? "underestimated" : "overestimated";
      sizeIssue = `note ${noteNumber}: ${sizeWord} ${correctIntervalName} (${previousCorrectPitch}→${currentCorrectPitch})`;
      intervalIssues.push(sizeIssue);
    }

    if (!relativeIntervalCorrect && contourCorrect && !intervalSizeCorrect) {
      const sizeWord = selectedSize < correctSize ? "too small" : "too large";
      intervalIssues.push(`note ${noteNumber}: contour right, interval ${sizeWord}`);
    }

    if (!correctFlags[index] && !correctFlags[index - 1] && relativeIntervalCorrect) {
      anchorShiftIssues.push(`notes ${index}–${noteNumber}: interval shape is right, but the melody is shifted from an earlier anchor`);
    }

    addDiagnosticResult(contourMetric, contourCorrect, noteNumber, contourIssue);
    addDiagnosticResult(intervalSizeMetric, intervalSizeCorrect, noteNumber, sizeIssue);
    addDiagnosticResult(relativeIntervalMetric, relativeIntervalCorrect, noteNumber, !relativeIntervalCorrect ? `note ${noteNumber}: expected ${correctDirectionLabel} ${correctIntervalName}, placed ${selectedDirectionLabel} ${selectedIntervalName}` : "");
  }

  const groups = Array.from(groupMap.values());
  const intervalMetrics = [contourMetric, intervalSizeMetric, relativeIntervalMetric].filter((metric) => metric.total > 0);
  const strengths = summariseDiagnosticGroups([
    ...intervalMetrics,
    ...groups
  ]).filter((group) => group.correct > 0 && group.correct / Math.max(group.total, 1) >= 0.75);

  const needsWork = [
    ...intervalMetrics,
    ...groups
  ].filter((group) => group.wrong > 0)
    .sort((a, b) => {
      const aMissRate = a.wrong / Math.max(a.total, 1);
      const bMissRate = b.wrong / Math.max(b.total, 1);
      if (bMissRate !== aMissRate) return bMissRate - aMissRate;
      return b.wrong - a.wrong;
    });

  return {
    strengths,
    needsWork,
    noteDetails,
    groups,
    contour: contourMetric,
    intervalSize: intervalSizeMetric,
    relativeInterval: relativeIntervalMetric,
    contourIssues,
    intervalIssues,
    anchorShiftIssues
  };
}


function getQuestionMarkScheme(totalNotes = dictationSlots.length || 0) {
  const configuredScheme = (MM001_SOURCE && MM001_SOURCE.markScheme) || {};
  const pitchMarks = Number.isFinite(Number(configuredScheme.pitchMarks))
    ? Number(configuredScheme.pitchMarks)
    : totalNotes;
  const shapeMarks = Number.isFinite(Number(configuredScheme.shapeMarks))
    ? Number(configuredScheme.shapeMarks)
    : (totalNotes > 1 ? 1 : 0);

  return {
    name: configuredScheme.name || "GCSE best-fit melodic dictation",
    pitchMarks,
    shapeMarks,
    pitchMarkPerNote: configuredScheme.pitchMarkPerNote !== false,
    shapeCreditAvailable: shapeMarks > 0,
    description: configuredScheme.description || "1 mark per correct pitch, with a best-fit contour/shape mark where the melodic shape is secure."
  };
}

function getOrdinalNoteLabel(noteNumber = 1) {
  const safeNumber = Number(noteNumber) || 1;
  const suffix = safeNumber % 10 === 1 && safeNumber % 100 !== 11
    ? "st"
    : safeNumber % 10 === 2 && safeNumber % 100 !== 12
      ? "nd"
      : safeNumber % 10 === 3 && safeNumber % 100 !== 13
        ? "rd"
        : "th";
  return `${safeNumber}${suffix} note`;
}

function getIntervalNumberName(stepDistance = 0) {
  const intervalNumber = Math.abs(Number(stepDistance) || 0) + 1;
  const labels = {
    1: "a repeated note",
    2: "a step",
    3: "a third",
    4: "a fourth",
    5: "a fifth",
    6: "a sixth",
    7: "a seventh",
    8: "an octave"
  };
  return labels[intervalNumber] || "a large leap";
}

function getDirectedIntervalLabel(delta = 0) {
  const numericDelta = Number(delta) || 0;
  if (numericDelta === 0) return "a repeated note";
  return `${numericDelta > 0 ? "up" : "down"} ${getIntervalNumberName(numericDelta)}`;
}

function getPitchHeightComment(selectedPitch = "", correctPitch = "") {
  if (!selectedPitch || !correctPitch) return "not placed accurately";
  const difference = pitchToDiatonicNumber(selectedPitch) - pitchToDiatonicNumber(correctPitch);
  if (difference > 0) return "placed too high";
  if (difference < 0) return "placed too low";
  return "correct";
}

function getPreviousIntervalFeedback(index = 0) {
  if (index <= 0) return "Check the starting pitch against the printed stave position.";

  const previousSlot = dictationSlots[index - 1];
  const slot = dictationSlots[index];
  if (!previousSlot || !slot || !previousSlot.selectedPitch || !slot.selectedPitch) {
    return "Check the melodic movement into this note.";
  }

  const correctDelta = pitchToDiatonicNumber(slot.pitch) - pitchToDiatonicNumber(previousSlot.pitch);
  const selectedDelta = pitchToDiatonicNumber(slot.selectedPitch) - pitchToDiatonicNumber(previousSlot.selectedPitch);
  const correctDirection = Math.sign(correctDelta);
  const selectedDirection = Math.sign(selectedDelta);
  const correctSize = Math.abs(correctDelta);
  const selectedSize = Math.abs(selectedDelta);

  if (correctDirection !== selectedDirection) {
    return `From note ${index} to note ${index + 1}, the melody should move ${getDirectedIntervalLabel(correctDelta)}, but your answer moves ${getDirectedIntervalLabel(selectedDelta)}.`;
  }

  if (correctSize !== selectedSize) {
    const sizeComment = selectedSize < correctSize ? "too small" : "too large";
    return `The direction into note ${index + 1} is right, but the interval is ${sizeComment}: it should be ${getDirectedIntervalLabel(correctDelta)}.`;
  }

  return `The interval into note ${index + 1} is right; check whether an earlier anchor pitch has shifted the answer.`;
}

function buildGCSEMarkingEvaluation(correctFlags = [], diagnostic = null) {
  const totalNotes = dictationSlots.length || 0;
  const markScheme = getQuestionMarkScheme(totalNotes);
  const pitchMarksAwarded = correctFlags.filter(Boolean).length;
  const intervalResults = [];
  let contourCorrectCount = 0;
  let intervalExactCount = 0;
  let firstContourError = null;
  let firstIntervalSizeError = null;
  let relativeIntervalPatternExact = totalNotes > 1;
  let contourPatternExact = totalNotes > 1;

  for (let index = 1; index < totalNotes; index += 1) {
    const previousSlot = dictationSlots[index - 1];
    const slot = dictationSlots[index];
    const correctDelta = pitchToDiatonicNumber(slot.pitch) - pitchToDiatonicNumber(previousSlot.pitch);
    const selectedDelta = pitchToDiatonicNumber(slot.selectedPitch) - pitchToDiatonicNumber(previousSlot.selectedPitch);
    const contourCorrect = Math.sign(correctDelta) === Math.sign(selectedDelta);
    const intervalExact = correctDelta === selectedDelta;
    const intervalSizeCorrect = Math.abs(correctDelta) === Math.abs(selectedDelta);

    if (contourCorrect) contourCorrectCount += 1;
    if (intervalExact) intervalExactCount += 1;
    if (!contourCorrect) contourPatternExact = false;
    if (!intervalExact) relativeIntervalPatternExact = false;

    if (!contourCorrect && !firstContourError) {
      firstContourError = `note ${index + 1}: expected ${getDirectedIntervalLabel(correctDelta)}, heard ${getDirectedIntervalLabel(selectedDelta)}`;
    }

    if (!intervalSizeCorrect && !firstIntervalSizeError) {
      const sizeWord = Math.abs(selectedDelta) < Math.abs(correctDelta) ? "too small" : "too large";
      firstIntervalSizeError = `note ${index + 1}: interval ${sizeWord}; expected ${getDirectedIntervalLabel(correctDelta)}`;
    }

    intervalResults.push({
      noteNumber: index + 1,
      correctDelta,
      selectedDelta,
      contourCorrect,
      intervalExact,
      intervalSizeCorrect
    });
  }

  const shapeCreditAvailable = Boolean(markScheme.shapeCreditAvailable && totalNotes > 1);
  const shapeMarkAwarded = shapeCreditAvailable ? contourPatternExact : false;
  const shapeMarksAwarded = shapeMarkAwarded ? markScheme.shapeMarks : 0;
  const awardedMarks = pitchMarksAwarded + shapeMarksAwarded;
  const maxMarks = markScheme.pitchMarks + (shapeCreditAvailable ? markScheme.shapeMarks : 0);
  const startingPitchCorrect = Boolean(correctFlags[0]);
  const exactPitchPerfect = pitchMarksAwarded === totalNotes;

  const wrongNotes = dictationSlots
    .map((slot, index) => ({
      noteNumber: index + 1,
      selectedPitch: slot.selectedPitch || "—",
      correctPitch: slot.pitch || "—",
      isCorrect: Boolean(correctFlags[index]),
      pitchComment: getPitchHeightComment(slot.selectedPitch, slot.pitch),
      intervalComment: getPreviousIntervalFeedback(index)
    }))
    .filter((note) => !note.isCorrect);

  let shortComment = "Pitch accuracy and melodic shape have been marked separately.";
  let examinerComment = "Award 1 mark for each exact pitch. Award the shape mark only where the contour is secure across the missing melody.";

  if (exactPitchPerfect && shapeMarkAwarded) {
    shortComment = "All pitch marks and the melodic shape credit have been awarded.";
    examinerComment = "Full credit: every pitch is accurate and the melodic contour is secure.";
  } else if (!startingPitchCorrect && relativeIntervalPatternExact) {
    shortComment = "The answer is transposed: the starting pitch is wrong, but the interval pattern is secure.";
    examinerComment = "Credit is given for shape because the melody keeps the correct interval pattern after the first note, but pitch marks are lost where exact notes are incorrect.";
  } else if (!startingPitchCorrect && shapeMarkAwarded) {
    shortComment = "The starting pitch is incorrect, but the overall contour is strong enough for shape credit.";
    examinerComment = "This is a typical best-fit GCSE case: the answer does not earn every pitch mark, but the melodic shape is recognisable.";
  } else if (shapeMarkAwarded) {
    shortComment = "The contour is secure, but some exact pitches or interval sizes need correction.";
    examinerComment = "Shape credit is awarded because the up/down/same outline is correct. Lost marks come from exact pitch placement.";
  } else if (contourCorrectCount > 0) {
    shortComment = "Some melodic direction is correct, but the contour is not secure enough for the shape mark.";
    examinerComment = `No shape mark: the contour breaks at ${firstContourError || "one or more notes"}.`;
  } else {
    shortComment = "The exact pitches and melodic contour both need further work.";
    examinerComment = "No shape mark: the missing melody does not yet show a secure outline.";
  }

  return {
    markScheme,
    totalNotes,
    pitchMarksAwarded,
    pitchMarksAvailable: markScheme.pitchMarks,
    shapeCreditAvailable,
    shapeMarksAvailable: shapeCreditAvailable ? markScheme.shapeMarks : 0,
    shapeMarkAwarded,
    shapeMarksAwarded,
    awardedMarks,
    maxMarks,
    startingPitchCorrect,
    exactPitchPerfect,
    contourCorrectCount,
    contourTotal: Math.max(totalNotes - 1, 0),
    intervalExactCount,
    intervalResults,
    relativeIntervalPatternExact,
    contourPatternExact,
    firstContourError,
    firstIntervalSizeError,
    wrongNotes,
    shortComment,
    examinerComment,
    diagnostic
  };
}

function getGCSEMarkingForPanel(correctCount = 0, total = dictationSlots.length || 0, diagnostic = lastAttemptDiagnostic) {
  if (diagnostic && diagnostic.gcseMarking) return diagnostic.gcseMarking;
  const fallbackFlags = dictationSlots.map((slot) => {
    const acceptedPitches = Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
      ? slot.acceptedPitches
      : [slot.pitch];
    return Boolean(slot.selectedPitch && acceptedPitches.includes(slot.selectedPitch));
  });
  return buildGCSEMarkingEvaluation(fallbackFlags, diagnostic);
}

function getMarkStateClass(awarded = 0, available = 0) {
  if (!available) return "";
  if (awarded >= available) return "is-secure";
  if (awarded >= Math.ceil(available / 2)) return "is-nearly";
  return "is-focus";
}

function formatGCSEMarkSchemeSummary(marking) {
  if (!marking) return "";

  const contourText = marking.shapeCreditAvailable
    ? `${marking.shapeMarksAwarded}/${marking.shapeMarksAvailable}`
    : "—";

  return `
    <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melody Master mark breakdown">
      <div class="diagnostic-metric ${getMarkStateClass(marking.pitchMarksAwarded, marking.pitchMarksAvailable)}">
        <span>Pitch mark</span>
        <strong>${marking.pitchMarksAwarded}/${marking.pitchMarksAvailable}</strong>
      </div>
      <div class="diagnostic-metric ${marking.shapeMarkAwarded ? "is-secure" : "is-focus"}">
        <span>Contour mark</span>
        <strong>${contourText}</strong>
      </div>
    </div>
  `;
}

function getQuestionMaxMarksFromSource(source = {}) {
  const layoutSlots = source && source.dictationLayout && Array.isArray(source.dictationLayout.slots)
    ? source.dictationLayout.slots.length
    : 0;
  const answerPitchCount = Array.isArray(source.answerPitches) ? source.answerPitches.length : 0;
  const totalNotes = layoutSlots || answerPitchCount || 0;
  const configuredScheme = source.markScheme || {};
  const pitchMarks = Number.isFinite(Number(configuredScheme.pitchMarks))
    ? Number(configuredScheme.pitchMarks)
    : totalNotes;
  const shapeMarks = Number.isFinite(Number(configuredScheme.shapeMarks))
    ? Number(configuredScheme.shapeMarks)
    : (totalNotes > 1 ? 1 : 0);

  return pitchMarks + (shapeMarks > 0 ? shapeMarks : 0);
}

function getRoundTotalPossibleMarks() {
  const indices = roundQuestionIndices && roundQuestionIndices.length
    ? roundQuestionIndices
    : [currentQuestionIndex];

  if (isDevicesRound()) {
    return indices.reduce((sum, index) => sum + (Number(melodicDeviceQuestions[index]?.marks) || 1), 0);
  }

  return indices.reduce((sum, index) => sum + getQuestionMaxMarksFromSource(ALL_MELODY_CLIPS[index] || MM001_SOURCE), 0);
}

function getRoundScoreSummary() {
  const markedResults = roundResults.filter(Boolean);
  const awarded = markedResults.reduce((sum, result) => sum + (Number(result.awardedMarks) || 0), 0);
  const possibleSoFar = markedResults.reduce((sum, result) => sum + (Number(result.maxMarks) || 0), 0);
  const totalPossible = isRoundActive ? getRoundTotalPossibleMarks() : possibleSoFar;
  const totalQuestions = getRoundTotal();
  const attempted = markedResults.length;
  const isFinal = isRoundActive && attempted >= totalQuestions && totalQuestions > 0;
  const percentageBase = isFinal ? totalPossible : possibleSoFar;
  const percentage = percentageBase > 0 ? Math.round((awarded / percentageBase) * 100) : 0;

  return {
    awarded,
    possibleSoFar,
    totalPossible,
    totalQuestions,
    attempted,
    isFinal,
    percentage
  };
}

function getRoundFeedbackText(summary) {
  if (!summary || summary.attempted <= 0) {
    return "Your round score will update after each checked answer.";
  }

  if (isDevicesRound()) {
    if (!summary.isFinal) {
      return `${summary.attempted}/${summary.totalQuestions} ${summary.attempted === 1 ? "question" : "questions"} answered. Keep listening for melodic-device clues.`;
    }

    if (summary.percentage >= 90) return "Excellent round. Melodic-device recognition is secure.";
    if (summary.percentage >= 70) return "Strong round. Most melodic devices are clear; review the feedback for any missed examples.";
    if (summary.percentage >= 50) return "Developing round. Focus on contour, repetition and interval patterns in each phrase.";
    return "Keep practising. Start by naming the melodic movement, then listen for repeated notes, sequence and leaps.";
  }

  if (!summary.isFinal) {
    return `${summary.attempted}/${summary.totalQuestions} ${summary.attempted === 1 ? "question" : "questions"} marked. Keep using the feedback above before moving on.`;
  }

  if (summary.percentage >= 90) {
    return "Excellent round. Pitch accuracy and melodic contour are secure.";
  }

  if (summary.percentage >= 70) {
    return "Strong round. Most of the dictation is accurate; review the marked points before moving on.";
  }

  if (summary.percentage >= 50) {
    return "Developing round. The melody shape is partly secure; focus on exact pitch placement and interval size.";
  }

  return "Keep practising. Start with the first note and the direction of each movement before refining exact pitch.";
}

function renderRoundScoreTracker() {
  const summary = getRoundScoreSummary();
  const title = summary.isFinal ? "Final score" : "Round score";
  const scoreTextValue = summary.isFinal
    ? `${summary.awarded}/${summary.totalPossible}`
    : `${summary.awarded}/${summary.totalPossible}`;
  const markedText = `${summary.attempted}/${summary.totalQuestions} ${summary.totalQuestions === 1 ? "question" : "questions"} marked`;

  return `
    <div class="diagnostic-card mm-round-score-tile ${summary.isFinal ? "is-final" : ""}">
      <span>${escapeHTML(title)}</span>
      <strong>${escapeHTML(scoreTextValue)}</strong>
      <small>${escapeHTML(markedText)}${summary.attempted ? ` · ${summary.percentage}%` : ""}</small>
      <p>${escapeHTML(getRoundFeedbackText(summary))}</p>
    </div>
  `;
}

function getRoundAggregateMarks() {
  const markedResults = roundResults.filter(Boolean);
  return markedResults.reduce((totals, result) => {
    totals.pitchAwarded += Number(result.pitchMarksAwarded) || 0;
    totals.pitchAvailable += Number(result.pitchMarksAvailable) || 0;
    totals.shapeAwarded += Number(result.shapeMarksAwarded) || 0;
    totals.shapeAvailable += Number(result.shapeMarksAvailable) || 0;
    return totals;
  }, {
    pitchAwarded: 0,
    pitchAvailable: 0,
    shapeAwarded: 0,
    shapeAvailable: 0
  });
}

function getCompiledRoundFeedback(summary = getRoundScoreSummary()) {
  if (isDevicesRound()) {
    if (!summary || summary.attempted <= 0) {
      return "No submitted answers were found for this round.";
    }

    if (summary.percentage >= 90) {
      return "Excellent round. You identified the melodic devices securely across the excerpts.";
    }

    if (summary.percentage >= 70) {
      return "Strong round. Review any missed examples and listen again for the precise contour or interval clue.";
    }

    if (summary.percentage >= 50) {
      return "Developing round. Focus on whether the melody is moving by step, leap, repetition, sequence or triad shape.";
    }

    return "Keep practising. First name the overall direction of the melody, then listen for repeated notes, steps, leaps and patterns.";
  }

  const totals = getRoundAggregateMarks();
  const pitchPercent = totals.pitchAvailable > 0 ? Math.round((totals.pitchAwarded / totals.pitchAvailable) * 100) : 0;
  const contourPercent = totals.shapeAvailable > 0 ? Math.round((totals.shapeAwarded / totals.shapeAvailable) * 100) : 0;

  if (!summary || summary.attempted <= 0) {
    return "No submitted answers were found for this round.";
  }

  if (summary.percentage >= 90) {
    return "Excellent round. Your pitch accuracy and melodic contour are secure across the dictation questions.";
  }

  if (contourPercent >= 80 && pitchPercent < 70) {
    return "Your overall melodic shape is secure, but exact pitch placement needs refining. Keep using the first note as an anchor, then check each interval size.";
  }

  if (pitchPercent >= 70 && contourPercent < 70) {
    return "Several exact pitches are accurate, but the direction of the melody is not yet consistent. Focus on whether each note moves up, down, or repeats before refining the final pitch.";
  }

  if (summary.percentage >= 70) {
    return "Strong round. Most of the dictation is accurate; review any marked notes and listen again for the size of steps and leaps.";
  }

  if (summary.percentage >= 50) {
    return "Developing round. The melody is partly secure; the next step is to stabilise the starting pitch and track the contour before checking exact notes.";
  }

  return "Keep practising. Start by identifying the first missing note and the direction of each movement, then refine whether each movement is a step, repeat, or leap.";
}

function renderRoundQuestionRows() {
  const totalQuestions = getRoundTotal();
  const rows = Array.from({ length: totalQuestions }, (_, index) => {
    const result = roundResults[index];
    if (!result) {
      return `
        <div class="mm-round-review-row">
          <span>Q${index + 1}</span>
          <strong>Not submitted</strong>
          <small>—</small>
        </div>
      `;
    }

    if (result.skill === "melodic-devices") {
      return `
        <div class="mm-round-review-row">
          <span>Question ${index + 1}</span>
          <strong>${escapeHTML(`${result.awardedMarks}/${result.maxMarks}`)}</strong>
          <small>${escapeHTML(result.category || "Melodic devices")} · Your answer: ${escapeHTML(result.selectedAnswer || "—")} · Correct: ${escapeHTML(result.correctAnswer || "—")}</small>
        </div>
      `;
    }

    const noteText = result.firstWrongNote
      ? `First pitch to review: note ${result.firstWrongNote}`
      : (result.firstContourError || result.firstIntervalSizeError || "Secure response");

    return `
      <div class="mm-round-review-row">
        <span>Question ${index + 1}</span>
        <strong>${escapeHTML(`${result.awardedMarks}/${result.maxMarks}`)}</strong>
        <small>Pitch ${escapeHTML(`${result.pitchMarksAwarded}/${result.pitchMarksAvailable}`)} · Contour ${escapeHTML(`${result.shapeMarksAwarded}/${result.shapeMarksAvailable}`)} · ${escapeHTML(noteText)}</small>
      </div>
    `;
  });

  return rows.join("");
}

function renderRoundReviewPanel() {
  const summary = getRoundScoreSummary();
  const totals = getRoundAggregateMarks();
  const markedText = `${summary.attempted}/${summary.totalQuestions} ${summary.totalQuestions === 1 ? "question" : "questions"} submitted`;
  const isDevicesReview = isDevicesRound();

  return `
    <div class="mm-round-review-panel mm-source-panel mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel">
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${escapeHTML(`${summary.awarded}/${summary.totalPossible}`)}</strong>
        <small>${escapeHTML(markedText)} · ${escapeHTML(`${summary.percentage}%`)}</small>
      </div>

      <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Round mark breakdown">
        <div class="diagnostic-metric ${isDevicesReview ? (summary.awarded === summary.totalPossible ? "is-secure" : "is-focus") : (totals.pitchAwarded === totals.pitchAvailable && totals.pitchAvailable ? "is-secure" : "is-focus")}">
          <span>${isDevicesReview ? "Devices total" : "Pitch total"}</span>
          <strong>${escapeHTML(isDevicesReview ? `${summary.awarded}/${summary.totalPossible}` : `${totals.pitchAwarded}/${totals.pitchAvailable}`)}</strong>
        </div>
        <div class="diagnostic-metric ${isDevicesReview ? (summary.percentage >= 70 ? "is-secure" : "is-focus") : (totals.shapeAwarded === totals.shapeAvailable && totals.shapeAvailable ? "is-secure" : "is-focus")}">
          <span>${isDevicesReview ? "Recognition" : "Contour total"}</span>
          <strong>${escapeHTML(isDevicesReview ? `${summary.percentage}%` : `${totals.shapeAwarded}/${totals.shapeAvailable}`)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile">
        <span>Compiled feedback</span>
        <strong>${escapeHTML(getCompiledRoundFeedback(summary))}</strong>
      </div>

      <div class="mm-round-review-list" aria-label="Question-by-question round results">
        ${renderRoundQuestionRows()}
      </div>

      <button id="roundFinishButton" class="primary-button mm-final-finish-button" type="button">Finish Quiz</button>
    </div>
  `;
}

function showRoundFeedbackWindow() {
  saveMelodyMasterProgress();
  if (!answerCard || !isRoundActive) {
    finishRound();
    return;
  }

  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();
  clearScoreFocus();

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  isAudioPlaying = false;
  playRemainingAtStartOfCurrentPlayback = null;
  isRoundFeedbackOpen = true;
  isShowingAnswer = false;

  if (scoreImage) {
    scoreImage.src = MM001.questionImage;
    scoreImage.alt = `${MM001.id} question score with missing notes`;
  }
  if (scoreShell) scoreShell.classList.remove("showing-answer", "is-audio-focus", "is-note-focus");
  if (scoreOverlay) scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");

  if (appShell) appShell.classList.add("is-round-feedback-open");
  if (quizPanel) quizPanel.classList.add("is-round-feedback-open");
  document.body.classList.add("mm-round-review-open");

  removeRoundFeedbackOverlay();
  roundFeedbackOverlay = document.createElement("div");
  roundFeedbackOverlay.className = "mm-round-feedback-overlay";
  roundFeedbackOverlay.setAttribute("role", "dialog");
  roundFeedbackOverlay.setAttribute("aria-modal", "true");
  roundFeedbackOverlay.setAttribute("aria-label", "Melody Master round feedback");
  roundFeedbackOverlay.innerHTML = renderRoundReviewPanel();
  document.body.appendChild(roundFeedbackOverlay);

  const finishButton = roundFeedbackOverlay.querySelector("#roundFinishButton");
  if (finishButton) finishButton.addEventListener("click", finishRound);

  setFeedback("Round complete. Review your final score and feedback, then press Finish Quiz.", "good");
  if (playButton) {
    playButton.textContent = "See Feedback";
    playButton.disabled = true;
  }
}

function formatGCSEErrorList(marking) {
  if (!marking || !marking.wrongNotes || !marking.wrongNotes.length) {
    return "<p class=\"gcse-error-list-empty\">No pitch errors: every missing note is accurately placed.</p>";
  }

  return `
    <ul class="gcse-error-list" aria-label="GCSE melodic dictation error feedback">
      ${marking.wrongNotes.slice(0, 4).map((note) => `
        <li>
          <strong>${escapeHTML(getOrdinalNoteLabel(note.noteNumber))}</strong>
          <span>${escapeHTML(note.pitchComment)}. ${escapeHTML(note.intervalComment)}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function formatDiagnosticStrengths(diagnostic) {
  if (!diagnostic || !diagnostic.strengths || !diagnostic.strengths.length) {
    return "No clear strength yet — check another attempt after moving the red notes.";
  }

  return diagnostic.strengths
    .slice(0, 2)
    .map((group) => `${escapeHTML(group.label)} <span class="diagnostic-score">${group.correct}/${group.total}</span>`)
    .join(" · ");
}

function formatDiagnosticNeedsWork(diagnostic) {
  if (!diagnostic || !diagnostic.needsWork || !diagnostic.needsWork.length) {
    return "No weak area in this attempt.";
  }

  return diagnostic.needsWork
    .slice(0, 2)
    .map((group) => {
      const noteText = group.wrongNotes.length === 1
        ? `note ${group.wrongNotes[0]}`
        : `notes ${group.wrongNotes.join(", ")}`;
      return `${escapeHTML(group.label)} <span class="diagnostic-score">${group.correct}/${group.total}</span> <span class="diagnostic-note-ref">${escapeHTML(noteText)}</span>`;
    })
    .join(" · ");
}

function formatDiagnosticMetric(metric, label) {
  if (!metric || !metric.total) {
    return `<div class="diagnostic-metric"><span>${escapeHTML(label)}</span><strong>—</strong></div>`;
  }

  const rate = metric.correct / Math.max(metric.total, 1);
  const stateClass = rate >= 0.75 ? "is-secure" : rate >= 0.5 ? "is-nearly" : "is-focus";

  return `
    <div class="diagnostic-metric ${stateClass}">
      <span>${escapeHTML(label)}</span>
      <strong>${metric.correct}/${metric.total}</strong>
    </div>
  `;
}

function formatContourIntervalMetrics(diagnostic) {
  if (!diagnostic) return "";

  return `
    <div class="diagnostic-metrics" aria-label="Contour and interval accuracy">
      ${formatDiagnosticMetric(diagnostic.contour, "Contour")}
      ${formatDiagnosticMetric(diagnostic.intervalSize, "Interval size")}
    </div>
  `;
}

function getDiagnosticInsight(diagnostic, isPerfect = false) {
  if (isPerfect) {
    return "You matched both the melody shape and the interval sizes. Replay the answer score and notice how the grouping confirms what you heard.";
  }

  if (!diagnostic) {
    return "Submit an attempt to receive contour and interval-size feedback.";
  }

  if (diagnostic.anchorShiftIssues && diagnostic.anchorShiftIssues.length) {
    return `${diagnostic.anchorShiftIssues[0]}. Fix the earliest red note first, then re-check the following intervals.`;
  }

  const contour = diagnostic.contour || {};
  const intervalSize = diagnostic.intervalSize || {};
  const contourRate = contour.correct / Math.max(contour.total, 1);
  const sizeRate = intervalSize.correct / Math.max(intervalSize.total, 1);

  if (contour.total && intervalSize.total && contourRate >= 0.75 && sizeRate < 0.75) {
    const issue = diagnostic.intervalIssues && diagnostic.intervalIssues.length ? diagnostic.intervalIssues[0] : "some intervals are the wrong size";
    return `The contour is mostly right, but the interval size needs work: ${issue}. Keep the direction, then judge whether the movement is a step, third, or larger leap.`;
  }

  if (contour.total && contourRate < 0.75) {
    const issue = diagnostic.contourIssues && diagnostic.contourIssues.length ? diagnostic.contourIssues[0] : "the melody direction is unclear";
    return `Contour focus: ${issue}. On the next listen, trace only whether each note goes up, down, or stays the same before worrying about exact pitch.`;
  }

  if (intervalSize.total && sizeRate < 0.75) {
    const issue = diagnostic.intervalIssues && diagnostic.intervalIssues.length ? diagnostic.intervalIssues[0] : "one or more interval sizes are inaccurate";
    return `Interval-size focus: ${issue}. Sing the previous note internally, then decide whether the next movement is by step or leap.`;
  }

  const firstWeakness = diagnostic.needsWork && diagnostic.needsWork[0];
  if (firstWeakness) {
    if (firstWeakness.label.includes("stepwise")) {
      return "Next listen: track whether the melody moves up or down by step before placing the note.";
    }
    if (firstWeakness.label.includes("repeated")) {
      return "Next listen: check whether the pitch actually changes or stays the same.";
    }
    if (firstWeakness.label.includes("leap") || firstWeakness.label.includes("interval")) {
      return "Next listen: sing the previous note in your head, then judge the size of the leap before placing the next note.";
    }
  }

  return "Move the red notes, then check again to refine the diagnosis.";
}

function getDiagnosticNextStep(diagnostic, isPerfect = false) {
  return getDiagnosticInsight(diagnostic, isPerfect);
}


function getCompactGCSEFeedback(marking, diagnostic, isFullCredit = false) {
  if (!marking) {
    return "Submit an attempt to receive feedback.";
  }

  if (isFullCredit) {
    return "Full credit. All pitches are accurate and the melodic contour is secure.";
  }

  const firstWrongNote = marking.wrongNotes && marking.wrongNotes.length ? marking.wrongNotes[0] : null;
  const firstWrongNoteText = firstWrongNote ? ` Start by correcting ${getOrdinalNoteLabel(firstWrongNote.noteNumber).toLowerCase()}.` : "";

  if (marking.shapeMarkAwarded && !marking.exactPitchPerfect) {
    return `The melodic contour is secure, so the contour mark is awarded. Lost marks are for exact pitch placement.${firstWrongNoteText}`;
  }

  if (marking.firstContourError) {
    return `No contour mark yet: the melodic direction breaks at ${marking.firstContourError}. Fix that point first, then re-check the following notes.`;
  }

  if (marking.firstIntervalSizeError) {
    return `The direction is partly secure, but an interval size is inaccurate at ${marking.firstIntervalSizeError}. Listen again for step or leap size.`;
  }

  return `${marking.shortComment}${firstWrongNoteText}`;
}

function renderDiagnosticPanel(correctCount = 0, total = dictationSlots.length || 6, diagnostic = lastAttemptDiagnostic) {
  const marking = getGCSEMarkingForPanel(correctCount, total, diagnostic);
  const isFullCredit = marking.awardedMarks === marking.maxMarks;
  const panelClass = isFullCredit ? "is-correct" : "is-wrong";

  return `
    <div class="answer-reveal mm-source-panel ${panelClass} mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel">
      ${formatGCSEMarkSchemeSummary(marking)}

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Feedback</span>
        <strong>${escapeHTML(getCompactGCSEFeedback(marking, diagnostic, isFullCredit))}</strong>
      </div>

      ${renderRoundScoreTracker()}
    </div>
  `;
}

function renderAnswerPanelHome() {
  if (!answerCard) return;

  answerCard.innerHTML = `
    <div class="answerCard-empty mm-source-panel">
      <div class="answer-empty-brand" aria-hidden="true">
        <span class="answer-empty-icon">
          <img
            src="../../assets/icons/modules/melody-master.png"
            alt=""
            onerror="this.style.display='none'; this.parentElement.classList.add('missing-answer-icon');"
          />
        </span>
        <span class="answer-empty-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </span>
      </div>
    </div>
  `;
}

function ensureMelodicDevicesWorkspace() {
  if (!dictationConsole) return null;

  let workspace = document.getElementById("melodicDevicesPanel");
  if (!workspace) {
    workspace = document.createElement("div");
    workspace.id = "melodicDevicesPanel";
    workspace.className = "melodic-devices-centre-panel";
    workspace.hidden = true;
    if (feedback && feedback.parentNode === dictationConsole) {
      dictationConsole.insertBefore(workspace, feedback);
    } else {
      dictationConsole.appendChild(workspace);
    }
  }

  return workspace;
}

function hideMelodicDevicesWorkspace() {
  const workspace = document.getElementById("melodicDevicesPanel");
  if (workspace) {
    workspace.hidden = true;
    workspace.innerHTML = "";
  }
  if (scoreShell) scoreShell.hidden = false;
  if (dictationWorkspace) {
    dictationWorkspace.hidden = false;
    dictationWorkspace.classList.remove("is-melodic-devices-workspace");
  }
  if (quizPanel) quizPanel.classList.remove("is-devices-question");
  syncMelodyShellLabels("dictation");
}

function wireMelodicDevicesOptionButtons(root = document) {
  if (!root) return;

  root.querySelectorAll(".melodic-devices-option").forEach((button) => {
    if (button.dataset.devicesOptionBound === "true") return;

    button.dataset.devicesOptionBound = "true";
    button.addEventListener("click", () => submitMelodicDeviceAnswer(button.dataset.choice || ""));
  });
}

function renderMelodicDevicesWorkspace(question = currentDeviceQuestion) {
  const workspace = ensureMelodicDevicesWorkspace();
  if (!workspace || !question) return;

  if (scoreShell) scoreShell.hidden = true;
  if (dictationWorkspace) {
    dictationWorkspace.hidden = true;
    dictationWorkspace.classList.add("is-melodic-devices-workspace");
  }
  if (quizPanel) quizPanel.classList.add("is-devices-question");

  workspace.hidden = false;
  workspace.innerHTML = `
    <div class="melodic-devices-prompt-card">
      <p class="eyebrow">MELODIC DEVICES</p>
      <strong>Choose the best answer.</strong>
      <small>${escapeHTML(question.level)} · ${escapeHTML(question.id)} · ${escapeHTML(getPlayLimitLabel())}</small>
    </div>
    <div class="melodic-devices-options" role="radiogroup" aria-label="Melodic Devices answer options">
      ${question.choices.map((choice) => `
        <button class="melodic-devices-option" type="button" data-choice="${escapeHTML(choice)}">
          <span>${escapeHTML(choice)}</span>
        </button>
      `).join("")}
    </div>
  `;

  wireMelodicDevicesOptionButtons(workspace);
}

function renderMelodicDevicesAnswerPanelIntro(question = currentDeviceQuestion) {
  if (!answerCard) return;

  answerCard.innerHTML = `
    <div class="answerCard-empty mm-source-panel mm-source-panel-active mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel melodic-devices-feedback-panel">
      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Feedback</span>
        <strong>Listen to the excerpt, then choose the best melodic-device answer.</strong>
      </div>

      <div class="diagnostic-card">
        <span>Answer options</span>
        <strong>Use the centre panel to answer.</strong>
      </div>

      ${renderRoundScoreTracker()}
    </div>
  `;
}

function renderMelodicDevicesAnswerPanelSubmitted(result = null, question = currentDeviceQuestion) {
  if (!answerCard || !question || !result) return;

  const panelClass = result.awardedMarks === result.maxMarks ? "is-correct" : "is-wrong";
  answerCard.innerHTML = `
    <div class="answer-reveal mm-source-panel ${panelClass} mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel melodic-devices-feedback-panel">
      <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics melodic-devices-mark-metrics" aria-label="Melodic Devices mark breakdown">
        <div class="diagnostic-metric ${result.awardedMarks === result.maxMarks ? "is-secure" : "is-focus"}">
          <span>Mark</span>
          <strong>${escapeHTML(`${result.awardedMarks}/${result.maxMarks}`)}</strong>
        </div>
        <div class="diagnostic-metric">
          <span>Your answer</span>
          <strong>${escapeHTML(result.selectedAnswer || "—")}</strong>
        </div>
        <div class="diagnostic-metric is-secure">
          <span>Correct answer</span>
          <strong>${escapeHTML(question.correctAnswer)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Feedback</span>
        <strong>${escapeHTML(question.feedback || result.shortComment || "Review the melodic feature in the excerpt.")}</strong>
      </div>

      ${renderRoundScoreTracker()}
    </div>
  `;
}

function renderAnswerPanelIntro() {
  if (!answerCard) return;

  if (window.MELODY_MASTER_CLASSROOM_MODE) {
    answerCard.innerHTML = renderClassroomDiagnosticPanel(null, {
      feedback: "Place all notes, then submit your answer.",
      status: "Live classroom"
    });
    return;
  }

  answerCard.innerHTML = `
    <div class="answerCard-empty mm-source-panel mm-source-panel-active mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel">
      <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melody Master mark breakdown">
        <div class="diagnostic-metric">
          <span>Pitch mark</span>
          <strong>—</strong>
        </div>
        <div class="diagnostic-metric">
          <span>Contour mark</span>
          <strong>—</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Feedback</span>
        <strong>Place all notes, then press Submit your answers.</strong>
      </div>

      ${renderRoundScoreTracker()}
    </div>
  `;
}

function renderAnswerPanelSubmitted(correctCount = 0, total = dictationSlots.length || 6) {
  if (!answerCard) return;

  answerCard.innerHTML = renderDiagnosticPanel(correctCount, total, lastAttemptDiagnostic);
}

function renderAnswerPanelAnswer() {
  if (!answerCard) return;

  const total = dictationSlots.length || 6;
  const correctCount = lastAttemptDiagnostic
    ? lastAttemptDiagnostic.noteDetails.filter((note) => note.isCorrect).length
    : total;

  answerCard.innerHTML = renderDiagnosticPanel(correctCount, total, lastAttemptDiagnostic);
}

/* =========================
   Classroom bridge API
   ---------------------
   Teacher Mode student pages reuse this original Melody Master gameplay engine
   instead of rebuilding note sizing, score placement, drag/zoom or answer mapping.
   The normal solo app does not call these helpers, so solo gameplay stays unchanged.
========================= */
function getClassroomSubmissionPayload() {
  const total = dictationSlots.length || 0;
  let correctCount = 0;
  const answers = [];
  const correctFlags = [];

  dictationSlots.forEach((slot, index) => {
    const selectedPitch = slot && slot.placed ? (slot.selectedPitch || "") : "";
    answers[index] = selectedPitch;

    const acceptedPitches = Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
      ? slot.acceptedPitches
      : [slot.pitch];
    const isCorrect = Boolean(selectedPitch) && acceptedPitches.includes(selectedPitch);
    correctFlags[index] = isCorrect;
    if (isCorrect) correctCount += 1;
  });

  return {
    questionId: MM001 && MM001.id,
    questionIndex: currentQuestionIndex,
    answers,
    correctCount,
    total,
    placedCount: getPlacedCount(),
    allPlaced: total > 0 && getPlacedCount() === total,
    correctFlags
  };
}

function classroomLoadQuestionByIndex(index = 0) {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();
  clearScoreFocus();

  setActiveQuestion(index);
  loadQuestion();

  // Keep the real Melody Master app loaded, but do not reveal the draggable notes
  // until the teacher has pressed Play for the class.
  hasPlayedAudio = false;
  isShowingAnswer = false;
  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  if (scoreOverlay) {
    scoreOverlay.classList.add("is-notes-hidden-before-play");
    scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");
  }
  if (scoreShell) scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus");
  if (scoreImage) {
    scoreImage.src = MM001.questionImage;
    scoreImage.alt = `${MM001.id} question score with missing notes`;
  }
  setPlayButtonMode("play");
  setFeedback("Waiting for the teacher to play the excerpt.");
  renderAnswerPanelIntro();
}

function classroomShowQuestionForTeacherPlayback() {
  if (!isLoaded) loadQuestion();

  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();
  clearScoreFocus();

  isShowingAnswer = false;
  isQuestionComplete = false;
  hasSubmittedCurrentQuestion = false;
  hasPlayedAudio = true;

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  if (scoreImage) {
    scoreImage.src = MM001.questionImage;
    scoreImage.alt = `${MM001.id} question score with missing notes`;
  }

  if (scoreOverlay) {
    scoreOverlay.classList.remove("is-notes-hidden-before-play", "is-answer-visible", "is-perfect-answer-reveal");
  }

  if (scoreShell) scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus", "is-audio-focus");

  // This is the original Melody Master expanded-score placement/size behaviour.
  // We deliberately do not use the experimental guided-scroll view here.
  expandScoreForPlay();
  setPlayButtonMode("replay");
  setFeedback("Listen through the teacher speakers, then drag each note onto the stave.");
  updateDictationProgress();
  renderAnswerPanelIntro();
}

function renderClassroomDiagnosticPanel(evaluation = null, options = {}) {
  const marking = evaluation && evaluation.marking ? evaluation.marking : null;
  const isSubmitted = Boolean(options.submitted);
  const status = options.status || (isSubmitted ? "Submitted" : "Live classroom");
  const feedbackText = options.feedback || (marking
    ? getCompactGCSEFeedback(marking, evaluation.diagnostic, marking.awardedMarks === marking.maxMarks)
    : "Place all notes, then submit your answer.");
  const pitchText = marking ? `${marking.pitchMarksAwarded}/${marking.pitchMarksAvailable}` : "—";
  const contourText = marking
    ? (marking.shapeCreditAvailable ? `${marking.shapeMarksAwarded}/${marking.shapeMarksAvailable}` : "—")
    : "—";

  return `
    <div class="answerCard-empty mm-source-panel mm-source-panel-active classroom-status-panel classroom-gcse-feedback-panel ${isSubmitted ? "is-submitted" : ""}">
      <span class="classroom-status-pill">${escapeHTML(status)}</span>

      <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melody Master mark breakdown">
        <div class="diagnostic-metric ${marking ? getMarkStateClass(marking.pitchMarksAwarded, marking.pitchMarksAvailable) : ""}">
          <span>Pitch mark</span>
          <strong>${escapeHTML(pitchText)}</strong>
        </div>
        <div class="diagnostic-metric ${marking ? (marking.shapeMarkAwarded ? "is-secure" : "is-focus") : ""}">
          <span>Contour mark</span>
          <strong>${escapeHTML(contourText)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Feedback</span>
        <strong>${escapeHTML(feedbackText)}</strong>
      </div>
    </div>
  `;
}

function classroomEvaluateCurrentAttempt(options = {}) {
  const payload = getClassroomSubmissionPayload();
  const markTokens = Boolean(options.markTokens);
  const setSubmittedState = Boolean(options.setSubmittedState);

  if (!payload || !payload.allPlaced) {
    return { payload, diagnostic: null, marking: null, allPlaced: false };
  }

  const correctFlags = Array.isArray(payload.correctFlags) ? payload.correctFlags : [];
  let correctCount = 0;

  dictationSlots.forEach((slot, index) => {
    const isCorrect = Boolean(correctFlags[index]);
    if (isCorrect) correctCount += 1;

    if (markTokens && slot && slot.token) {
      slot.token.classList.remove("correct", "wrong", "answer-flash-correct", "answer-flash-wrong", "perfect-answer-notehead-flash");
      void slot.token.offsetWidth;
      slot.token.classList.add(
        isCorrect ? "correct" : "wrong",
        isCorrect ? "answer-flash-correct" : "answer-flash-wrong"
      );
    }
  });

  lastAttemptDiagnostic = buildAttemptDiagnostic(correctFlags);
  lastAttemptDiagnostic.gcseMarking = buildGCSEMarkingEvaluation(correctFlags, lastAttemptDiagnostic);

  if (setSubmittedState) {
    hasSubmittedCurrentQuestion = true;
    isQuestionComplete = true;
  }

  if (progressInner) progressInner.style.width = "100%";
  if (scoreText) scoreText.textContent = `Mark: ${lastAttemptDiagnostic.gcseMarking.awardedMarks} / ${lastAttemptDiagnostic.gcseMarking.maxMarks}`;
  if (streakText) streakText.textContent = correctCount === payload.total ? "Complete" : `${correctCount}/${payload.total} pitches`;
  if (xpText) {
    xpText.textContent = lastAttemptDiagnostic.gcseMarking.shapeCreditAvailable
      ? (lastAttemptDiagnostic.gcseMarking.shapeMarkAwarded ? "Shape credited" : "Shape not credited")
      : "Submitted";
  }

  return {
    payload,
    diagnostic: lastAttemptDiagnostic,
    marking: lastAttemptDiagnostic.gcseMarking,
    correctCount,
    total: payload.total,
    allPlaced: true
  };
}

function classroomRenderAttemptFeedback(evaluation = null, options = {}) {
  if (!answerCard) return;
  answerCard.innerHTML = renderClassroomDiagnosticPanel(evaluation, options);
}

function classroomToggleAnswer() {
  hasSubmittedCurrentQuestion = true;
  isQuestionComplete = true;
  showAnswer();
  return isShowingAnswer;
}

function classroomShowQuestionScore() {
  if (isShowingAnswer) showAnswer();
}

function classroomGetQuestionMeta() {
  return {
    id: MM001 && MM001.id,
    title: MM001 && MM001.title,
    composer: MM001 && MM001.composer,
    work: MM001 && MM001.work,
    movement: MM001 && MM001.movement,
    performer: MM001 && MM001.performer,
    source: MM001 && MM001.source,
    rights: MM001 && MM001.rights
  };
}

function classroomSetFeedback(message = "", state = "") {
  setFeedback(message, state);
}

window.MelodyMasterClassroom = {
  loadQuestionByIndex: classroomLoadQuestionByIndex,
  showQuestionForTeacherPlayback: classroomShowQuestionForTeacherPlayback,
  getSubmissionPayload: getClassroomSubmissionPayload,
  evaluateCurrentAttempt: classroomEvaluateCurrentAttempt,
  renderAttemptFeedback: classroomRenderAttemptFeedback,
  toggleAnswer: classroomToggleAnswer,
  showQuestionScore: classroomShowQuestionScore,
  getQuestionMeta: classroomGetQuestionMeta,
  setFeedback: classroomSetFeedback,
  refreshExpandedScorePosition,
  queueNoteScaleUpdate
};

function closeSettingsMenu() {
  if (!advancedSettings) return;
  advancedSettings.style.display = "none";
  advancedSettings.classList.remove("is-open");
  advancedSettings.setAttribute("aria-hidden", "true");
  if (settingsToggle) settingsToggle.setAttribute("aria-expanded", "false");
}

function getMelodicIntervalLaunchUrl() {
  const count = getSelectedRadioValue("questionCount", String(DEFAULT_QUIZ_SETTINGS.questionCount));
  const params = new URLSearchParams({
    mode: "recognition",
    count,
    answerMode: "number",
    set: "basic",
    autostart: "1",
    source: "melody-master"
  });

  return `../melodic-intervals/index.html?${params.toString()}`;
}

async function startQuizRound() {
  closeSettingsMenu();

  const selectedMode = getSelectedQuizMode();

  if (selectedMode === "intervals") {
    window.location.href = getMelodicIntervalLaunchUrl();
    return;
  }

  if (selectedMode === "devices") {
    activeRoundSkill = "devices";
    if (startButton) startButton.disabled = true;
    setFeedback("Loading Melodic Devices questions…");

    try {
      await loadMelodicDeviceQuestions();
    } catch (error) {
      setFeedback(error?.message || "Melodic Devices questions could not be loaded.", "bad");
      if (startButton) startButton.disabled = false;
      return;
    }

    if (startButton) startButton.disabled = false;

    closeRoundFeedbackWindow();
    quizSettings = getQuizSettingsFromControls();
    roundQuestionIndices = buildDeviceRoundQuestionIndices(quizSettings.questionCount);

    if (!roundQuestionIndices.length) {
      setFeedback("No Melodic Devices questions are available for this level yet.", "bad");
      return;
    }

    roundQuestionPosition = 0;
    roundResults = [];
    resetMelodyMasterProgressRound();
    hasSubmittedCurrentQuestion = false;
    isRoundActive = true;
    currentDeviceQuestionIndex = roundQuestionIndices[0] || 0;
    loadMelodicDeviceQuestion({ autoPlay: true });
    return;
  }

  activeRoundSkill = "dictation";
  closeRoundFeedbackWindow();
  quizSettings = getQuizSettingsFromControls();
  roundQuestionIndices = buildRoundQuestionIndices(quizSettings.questionCount);
  roundQuestionPosition = 0;
  roundResults = [];
  resetMelodyMasterProgressRound();
  hasSubmittedCurrentQuestion = false;
  isRoundActive = true;

  setActiveQuestion(roundQuestionIndices[0] || 0);
  if (startButton) startButton.textContent = "Start Quiz";
  loadQuestion({ autoPlay: true, expandOnLoad: true });
}

if (settingsToggle && advancedSettings) {
  settingsToggle.addEventListener("click", () => {
    const isOpen = advancedSettings.style.display !== "none";
    advancedSettings.style.display = isOpen ? "none" : "block";
    advancedSettings.classList.toggle("is-open", !isOpen);
    advancedSettings.setAttribute("aria-hidden", String(isOpen));
    settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

startButton.addEventListener("click", startQuizRound);
playButton.addEventListener("click", playAudio);
if (showAnswerButton) showAnswerButton.addEventListener("click", showAnswer);
resetButton.addEventListener("click", resetDictation);
checkAnswerButton.addEventListener("click", checkAnswer);
if (scoreCloseButton) scoreCloseButton.addEventListener("click", closeExpandedScoreTile);
window.addEventListener("resize", queueNoteScaleUpdate);
document.querySelectorAll('input[name="mmLevel"]').forEach((input) => {
  input.addEventListener("change", () => {
    updateSettingsAvailability();
  });
});
document.querySelectorAll('input[name="quizMode"]').forEach((input) => input.addEventListener("change", updateSettingsAvailability));
updateSettingsAvailability();

initialiseNoteScaleObserver();
queueNoteScaleUpdate();
clearScoreTrackInfo();
renderAnswerPanelHome();
