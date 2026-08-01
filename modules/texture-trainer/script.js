const TextureQuestionSystem = window.EchoAuralTextureQuestionSystem;
const rawQuestions = Array.isArray(window.textureQuestions) ? window.textureQuestions : [];
const allQuestions = rawQuestions.map((question, index) => TextureQuestionSystem.normaliseQuestion(question, index));
const DEFAULT_ROUND_SIZE = 5;
const LEVELS = [
  {
    id: "Foundation",
    summary: "Foundation: one-mark questions on simple monophonic, homophonic and polyphonic textures."
  },
  {
    id: "Developing",
    summary: "Developing: harder one-mark questions on fugal, imitative and contrapuntal textures."
  },
  {
    id: "Securing",
    summary: "Securing: guided two-mark questions where the texture changes."
  },
  {
    id: "Mastering",
    summary: "Mastering: tougher two-mark questions describing changing or contrasting textures."
  }
];
const TEXTURE_CHOICE_FALLBACKS = [
  "Monophonic",
  "Homophonic",
  "Polyphonic",
  "Contrapuntal",
  "Imitative",
  "Fugal",
  "Canon",
  "Unison",
  "Octaves",
  "Melody and accompaniment",
  "Chordal homophony",
  "Antiphonal",
  "Heterophonic",
  "Layered texture",
  "Solo and tutti",
  "Parallel motion"
];

let currentIndex = 0;
let currentQuestion = null;
let questions = [];
let selectedLevel = "Foundation";
let selectedRoundSize = DEFAULT_ROUND_SIZE;
let mixedDifficultyMode = false;
let audio = null;
let audioStopTimer = null;
let totalMarksAwarded = 0;
let totalMarksAvailable = 0;
let answeredCount = 0;
let hasSubmittedCurrent = false;
let currentChoiceOrder = [];
let roundHistory = [];
let eaProgressRoundId = "";

const appShell = document.querySelector(".app-shell");
const quizPanel = document.getElementById("gameScreen");
const roundText = document.getElementById("roundText");
const progressInner = document.getElementById("progressInner");
const scoreText = document.getElementById("scoreText");
const answeredText = document.getElementById("answeredText");
const accuracyText = document.getElementById("accuracyText");
const questionTitle = document.getElementById("questionTitle");
const questionPrompt = document.getElementById("questionPrompt");
const questionMarks = document.getElementById("questionMarks");
const startButton = document.getElementById("startButton");
const textureSettingsToggle = document.getElementById("textureSettingsToggle");
const textureAdvancedSettings = document.getElementById("textureAdvancedSettings");
const playButton = document.getElementById("playButton");
const submitButton = document.getElementById("submitButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");
const studentAnswer = document.getElementById("studentAnswer");
const answerLabel = document.getElementById("answerLabel");
const choiceArea = document.getElementById("choiceArea");
const responseArea = document.getElementById("responseArea");
const roundFeedbackPanel = document.getElementById("roundFeedbackPanel");
const feedback = document.getElementById("feedback");
const answerCard = document.getElementById("answerCard");
const levelButtons = Array.from(document.querySelectorAll("[data-level]"));
const levelSummary = document.getElementById("levelSummary");
const questionPoolText = document.getElementById("questionPoolText");

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
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLevelDefinition(level) {
  return LEVELS.find((definition) => definition.id === level) || LEVELS[0];
}

