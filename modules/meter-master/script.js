const MODULE_ID = "meter-master";
const MODULE_TITLE = "Meter Master";
const DATA_URL = "data/meter-master-exam-style-60.json";
const PRACTICE_ROUND_SIZE = 5;
const PROGRESSION_ROUND_SIZE = 5;
const PROGRESSION_PASS_MARK = 100;

const LEVELS = [
  {
    id: "Foundation",
    index: 0,
    summary: "Foundation: recognise clear simple, compound, duple, triple and quadruple metres."
  },
  {
    id: "Developing",
    index: 1,
    summary: "Developing: identify pulse, beat units, regularity and common metre confusions."
  },
  {
    id: "Securing",
    index: 2,
    summary: "Securing: choose full metre descriptions and score-supported time-signature answers."
  },
  {
    id: "Mastering",
    index: 3,
    summary: "Mastering: tackle notation explanations, irregular metre and tougher two-mark choices."
  }
];

const FULL_METRE_CHOICES = [
  "Simple duple",
  "Simple triple",
  "Simple quadruple",
  "Compound duple",
  "Compound triple",
  "Compound quadruple",
  "Irregular quintuple"
];

const TIME_SIGNATURE_CHOICES = ["2/2", "2/4", "3/4", "4/4", "5/4", "6/8", "12/8"];

const BEAT_COUNT_CHOICES = ["2", "3", "4", "5"];

const BEAT_UNIT_CHOICES = ["Minim", "Crotchet", "Dotted crotchet", "Quaver"];

const NOTATION_FEATURE_CHOICES = [
  "Two crotchet beats",
  "Three crotchet beats",
  "Four crotchet beats",
  "Two dotted-crotchet beats",
  "Four dotted-crotchet beats",
  "Five crotchets grouped unevenly"
];

const RHYTHM_FEATURE_CHOICES = [
  "2/4 and simple duple",
  "3/4 and simple triple",
  "4/4 and simple quadruple",
  "2/2 and simple duple",
  "6/8 and compound duple",
  "12/8 and compound quadruple",
  "5/4 and irregular quintuple"
];

const COMPOUND_EXPLANATION_CHOICES = [
  "Two main beats divided into threes",
  "Three crotchet beats divided into twos",
  "Four crotchet beats with simple division",
  "Five crotchets grouped unevenly"
];

let sourceQuestions = [];
let allQuestions = [];
let questionsReadyPromise = null;
let pendingHostedQuestion = null;
let currentIndex = 0;
let currentQuestion = null;
let questions = [];
let selectedLevel = "Foundation";
let selectedPracticeRoundSize = PRACTICE_ROUND_SIZE;
let mixedDifficultyMode = false;
let unlockedLevelIndex = 0;
let audio = null;
let totalMarksAwarded = 0;
let totalMarksAvailable = 0;
let answeredCount = 0;
let score = 0;
let streak = 0;
let xp = 0;
let hasSubmittedCurrent = false;
let selectedChoice = "";
let roundHistory = [];
let eaProgressRoundId = "";
let learningMode = "";
let roundFeedbackOverlay = null;

const quizPanel = document.getElementById("gameScreen");
const roundText = document.getElementById("roundText");
const progressInner = document.getElementById("progressInner");
const scoreText = document.getElementById("scoreText");
const streakText = document.getElementById("streakText");
const xpText = document.getElementById("xpText");
const questionTitle = document.getElementById("questionTitle");
const questionPrompt = document.getElementById("questionPrompt");
const questionMarks = document.getElementById("questionMarks");
const scoreContextCard = document.getElementById("scoreContextCard");
const startButton = document.getElementById("startButton");
const meterSettingsToggle = document.getElementById("meterSettingsToggle");
const meterAdvancedSettings = document.getElementById("meterAdvancedSettings");
const playButton = document.getElementById("playButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");
const meterCentrePanel = document.getElementById("meterCentrePanel");
const choiceGrid = document.getElementById("choiceGrid");
const feedback = document.getElementById("feedback");
const answerCard = document.getElementById("answerCard");
const appShell = document.querySelector(".app-shell");
const listeningConsole = document.querySelector(".listening-console");
const levelButtons = Array.from(document.querySelectorAll("[data-level]"));
const levelSummary = document.getElementById("levelSummary");
const questionPoolText = document.getElementById("questionPoolText");

function getLearningMode() {
  const mode = String(new URLSearchParams(window.location.search).get("eaMode") || "").trim().toLowerCase();
  if (mode === "progress" || mode === "progression") return "progression";
  return "";
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

function normaliseText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\/+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayCase(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+\/\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return raw;
  return raw
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word === "and" || word === "or" ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
    .replace(/\bGcse\b/g, "GCSE");
}

function getLevelDefinition(level) {
  return LEVELS.find((definition) => definition.id === level) || LEVELS[0];
}

function getLevelByIndex(index) {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Number(index) || 0))] || LEVELS[0];
}

function isProgressionMode() {
  return learningMode === "progression";
}

function readAdvancedSettings() {
  const selectedCount = document.querySelector('input[name="meterQuestionCount"]:checked')?.value || String(PRACTICE_ROUND_SIZE);
  selectedPracticeRoundSize = Math.max(1, Number(selectedCount) || PRACTICE_ROUND_SIZE);
  mixedDifficultyMode = !isProgressionMode() && Boolean(document.querySelector('input[name="meterMixedDifficulty"]')?.checked);
}

function roundSizeForMode() {
  readAdvancedSettings();
  return isProgressionMode() ? PROGRESSION_ROUND_SIZE : selectedPracticeRoundSize;
}

function questionUsesScore(question) {
  return question?.requires_score === true || String(question?.requires_score || "").trim().toLowerCase() === "true";
}

function deriveQuestionLevel(question) {
  const mode = String(question?.mode || "");
  const timeSignature = String(question?.time_signature || "");
  const marks = Number(question?.marks || 1);

  if (timeSignature === "5/4" || timeSignature === "12/8" || /Irregular|Rhythm and metre features|Explain notation/i.test(mode)) {
    return "Mastering";
  }

  // Skeleton-score completion ("time signature removed from the score, pick
  // the missing one") is the one score-based question type placed at
  // Developing rather than Securing — per 2026-08-12 review, it tests the
  // same notation-reading skill as the non-score Developing questions, just
  // with a score alongside, so it shouldn't jump a whole level for that.
  if (questionUsesScore(question)) {
    return mode === "Skeleton-score completion" ? "Developing" : "Securing";
  }
  if (marks >= 2) return "Securing";
  if (/Pulse analysis|Beat-unit analysis|Discrimination|Regularity|Notation vocabulary/i.test(mode)) return "Developing";
  return "Foundation";
}

