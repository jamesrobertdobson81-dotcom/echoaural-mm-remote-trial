const questions = Array.isArray(window.textureQuestions) ? window.textureQuestions : [];

let currentIndex = 0;
let currentQuestion = null;
let audio = null;
let totalMarksAwarded = 0;
let totalMarksAvailable = 0;
let answeredCount = 0;
let hasSubmittedCurrent = false;
let roundHistory = [];

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
const playButton = document.getElementById("playButton");
const submitButton = document.getElementById("submitButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");
const studentAnswer = document.getElementById("studentAnswer");
const responseArea = document.getElementById("responseArea");
const feedback = document.getElementById("feedback");
const answerCard = document.getElementById("answerCard");

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

function phraseToTokens(value) {
  return normaliseText(value).split(" ").filter(Boolean);
}

function containsPhrase(answer, phrase) {
  const normalisedAnswer = ` ${normaliseText(answer)} `;
  const normalisedPhrase = normaliseText(phrase);
  if (!normalisedPhrase) return false;

  const phrasePattern = ` ${normalisedPhrase} `;
  if (!normalisedAnswer.includes(phrasePattern)) return false;

  // Avoid false positives such as "not monophonic" being marked as correct.
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

    return true;
  }

  return false;
}

function findMatchingPhrase(answer, phrases = []) {
  return phrases.find((phrase) => containsPhrase(answer, phrase)) || "";
}

function markAnswer(question, answer) {
  const maxMarks = Number(question.maxMarks) || 1;
  const acceptedMatch = findMatchingPhrase(answer, question.acceptedAnswers);
  const partialMatch = findMatchingPhrase(answer, question.partialAnswers);
  const incorrectMatch = findMatchingPhrase(answer, question.incorrectAnswers);

  if (acceptedMatch) {
    return {
      status: "correct",
      marksAwarded: maxMarks,
      maxMarks,
      matchedPhrase: acceptedMatch,
      feedback: question.feedbackCorrect || "Correct.",
      label: "Correct"
    };
  }

  if (partialMatch) {
    return {
      status: "partial",
      marksAwarded: maxMarks > 1 ? Math.max(1, Math.floor(maxMarks / 2)) : 0.5,
      maxMarks,
      matchedPhrase: partialMatch,
      feedback: question.feedbackPartial || "Partly correct. Use more precise GCSE vocabulary.",
      label: "Partly correct"
    };
  }

  return {
    status: "incorrect",
    marksAwarded: 0,
    maxMarks,
    matchedPhrase: incorrectMatch,
    feedback: incorrectMatch
      ? buildWrongAnswerFeedback(question, incorrectMatch)
      : (question.feedbackIncorrect || "Not quite. Check the model answer and try to use precise GCSE vocabulary."),
    label: "Not quite"
  };
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
  const totalQuestions = questions.length || 1;
  const visibleQuestionNumber = Math.min(currentIndex + 1, totalQuestions);
  const percentage = totalMarksAvailable > 0 ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100) : 0;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  roundText.textContent = answeredCount >= totalQuestions
    ? "Round complete"
    : `Question ${visibleQuestionNumber} / ${totalQuestions}`;
  progressInner.style.width = `${progress}%`;
  scoreText.textContent = `Marks: ${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)}`;
  answeredText.textContent = `Answered: ${answeredCount}`;
  accuracyText.textContent = `Accuracy: ${percentage}%`;
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
      <p class="muted">Submit a short written response to see the awarded mark, feedback, model answer and vocabulary tip.</p>
    </div>
  `;
}

function renderAnswerCard(question, result, answer) {
  const matchedLine = result.matchedPhrase
    ? `<div class="meta-row"><span>Matched phrase</span><strong>${escapeHTML(result.matchedPhrase)}</strong></div>`
    : `<div class="meta-row"><span>Matched phrase</span><strong>No exact keyword match</strong></div>`;

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
        ${matchedLine}
        <div class="meta-row"><span>Vocabulary tip</span><strong>${escapeHTML(question.vocabularyTip || "Use precise GCSE texture terminology.")}</strong></div>
      </div>
    </div>
  `;
}

function playCurrentClip() {
  if (!currentQuestion) return;

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  audio = new Audio(currentQuestion.audio);
  audio.volume = 1;
  playButton.textContent = "Replay Clip";

  audio.play().catch(() => {
    feedback.textContent = `Audio could not play yet. Replace placeholder file: modules/texture-trainer/${currentQuestion.audio}`;
    feedback.className = "bad";
  });
}