function getQuestionNumber(question) {
  const match = String(question?.id || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getQuestionCode(question) {
  return String(question?.type || question?.marksType || question?.target || "").toUpperCase();
}

function questionContains(question, pattern) {
  return pattern.test([
    question?.id,
    question?.title,
    question?.target,
    question?.type,
    question?.marksType,
    question?.prompt,
    question?.modelAnswer
  ].filter(Boolean).join(" "));
}

function getQuestionLevel(question) {
  return TextureQuestionSystem.getQuestionLevel(question);
}

function getAnswerSignature(question) {
  const combined = normaliseText([
    question?.target,
    question?.type,
    question?.marksType,
    question?.modelAnswer
  ].filter(Boolean).join(" "));

  if (combined.includes("monophonic") && (combined.includes("chordal") || combined.includes("homophonic"))) return "monophonic-to-chordal";
  if (combined.includes("monophonic") && (combined.includes("fugal") || combined.includes("polyphonic") || combined.includes("imitative"))) return "monophonic-to-fugal";
  if (combined.includes("homophonic") && (combined.includes("fugal") || combined.includes("polyphonic") || combined.includes("imitative"))) return "homophonic-to-fugal";
  if (combined.includes("thin") && combined.includes("thick")) return "thin-to-thick";
  if (combined.includes("fugal") || combined.includes("fugue")) return "fugal";
  if (combined.includes("monophonic")) return "monophonic";
  if (combined.includes("homophonic") || combined.includes("chordal")) return "homophonic";
  if (combined.includes("polyphonic") || combined.includes("contrapuntal") || combined.includes("imitative")) return "polyphonic";
  return normaliseText(question?.target || question?.title || question?.id || "texture");
}

function getQuestionsForLevel(level) {
  return allQuestions.filter((question) => getQuestionLevel(question) === level);
}

function readAdvancedSettings() {
  const selectedCount = Number(document.querySelector('input[name="textureQuestionCount"]:checked')?.value || DEFAULT_ROUND_SIZE);
  selectedRoundSize = [3, 5, 10].includes(selectedCount) ? selectedCount : DEFAULT_ROUND_SIZE;
  mixedDifficultyMode = Boolean(document.querySelector('input[name="textureMixedDifficulty"]')?.checked);
}

function getActiveQuestionPool(level) {
  return mixedDifficultyMode ? allQuestions : getQuestionsForLevel(level);
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
  const pool = shuffleList(getActiveQuestionPool(level));
  const roundLimit = Math.min(selectedRoundSize, pool.length);
  const round = [];
  const remaining = pool.slice();

  while (remaining.length && round.length < roundLimit) {
    const previousSignature = round.length ? getAnswerSignature(round[round.length - 1]) : "";
    const nextIndex = previousSignature
      ? remaining.findIndex((question) => getAnswerSignature(question) !== previousSignature)
      : 0;
    const chosenIndex = nextIndex >= 0 ? nextIndex : 0;
    round.push(remaining.splice(chosenIndex, 1)[0]);
  }

  return round;
}

function updateLevelControls() {
  levelButtons.forEach((button) => {
    const isSelected = button.dataset.level === selectedLevel;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });

  const levelDefinition = getLevelDefinition(selectedLevel);
  readAdvancedSettings();
  const poolCount = getActiveQuestionPool(selectedLevel).length;
  if (levelSummary) levelSummary.textContent = levelDefinition.summary;
  if (questionPoolText) {
    const roundCount = Math.min(selectedRoundSize, poolCount);
    questionPoolText.textContent = `${poolCount} available · ${roundCount} random ${roundCount === 1 ? "question" : "questions"} per round.`;
  }
  if (startButton && !startButton.hidden) startButton.textContent = "Start Quiz";
}

function setSelectedLevel(level) {
  selectedLevel = getLevelDefinition(level).id;
  questions = buildRandomRound(selectedLevel);
  updateLevelControls();
  updateStats();
}

function phraseToTokens(value) {
  return normaliseText(value).split(" ").filter(Boolean);
}

function findPhraseOccurrence(answer, phrase) {
  const normalisedPhrase = normaliseText(phrase);
  if (!normalisedPhrase) return null;

  const normalisedAnswer = ` ${normaliseText(answer)} `;
  if (!normalisedAnswer.includes(` ${normalisedPhrase} `)) return null;

  const tokens = phraseToTokens(answer);
  const phraseTokens = phraseToTokens(phrase);
  const phraseLength = phraseTokens.length;

  for (let index = 0; index <= tokens.length - phraseLength; index += 1) {
    const segment = tokens.slice(index, index + phraseLength).join(" ");
    if (segment !== normalisedPhrase) continue;

    const previousTwo = tokens.slice(Math.max(0, index - 2), index);
    if (previousTwo.includes("not") || previousTwo.includes("no") || previousTwo.includes("isnt") || previousTwo.includes("isn")) {
      continue;
    }

    return { phrase, start: index, end: index + phraseLength };
  }

  return null;
}

function containsPhrase(answer, phrase) {
  return Boolean(findPhraseOccurrence(answer, phrase));
}

function findMatchingPhrase(answer, phrases = []) {
  return phrases.find((phrase) => containsPhrase(answer, phrase)) || "";
}

function phraseSpansOverlap(firstMatch, secondMatch) {
  return firstMatch.start < secondMatch.end && secondMatch.start < firstMatch.end;
}

function findUnusedMatchingPhrase(answer, phrases = [], usedMatches = []) {
  const matches = phrases
    .map((phrase) => findPhraseOccurrence(answer, phrase))
    .filter(Boolean);
  const match = matches.find((candidate) => !usedMatches.some((usedMatch) => phraseSpansOverlap(candidate, usedMatch)));
  if (match) usedMatches.push(match);
  return match?.phrase || "";
}

function markAnswerByPoints(question, answer) {
  const maxMarks = Number(question.maxMarks) || 1;
  const usedMatches = [];
  const pointResults = [];
  let marksAwarded = 0;

  question.markPoints.forEach((markPoint) => {
    const acceptedMatch = findUnusedMatchingPhrase(answer, markPoint.acceptedAnswers, usedMatches);
    if (acceptedMatch) {
      marksAwarded += 1;
      pointResults.push({
        label: markPoint.label || "Mark point",
        status: "correct",
        matchedPhrase: acceptedMatch,
        marksAwarded: 1
      });
      return;
    }

    const partialMatch = findUnusedMatchingPhrase(answer, markPoint.partialAnswers, usedMatches);
    if (partialMatch) {
      marksAwarded += 0.5;
      pointResults.push({
        label: markPoint.label || "Mark point",
        status: "partial",
        matchedPhrase: partialMatch,
        marksAwarded: 0.5
      });
      return;
    }

    pointResults.push({
      label: markPoint.label || "Mark point",
      status: "missed",
      matchedPhrase: "",
      marksAwarded: 0
    });
  });

  const cappedMarks = Math.min(maxMarks, marksAwarded);
  const status = cappedMarks >= maxMarks ? "correct" : cappedMarks > 0 ? "partial" : "incorrect";
  const matchedPhrase = pointResults
    .filter((pointResult) => pointResult.matchedPhrase)
    .map((pointResult) => `${pointResult.label}: ${pointResult.matchedPhrase}`)
    .join("; ");

  return {
    status,
    marksAwarded: cappedMarks,
    maxMarks,
    matchedPhrase,
    pointResults,
    feedback: status === "correct"
      ? (question.feedbackCorrect || "Correct.")
      : status === "partial"
        ? (question.feedbackPartial || "Partly correct. Use more precise GCSE vocabulary.")
        : (question.feedbackIncorrect || "Not quite. Check the model answer and try to use precise GCSE vocabulary."),
    label: status === "correct" ? "Correct" : status === "partial" ? "Partly correct" : "Not quite"
  };
}

function markAnswer(question, answer) {
  return TextureQuestionSystem.markAnswer(question, answer);
}

function buildWrongAnswerFeedback(question, wrongPhrase) {
  const base = question.feedbackIncorrect || "Not quite. Check the model answer and try to use precise GCSE vocabulary.";
  return `${base} Your answer included “${wrongPhrase}”, which does not fit this extract.`;
}

function formatMark(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatExamMarks(maxMarks) {
  const marks = Number(maxMarks) || 1;
  return `[${formatMark(marks)}]`;
}

function setQuestionMarks(question) {
  if (!questionMarks) return;

  if (!question) {
    questionMarks.hidden = true;
    questionMarks.textContent = "";
    questionMarks.removeAttribute("aria-label");
    return;
  }

  const marks = Number(question.maxMarks) || 1;
  questionMarks.textContent = formatExamMarks(marks);
  questionMarks.setAttribute("aria-label", `${formatMark(marks)} ${marks === 1 ? "mark" : "marks"}`);
  questionMarks.hidden = false;
}

function updateStats() {
  const totalQuestions = questions.length;
  const visibleQuestionNumber = totalQuestions ? Math.min(currentIndex + 1, totalQuestions) : 0;
  const percentage = totalMarksAvailable > 0 ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100) : 0;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  roundText.textContent = quizPanel?.classList.contains("is-ready")
    ? "Ready"
    : totalQuestions && answeredCount >= totalQuestions
      ? "Round complete"
      : `Question ${visibleQuestionNumber} / ${totalQuestions || "—"}`;
  progressInner.style.width = `${progress}%`;
  scoreText.textContent = `Marks: ${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)}`;
  answeredText.textContent = `Answered: ${answeredCount}`;
  accuracyText.textContent = `Accuracy: ${percentage}%`;
}

function getResponseInstruction(question) {
  if (question.responseType === "multiple-choice") return "Choose the best texture answer.";
  if (question.responseType === "short-text") return "Type the precise texture term or short phrase.";
  return "Write a short GCSE-style description using precise texture vocabulary.";
}

function uniqueChoiceLabels(choices = []) {
  const uniqueChoices = [];
  choices.forEach((choice) => {
    const label = String(choice || "").trim();
    if (!label) return;
    if (uniqueChoices.some((existingChoice) => TextureQuestionSystem.sameAnswer(existingChoice, label))) return;
    uniqueChoices.push(label);
  });
  return uniqueChoices;
}

function getFourAnswerChoices(question) {
  const configuredChoices = uniqueChoiceLabels([
    ...(question.answerChoices || []),
    ...(question.answerOptions || [])
  ]);
  const correctChoice = String(question.correctChoice || question.preferredAnswer || configuredChoices[0] || "").trim();
  const configuredHasCorrect = configuredChoices.some((choice) => TextureQuestionSystem.sameAnswer(choice, correctChoice));
  const baseChoices = uniqueChoiceLabels([
    ...(configuredHasCorrect ? configuredChoices : [correctChoice, ...configuredChoices]),
    ...TEXTURE_CHOICE_FALLBACKS
  ]);
  const displayedCorrectChoice = baseChoices.find((choice) => TextureQuestionSystem.sameAnswer(choice, correctChoice)) || baseChoices[0] || correctChoice;
  const distractors = baseChoices
    .filter((choice) => !TextureQuestionSystem.isChoiceEquivalentToCorrect(choice, question, displayedCorrectChoice))
    .slice(0, 3);
  return TextureQuestionSystem.shuffleChoices(uniqueChoiceLabels([displayedCorrectChoice, ...distractors]).slice(0, 4));
}

function renderChoiceButtons(question) {
  if (!choiceArea) return;
  currentChoiceOrder = getFourAnswerChoices(question);
  choiceArea.hidden = false;
  choiceArea.innerHTML = currentChoiceOrder.map((choice) => `
    <button class="tt-choice-button" type="button" data-answer="${escapeHTML(choice)}">
      <span>${escapeHTML(choice)}</span>
    </button>
  `).join("");
  choiceArea.querySelectorAll(".tt-choice-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (hasSubmittedCurrent) return;
      choiceArea.querySelectorAll(".tt-choice-button").forEach((item) => item.classList.toggle("is-selected", item === button));
      submitCurrentAnswer(button.dataset.answer || "");
    });
  });
}