function stableHash(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function stableShuffle(list, seed) {
  return list
    .map((item) => ({ item, score: stableHash(`${seed}:${item}`) }))
    .sort((first, second) => first.score - second.score)
    .map((entry) => entry.item);
}

function uniqueChoices(choices) {
  const seen = new Set();
  return choices
    .map((choice) => String(choice || "").trim())
    .filter(Boolean)
    .filter((choice) => {
      const key = normaliseText(choice);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function findMatchingChoice(correctAnswer, choices) {
  const correctKey = normaliseText(correctAnswer);
  return choices.find((choice) => normaliseText(choice) === correctKey) || "";
}

function metreFeatureChoice(question) {
  const timeSignature = String(question?.time_signature || "").trim();
  const family = displayCase(question?.metre_family || "");

  if (timeSignature === "6/8") return "6/8 and compound duple";
  if (timeSignature === "12/8") return "12/8 and compound quadruple";
  if (timeSignature === "5/4") return "5/4 and irregular quintuple";
  if (timeSignature === "2/2") return "2/2 and simple duple";
  if (timeSignature === "2/4") return "2/4 and simple duple";
  if (timeSignature === "3/4") return "3/4 and simple triple";
  if (timeSignature === "4/4") return "4/4 and simple quadruple";
  return family;
}

function notationFeatureChoice(question) {
  const timeSignature = String(question?.time_signature || "").trim();
  if (timeSignature === "6/8") return "Two dotted-crotchet beats";
  if (timeSignature === "12/8") return "Four dotted-crotchet beats";
  if (timeSignature === "5/4") return "Five crotchets grouped unevenly";
  if (timeSignature === "2/2") return "Two minim beats";
  if (timeSignature === "2/4") return "Two crotchet beats";
  if (timeSignature === "3/4") return "Three crotchet beats";
  if (timeSignature === "4/4") return "Four crotchet beats";
  return displayCase(question?.correct_answer || "");
}

function chooseDistractors(correctChoice, sourceChoices, questionId, maximumChoices = 4) {
  const correctKey = normaliseText(correctChoice);
  const unique = uniqueChoices(sourceChoices);
  const distractors = stableShuffle(unique.filter((choice) => normaliseText(choice) !== correctKey), questionId);
  return stableShuffle([correctChoice, ...distractors.slice(0, Math.max(0, maximumChoices - 1))], `${questionId}:final`);
}

function buildChoiceSet(question) {
  const rowOptions = Array.isArray(question?.options) ? question.options.filter(Boolean) : [];
  const rawCorrect = String(question?.correct_answer || "").trim();
  const responseType = String(question?.response_type || "");
  const mode = String(question?.mode || "");
  let correctChoice = findMatchingChoice(rawCorrect, rowOptions) || displayCase(rawCorrect);
  let choices = rowOptions;

  if (!choices.length || !findMatchingChoice(correctChoice, choices)) {
    if (/numeric/i.test(responseType)) {
      choices = BEAT_COUNT_CHOICES;
    } else if (/time signature/i.test(responseType)) {
      choices = TIME_SIGNATURE_CHOICES;
    } else if (/Full metre/i.test(mode) || /two-part written/i.test(responseType)) {
      choices = FULL_METRE_CHOICES;
    } else if (/Explain notation/i.test(mode)) {
      correctChoice = notationFeatureChoice(question);
      choices = NOTATION_FEATURE_CHOICES;
    } else if (/Rhythm and metre/i.test(mode)) {
      correctChoice = metreFeatureChoice(question);
      choices = RHYTHM_FEATURE_CHOICES;
    } else if (/Irregular metre/i.test(mode)) {
      correctChoice = "5/4 and irregular quintuple";
      choices = RHYTHM_FEATURE_CHOICES;
    } else if (/compound duple/i.test(rawCorrect) || /divided into threes/i.test(rawCorrect)) {
      correctChoice = "Two main beats divided into threes";
      choices = COMPOUND_EXPLANATION_CHOICES;
    } else {
      choices = [correctChoice, ...FULL_METRE_CHOICES, ...BEAT_UNIT_CHOICES, ...TIME_SIGNATURE_CHOICES];
    }
  }

  if (!findMatchingChoice(correctChoice, choices)) choices = [correctChoice, ...choices];

  return {
    correctChoice,
    choices: chooseDistractors(correctChoice, choices, question?.id || rawCorrect, 4)
  };
}

function cleanAudioPath(audioPath) {
  const raw = String(audioPath || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return raw;
  return raw.replace(/^modules\/meter-master\//, "");
}

function cleanScoreAssetPath(scoreAsset) {
  const raw = String(scoreAsset || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return raw;
  if (raw.includes("/")) return raw.replace(/^modules\/meter-master\//, "");
  return `scores/${raw}`;
}

function prepareQuestion(rawQuestion) {
  const choiceSet = buildChoiceSet(rawQuestion);
  return {
    ...rawQuestion,
    level: deriveQuestionLevel(rawQuestion),
    audio: cleanAudioPath(rawQuestion.audio_path || ""),
    maxMarks: Number(rawQuestion.marks || 1),
    correctChoice: choiceSet.correctChoice,
    choices: choiceSet.choices,
    answerSignature: normaliseText(choiceSet.correctChoice),
    requiresScore: questionUsesScore(rawQuestion),
    scoreAsset: cleanScoreAssetPath(rawQuestion.score_asset || ""),
    scoreInstruction: String(rawQuestion.score_instruction || "").trim(),
    prompt: String(rawQuestion.question || "Choose the best metre answer."),
    title: `${rawQuestion.id || "Meter question"} · ${rawQuestion.mode || "Metre"}`
  };
}

function getQuestionsForLevel(level) {
  if (mixedDifficultyMode && !isProgressionMode()) return allQuestions;
  return allQuestions.filter((question) => question.level === level);
}

function shuffleList(list) {
  const shuffled = list.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildRandomRound(level) {
  readAdvancedSettings();
  const spacedKey = `meter:${mixedDifficultyMode && !isProgressionMode() ? "mixed" : level}`;
  const SR = window.EchoAuralSpacedRepetition;
  const pool = SR
    ? SR.orderByLeastRecentlyShown(getQuestionsForLevel(level), { key: spacedKey, idOf: (question) => question.id })
    : shuffleList(getQuestionsForLevel(level));
  const roundLimit = Math.min(roundSizeForMode(), pool.length);
  // Keep the same answer from appearing twice anywhere in the round, not
  // just back-to-back.
  const deduped = SR?.dedupeByAnswer ? SR.dedupeByAnswer(pool, roundLimit, (question) => question.answerSignature) : pool;
  const round = deduped.slice(0, roundLimit);

  SR?.markShown(round, { key: spacedKey, idOf: (question) => question.id });
  return round;
}

let levelChosen = false;

function updateLevelControls() {
  readAdvancedSettings();
  levelButtons.forEach((button) => {
    const definition = getLevelDefinition(button.dataset.level);
    const isSelected = levelChosen && definition.id === selectedLevel;
    const isLocked = isProgressionMode() && definition.index > unlockedLevelIndex;
    button.classList.toggle("is-selected", isSelected);
    button.disabled = isLocked;
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });

  const levelDefinition = getLevelDefinition(selectedLevel);
  const poolCount = getQuestionsForLevel(selectedLevel).length;
  const roundCount = Math.min(roundSizeForMode(), poolCount);
  if (levelSummary) {
    levelSummary.textContent = mixedDifficultyMode
      ? "Mixed difficulty: questions will be drawn from all available Meter Master levels."
      : isProgressionMode()
      ? `${levelDefinition.summary} Progress mode needs ${PROGRESSION_PASS_MARK}% to unlock the next level.`
      : levelDefinition.summary;
  }
  if (questionPoolText) {
    questionPoolText.textContent = sourceQuestions.length
      ? `${poolCount} available · ${roundCount} random ${roundCount === 1 ? "question" : "questions"} per round.`
      : "Loading Meter Master questions…";
  }
  if (startButton && !startButton.hidden) startButton.textContent = "Start Learning";
}

function setSelectedLevel(level) {
  const levelDefinition = getLevelDefinition(level);
  if (isProgressionMode() && levelDefinition.index > unlockedLevelIndex) return;
  selectedLevel = levelDefinition.id;
  questions = buildRandomRound(selectedLevel);
  updateLevelControls();
  updateStats();
}

function setMeterAdvancedSettingsOpen(isOpen) {
  if (!meterSettingsToggle || !meterAdvancedSettings) return;
  meterAdvancedSettings.style.display = isOpen ? "block" : "none";
  meterAdvancedSettings.classList.toggle("is-open", isOpen);
  meterAdvancedSettings.setAttribute("aria-hidden", String(!isOpen));
  meterSettingsToggle.setAttribute("aria-expanded", String(isOpen));
}

function toggleMeterAdvancedSettings() {
  const isOpen = meterSettingsToggle?.getAttribute("aria-expanded") === "true";
  setMeterAdvancedSettingsOpen(!isOpen);
}

function formatMark(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function stripTrailingQuestionMarkSuffix(text) {
  if (window.EAQuestionPromptMarks?.stripTrailing) {
    return window.EAQuestionPromptMarks.stripTrailing(text);
  }
  return String(text ?? "")
    .replace(/(?:[\s\u00A0\u202F]*)[(（]\s*\d+(?:\.\d+)?\s*[)）]\s*$/u, "")
    .replace(/[\s\u00A0\u202F]+$/u, "");
}

function setQuestionMarks(question) {
  if (!questionMarks) return;
  const marks = Number(question?.maxMarks || question?.marks || 0);
  if (!question || marks <= 0) {
    questionMarks.hidden = true;
    questionMarks.textContent = "";
    questionMarks.setAttribute("aria-hidden", "true");
    questionMarks.removeAttribute("aria-label");
    return;
  }
  questionMarks.textContent = `\u00A0(${formatMark(marks)})`;
  questionMarks.hidden = false;
  questionMarks.setAttribute("aria-hidden", "false");
  questionMarks.setAttribute("aria-label", `${formatMark(marks)} mark${marks === 1 ? "" : "s"}`);
}

function updateStats() {
  const totalQuestions = questions.length || roundSizeForMode();
  const progress = questions.length ? ((currentIndex + (hasSubmittedCurrent ? 1 : 0)) / questions.length) * 100 : 0;

  if (roundText) {
    roundText.textContent = quizPanel?.classList.contains("is-ready")
      ? "Ready"
      : `Question ${Math.min(currentIndex + 1, Math.max(1, totalQuestions))} / ${totalQuestions}`;
  }
  if (progressInner) progressInner.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  if (scoreText) scoreText.textContent = `Mark: ${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)}`;
  if (streakText) streakText.textContent = `Streak: ${streak}`;
  if (xpText) xpText.textContent = `XP: ${xp}`;
}

function stopCurrentAudio() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function playCurrentClip() {
  if (!currentQuestion?.audio) return;
  stopCurrentAudio();
  audio = new Audio(currentQuestion.audio);
  audio.play().catch(() => {
    if (feedback) {
      feedback.textContent = "Press Replay Clip to hear the audio.";
      feedback.className = "partial";
    }
  });
}

function handleReplayOrNext() {
  if (playButton?.dataset.action === "next") {
    goToNextQuestion();
    return;
  }

  playCurrentClip();
}

function clearChoiceSelection() {
  selectedChoice = "";
  choiceGrid?.querySelectorAll(".choice-button").forEach((button) => {
    button.classList.remove("is-selected", "is-correct", "is-wrong");
    button.disabled = false;
    button.setAttribute("aria-checked", "false");
  });
}

function renderChoices(question) {
  if (!choiceGrid) return;
  const choices = Array.isArray(question.choices) ? question.choices.slice(0, 4) : [];
  choiceGrid.setAttribute("data-answer-count", String(choices.length || 4));
  choiceGrid.innerHTML = choices.map((choice) => `
    <button class="choice-button meter-option" type="button" role="radio" aria-checked="false" data-choice="${escapeHTML(choice)}">
      <span>${escapeHTML(choice)}</span>
    </button>
  `).join("");
  clearChoiceSelection();
}

function shouldShowPrintedSignature(question) {
  const instruction = String(question?.scoreInstruction || "").toLowerCase();
  const mode = String(question?.mode || "").toLowerCase();
  if (instruction.includes("keep the signature visible")) return true;
  return mode.includes("rhythm and metre features");
}

function questionMetreFamily(question) {
  return String(question?.metre_family || "").trim().toLowerCase();
}

function barPatternForQuestion(question) {
  const signature = String(question?.time_signature || "").trim();
  const family = questionMetreFamily(question);
  if (signature === "6/8") return { beats: 6, groups: [3, 3], noteKind: "quaver", label: "Compound duple grouping" };
  if (signature === "12/8") return { beats: 12, groups: [3, 3, 3, 3], noteKind: "quaver", label: "Compound quadruple grouping" };
  if (signature === "5/4" || family.includes("irregular")) return { beats: 5, groups: [2, 3], noteKind: "crotchet", label: "Irregular 2+3 grouping" };
  if (signature === "2/2") return { beats: 2, groups: [1, 1], noteKind: "minim", label: "Two minim beats" };
  if (signature === "2/4") return { beats: 2, groups: [1, 1], noteKind: "crotchet", label: "Simple duple grouping" };
  if (signature === "3/4") return { beats: 3, groups: [1, 1, 1], noteKind: "crotchet", label: "Simple triple grouping" };
  return { beats: 4, groups: [1, 1, 1, 1], noteKind: "crotchet", label: "Simple quadruple grouping" };
}

function noteSvg(x, y, kind = "crotchet") {
  const open = kind === "minim";
  const head = `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="6.2" transform="rotate(-18 ${x} ${y})" fill="${open ? "white" : "#06111f"}" stroke="#06111f" stroke-width="2.4" />`;
  const stemX = x + 7.5;
  const stemTop = y - 48;
  const stem = `<line x1="${stemX}" y1="${y - 2}" x2="${stemX}" y2="${stemTop}" stroke="#06111f" stroke-width="3" stroke-linecap="round" />`;
  if (kind === "quaver") {
    return `${head}${stem}<path d="M${stemX} ${stemTop} C${stemX + 20} ${stemTop + 5}, ${stemX + 20} ${stemTop + 21}, ${stemX + 3} ${stemTop + 24}" fill="none" stroke="#06111f" stroke-width="3" stroke-linecap="round" />`;
  }
  return `${head}${stem}`;
}

function beamedGroupSvg(points) {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const y1 = first.y - 50;
  const y2 = last.y - 50;
  const x1 = first.x + 7.5;
  const x2 = last.x + 7.5;
  return `<polygon points="${x1},${y1} ${x2},${y2} ${x2},${y2 + 7} ${x1},${y1 + 7}" fill="#06111f" />`;
}

function scoreBarSvg(barStart, barWidth, pattern, barIndex) {
  const beatGap = barWidth / pattern.beats;
  const baseY = 99;
  const pitches = [0, -9, 4, -5, 8, -2, -11, 2, -7, 6, -4, 10];
  const points = Array.from({ length: pattern.beats }, (_, beatIndex) => ({
    x: barStart + (beatGap * beatIndex) + (beatGap / 2),
    y: baseY + pitches[(beatIndex + barIndex) % pitches.length]
  }));

  let svg = "";
  if (pattern.noteKind === "quaver") {
    let offset = 0;
    for (const groupSize of pattern.groups) {
      const group = points.slice(offset, offset + groupSize);
      svg += group.map((point) => noteSvg(point.x, point.y, "quaver")).join("");
      svg += beamedGroupSvg(group);
      offset += groupSize;
    }
  } else {
    svg = points.map((point) => noteSvg(point.x, point.y, pattern.noteKind)).join("");
  }

  return `${svg}<line x1="${barStart + barWidth}" y1="62" x2="${barStart + barWidth}" y2="128" stroke="#06111f" stroke-width="2.8" />`;
}

function scoreSignatureSvg(question, showPrintedSignature) {
  const [top = "", bottom = ""] = String(question?.time_signature || "").trim().split("/");
  if (!showPrintedSignature) {
    return `
      <rect x="72" y="73" width="42" height="45" rx="8" fill="rgba(56,189,248,.08)" stroke="rgba(6,17,31,.42)" stroke-width="2" stroke-dasharray="6 5" />
      <text x="93" y="104" text-anchor="middle" font-size="28" font-weight="900" fill="#2563eb">?</text>
    `;
  }

  return `
    <text x="92" y="88" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="900" fill="#06111f">${escapeHTML(top)}</text>
    <text x="92" y="119" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="900" fill="#06111f">${escapeHTML(bottom)}</text>
  `;
}

function buildScoreExtractSvg(question) {
  const showPrintedSignature = shouldShowPrintedSignature(question);
  const pattern = barPatternForQuestion(question);
  const barCount = pattern.beats >= 12 ? 2 : 3;
  const scoreStart = 124;
  const scoreEnd = 850;
  const barWidth = (scoreEnd - scoreStart) / barCount;
  const bars = Array.from({ length: barCount }, (_, index) => scoreBarSvg(scoreStart + (index * barWidth), barWidth, pattern, index)).join("");
  const signatureLabel = showPrintedSignature ? String(question?.time_signature || "") : "missing time signature";
  const label = `${question?.id || "Meter Master"} score extract, ${pattern.label}, ${signatureLabel}`;

  return `
    <svg class="score-extract-svg" viewBox="0 0 900 184" role="img" aria-label="${escapeHTML(label)}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="900" height="184" rx="22" fill="#f8fafc" />
      <rect x="18" y="18" width="864" height="148" rx="18" fill="#ffffff" stroke="#d9e2ef" stroke-width="2" />
      <text x="39" y="121" font-family="Georgia, serif" font-size="78" fill="#06111f">𝄞</text>
      ${[62, 78.5, 95, 111.5, 128].map((y) => `<line x1="42" y1="${y}" x2="858" y2="${y}" stroke="#06111f" stroke-width="2" />`).join("")}
      ${scoreSignatureSvg(question, showPrintedSignature)}
      <line x1="${scoreStart}" y1="62" x2="${scoreStart}" y2="128" stroke="#06111f" stroke-width="2.8" />
      ${bars}
      <text x="40" y="157" font-size="14" font-weight="800" letter-spacing=".12em" fill="#64748b">${escapeHTML(String(question?.id || "").toUpperCase())}</text>
      <text x="858" y="157" text-anchor="end" font-size="14" font-weight="800" fill="#64748b">${escapeHTML(pattern.label)}</text>
    </svg>
  `;
}

function renderScoreContext(question) {
  if (!scoreContextCard) return;
  if (!question.requiresScore) {
    listeningConsole?.classList.remove("has-score-extract");
    scoreContextCard.hidden = true;
    scoreContextCard.innerHTML = "";
    return;
  }

  listeningConsole?.classList.add("has-score-extract");
  scoreContextCard.hidden = false;
  const scoreMarkup = question.scoreAsset
    ? `<img class="score-extract-image" src="${escapeHTML(question.scoreAsset)}" alt="${escapeHTML(question.id || "Meter Master")} score extract" />`
    : buildScoreExtractSvg(question);
  scoreContextCard.innerHTML = `
    <div class="score-extract-frame">${scoreMarkup}</div>
    <div class="score-extract-caption">
      <strong>Score extract</strong>
      <span>${escapeHTML(question.metre_family || "Metre focus")} · ${escapeHTML(shouldShowPrintedSignature(question) ? "time signature visible" : "time signature removed")}</span>
    </div>
  `;

  scoreContextCard.querySelector(".score-extract-image")?.addEventListener("error", (event) => {
    const frame = event.currentTarget.closest(".score-extract-frame");
    if (frame) frame.innerHTML = buildScoreExtractSvg(question);
  }, { once: true });
}

function renderEmptyAnswerCard() {
  if (!answerCard) return;
  answerCard.innerHTML = `
    <div class="answerCard-empty meter-source-panel">
      <div class="answer-empty-stage" aria-hidden="true">
        <div class="answer-empty-orbit">
          <span class="answer-empty-sparkle answer-empty-sparkle-1" aria-hidden="true"></span>
          <span class="answer-empty-sparkle answer-empty-sparkle-2" aria-hidden="true"></span>
          <span class="answer-empty-sparkle answer-empty-sparkle-3" aria-hidden="true"></span>
          <span class="answer-empty-sparkle answer-empty-sparkle-4" aria-hidden="true"></span>
          <span class="answer-empty-icon">
            <img
              src="../../assets/icons/modes/mm-transparent/answers-transparent.png?v=3"
              alt=""
              onerror="this.style.display='none'; this.parentElement.classList.add('missing-answer-icon');"
            />
          </span>
        </div>
      </div>
      <div class="answer-empty-copy">
        <h2>Your answers will appear here</h2>
        <p>Complete a quiz to see your responses and performance feedback.</p>
      </div>
    </div>
  `;
}

function renderAnswerCard(question, result) {
  if (!answerCard) return;
  answerCard.innerHTML = `
    <div class="marked-card">
      <p class="eyebrow">${escapeHTML(result.correct ? "Correct" : "Keep Listening")}</p>
      <h2>${escapeHTML(result.correct ? "Secure metre recognition" : "Review the metre clue")}</h2>
      <p>${escapeHTML(result.feedback)}</p>
      <div class="answer-review-list">
        <span><strong>Your answer:</strong> ${escapeHTML(result.studentAnswer || "No answer selected")}</span>
        <span><strong>Correct answer:</strong> ${escapeHTML(question.correctChoice)}</span>
        <span><strong>Mark scheme:</strong> ${escapeHTML(question.mark_scheme || question.correctChoice)}</span>
      </div>
      <div class="marked-meta">
        <span><strong>Focus:</strong> ${escapeHTML(question.mode || "Metre")}</span>
        <span><strong>Metre family:</strong> ${escapeHTML(question.metre_family || "—")}</span>
        <span><strong>Time signature:</strong> ${escapeHTML(question.time_signature || "—")}</span>
      </div>
    </div>
  `;
}

function markCurrentQuestion() {
  const correct = normaliseText(selectedChoice) === normaliseText(currentQuestion.correctChoice);
  const maxMarks = Number(currentQuestion.maxMarks || 1);
  return {
    correct,
    status: correct ? "correct" : "incorrect",
    marksAwarded: correct ? maxMarks : 0,
    maxMarks,
    studentAnswer: selectedChoice,
    feedback: correct
      ? (currentQuestion.feedback || "Correct. You identified the metre accurately.")
      : `Not quite. The answer is ${currentQuestion.correctChoice}. ${currentQuestion.feedback || ""}`.trim()
  };
}

function submitAnswer() {
  if (!currentQuestion || hasSubmittedCurrent) return;
  if (!selectedChoice) {
    feedback.textContent = "Choose one answer before submitting.";
    feedback.className = "partial";
    return;
  }

  const result = markCurrentQuestion();
  hasSubmittedCurrent = true;
  answeredCount += 1;
  if (result.correct) {
    score += 1;
    streak += 1;
    xp += 20;
  } else {
    streak = 0;
    xp += 5;
  }
  totalMarksAwarded += result.marksAwarded;
  totalMarksAvailable += result.maxMarks;
  roundHistory.push({ question: currentQuestion, result });

  choiceGrid?.querySelectorAll(".choice-button").forEach((button) => {
    const choice = button.dataset.choice || "";
    button.disabled = true;
    if (normaliseText(choice) === normaliseText(currentQuestion.correctChoice)) button.classList.add("is-correct");
    if (normaliseText(choice) === normaliseText(selectedChoice) && !result.correct) button.classList.add("is-wrong");
  });

  feedback.textContent = "";
  feedback.className = "";
  playButton.dataset.action = "replay";
  playButton.textContent = "Replay Clip";
  if (nextButton) {
    nextButton.hidden = false;
    nextButton.textContent = currentIndex >= questions.length - 1 ? "Finish Round" : "Next Question";
  }
  renderAnswerCard(currentQuestion, result);
  window.EAProgressEmbed?.answerComplete({
    questionId: currentQuestion.id,
    score: result.correct ? 1 : 0,
    maximumScore: 1,
    correct: result.correct,
    responseType: "multiple-choice",
    answerData: result.studentAnswer,
    modelAnswer: currentQuestion.correctChoice,
    feedback: result.feedback,
    metreFamily: currentQuestion.metre_family,
    mode: currentQuestion.mode,
    requiresScore: currentQuestion.requires_score,
    timeSignature: currentQuestion.time_signature
  });
  updateStats();
}

function loadQuestion(index) {
  currentQuestion = questions[index];
  hasSubmittedCurrent = false;
  selectedChoice = "";
  stopCurrentAudio();

  if (!currentQuestion) {
    feedback.textContent = "No Meter Master question is ready.";
    feedback.className = "bad";
    updateStats();
    return;
  }

  window.EAProgressEmbed?.questionReady({ id: currentQuestion.id, level: currentQuestion.level });

  setQuizVisualState("active");
  questionTitle.textContent = currentQuestion.title;
  questionPrompt.textContent = stripTrailingQuestionMarkSuffix(currentQuestion.prompt);
  setQuestionMarks(currentQuestion);
  renderScoreContext(currentQuestion);
  renderChoices(currentQuestion);
  renderEmptyAnswerCard();
  if (meterCentrePanel) meterCentrePanel.hidden = false;
  playButton.dataset.action = "replay";
  playButton.textContent = "Replay Clip";
  playButton.disabled = false;
  playButton.style.display = "inline-flex";
  if (nextButton) nextButton.hidden = true;
  feedback.textContent = "";
  feedback.className = "";
  updateStats();
  playCurrentClip();
}

function getMedal(percentage) {
  if (percentage === 100) return { title: "Metre Mastered", stars: "★★★★★" };
  if (percentage >= 80) return { title: "Strong Pulse Recognition", stars: "★★★★" };
  if (percentage >= 60) return { title: "Developing Metre Security", stars: "★★★" };
  return { title: "Keep Counting the Pulse", stars: "★★" };
}

function buildRoundSummary() {
  return roundHistory.map((entry, index) => `
    <div class="summary-row ${entry.result.status}">
      <span>${index + 1}</span>
      <strong>${escapeHTML(entry.question.id || `Q${index + 1}`)}</strong>
      <em>${escapeHTML(entry.result.correct ? "Correct" : "Review")}</em>
    </div>
  `).join("");
}

function removeRoundFeedbackOverlay() {
  if (roundFeedbackOverlay && roundFeedbackOverlay.parentNode) {
    roundFeedbackOverlay.parentNode.removeChild(roundFeedbackOverlay);
  }
  roundFeedbackOverlay = null;
}

function closeRoundFeedbackWindow() {
  removeRoundFeedbackOverlay();
  document.body.classList.remove("meter-round-review-open");
  appShell?.classList.remove("is-round-feedback-open");
  quizPanel?.classList.remove("is-round-feedback-open");
}

function finishRoundFeedbackWindow() {
  closeRoundFeedbackWindow();
  setQuizVisualState("ready");
  if (meterCentrePanel) meterCentrePanel.hidden = true;
  listeningConsole?.classList.remove("has-score-extract");
  scoreContextCard.hidden = true;
  startButton.hidden = false;
  startButton.textContent = "Start Learning";
  questionTitle.textContent = "Meter Master";
  questionPrompt.textContent = "Choose a level, then start the metre round.";
  setQuestionMarks(null);
  feedback.textContent = "";
  feedback.className = "";
  progressInner.style.width = "0%";
  roundText.textContent = "Ready";
  if (playButton) {
    playButton.dataset.action = "replay";
    playButton.textContent = "Replay Clip";
    playButton.style.display = "none";
  }
  if (nextButton) nextButton.hidden = true;
  renderEmptyAnswerCard();
}

function getMeterRoundFeedback(percentage) {
  if (percentage >= 85) return "Secure metre recognition. Keep linking what you hear to pulse groupings and beat units.";
  if (percentage >= 60) return "Your metre recognition is developing. Count the main beats first, then decide simple or compound.";
  return "Keep practising: find the recurring pulse, group it into bars, then choose the metre term.";
}

function renderMeterRoundQuestionRows() {
  if (!roundHistory.length) return "";

  return roundHistory.map((entry, index) => `
    <div class="mm-round-review-row ${entry.result.correct ? "is-secure" : "is-focus"}">
      <span>Question ${index + 1}</span>
      <strong>${escapeHTML(`${entry.result.marksAwarded}/${entry.result.maxMarks}`)}</strong>
      <small>Your answer: ${escapeHTML(entry.result.studentAnswer || "—")} · Correct: ${escapeHTML(entry.question.correctChoice || "—")}</small>
    </div>
  `).join("");
}

function renderMeterRoundReviewPanel(percentage, medal) {
  const answeredTextValue = `${answeredCount}/${questions.length} ${questions.length === 1 ? "question" : "questions"} answered`;

  return `
    <div class="mm-round-review-panel meter-round-review-panel">
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${escapeHTML(`${totalMarksAwarded}/${totalMarksAvailable}`)}</strong>
        <small>${escapeHTML(answeredTextValue)} · ${escapeHTML(`${percentage}%`)}</small>
      </div>

      <div class="diagnostic-metrics meter-round-feedback-metrics" aria-label="Round mark breakdown">
        <div class="diagnostic-metric ${totalMarksAwarded === totalMarksAvailable ? "is-secure" : "is-focus"}">
          <span>Score</span>
          <strong>${escapeHTML(`${totalMarksAwarded}/${totalMarksAvailable}`)}</strong>
        </div>
        <div class="diagnostic-metric ${percentage >= 85 ? "is-secure" : "is-focus"}">
          <span>Accuracy</span>
          <strong>${escapeHTML(`${percentage}%`)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile">
        <span>${escapeHTML(medal.title)}</span>
        <strong>${escapeHTML(getMeterRoundFeedback(percentage))}</strong>
      </div>

      <div class="mm-round-review-list" aria-label="Question-by-question round results">
        ${renderMeterRoundQuestionRows()}
      </div>

      <button id="roundFinishButton" class="primary-button mm-final-finish-button" type="button">Finish Quiz</button>
    </div>
  `;
}

function showRoundFeedbackWindow(percentage, medal) {
  closeRoundFeedbackWindow();
  document.body.classList.add("meter-round-review-open");
  appShell?.classList.add("is-round-feedback-open");
  quizPanel?.classList.add("is-round-feedback-open");

  roundFeedbackOverlay = document.createElement("div");
  roundFeedbackOverlay.className = "meter-round-feedback-overlay";
  roundFeedbackOverlay.setAttribute("role", "dialog");
  roundFeedbackOverlay.setAttribute("aria-modal", "true");
  roundFeedbackOverlay.setAttribute("aria-label", "Meter Master round feedback");
  roundFeedbackOverlay.innerHTML = renderMeterRoundReviewPanel(percentage, medal);
  document.body.appendChild(roundFeedbackOverlay);

  roundFeedbackOverlay.querySelector("#roundFinishButton")?.addEventListener("click", finishRoundFeedbackWindow);
  roundFeedbackOverlay.querySelector("#roundFinishButton")?.focus();
}

function resetMeterProgressRound() {
  eaProgressRoundId = window.EchoAuralTracking
    ? window.EchoAuralTracking.createClientRoundId(MODULE_ID)
    : `${MODULE_ID}-${Date.now()}`;
}

async function saveMeterRound(percentage) {
  if (!window.EchoAuralTracking || !roundHistory.length) return;
  if (!eaProgressRoundId) resetMeterProgressRound();
  const medal = getMedal(percentage);
  const levelDefinition = getLevelDefinition(selectedLevel);

  await window.EchoAuralTracking.saveRound({
    moduleId: MODULE_ID,
    clientRoundId: eaProgressRoundId,
    score: totalMarksAwarded,
    maximumScore: totalMarksAvailable,
    roundFeedback: percentage >= 85
      ? "Secure metre recognition. Keep linking what you hear to pulse groupings and beat units."
      : percentage >= 60
        ? "Your metre recognition is developing. Count the main beats first, then decide simple or compound."
        : "Keep practising: find the recurring pulse, group it into bars, then choose the metre term.",
    metadata: {
      medal: medal.title,
      level: selectedLevel,
      levelLabel: selectedLevel,
      progressionLevel: levelDefinition.index
    },
    questions: roundHistory.map((entry, index) => ({
      questionId: entry.question.id || `MTR-Q${index + 1}`,
      score: Number(entry.result.marksAwarded) || 0,
      maximumScore: Number(entry.result.maxMarks) || 0,
      feedback: entry.result.feedback || "Review the metre clue and mark scheme.",
      answerData: {
        title: entry.question.title || "Meter question",
        level: selectedLevel,
        levelLabel: selectedLevel,
        progressionLevel: levelDefinition.index,
        status: entry.result.status || "",
        selectedAnswer: entry.result.studentAnswer || "",
        correctAnswer: entry.question.correctChoice || "",
        metreFamily: entry.question.metre_family || "",
        timeSignature: entry.question.time_signature || "",
        markScheme: entry.question.mark_scheme || ""
      }
    }))
  });
}

async function recordProgressionAttempt(percentage) {
  if (!isProgressionMode() || !window.EAProgressionStore?.recordAttempt) return;
  const levelDefinition = getLevelDefinition(selectedLevel);
  const passed = percentage >= PROGRESSION_PASS_MARK;

  const result = await window.EAProgressionStore.recordAttempt({
    moduleId: MODULE_ID,
    level: levelDefinition.index,
    score: totalMarksAwarded,
    maximumScore: totalMarksAvailable,
    percentage,
    passMark: PROGRESSION_PASS_MARK,
    passed
  });

  const nextUnlocked = Math.max(
    unlockedLevelIndex,
    Math.min(LEVELS.length - 1, Number(result?.moduleState?.unlockedLevel) || 0)
  );
  unlockedLevelIndex = nextUnlocked;
  updateLevelControls();
}

async function endRound() {
  setQuizVisualState("complete");
  if (meterCentrePanel) meterCentrePanel.hidden = true;
  listeningConsole?.classList.remove("has-score-extract");
  scoreContextCard.hidden = true;
  if (playButton) {
    playButton.dataset.action = "replay";
    playButton.textContent = "Replay Clip";
  }
  if (nextButton) nextButton.hidden = true;
  startButton.hidden = false;
  startButton.textContent = "Start Learning";
  const percentage = totalMarksAvailable > 0 ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100) : 0;
  const medal = getMedal(percentage);

  await saveMeterRound(percentage);
  await recordProgressionAttempt(percentage);

  questionTitle.textContent = "Round complete";
  questionPrompt.textContent = isProgressionMode() && percentage >= PROGRESSION_PASS_MARK && getLevelDefinition(selectedLevel).index < LEVELS.length - 1
    ? `${medal.title} · next level unlocked`
    : medal.title;
  setQuestionMarks(null);
  feedback.textContent = isProgressionMode() && percentage < PROGRESSION_PASS_MARK
    ? "Progress mode needs every question correct before the next level unlocks."
    : "Review the answer card, then restart when ready.";
  feedback.className = percentage >= 60 ? "good" : "partial";
  progressInner.style.width = "100%";

  answerCard.innerHTML = `
    <div class="round-summary-card">
      <p class="eyebrow">METER MASTER SUMMARY</p>
      <h2>${escapeHTML(medal.title)}</h2>
      <div class="summary-list">${buildRoundSummary()}</div>
      <p class="muted">Next step: count the pulse, group the beats, then choose the metre vocabulary that matches.</p>
    </div>
  `;
  showRoundFeedbackWindow(percentage, medal);
  updateStats();
}

function goToNextQuestion() {
  if (!hasSubmittedCurrent) return;
  currentIndex += 1;
  if (currentIndex >= questions.length) void endRound();
  else loadQuestion(currentIndex);
}

// True once a Live Session host has loaded its first question through the
// contract (see loadQuestionById below) — distinguishes "boot the round"
// from "load another question into an already-running round."
let contractSessionStarted = false;

function startRound(options = {}) {
  closeRoundFeedbackWindow();
  questions = buildRandomRound(selectedLevel);
  // Live Session host handed us a specific question via the contract (see
  // loadQuestionById below) — pin it to the front so the existing
  // loadQuestion()/goToNextQuestion() flow picks it up completely
  // unchanged.
  if (options.forcedQuestion) {
    questions = questions.filter((question) => question !== options.forcedQuestion);
    questions.unshift(options.forcedQuestion);
  }
  currentIndex = 0;
  currentQuestion = null;
  totalMarksAwarded = 0;
  totalMarksAvailable = 0;
  answeredCount = 0;
  score = 0;
  streak = 0;
  xp = 0;
  hasSubmittedCurrent = false;
  selectedChoice = "";
  roundHistory = [];
  resetMeterProgressRound();
  stopCurrentAudio();
  setMeterAdvancedSettingsOpen(false);

  if (!questions.length) {
    feedback.textContent = `No ${selectedLevel} Meter Master questions were found.`;
    feedback.className = "bad";
    updateStats();
    return;
  }

  startButton.hidden = true;
  loadQuestion(0);
}

// Live Sessions entry point: a teacher (via the classroom server) has
// picked an exact question and the host wants this exact question
// rendered, not whatever buildRandomRound() would have drawn next. Reuses
// startRound()/loadQuestion() completely unchanged (see the forcedQuestion
// handling above), so this app's real UI, audio and scoring are exactly
// what a student sees in normal practice, just pointed at a specific
// question instead of a random round draw.
function loadQuestionById(rawId) {
  const id = String(rawId || "").trim();
  if (!id) return false;
  const target = allQuestions.find((question) => question.id === id);
  if (!target) {
    window.EAProgressEmbed?.poolEmpty({ reason: "unknown-question-id", questionId: id });
    return false;
  }

  if (!contractSessionStarted) {
    contractSessionStarted = true;
    startRound({ forcedQuestion: target });
  } else {
    questions = questions.filter((question) => question !== target);
    questions.unshift(target);
    currentIndex = 0;
    loadQuestion(currentIndex);
  }
  return true;
}

window.EAProgressEmbed?.registerQuestionHandler((payload) => {
  // The classroom host can send teacher-load-question immediately after
  // app-ready while the bank fetch is still resolving. Queue it rather than
  // reporting a false pool-empty result; init drains it after loadQuestions.
  if (!allQuestions.length) {
    pendingHostedQuestion = payload || {};
    return true;
  }
  return loadQuestionById(payload && (payload.questionId || payload.id));
});

async function initialiseProgressionMode() {
  if (!isProgressionMode()) return;
  try {
    await window.EAProgressionStore?.ready?.();
    const moduleState = window.EAProgressionStore?.getModule?.(MODULE_ID);
    unlockedLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, Number(moduleState?.unlockedLevel) || 0));
    selectedLevel = getLevelByIndex(unlockedLevelIndex).id;
  } catch (_error) {
    unlockedLevelIndex = 0;
    selectedLevel = "Foundation";
  }
}

async function loadQuestions() {
  const response = await fetch(DATA_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Meter Master data failed to load (${response.status}).`);
  const data = await response.json();
  sourceQuestions = Array.isArray(data.questions) ? data.questions : [];
  allQuestions = sourceQuestions.map(prepareQuestion);
}

function showLoadError(error) {
  feedback.textContent = error?.message || "Meter Master questions could not be loaded.";
  feedback.className = "bad";
  if (questionPoolText) questionPoolText.textContent = "Check modules/meter-master/data/meter-master-exam-style-60.json.";
  startButton.disabled = true;
}

const consoleSkillIcon = document.getElementById("consoleSkillIcon");
const DEFAULT_CONSOLE_ICON = "../../assets/icons/modules/meter-master.png";
const SKILL_CONSOLE_ICON = "../../assets/icons/modules/meter-transparent/rhythmic-devices-transparent.png";

function syncConsoleSkillIcon() {
  if (!consoleSkillIcon) return;
  const checked = document.querySelector('input[name="meterSkill"]:checked');
  consoleSkillIcon.src = checked ? SKILL_CONSOLE_ICON : DEFAULT_CONSOLE_ICON;
  consoleSkillIcon.parentElement?.classList.toggle("is-skill-icon", !!checked);
}

/** Start cannot begin until the user has explicitly picked both a skill and a level. */
function updateStartAvailability() {
  if (!startButton) return;
  const hasSkill = !!document.querySelector('input[name="meterSkill"]:checked');
  startButton.disabled = !(hasSkill && levelChosen);
}

/** Centre-panel heading: "Learning" until a skill is chosen, then that
 *  skill's short name (matching its own skill-button label). */
const SKILL_HEADING_LABELS = { "rhythmic-devices": "Devices" };
const centreHeadingLabel = document.getElementById("centreHeadingLabel");
function updateCentreHeading() {
  if (!centreHeadingLabel) return;
  const checked = document.querySelector('input[name="meterSkill"]:checked');
  centreHeadingLabel.textContent = checked ? (SKILL_HEADING_LABELS[checked.value] || "Learning") : "Learning";
}

/** Big console title text: the suite wordmark until a skill is chosen, then
 *  that skill's short name in the app's own flat accent colour. */
const consoleTitleMain = document.getElementById("consoleTitleMain");
const consoleTitleGradient = document.getElementById("consoleTitleGradient");
const DEFAULT_CONSOLE_TITLE_MAIN = consoleTitleMain ? consoleTitleMain.textContent : "";
const DEFAULT_CONSOLE_TITLE_GRADIENT = consoleTitleGradient ? consoleTitleGradient.textContent : "";
function updateConsoleTitle() {
  if (!consoleTitleMain || !consoleTitleGradient) return;
  const checked = document.querySelector('input[name="meterSkill"]:checked');
  if (checked) {
    consoleTitleMain.textContent = "";
    consoleTitleGradient.textContent = SKILL_HEADING_LABELS[checked.value] || checked.value;
    consoleTitleGradient.classList.add("is-skill-active");
  } else {
    consoleTitleMain.textContent = DEFAULT_CONSOLE_TITLE_MAIN;
    consoleTitleGradient.textContent = DEFAULT_CONSOLE_TITLE_GRADIENT;
    consoleTitleGradient.classList.remove("is-skill-active");
  }
}

function bindEvents() {
  levelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      levelChosen = true;
      setSelectedLevel(button.dataset.level);
      updateStartAvailability();
    });
  });
  document.querySelectorAll('input[name="meterSkill"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateStartAvailability();
      syncConsoleSkillIcon();
      updateCentreHeading();
      updateConsoleTitle();
    });
  });

  meterSettingsToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMeterAdvancedSettings();
  });

  meterAdvancedSettings?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.querySelectorAll('input[name="meterQuestionCount"], input[name="meterMixedDifficulty"]').forEach((input) => {
    input.addEventListener("change", () => {
      questions = buildRandomRound(selectedLevel);
      updateLevelControls();
      updateStats();
    });
  });

  choiceGrid?.addEventListener("click", (event) => {
    if (hasSubmittedCurrent) return;
    const button = event.target.closest(".choice-button");
    if (!button) return;
    selectedChoice = button.dataset.choice || "";
    choiceGrid.querySelectorAll(".choice-button").forEach((choiceButton) => {
      const isSelected = choiceButton === button;
      choiceButton.classList.toggle("is-selected", isSelected);
      choiceButton.setAttribute("aria-checked", isSelected ? "true" : "false");
    });
    submitAnswer();
  });

  startButton.addEventListener("click", startRound);
  restartButton.addEventListener("click", startRound);
  playButton.addEventListener("click", handleReplayOrNext);
  nextButton?.addEventListener("click", goToNextQuestion);

  document.addEventListener("click", (event) => {
    if (meterSettingsToggle?.getAttribute("aria-expanded") !== "true") return;
    const clickedInsideSettings = meterAdvancedSettings?.contains(event.target);
    const clickedToggle = meterSettingsToggle?.contains(event.target);
    if (!clickedInsideSettings && !clickedToggle) setMeterAdvancedSettingsOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && meterSettingsToggle?.getAttribute("aria-expanded") === "true") {
      setMeterAdvancedSettingsOpen(false);
      meterSettingsToggle.focus();
    }
  });

}

async function init() {
  learningMode = getLearningMode();
  bindEvents();

  try {
    questionsReadyPromise = loadQuestions();
    await questionsReadyPromise;
    if (pendingHostedQuestion) {
      const request = pendingHostedQuestion;
      pendingHostedQuestion = null;
      loadQuestionById(request.questionId || request.id);
    }
    await initialiseProgressionMode();
    questions = buildRandomRound(selectedLevel);
    updateLevelControls();
    updateStats();

    if (learningMode === "progression") {
      levelChosen = true;
      updateLevelControls();
      feedback.textContent = `Progress mode: working at ${selectedLevel}.`;
      feedback.className = "";
    } else {
      feedback.textContent = "Choose a level, then start the metre round.";
      feedback.className = "";
    }
    updateStartAvailability();
    syncConsoleSkillIcon();
    updateCentreHeading();
    updateConsoleTitle();
  } catch (error) {
    showLoadError(error);
  }
}

void init();