function loadQuestion(index) {
  currentQuestion = questions[index];
  hasSubmittedCurrent = false;

  if (!currentQuestion) {
    endRound();
    return;
  }

  setQuizVisualState("active");
  questionTitle.textContent = `${currentQuestion.id} · ${currentQuestion.title}`;
  questionPrompt.textContent = currentQuestion.prompt;
  setQuestionMarks(currentQuestion);
  studentAnswer.value = "";
  studentAnswer.disabled = false;
  submitButton.disabled = false;
  submitButton.hidden = false;
  nextButton.hidden = true;
  responseArea.hidden = false;
  feedback.textContent = "Listen to the clip, then write one concise GCSE-style sentence.";
  feedback.className = "";
  playButton.textContent = "Play Clip";
  renderEmptyAnswerCard();
  updateStats();
}

function submitCurrentAnswer() {
  if (!currentQuestion || hasSubmittedCurrent) return;

  const rawAnswer = studentAnswer.value.trim();
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

  feedback.textContent = result.feedback;
  feedback.className = result.status === "correct" ? "good" : result.status === "partial" ? "partial" : "bad";
  studentAnswer.disabled = true;
  submitButton.disabled = true;
  submitButton.hidden = true;
  nextButton.hidden = false;

  if (audio) audio.pause();
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
  return roundHistory.map((entry, index) => `
    <div class="summary-row ${entry.result.status}">
      <span>${index + 1}</span>
      <strong>${escapeHTML(entry.question.title)}</strong>
      <em>${formatMark(entry.result.marksAwarded)} / ${formatMark(entry.result.maxMarks)}</em>
    </div>
  `).join("");
}

function endRound() {
  setQuizVisualState("complete");
  responseArea.hidden = true;
  startButton.hidden = false;
  startButton.textContent = "Restart Texture Trainer";
  const percentage = totalMarksAvailable > 0 ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100) : 0;
  const medal = getMedal(percentage);

  questionTitle.textContent = "Round complete";
  questionPrompt.textContent = `${medal.title} · ${percentage}%`;
  setQuestionMarks(null);
  feedback.textContent = "Review the answer card, then restart when ready.";
  feedback.className = percentage >= 60 ? "good" : "partial";
  progressInner.style.width = "100%";

  answerCard.innerHTML = `
    <div class="round-summary-card">
      <p class="eyebrow">TEXTURE TRAINER SUMMARY</p>
      <h2>${escapeHTML(medal.title)}</h2>
      <p class="summary-stars" aria-label="${escapeHTML(medal.stars)}">${escapeHTML(medal.stars)}</p>
      <div class="summary-score">${formatMark(totalMarksAwarded)} / ${formatMark(totalMarksAvailable)} marks · ${percentage}%</div>
      <div class="summary-list">${buildRoundSummary()}</div>
      <p class="muted">Next step: replace the placeholder audio files and expand the answer cards with board-specific mark-scheme language.</p>
    </div>
  `;
  updateStats();
}

function goToNextQuestion() {
  if (!hasSubmittedCurrent) return;
  currentIndex += 1;
  if (currentIndex >= questions.length) endRound();
  else loadQuestion(currentIndex);
}

function startRound() {
  currentIndex = 0;
  currentQuestion = null;
  totalMarksAwarded = 0;
  totalMarksAvailable = 0;
  answeredCount = 0;
  hasSubmittedCurrent = false;
  roundHistory = [];

  if (audio) {
    audio.pause();
    audio = null;
  }

  startButton.hidden = true;
  loadQuestion(0);
}

startButton?.addEventListener("click", startRound);
restartButton?.addEventListener("click", startRound);
playButton?.addEventListener("click", playCurrentClip);
submitButton?.addEventListener("click", submitCurrentAnswer);
nextButton?.addEventListener("click", goToNextQuestion);
studentAnswer?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitCurrentAnswer();
});

if (!questions.length) {
  questionPrompt.textContent = "No Texture Trainer questions were found.";
  setQuestionMarks(null);
  startButton.disabled = true;
  feedback.textContent = "Check modules/texture-trainer/data/texture-questions.js.";
  feedback.className = "bad";
} else {
  updateStats();
}