function updateChoiceButtonsAfterSubmit(result, submittedAnswer) {
  if (!choiceArea || choiceArea.hidden) return;
  choiceArea.querySelectorAll(".tt-choice-button").forEach((button) => {
    const answer = button.dataset.answer || "";
    const isCorrect = TextureQuestionSystem.isChoiceEquivalentToCorrect(answer, currentQuestion, result.correctChoice || currentQuestion.correctChoice);
    const isSelected = TextureQuestionSystem.sameAnswer(answer, submittedAnswer);
    button.disabled = true;
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-correct", isCorrect);
    button.classList.toggle("is-incorrect", isSelected && !isCorrect);
  });
}

function configureResponseControls(question) {
  const isChoice = question.responseType === "multiple-choice";
  const isShort = question.responseType === "short-text";
  if (choiceArea) {
    choiceArea.hidden = !isChoice;
    choiceArea.innerHTML = "";
  }
  if (answerLabel) {
    answerLabel.hidden = isChoice;
    answerLabel.textContent = isShort ? "Your term" : "Your answer";
  }
  if (studentAnswer) {
    studentAnswer.hidden = isChoice;
    studentAnswer.value = "";
    studentAnswer.disabled = false;
    studentAnswer.rows = isShort ? 2 : 5;
    studentAnswer.placeholder = isShort
      ? "Example: homorhythmic"
      : "Example: The texture begins monophonically, then independent parts enter in imitation.";
  }
  if (submitButton) {
    submitButton.hidden = isChoice;
    submitButton.disabled = false;
  }
  if (isChoice) renderChoiceButtons(question);
}

