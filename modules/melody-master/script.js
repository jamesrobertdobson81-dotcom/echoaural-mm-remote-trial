const SOURCE_MELODY_CLIPS = (typeof melodyClips !== "undefined" && Array.isArray(melodyClips) && melodyClips.length)
  ? melodyClips
  : [];

const ALL_MELODY_CLIPS = SOURCE_MELODY_CLIPS.slice().reverse();

let currentQuestionIndex = 0;
let MM001_SOURCE = {};
let MM001 = {};
let MM001_DICTATION = {};

const DEFAULT_DICTATION_LAYOUT = {
  noteImage: "assets/icons/notes/semiquaver-sibelius.png",
  noteImageFallback: "assets/icons/notes/semiquaver-sibelis.png",
  topLinePitch: "E5",
  staffTopY: 31.5,
  staffStepY: 4.95,
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
const scoreCloseButton = document.getElementById("scoreCloseButton");
const scoreOverlay = document.getElementById("scoreOverlay");
const scoreImageFrame = document.querySelector(".score-image-frame");
const dictationWorkspace = document.getElementById("answers");
let noteScaleResizeObserver = null;
let noteScaleFrameId = null;

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

function setFeedback(message, state = "") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = state;
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

  // Keep existing question data unchanged, but make the first two ledger-line
  // positions above the treble stave available across the deck for future questions.
  const upperLedgerPitches = ["C6", "B5", "A5", "G5"];
  const uniquePitches = [...new Set([...configuredPitches, ...upperLedgerPitches])]
    .sort((a, b) => pitchToDiatonicNumber(b) - pitchToDiatonicNumber(a));

  return uniquePitches.map((pitch) => ({
    pitch,
    y: getPitchYPercent(pitch)
  }));
}

function getUpperLedgerLinePitchesForPitch(pitch) {
  const pitchNumber = pitchToDiatonicNumber(pitch);
  const firstLedgerNumber = pitchToDiatonicNumber("A5");
  const secondLedgerNumber = pitchToDiatonicNumber("C6");

  if (pitchNumber >= secondLedgerNumber) return ["A5", "C6"];
  if (pitchNumber >= firstLedgerNumber) return ["A5"];
  return [];
}

function updateSlotLedgerLines(slot, pitch) {
  if (!slot || !slot.ledgerLines) return;

  const requiredLines = getUpperLedgerLinePitchesForPitch(pitch);

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
      visualAnchorY: slot.visualAnchorY !== undefined ? Number(slot.visualAnchorY) : getDefaultVisualAnchorY(slot.icon || MM001_DICTATION.noteImage),
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
    ["A5", "C6"].forEach((linePitch) => {
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
  isQuestionComplete = false;
  setPlayButtonMode(hasPlayedAudio ? "replay" : "play");
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
  if (checkAnswerButton) checkAnswerButton.disabled = placedCount !== total;
}

function setPlayButtonMode(mode) {
  if (!playButton) return;

  if (mode === "next") {
    playButton.textContent = "Next Question";
    playButton.dataset.mode = "next";
    playButton.setAttribute("aria-label", "Next question");
    return;
  }

  playButton.dataset.mode = "play";
  playButton.removeAttribute("aria-label");
  playButton.textContent = mode === "replay" ? "Replay Excerpt" : "Play Excerpt";
}

function goToNextQuestion() {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  const totalQuestions = ALL_MELODY_CLIPS.length || 1;
  const nextIndex = (currentQuestionIndex + 1) % totalQuestions;

  if (quizPanel) quizPanel.classList.add("is-question-handoff-out");
  clearScoreFocus();
  collapseScoreExpansion();

  questionHandoffTimer = window.setTimeout(() => {
    questionHandoffTimer = null;

    if (quizPanel) {
      quizPanel.classList.remove("is-question-handoff-out");
      quizPanel.classList.add("is-question-handoff-in");
    }

    setActiveQuestion(nextIndex);
    loadQuestion({ autoPlay: true, transitionIn: true });

    window.setTimeout(() => {
      if (quizPanel) quizPanel.classList.remove("is-question-handoff-in");
    }, 900);
  }, 420);
}

function closeExpandedScoreTile() {
  clearScoreFocus();
  collapseScoreExpansion();
}


function loadQuestion(options = {}) {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  const shouldAutoPlay = Boolean(options && options.autoPlay === true);
  const isTransitionIn = Boolean(options && options.transitionIn === true);

  isLoaded = true;
  isShowingAnswer = false;
  hasPlayedAudio = false;
  isQuestionComplete = false;
  lastAttemptDiagnostic = null;
  lastAttemptDiagnostic = null;

  setQuizVisualState("active");

  if (quizPanel && !isTransitionIn) quizPanel.classList.remove("is-question-handoff-out", "is-question-handoff-in");

  questionText.textContent = "Complete the melody.";
  roundText.textContent = `${MM001.id} active`;
  scoreText.textContent = "Placed: 0 / 6";
  streakText.textContent = "Pitch snap";
  xpText.textContent = getNoteCountLabel(MM001_DICTATION.slots.length);
  progressInner.style.width = "0%";

  scoreImage.src = MM001.questionImage;
  scoreImage.alt = `${MM001.id} question score with missing notes`;

  audio = new Audio(MM001.audio);
  audio.volume = 1;

  startButton.style.display = "none";
  playButton.style.display = "inline-flex";
  setPlayButtonMode("play");
  checkAnswerButton.disabled = true;
  if (showAnswerButton) showAnswerButton.textContent = "Show Answer";

  scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus", "is-score-expanded");
  collapseScoreExpansion();

  renderDictationNotes();
  setFeedback(shouldAutoPlay ? "Next question loading — listen for the new missing notes." : "");
  renderAnswerPanelIntro();

  if (shouldAutoPlay) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        playAudio({ autoStarted: true });
      });
    });
  }
}

