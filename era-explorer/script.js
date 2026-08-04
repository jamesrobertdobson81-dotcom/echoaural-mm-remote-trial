"use strict";

let clipPool = [];
let roundQuestions = [];
let currentQuestion = null;
let currentQuestionIndex = 0;
let currentAudio = null;
let audioStopTimer = null;
let audioToken = 0;
let score = 0;
let questionsAnswered = 0;
let totalQuestions = 5;
let streak = 0;
let xp = 0;
let gameOver = false;
let answerLocked = true;
let roundHistory = [];
let roundFeedbackOverlay = null;

const AUDIO_WINDOW_SECONDS = 10;
const PERIOD_ICON_BASE_PATH = "../assets/icons/eras/";
const PERIOD_ICON_CACHE_BUST = "v=6";
const PERIOD_ICON_MAP = Object.freeze({
  renaissance: "renaissance.png",
  baroque: "baroque.png",
  classical: "classical.png",
  romantic: "romantic.png",
  "20th century": "20th-century.png",
  "twentieth century": "20th-century.png"
});

const COMPOSER_ICON_BASE_PATH = "../assets/icons/composers/";
const COMPOSER_ICON_CACHE_BUST = "v=4";
/** Full EchoAural composer names → verified icon filenames. */
const COMPOSER_ICON_MAP = Object.freeze({
  "antonio vivaldi": "antonio_vivaldi.png",
  "antonin dvorak": "antonin_dvorak.png",
  "carl philipp emanuel bach": "carl_philipp_emanuel_bach.png",
  "claude debussy": "claude_debussy.png",
  "edvard grieg": "edvard_grieg.png",
  "edward elgar": "edward_elgar.png",
  "felix mendelssohn": "felix_mendelssohn.png",
  "frederic chopin": "frederic_chopin.png",
  "gabriel faure": "gabriel_faure.png",
  "georg philipp telemann": "georg_philipp_telemann.png",
  "george frideric handel": "george_frideric_handel.png",
  "igor stravinsky": "igor_stravinsky.png",
  "johann sebastian bach": "johann_sebastian_bach.png",
  "johann strauss ii": "johann_strauss_ii.png",
  "johannes brahms": "johannes_brahms.png",
  "joseph haydn": "joseph_haydn.png",
  "ludwig van beethoven": "ludwig_van_beethoven.png",
  "modest mussorgsky": "modest_mussorgsky.png",
  "muzio clementi": "muzio_clementi.png",
  "pyotr ilyich tchaikovsky": "pyotr_ilyich_tchaikovsky.png",
  "robert schumann": "robert_schumann.png",
  "sergei rachmaninoff": "sergei_rachmaninoff.png",
  "tomaso albinoni": "tomaso_albinoni.png",
  "wolfgang amadeus mozart": "wolfgang_amadeus_mozart.png"
});
const core = window.EraExplorer;

const playButton = document.getElementById("playButton");
const nextButton = document.getElementById("nextButton");
const answersDiv = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const scoreText = document.getElementById("scoreText");
const roundText = document.getElementById("roundText");
const progressInner = document.getElementById("progressInner");
const restartButton = document.getElementById("restartButton");
const streakText = document.getElementById("streakText");
const xpText = document.getElementById("xpText");
const questionText = document.getElementById("questionText");
const startButton = document.getElementById("startButton");
const answerCard = document.getElementById("answerCard");
const setupMessage = document.getElementById("setupMessage");
const appShell = document.querySelector(".app-shell");
const quizPanel = document.getElementById("gameScreen");
const settingsToggle = document.getElementById("settingsToggle");
const advancedSettings = document.getElementById("advancedSettings");

function displayText(value) {
  return String(value ?? "").trim();
}