function renderEmptyAnswerCard() {
  answerCard.innerHTML = `
    <div class="answerCard-empty">
      <div class="answer-empty-brand" aria-hidden="true">
        <span class="answer-empty-icon"><img src="../../assets/icons/modules/texture-trainer.svg" alt="" onerror="this.style.display='none'; this.parentElement.classList.add('missing-answer-icon');" /></span>
        <span class="answer-empty-wave"><span></span><span></span><span></span><span></span><span></span></span>
      </div>
      <p class="eyebrow">ANSWER PANEL</p>
      <h2>Your marked answer appears here.</h2>
      <p class="muted">Choose or write an answer to see feedback, the preferred term and the model answer.</p>
    </div>
  `;
}

function renderAnswerCard(question, result, answer) {
  const matchedLine = result.matchedPhrase
    ? `<div class="meta-row"><span>Matched idea</span><strong>${escapeHTML(result.matchedPhrase)}</strong></div>`
    : `<div class="meta-row"><span>Matched idea</span><strong>No full concept match yet</strong></div>`;
  const markPointLine = Array.isArray(result.pointResults) && result.pointResults.length
    ? `<div class="concept-results" aria-label="Marked musical ideas">${result.pointResults.map((pointResult) => {
      const symbol = pointResult.status === "correct" ? "✓" : pointResult.status === "partial" ? "½" : "–";
      return `<span class="concept-pill is-${escapeHTML(pointResult.status)}">${escapeHTML(symbol)} ${escapeHTML(pointResult.label)}</span>`;
    }).join("")}</div>`
    : "";
  const missingLine = Array.isArray(result.missingConcepts) && result.missingConcepts.length
    ? `<div class="meta-row"><span>Missing idea</span><strong>${escapeHTML(result.missingConcepts.slice(0, 2).join(", "))}</strong></div>`
    : "";
  const preferredAnswerLine = question.preferredAnswer
    ? `<div class="meta-row"><span>Preferred term</span><strong>${escapeHTML(question.preferredAnswer)}</strong></div>`
    : "";

  answerCard.innerHTML = `
    <div class="answer-reveal is-${result.status}">
      <div class="answer-status-line">
        <span class="answer-status-dot" aria-hidden="true"></span>
        <p class="${result.status === "correct" ? "good" : result.status === "partial" ? "partial" : "bad"}">${escapeHTML(result.label)}</p>
      </div>

      <div class="answer-title-block">
        <p class="eyebrow">${escapeHTML(question.id)} · ${escapeHTML(question.title)}</p>
        <h2>${formatMark(result.marksAwarded)} / ${formatMark(result.maxMarks)}</h2>
      </div>

      ${markPointLine}

      <div class="feedback-box">
        <h3>Feedback</h3>
        <p>${escapeHTML(result.feedback)}</p>
      </div>

      <div class="model-answer-box">
        <h3>Model answer</h3>
        <p>${escapeHTML(question.modelAnswer)}</p>
      </div>

      <div class="answer-meta-card">
        <div class="meta-row"><span>Your answer</span><strong>${escapeHTML(answer || "—")}</strong></div>
        ${preferredAnswerLine}
        ${matchedLine}
        ${missingLine}
        <div class="meta-row"><span>Vocabulary tip</span><strong>${escapeHTML(question.vocabularyTip || "Use precise GCSE texture terminology.")}</strong></div>
      </div>
    </div>
  `;
}