function playAudio() {
  if (isQuestionComplete || (playButton && playButton.dataset.mode === "next")) {
    goToNextQuestion();
    return;
  }

  if (!isLoaded) loadQuestion();

  if (!audio) {
    audio = new Audio(MM001.audio);
  }

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
  audio.onended = clearScoreFocus;

  let playAttempt;

  try {
    // Keep the audio call as the first action after the button press so browsers
    // still treat it as user-initiated playback.
    playAttempt = audio.play();
  } catch (error) {
    clearScoreFocus();
    setFeedback(`Audio could not play. Check that the audio file is available at ${MM001.audio}.`, "bad");
    return;
  }

  hasPlayedAudio = true;
  if (scoreOverlay) scoreOverlay.classList.remove("is-notes-hidden-before-play");
  expandScoreForPlay();
  startScoreFocus();
  setPlayButtonMode("replay");
  setFeedback("Listen for the missing notes, then drag each note onto the line or space you think is correct.");

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      clearScoreFocus();
      setFeedback(`Audio could not play. Check that the audio file is available at ${MM001.audio}.`, "bad");
    });
  }
}

function showAnswer() {
  clearPerfectAnswerRevealTimer();

  if (!isLoaded) loadQuestion();

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
    setFeedback("Showing the answer score. Tap Show Question to return to your draggable notes.", "good");
    renderAnswerPanelAnswer();
  } else {
    scoreImage.src = MM001.questionImage;
    scoreImage.alt = `${MM001.id} question score with missing notes`;
    scoreShell.classList.remove("showing-answer");
    if (scoreOverlay) {
      scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");
      scoreOverlay.classList.toggle("is-notes-hidden-before-play", !hasPlayedAudio);
    }
    if (showAnswerButton) showAnswerButton.textContent = "Show Answer";
    updateDictationProgress();
    setFeedback("Back to the question score. Your draggable notes are still in place.");
    renderAnswerPanelIntro();
  }
}