function comparisonKey(value) {
  return displayText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function setQuizVisualState(state) {
  quizPanel.classList.remove("is-ready", "is-active", "is-complete");
  quizPanel.classList.add(`is-${state}`);
}

function neutralIcon() {
  return '<span class="instrument-icon-shell era-transparent-placeholder" aria-hidden="true"></span>';
}

function getPeriodIconFileName(period) {
  return PERIOD_ICON_MAP[comparisonKey(period)] || "";
}

function getComposerIconFileName(composer) {
  return COMPOSER_ICON_MAP[comparisonKey(composer)] || "";
}

function showEraTileIconFallback(image) {
  image.onerror = null;
  image.style.display = "none";
  const fallback = image.nextElementSibling;
  if (fallback) fallback.style.display = "grid";
}

window.showEraTileIconFallback = showEraTileIconFallback;
window.showPeriodIconFallback = showEraTileIconFallback;

function buildEraTileIcon(src) {
  return `
    <span class="instrument-icon-shell era-tile-icon-shell" aria-hidden="true">
      <img
        class="instrument-icon-img era-tile-icon-img"
        src="${escapeAttr(src)}"
        alt=""
        loading="lazy"
        decoding="async"
        onerror="showEraTileIconFallback(this)"
      />
      <span class="icon-fallback">♪</span>
    </span>
  `;
}

function getPeriodIcon(period) {
  const fileName = getPeriodIconFileName(period);
  if (!fileName) return neutralIcon();
  return buildEraTileIcon(`${PERIOD_ICON_BASE_PATH}${fileName}?${PERIOD_ICON_CACHE_BUST}`);
}

function getComposerIcon(composer) {
  const fileName = getComposerIconFileName(composer);
  if (!fileName) return neutralIcon();
  return buildEraTileIcon(`${COMPOSER_ICON_BASE_PATH}${fileName}?${COMPOSER_ICON_CACHE_BUST}`);
}

function optionIconForChoice(choice) {
  if (currentQuestion?.type === "period") return getPeriodIcon(choice);
  if (currentQuestion?.type === "composer") return getComposerIcon(choice);
  return neutralIcon();
}

function revealIconForQuestion(question = currentQuestion) {
  if (!question) return neutralIcon();
  if (question.type === "period") return getPeriodIcon(question.correctAnswer);
  if (question.type === "composer") return getComposerIcon(question.correctAnswer);
  return getPeriodIcon(question.clip?.period);
}

function buildMetaRow(label, value) {
  if (!displayText(value)) return "";
  return `
    <div class="meta-row">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}

function setAnswerButtonsDisabled(disabled) {
  answersDiv.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}

function updateScore() {
  scoreText.textContent = `Score: ${score} / ${questionsAnswered}`;
  streakText.textContent = `Streak: ${streak}`;
  xpText.textContent = `XP: ${xp}`;
  roundText.textContent = gameOver
    ? "Round complete"
    : `Question ${Math.min(currentQuestionIndex + 1, totalQuestions)} / ${totalQuestions}`;
  progressInner.style.width = gameOver
    ? "100%"
    : `${(questionsAnswered / totalQuestions) * 100}%`;
}

function renderReadyCard() {
  answerCard.innerHTML = `
    <div class="answerCard-empty">
      <div class="answer-empty-brand" aria-hidden="true">
        <span class="answer-empty-icon"><img src="../assets/icons/modules/context-coach.png" alt="" /></span>
        <span class="answer-empty-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </span>
      </div>
      <p class="eyebrow">ANSWER PANEL</p>
      <h2>Your listening evidence appears here.</h2>
      <p class="muted">Correct answers, clip details and the round summary will build here as students listen.</p>
    </div>
  `;
}

function stopAudio(resetPosition = true) {
  if (audioStopTimer) {
    window.clearTimeout(audioStopTimer);
    audioStopTimer = null;
  }
  if (!currentAudio) return;
  currentAudio.pause();
  if (resetPosition) {
    const startTime = Number(currentQuestion?.clip?.startTime || 0);
    try { currentAudio.currentTime = startTime; }
    catch (_error) { /* Metadata may not be loaded yet. */ }
  }
}

function audioWindowSeconds() {
  const start = Number(currentQuestion?.clip?.startTime || 0);
  const suppliedEnd = Number(currentQuestion?.clip?.endTime);
  if (Number.isFinite(suppliedEnd) && suppliedEnd > start) {
    return Math.min(AUDIO_WINDOW_SECONDS, suppliedEnd - start);
  }
  return AUDIO_WINDOW_SECONDS;
}

function scheduleAudioStop(token) {
  if (audioStopTimer) window.clearTimeout(audioStopTimer);
  audioStopTimer = window.setTimeout(() => {
    if (token !== audioToken || !currentAudio) return;
    currentAudio.pause();
    currentAudio.currentTime = Number(currentQuestion?.clip?.startTime || 0);
  }, Math.max(1, audioWindowSeconds()) * 1000);
}

function playCurrentClip() {
  if (!currentAudio || gameOver || !currentQuestion) return;
  stopAudio(false);
  const token = audioToken;
  const startTime = Number(currentQuestion.clip.startTime || 0);
  try { currentAudio.currentTime = startTime; }
  catch (_error) { /* The loadedmetadata handler below will set it. */ }
  currentAudio.volume = 1;

  const playAttempt = currentAudio.play();
  if (playAttempt && typeof playAttempt.then === "function") {
    playAttempt
      .then(() => {
        if (token !== audioToken) return;
        scheduleAudioStop(token);
        if (!answerLocked) setAnswerButtonsDisabled(false);
      })
      .catch(() => {
        if (token !== audioToken) return;
        console.warn("[Era Explorer] Browser autoplay was blocked; use Replay Clip.");
        if (!answerLocked) setAnswerButtonsDisabled(false);
      });
  } else {
    scheduleAudioStop(token);
  }

  playButton.textContent = "Replay Clip";
}

function replaceUnavailableQuestion(failedQuestion) {
  const usedIds = new Set(roundQuestions.map((question) => question.clip.id));
  const candidates = core.shuffle(clipPool.filter((clip) => !usedIds.has(clip.id)));

  for (const clip of candidates) {
    const replacement = failedQuestion.type === "period"
      ? core.buildPeriodQuestion(clip, clipPool)
      : core.buildComposerQuestion(clip, clipPool);
    if (!core.validateEraQuestion(replacement)) continue;
    roundQuestions[currentQuestionIndex] = replacement;
    window.setTimeout(loadQuestion, 0);
    return;
  }

  console.warn("[Era Explorer] No valid replacement clip was available.");
  setupMessage.textContent = "This round could not continue. Please restart and try again.";
  restartGame();
}

function createCurrentAudio() {
  stopAudio();
  audioToken += 1;
  const token = audioToken;
  currentAudio = new Audio(currentQuestion.clip.audioPath);
  currentAudio.preload = "metadata";
  currentAudio.volume = 1;
  currentAudio.addEventListener("loadedmetadata", () => {
    if (token !== audioToken) return;
    const startTime = Number(currentQuestion?.clip?.startTime || 0);
    if (Number.isFinite(currentAudio.duration) && startTime < currentAudio.duration) {
      currentAudio.currentTime = startTime;
    }
  }, { once: true });
  currentAudio.addEventListener("error", () => {
    if (token !== audioToken || !currentQuestion) return;
    console.warn(`[Era Explorer] Skipping unavailable audio: ${currentQuestion.clip.audioPath}`);
    replaceUnavailableQuestion(currentQuestion);
  }, { once: true });
  currentAudio.addEventListener("ended", () => {
    if (audioStopTimer) window.clearTimeout(audioStopTimer);
    audioStopTimer = null;
  });
}

function renderQuestionOptions() {
  answersDiv.innerHTML = "";
  currentQuestion.options.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.dataset.answer = choice;
    button.setAttribute("aria-label", `Choose ${choice}`);
    button.innerHTML = `
      <span class="option-icon">${optionIconForChoice(choice)}</span>
      <span class="option-label">${escapeHTML(choice)}</span>
    `;
    button.addEventListener("click", () => checkAnswer(choice, button));
    answersDiv.appendChild(button);
  });
}

function loadQuestion() {
  if (gameOver) return;
  stopAudio();
  currentQuestion = roundQuestions[currentQuestionIndex];
  if (!currentQuestion) {
    endGame();
    return;
  }

  setQuizVisualState("active");
  answerLocked = false;
  questionText.textContent = currentQuestion.prompt;
  feedback.textContent = "";
  feedback.className = "";
  nextButton.style.display = "none";
  nextButton.textContent = currentQuestionIndex === totalQuestions - 1 ? "Finish Quiz" : "Next Question";
  playButton.style.display = "inline-flex";
  playButton.disabled = false;
  playButton.textContent = "Replay Clip";

  renderQuestionOptions();
  createCurrentAudio();
  updateScore();
  playCurrentClip();
}

function showAnswerCard(wasCorrect, selectedAnswer) {
  const clip = currentQuestion.clip;
  const answerType = currentQuestion.type === "period" ? "MUSICAL PERIOD" : "COMPOSER";
  answerCard.innerHTML = `
    <div class="answer-reveal ${wasCorrect ? "is-correct" : "is-wrong"}">
      <div class="answer-status-line">
        <span class="answer-status-dot" aria-hidden="true"></span>
        <p class="${wasCorrect ? "good" : "bad"}">${wasCorrect ? "Correct" : "Incorrect"}</p>
      </div>

      <div class="reveal-icon">${revealIconForQuestion(currentQuestion)}</div>

      <div class="answer-title-block">
        <p class="eyebrow">${answerType}</p>
        <h2>${escapeHTML(currentQuestion.correctAnswer)}</h2>
      </div>

      <div class="answer-meta-card">
        ${wasCorrect ? "" : buildMetaRow("Selected", selectedAnswer)}
        ${buildMetaRow("Composer", clip.composer)}
        ${buildMetaRow("Period", clip.period)}
        ${buildMetaRow("Work", clip.work)}
        ${buildMetaRow("Movement", clip.movement)}
        ${buildMetaRow("Source", clip.source)}
        ${buildMetaRow("Rights", clip.rights)}
      </div>
    </div>
  `;
}

function triggerConfetti() {
  const box = document.createElement("div");
  box.className = "confettiBox";
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement("span");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    box.appendChild(piece);
  }
  document.body.appendChild(box);
  window.setTimeout(() => box.remove(), 1200);
}

function factualFeedback(wasCorrect, selectedAnswer) {
  const clip = currentQuestion.clip;
  if (currentQuestion.type === "period") {
    return wasCorrect
      ? `Correct — this extract is from the ${clip.period} period. Composer: ${clip.composer}.`
      : `Incorrect — you selected ${selectedAnswer}. Correct: ${clip.period}. Composer: ${clip.composer}.`;
  }
  return wasCorrect
    ? `Correct — ${clip.composer}. Period: ${clip.period}.`
    : `Incorrect — you selected ${selectedAnswer}. Correct: ${clip.composer}. Period: ${clip.period}.`;
}

function checkAnswer(selectedAnswer, selectedButton) {
  if (gameOver || answerLocked || !currentQuestion) return;
  answerLocked = true;
  const wasCorrect = comparisonKey(selectedAnswer) === comparisonKey(currentQuestion.correctAnswer);
  questionsAnswered += 1;

  if (wasCorrect) {
    score += 1;
    streak += 1;
    xp += 20;
    feedback.className = "good";
    triggerConfetti();
  } else {
    streak = 0;
    xp += 5;
    feedback.className = "bad";
  }
  feedback.textContent = factualFeedback(wasCorrect, selectedAnswer);

  roundHistory.push({
    questionId: currentQuestion.id,
    questionType: currentQuestion.type,
    selectedAnswer,
    correctAnswer: currentQuestion.correctAnswer,
    composer: currentQuestion.clip.composer,
    period: currentQuestion.clip.period,
    clipId: currentQuestion.clip.id,
    wasCorrect
  });

  answersDiv.querySelectorAll("button").forEach((button) => {
    const label = button.dataset.answer || button.textContent.trim();
    button.disabled = true;
    if (comparisonKey(label) === comparisonKey(currentQuestion.correctAnswer)) button.classList.add("correct");
    if (button === selectedButton && !wasCorrect) button.classList.add("wrong");
  });

  showAnswerCard(wasCorrect, selectedAnswer);
  updateScore();
  nextButton.textContent = currentQuestionIndex === totalQuestions - 1 ? "Finish Quiz" : "Next Question";
  nextButton.style.display = "inline-flex";
}

function nextQuestion() {
  if (!answerLocked || gameOver) return;
  stopAudio();
  if (currentQuestionIndex >= totalQuestions - 1) {
    endGame();
    return;
  }
  currentQuestionIndex += 1;
  loadQuestion();
}

function getMedal(percentage) {
  if (percentage === 100) return { title: "Perfect Ear", stars: "★★★★★" };
  if (percentage >= 90) return { title: "Gold Ear", stars: "★★★★★" };
  if (percentage >= 80) return { title: "Excellent", stars: "★★★★" };
  if (percentage >= 70) return { title: "Great Work", stars: "★★★" };
  if (percentage >= 60) return { title: "Good Effort", stars: "★★" };
  return { title: "Keep Practising", stars: "★" };
}

function categoryResult(type) {
  const questions = roundHistory.filter((item) => item.questionType === type);
  return {
    score: questions.filter((item) => item.wasCorrect).length,
    total: questions.length
  };
}

function getRoundFeedback(percentage) {
  if (percentage >= 85) return "Secure recognition of musical periods and composers.";
  if (percentage >= 65) return "Good progress. Listen for clear era clues: texture, harmony, and typical instruments.";
  return "Keep practising. Link each composer to Renaissance, Baroque, Classical, Romantic, or 20th Century.";
}

function buildRoundSummaryGrid() {
  return `
    <div class="summary-grid" aria-label="Question-by-question round summary">
      ${roundHistory.map((item, index) => `
        <div class="${item.wasCorrect ? "summaryCorrect" : "summaryWrong"}" title="Question ${index + 1}: ${escapeAttr(item.correctAnswer)}">
          <small>${index + 1}</small>
          <span class="summary-mini-icon">${item.questionType === "period" ? getPeriodIcon(item.correctAnswer) : getComposerIcon(item.correctAnswer)}</span>
          <span class="summary-mark">${item.wasCorrect ? "✓" : "×"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRoundQuestionRows() {
  return roundHistory.map((item, index) => `
    <div class="mm-round-review-row ${item.wasCorrect ? "is-secure" : "is-focus"}">
      <span>Question ${index + 1} · ${item.questionType === "period" ? "Period" : "Composer"}</span>
      <strong>${item.wasCorrect ? "1/1" : "0/1"}</strong>
      <small>Your answer: ${escapeHTML(item.selectedAnswer || "—")} · Correct: ${escapeHTML(item.correctAnswer)}</small>
    </div>
  `).join("");
}

function renderRoundReviewPanel() {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const medal = getMedal(percentage);
  const composer = categoryResult("composer");
  const period = categoryResult("period");
  return `
    <div class="mm-round-review-panel ii-round-review-panel">
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${escapeHTML(`${score}/${totalQuestions}`)}</strong>
        <small>${escapeHTML(`${questionsAnswered}/${totalQuestions} questions answered`)} · ${escapeHTML(`${percentage}%`)}</small>
      </div>

      <div class="diagnostic-metrics ii-round-feedback-metrics" aria-label="Round category breakdown">
        <div class="diagnostic-metric ${composer.score === composer.total ? "is-secure" : "is-focus"}">
          <span>Composer</span>
          <strong>${escapeHTML(`${composer.score}/${composer.total}`)}</strong>
        </div>
        <div class="diagnostic-metric ${period.score === period.total ? "is-secure" : "is-focus"}">
          <span>Period</span>
          <strong>${escapeHTML(`${period.score}/${period.total}`)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile">
        <span>${escapeHTML(medal.title)}</span>
        <strong>${escapeHTML(getRoundFeedback(percentage))}</strong>
      </div>

      <div class="mm-round-review-list" aria-label="Question-by-question round results">
        ${renderRoundQuestionRows()}
      </div>

      <button id="roundFinishButton" class="primary-button mm-final-finish-button" type="button">Finish Quiz</button>
    </div>
  `;
}

function removeRoundFeedbackOverlay() {
  if (roundFeedbackOverlay?.parentNode) roundFeedbackOverlay.parentNode.removeChild(roundFeedbackOverlay);
  roundFeedbackOverlay = null;
}

function closeRoundFeedbackWindow() {
  stopAudio();
  removeRoundFeedbackOverlay();
  document.body.classList.remove("ii-round-review-open");
  appShell.classList.remove("is-round-feedback-open");
  quizPanel.classList.remove("is-round-feedback-open");
}

function finishRoundFeedbackWindow() {
  closeRoundFeedbackWindow();
  restartGame();
}

function showRoundFeedbackWindow() {
  closeRoundFeedbackWindow();
  document.body.classList.add("ii-round-review-open");
  appShell.classList.add("is-round-feedback-open");
  quizPanel.classList.add("is-round-feedback-open");

  roundFeedbackOverlay = document.createElement("div");
  roundFeedbackOverlay.className = "ii-round-feedback-overlay";
  roundFeedbackOverlay.setAttribute("role", "dialog");
  roundFeedbackOverlay.setAttribute("aria-modal", "true");
  roundFeedbackOverlay.setAttribute("aria-label", "ContextCoach round feedback");
  roundFeedbackOverlay.innerHTML = renderRoundReviewPanel();
  document.body.appendChild(roundFeedbackOverlay);
  roundFeedbackOverlay.querySelector("#roundFinishButton")?.addEventListener("click", finishRoundFeedbackWindow);
}

function endGame() {
  stopAudio();
  audioToken += 1;
  setQuizVisualState("complete");
  gameOver = true;
  answerLocked = true;
  answersDiv.innerHTML = "";
  nextButton.style.display = "none";
  playButton.disabled = true;
  playButton.textContent = "Round Complete";
  restartButton.style.display = "block";
  questionText.textContent = "";
  updateScore();

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const medal = getMedal(percentage);
  answerCard.innerHTML = `
    <div class="summary">
      <div class="summary-medal">
        <div class="reveal-icon">${neutralIcon()}</div>
        <p class="eyebrow">ROUND SUMMARY</p>
        <h2>${escapeHTML(medal.title)}</h2>
        <p class="stars">${escapeHTML(medal.stars)}</p>
      </div>
      <div class="summary-stats">
        <div><strong>${score}/${totalQuestions}</strong><span>Score</span></div>
        <div><strong>${percentage}%</strong><span>Accuracy</span></div>
        <div><strong>${xp}</strong><span>XP</span></div>
      </div>
      ${buildRoundSummaryGrid()}
    </div>
  `;

  showRoundFeedbackWindow();
}

function readQuestionCount() {
  const selected = Number(document.querySelector('input[name="questionCount"]:checked')?.value || 5);
  return [3, 5, 10].includes(selected) ? selected : 5;
}

function startGame() {
  if (!clipPool.length || startButton.disabled) return;
  closeRoundFeedbackWindow();
  totalQuestions = readQuestionCount();

  try {
    roundQuestions = core.buildRoundQuestions(clipPool, totalQuestions);
  } catch (error) {
    console.warn("[Era Explorer] Could not build the round:", error);
    setupMessage.textContent = "There are not enough valid clips to build this round.";
    return;
  }

  setAdvancedSettingsOpen(false);
  setQuizVisualState("active");
  setupMessage.textContent = "";
  score = 0;
  questionsAnswered = 0;
  currentQuestionIndex = 0;
  streak = 0;
  xp = 0;
  roundHistory = [];
  gameOver = false;
  answerLocked = false;
  restartButton.style.display = "none";
  startButton.style.display = "none";
  playButton.style.display = "inline-flex";
  questionText.textContent = "Loading question...";
  loadQuestion();
}

function restartGame() {
  stopAudio();
  audioToken += 1;
  closeRoundFeedbackWindow();
  score = 0;
  questionsAnswered = 0;
  currentQuestionIndex = 0;
  streak = 0;
  xp = 0;
  roundHistory = [];
  roundQuestions = [];
  currentQuestion = null;
  currentAudio = null;
  gameOver = false;
  answerLocked = true;
  setQuizVisualState("ready");
  renderReadyCard();
  answersDiv.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "";
  progressInner.style.width = "0%";
  roundText.textContent = "Ready";
  scoreText.textContent = "Score: 0 / 0";
  streakText.textContent = "Streak: 0";
  xpText.textContent = "XP: 0";
  questionText.textContent = "";
  startButton.style.display = "block";
  playButton.style.display = "none";
  nextButton.style.display = "none";
  restartButton.style.display = "none";
}

function setAdvancedSettingsOpen(isOpen) {
  advancedSettings.style.display = isOpen ? "block" : "none";
  advancedSettings.classList.toggle("is-open", isOpen);
  advancedSettings.setAttribute("aria-hidden", String(!isOpen));
  settingsToggle.setAttribute("aria-expanded", String(isOpen));
}

async function loadCatalogue() {
  try {
    const response = await fetch("/shared/data/clip-catalogue.json", {
      headers: { Accept: "application/json" },
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`Metadata request failed (${response.status}).`);
    const catalogue = await response.json();
    const audit = core.auditEraExplorerClips(catalogue);
    clipPool = audit.valid;

    if (audit.invalid.length) {
      const reasons = audit.invalid.reduce((counts, item) => {
        counts[item.reason] = (counts[item.reason] || 0) + 1;
        return counts;
      }, {});
      console.warn("[Era Explorer] Excluded invalid metadata records:", reasons);
    }

    const periods = core.uniqueValues(clipPool.map((clip) => clip.period));
    const composers = core.uniqueValues(clipPool.map((clip) => clip.composer));
    if (clipPool.length < 10 || periods.length < 3 || composers.length < 4) {
      throw new Error("The validated catalogue cannot support four-option mixed rounds.");
    }

    setupMessage.textContent = "";
    startButton.disabled = false;
    startButton.textContent = "Start Quiz";
  } catch (error) {
    console.warn("[Era Explorer] Catalogue unavailable:", error);
    setupMessage.textContent = "ContextCoach is temporarily unavailable.";
    startButton.disabled = true;
    startButton.textContent = "Clips Unavailable";
  }
}

settingsToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setAdvancedSettingsOpen(settingsToggle.getAttribute("aria-expanded") !== "true");
});

advancedSettings.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", (event) => {
  const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
  if (isOpen && !advancedSettings.contains(event.target) && !settingsToggle.contains(event.target)) {
    setAdvancedSettingsOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settingsToggle.getAttribute("aria-expanded") === "true") {
    setAdvancedSettingsOpen(false);
    settingsToggle.focus();
  }
});

playButton.addEventListener("click", playCurrentClip);
nextButton.addEventListener("click", nextQuestion);
restartButton.addEventListener("click", restartGame);
startButton.addEventListener("click", startGame);
window.addEventListener("pagehide", () => stopAudio());
window.addEventListener("beforeunload", () => stopAudio());

window.EraExplorerApp = Object.freeze({
  startGame,
  restartGame,
  stopAudio,
  getState: () => ({
    clipCount: clipPool.length,
    totalQuestions,
    currentQuestionIndex,
    questionsAnswered,
    score,
    gameOver,
    answerLocked,
    questionTypes: roundQuestions.map((question) => question.type),
    questionOptions: roundQuestions.map((question) => question.options.slice()),
    currentAudioPaused: currentAudio ? currentAudio.paused : true
  })
});

setAdvancedSettingsOpen(false);
setQuizVisualState("ready");
loadCatalogue();