function clearAudioStopTimer() {
  if (!audioStopTimer) return;
  window.clearTimeout(audioStopTimer);
  audioStopTimer = null;
}

function stopCurrentAudio() {
  clearAudioStopTimer();
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (_) {
    audio.pause();
  }
  audio = null;
}

function playCurrentClip() {
  if (!currentQuestion) return;

  stopCurrentAudio();

  const audioSource = currentQuestion.audio || currentQuestion.streamUrl || "";
  const clipStart = Number(currentQuestion.clipStart || 0);
  const clipEnd = Number(currentQuestion.clipEnd || 0);
  const clipDuration = Number(currentQuestion.clipDuration || currentQuestion.audioDurationSeconds || 0);
  let hasStarted = false;

  audio = new Audio(audioSource);
  audio.preload = "auto";
  audio.volume = 1;
  playButton.textContent = "Replay Clip";

  const stopAtClipEnd = () => {
    if (!audio || !(clipEnd > clipStart) || audio.currentTime < clipEnd) return;
    audio.pause();
    clearAudioStopTimer();
  };

  const armStopTimer = () => {
    clearAudioStopTimer();
    if (clipDuration > 0) {
      audioStopTimer = window.setTimeout(() => {
        if (audio) audio.pause();
      }, Math.ceil((clipDuration + 0.75) * 1000));
    }
  };

  const handlePlayError = () => {
    feedback.textContent = `Audio could not play yet. Check that ${currentQuestion.audio || currentQuestion.streamUrl} is available.`;
    feedback.className = "bad";
  };

  const startPlayback = () => {
    if (hasStarted || !audio) return;
    hasStarted = true;
    if (clipStart > 0) {
      try {
        audio.currentTime = clipStart;
      } catch (_) {
        // Some streamed sources cannot seek until metadata is available.
      }
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(armStopTimer).catch(handlePlayError);
    } else {
      armStopTimer();
    }
  };

  if (clipEnd > clipStart) audio.addEventListener("timeupdate", stopAtClipEnd);
  if (clipStart > 0) {
    audio.addEventListener("loadedmetadata", startPlayback, { once: true });
    audio.addEventListener("canplay", startPlayback, { once: true });
    audio.load();
    window.setTimeout(startPlayback, 1000);
  } else {
    startPlayback();
  }
}