function resetDictation() {
  clearPerfectAnswerRevealTimer();
  clearQuestionHandoffTimer();

  if (!isLoaded) {
    loadQuestion();
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
  scoreImage.src = MM001.questionImage;
  scoreImage.alt = `${MM001.id} question score with missing notes`;
  scoreShell.classList.remove("showing-answer", "is-drop-target", "is-note-focus", "is-score-expanded");
  collapseScoreExpansion();
  if (scoreOverlay) {
    scoreOverlay.classList.remove("is-answer-visible", "is-perfect-answer-reveal");
    scoreOverlay.classList.add("is-notes-hidden-before-play");
  }
  if (showAnswerButton) showAnswerButton.textContent = "Show Answer";
  setPlayButtonMode("play");
  progressInner.style.width = "0%";
  resetDictationNotes();
  setFeedback("Reset. Press Play Excerpt to show the draggable notes again.");
  renderAnswerPanelIntro();
}

function checkAnswer() {
  clearPerfectAnswerRevealTimer();

  const total = dictationSlots.length || 6;
  const placedCount = getPlacedCount();

  if (placedCount !== total) {
    setFeedback(`Place all ${total} notes onto the stave before checking.`, "bad");
    return;
  }

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

  progressInner.style.width = "100%";
  scoreText.textContent = `Correct: ${correctCount} / ${total}`;
  streakText.textContent = correctCount === total ? "Complete" : "Try again";
  xpText.textContent = "Checked";

  if (correctCount === total) {
    isQuestionComplete = true;
    setPlayButtonMode("next");
    setFeedback("Excellent — all the notes are correct. The full answer score will appear in a moment.", "good");
    revealAnswerScoreAfterPerfectCheck();
  } else {
    isQuestionComplete = false;
    setPlayButtonMode(hasPlayedAudio ? "replay" : "play");
    setFeedback(`${correctCount} / ${total} correct. Green notes are correct; red notes need moving.`, "bad");
  }

  renderAnswerPanelChecked(correctCount, total);
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
    return "Check an attempt to receive contour and interval-size feedback.";
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


function renderDiagnosticPanel(correctCount = 0, total = dictationSlots.length || 6, diagnostic = lastAttemptDiagnostic) {
  const isPerfect = correctCount === total;
  const panelClass = isPerfect ? "is-correct" : "is-wrong";
  const headline = isPerfect ? "Secure melodic dictation" : "Attempt diagnosis";

  return `
    <div class="answer-reveal mm-source-panel ${panelClass} mm-diagnostic-panel">
      <p class="eyebrow">SKILL FEEDBACK</p>
      <h2>${correctCount} / ${total} correct</h2>
      <p class="diagnostic-headline">${headline}</p>

      ${formatContourIntervalMetrics(diagnostic)}

      <div class="diagnostic-grid">
        <div class="diagnostic-card diagnostic-strength">
          <span>Strong</span>
          <strong>${formatDiagnosticStrengths(diagnostic)}</strong>
        </div>
        <div class="diagnostic-card diagnostic-focus">
          <span>Needs work</span>
          <strong>${formatDiagnosticNeedsWork(diagnostic)}</strong>
        </div>
      </div>

      <p class="diagnostic-next-step">${escapeHTML(getDiagnosticNextStep(diagnostic, isPerfect))}</p>
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
            src="../../assets/icons/modules/melody-master.svg"
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

function renderAnswerPanelIntro() {
  if (!answerCard) return;

  answerCard.innerHTML = `
    <div class="answerCard-empty mm-source-panel mm-source-panel-active mm-diagnostic-panel">
      <div class="answer-empty-brand" aria-hidden="true">
        <span class="answer-empty-icon">
          <img
            src="../../assets/icons/modules/melody-master.svg"
            alt=""
            onerror="this.style.display='none'; this.parentElement.classList.add('missing-answer-icon');"
          />
        </span>
      </div>

      <p class="eyebrow">SKILL FEEDBACK</p>
      <h2>Attempt diagnosis</h2>

      <div class="diagnostic-card diagnostic-empty">
        <span>${escapeHTML(MM001.id)}</span>
        <strong>Place all notes, then press Check your answers.</strong>
      </div>

      <p class="diagnostic-next-step">This panel will identify contour accuracy, interval-size accuracy, anchor-note shifts, and strengths such as stepwise motion or leaps.</p>
    </div>
  `;
}

function renderAnswerPanelChecked(correctCount = 0, total = dictationSlots.length || 6) {
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

function classroomSetFeedback(message = "", state = "") {
  setFeedback(message, state);
}

window.MelodyMasterClassroom = {
  loadQuestionByIndex: classroomLoadQuestionByIndex,
  showQuestionForTeacherPlayback: classroomShowQuestionForTeacherPlayback,
  getSubmissionPayload: getClassroomSubmissionPayload,
  setFeedback: classroomSetFeedback,
  refreshExpandedScorePosition,
  queueNoteScaleUpdate
};

if (settingsToggle && advancedSettings) {
  settingsToggle.addEventListener("click", () => {
    const isOpen = advancedSettings.style.display !== "none";
    advancedSettings.style.display = isOpen ? "none" : "block";
    advancedSettings.classList.toggle("is-open", !isOpen);
    advancedSettings.setAttribute("aria-hidden", String(isOpen));
    settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

startButton.addEventListener("click", () => loadQuestion());
playButton.addEventListener("click", playAudio);
if (showAnswerButton) showAnswerButton.addEventListener("click", showAnswer);
resetButton.addEventListener("click", resetDictation);
checkAnswerButton.addEventListener("click", checkAnswer);
if (scoreCloseButton) scoreCloseButton.addEventListener("click", closeExpandedScoreTile);
window.addEventListener("resize", queueNoteScaleUpdate);

initialiseNoteScaleObserver();
queueNoteScaleUpdate();
renderAnswerPanelHome();