function loadQuestion(index) {
  currentQuestion = questions[index];
  hasSubmittedCurrent = false;

  if (!currentQuestion) {
    endRound();
    return;
  }

  setQuizVisualState("active");
  questionTitle.textContent = "Listening question";
  questionPrompt.textContent = currentQuestion.prompt;
  setQuestionMarks(currentQuestion);
  configureResponseControls(currentQuestion);
  nextButton.hidden = true;
  responseArea.hidden = false;
  feedback.textContent = "";
  feedback.className = "";
  playButton.textContent = "Replay Clip";
  renderEmptyAnswerCard();
  updateStats();
  playCurrentClip();
}

function submitCurrentAnswer(providedAnswer = null) {
  if (!currentQuestion || hasSubmittedCurrent) return;

  const hasProvidedAnswer = typeof providedAnswer === "string";
  const rawAnswer = hasProvidedAnswer ? providedAnswer.trim() : studentAnswer.value.trim();
  if (!rawAnswer) {
    feedback.textContent = "Type an answer before submitting.";
    feedback.className = "bad";
    studentAnswer.focus();
    return;
  }

  const result = markAnswer(currentQuestion, rawAnswer);
  hasSubmittedCurrent = true;
  answeredCount += 1;
  totalMarksAwarded += result.marksAwarded;
  totalMarksAvailable += result.maxMarks;
  roundHistory.push({ question: currentQuestion, answer: rawAnswer, result });

  feedback.textContent = "";
  feedback.className = "";
  if (studentAnswer) studentAnswer.disabled = true;
  updateChoiceButtonsAfterSubmit(result, rawAnswer);
  if (submitButton) submitButton.disabled = true;
  submitButton.hidden = true;
  nextButton.hidden = false;

  stopCurrentAudio();
  renderAnswerCard(currentQuestion, result, rawAnswer);
  updateStats();

  if (currentIndex >= questions.length - 1) {
    nextButton.textContent = "Finish Round";
  } else {
    nextButton.textContent = "Next Question";
  }
}

function getMedal(percentage) {
  if (percentage === 100) return { title: "Precise Texture Vocabulary", stars: "★★★★★" };
  if (percentage >= 80) return { title: "Strong GCSE Listening", stars: "★★★★" };
  if (percentage >= 60) return { title: "Developing Vocabulary", stars: "★★★" };
  return { title: "Keep Practising", stars: "★★" };
}

function buildRoundSummary() {
  return roundHistory.map((entry, index) => {
    const statusLabel = entry.result.label || (entry.result.status === "correct" ? "Correct" : entry.result.status === "partial" ? "Partly correct" : "Not quite");
    return `
      <div class="summary-row ${entry.result.status}">
        <span>Question ${index + 1}</span>
        <strong>${formatMark(entry.result.marksAwarded)} / ${formatMark(entry.result.maxMarks)}</strong>
        <small>${escapeHTML(statusLabel)} · ${escapeHTML(entry.question.title)}</small>
      </div>
    `;
  }).join("");
}

function getTextureRoundFeedback(percentage) {
  if (percentage >= 85) return "Secure texture vocabulary. Keep supporting each term with precise audible evidence.";
  if (percentage >= 60) return "Your texture vocabulary is developing. Name the texture first, then explain the relationship between the musical lines.";
  return "Keep practising concise GCSE answers: identify the texture, then give one clear piece of audible evidence.";
}

function hideRoundFeedbackPanel() {
  if (!roundFeedbackPanel) return;
  roundFeedbackPanel.hidden = true;
  roundFeedbackPanel.innerHTML = "";
  document.body.classList.remove("tt-round-feedback-open");
  appShell?.classList.remove("is-round-feedback-open");
  quizPanel?.classList.remove("is-round-feedback-open");
}

function closeRoundFeedbackWindow() {
  hideRoundFeedbackPanel();
  setQuizVisualState("ready");
  responseArea.hidden = true;
  startButton.hidden = false;
  startButton.textContent = "Start Quiz";
  questionTitle.textContent = "Texture Trainer";
  questionPrompt.textContent = "Choose a level, then start the texture round.";
  setQuestionMarks(null);
  progressInner.style.width = "0%";
  roundText.textContent = "Ready";
  feedback.textContent = "";
  feedback.className = "";
}

function renderRoundFeedbackPanel(percentage, medal) {
  if (!roundFeedbackPanel) return;
  if (roundFeedbackPanel.parentElement !== document.body) {
    document.body.appendChild(roundFeedbackPanel);
  }
  const answeredTextValue = `${answeredCount}/${questions.length} ${questions.length === 1 ? "question" : "questions"} answered`;
  roundFeedbackPanel.innerHTML = `
    <div class="tt-round-feedback-card">
      <button id="roundFeedbackCloseButton" class="tt-round-feedback-close" type="button" aria-label="Close round feedback">×</button>
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="tt-round-feedback-hero">
        <span>Final score</span>
        <strong>${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)}</strong>
        <small>${escapeHTML(answeredTextValue)} · ${percentage}%</small>
      </div>

      <div class="tt-round-feedback-metrics" aria-label="Round summary">
        <div class="diagnostic-metric ${percentage >= 85 ? "is-secure" : "is-focus"}">
          <span>Marks</span>
          <strong>${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)}</strong>
        </div>
        <div class="diagnostic-metric ${totalMarksAwarded === totalMarksAvailable ? "is-secure" : "is-focus"}">
          <span>Questions</span>
          <strong>${answeredCount} / ${questions.length}</strong>
        </div>
      </div>

      <div class="diagnostic-card tt-compiled-feedback-tile">
        <span>Compiled feedback</span>
        <strong>${escapeHTML(getTextureRoundFeedback(percentage))}</strong>
      </div>

      <div class="summary-list" aria-label="Question-by-question round results">
        ${buildRoundSummary()}
      </div>
    </div>
  `;
  roundFeedbackPanel.hidden = false;
  document.body.classList.add("tt-round-feedback-open");
  appShell?.classList.add("is-round-feedback-open");
  quizPanel?.classList.add("is-round-feedback-open");
  roundFeedbackPanel.querySelector("#roundFeedbackCloseButton")?.addEventListener("click", closeRoundFeedbackWindow);
  roundFeedbackPanel.querySelector("#roundFeedbackCloseButton")?.focus();
}

function resetTextureProgressRound() {
  eaProgressRoundId = window.EchoAuralTracking
    ? window.EchoAuralTracking.createClientRoundId("texture-trainer")
    : `texture-trainer-${Date.now()}`;
}

function saveTextureProgress(percentage) {
  if (!window.EchoAuralTracking || !roundHistory.length) return;
  if (!eaProgressRoundId) resetTextureProgressRound();
  const medal = getMedal(percentage);
  window.EchoAuralTracking.saveRound({
    moduleId: "texture-trainer",
    clientRoundId: eaProgressRoundId,
    score: totalMarksAwarded,
    maximumScore: totalMarksAvailable,
    roundFeedback: getTextureRoundFeedback(percentage),
    metadata: { medal: medal.title, level: selectedLevel },
    questions: roundHistory.map((entry, index) => ({
      questionId: entry.question.id || `TT-Q${index + 1}`,
      score: Number(entry.result.marksAwarded) || 0,
      maximumScore: Number(entry.result.maxMarks) || 0,
      feedback: entry.result.feedback || "Review the model answer and precise GCSE vocabulary.",
      answerData: {
        title: entry.question.title || "Texture question",
        level: selectedLevel,
        responseType: entry.question.responseType || "",
        status: entry.result.status || "",
        answer: entry.answer || "",
        matchedPhrase: entry.result.matchedPhrase || "",
        preferredAnswer: entry.question.preferredAnswer || "",
        modelAnswer: entry.question.modelAnswer || "",
        missingConcepts: entry.result.missingConcepts || [],
        vocabularyTip: entry.question.vocabularyTip || ""
      }
    }))
  });
}

function endRound() {
  setQuizVisualState("complete");
  responseArea.hidden = true;
  hideRoundFeedbackPanel();
  startButton.hidden = false;
  startButton.textContent = "Start Quiz";
  const percentage = totalMarksAvailable > 0 ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100) : 0;
  const medal = getMedal(percentage);
  saveTextureProgress(percentage);

  questionTitle.textContent = "Round complete";
  questionPrompt.textContent = `${medal.title} · ${percentage}%`;
  setQuestionMarks(null);
  feedback.textContent = "";
  feedback.className = "";
  progressInner.style.width = "100%";
  renderRoundFeedbackPanel(percentage, medal);
  updateStats();
}

function goToNextQuestion() {
  if (!hasSubmittedCurrent) return;
  currentIndex += 1;
  if (currentIndex >= questions.length) endRound();
  else loadQuestion(currentIndex);
}

function startRound() {
  closeTextureAdvancedSettings();
  hideRoundFeedbackPanel();
  questions = buildRandomRound(selectedLevel);
  currentIndex = 0;
  currentQuestion = null;
  totalMarksAwarded = 0;
  totalMarksAvailable = 0;
  answeredCount = 0;
  hasSubmittedCurrent = false;
  roundHistory = [];
  resetTextureProgressRound();

  stopCurrentAudio();

  if (!questions.length) {
    feedback.textContent = `No ${selectedLevel} Texture Trainer questions were found.`;
    feedback.className = "bad";
    updateStats();
    return;
  }

  startButton.hidden = true;
  loadQuestion(0);
}

function setTextureAdvancedSettingsOpen(isOpen) {
  if (!textureSettingsToggle || !textureAdvancedSettings) return;
  textureAdvancedSettings.style.display = isOpen ? "block" : "none";
  textureAdvancedSettings.classList.toggle("is-open", isOpen);
  textureAdvancedSettings.setAttribute("aria-hidden", String(!isOpen));
  textureSettingsToggle.setAttribute("aria-expanded", String(isOpen));
}

function closeTextureAdvancedSettings() {
  setTextureAdvancedSettingsOpen(false);
}

levelButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedLevel(button.dataset.level || "Foundation"));
});
startButton?.addEventListener("click", startRound);
restartButton?.addEventListener("click", startRound);
textureSettingsToggle?.addEventListener("click", () => {
  const isOpen = textureAdvancedSettings?.style.display !== "none";
  setTextureAdvancedSettingsOpen(!isOpen);
});
textureAdvancedSettings?.addEventListener("click", (event) => {
  event.stopPropagation();
});
document.querySelectorAll('input[name="textureQuestionCount"], input[name="textureMixedDifficulty"]').forEach((input) => {
  input.addEventListener("change", updateLevelControls);
});
playButton?.addEventListener("click", playCurrentClip);
submitButton?.addEventListener("click", () => submitCurrentAnswer());
nextButton?.addEventListener("click", goToNextQuestion);
studentAnswer?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && currentQuestion?.responseType === "short-text") {
    event.preventDefault();
    submitCurrentAnswer();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitCurrentAnswer();
});
document.addEventListener("click", (event) => {
  const clickedInsideSettings = textureAdvancedSettings?.contains(event.target);
  const clickedToggle = textureSettingsToggle?.contains(event.target);
  if (!clickedInsideSettings && !clickedToggle) closeTextureAdvancedSettings();
});

if (!allQuestions.length) {
  questionPrompt.textContent = "No Texture Trainer questions were found.";
  setQuestionMarks(null);
  startButton.disabled = true;
  feedback.textContent = "Check modules/texture-trainer/data/texture-questions.js.";
  feedback.className = "bad";
} else {
  setSelectedLevel(selectedLevel);
  updateStats();
}
