let currentClip;
let audio;
let score = 0;
let questionsAnswered = 0;
let totalQuestions = 10;
let unlimitedMode = false;
let gameOver = false;
let streak = 0;
let xp = 0;
let selectedMode = "solo";
let selectedDifficulty = "all";
let selectedFamilies = ["strings", "woodwind", "brass", "guitar"];
let activeClips = [];
let questionDeck = [];
let roundHistory = [];
let eaProgressRoundId = "";
let eaLastRoundSave = Promise.resolve({ saved: false, reason: "not-started" });

const clipData = typeof clips !== "undefined" ? clips : [];
const iiLearningParams = new URLSearchParams(window.location.search);

function getInstrumentLearningMode() {
  const mode = cleanText(iiLearningParams.get("eaMode"));
  if (mode === "practice") return "practice";
  if (mode === "progress" || mode === "progression") return "progression";
  return "";
}

/*
  Icon path from:
  modules/instrument-identifier/script.js
  to:
  assets/icons/instruments/

  If your Instrument Identifier folder is somewhere else, this is the only path you should need to change.
*/
const ICON_BASE_PATH = "../../assets/icons/instruments/";

const INSTRUMENT_ICON_MAP = {
  "accordion": "accordion.svg",

  "violin": "violin.svg",
  "viola": "viola.svg",
  "cello": "cello.svg",
  "violoncello": "cello.svg",
  "double bass": "double-bass.svg",
  "contrabass": "double-bass.svg",

  "flute": "flute.svg",
  "piccolo": "piccolo.svg",
  "recorder": "recorder.svg",
  "oboe": "oboe.svg",
  "clarinet": "clarinet.svg",
  "bass clarinet": "bass-clarinet.svg",
  "bassoon": "bassoon.svg",
  "saxophone": "saxophone.svg",
  "alto saxophone": "saxophone.svg",
  "tenor saxophone": "saxophone.svg",

  "trumpet": "trumpet.svg",
  "horn": "french-horn.svg",
  "french horn": "french-horn.svg",
  "trombone": "trombone.svg",
  "tuba": "tuba.svg",

  "piano": "piano.svg",
  "organ": "organ.svg",
  "harpsichord": "harpsichord.svg",

  "guitar": "guitar.svg",
  "acoustic guitar": "acoustic-guitar.svg",
  "classical guitar": "guitar.svg",
  "electric guitar": "electric-guitar.svg",
  "bass guitar": "bass-guitar.svg",
  "harp": "harp.svg",

  "timpani": "timpani.svg",
  "kettle drums": "timpani.svg",
  "bass drum": "bass-drum.svg",
  "snare drum": "snare-drum.svg",
  "side drum": "snare-drum.svg",
  "triangle": "triangle.svg",
  "cymbals": "cymbals.svg",
  "xylophone": "xylophone.svg",
  "glockenspiel": "glockenspiel.svg",
  "marimba": "marimba.svg",
  "vibraphone": "vibraphone.svg",

  "voice": "voice.svg",
  "soprano": "voice.svg",
  "alto": "voice.svg",
  "tenor": "voice.svg",
  "bass": "voice.svg",
  "choir": "choir.svg"
};

const playButton = document.getElementById("playButton");
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
const quizPanel = document.getElementById("gameScreen");
const settingsToggle = document.getElementById("settingsToggle");
const advancedSettings = document.getElementById("advancedSettings");


function setQuizVisualState(state) {
  if (!quizPanel) return;

  quizPanel.classList.remove("is-ready", "is-active", "is-complete");
  quizPanel.classList.add(`is-${state}`);
}

function cleanText(text) {
  return String(text || "").trim().toLowerCase();
}

function displayText(text) {
  return String(text || "").trim();
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function getField(clip, names) {
  for (const name of names) {
    if (clip[name] !== undefined && clip[name] !== null && String(clip[name]).trim() !== "") {
      return String(clip[name]).trim();
    }
  }
  return "";
}

function getClipQuestion(clip) {
  const spreadsheetQuestion = getField(clip, [
    "question",
    "Question",
    "II Question",
    "ii question"
  ]);

  if (spreadsheetQuestion) return spreadsheetQuestion;

  const type = cleanText(getField(clip, ["type", "TYPE", "Type"]));

  if (type && type !== "solo") {
    return "Listen to the clip. What is the solo instrument?";
  }

  return "Listen to the clip. What instrument is playing?";
}

function normaliseIconKey(value) {
  return cleanText(value)
    .replaceAll("&", "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyInstrument(value) {
  return normaliseIconKey(value).replace(/\s+/g, "-");
}

function getIconFileName(instrument) {
  const key = normaliseIconKey(instrument);
  return INSTRUMENT_ICON_MAP[key] || `${slugifyInstrument(instrument)}.svg`;
}

function showInstrumentIconFallback(image) {
  image.onerror = null;
  image.style.display = "none";

  const fallback = image.nextElementSibling;
  if (fallback) fallback.style.display = "grid";
}

function getInstrumentIcon(instrument) {
  const safeInstrument = displayText(instrument) || "Instrument";
  const fileName = getIconFileName(safeInstrument);
  const src = `${ICON_BASE_PATH}${fileName}`;

  return `
    <span class="instrument-icon-shell" aria-hidden="true">
      <img
        class="instrument-icon-img"
        src="${escapeAttr(src)}"
        alt=""
        loading="lazy"
        decoding="async"
        onerror="showInstrumentIconFallback(this)"
      />
      <span class="icon-fallback">♪</span>
    </span>
  `;
}

function shuffle(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

function getUniqueInstrumentsFromClips(clipList) {
  return [...new Set(clipList.map(clip => displayText(clip.instrument)))].filter(Boolean);
}

function getFamilyBucket(clip) {
  const instrument = cleanText(clip.instrument);
  const family = cleanText(clip.family);

  if (instrument.includes("guitar")) return "guitar";
  if (family.includes("woodwind")) return "woodwind";
  if (family.includes("brass")) return "brass";
  if (family.includes("string")) return "strings";

  return family;
}

function getInstrumentsInSameFamily(correctInstrument) {
  const matchingClip = clipData.find(clip => cleanText(clip.instrument) === cleanText(correctInstrument));
  if (!matchingClip) return [];

  const bucket = getFamilyBucket(matchingClip);
  return getUniqueInstrumentsFromClips(clipData.filter(clip => getFamilyBucket(clip) === bucket));
}

function readSetupOptions() {
  selectedMode = document.querySelector('input[name="quizMode"]:checked')?.value || "solo";
  selectedDifficulty = document.querySelector('input[name="difficultyFilter"]:checked')?.value || "all";

  selectedFamilies = Array.from(document.querySelectorAll('input[name="familyFilter"]:checked'))
    .map(box => cleanText(box.value));

  const count = document.querySelector('input[name="questionCount"]:checked')?.value || "10";
  unlimitedMode = count === "unlimited";
  totalQuestions = unlimitedMode ? 999999 : Number(count);
}

function clipMatchesMode(clip) {
  const type = cleanText(clip.type);
  if (selectedMode === "solo") return type === "solo";
  if (selectedMode === "accompanied") return type !== "solo";
  return true;
}

function clipMatchesDifficulty(clip) {
  const difficulty = cleanText(clip.difficulty);

  if (selectedDifficulty === "all") return true;
  if (selectedDifficulty === "hard") return difficulty === "hard" || difficulty === "very hard";

  return difficulty === selectedDifficulty;
}

function clipMatchesFamily(clip) {
  return selectedFamilies.includes(getFamilyBucket(clip));
}

function buildQuestionDeck() {
  activeClips = clipData.filter(clip =>
    clipMatchesMode(clip) &&
    clipMatchesDifficulty(clip) &&
    clipMatchesFamily(clip)
  );

  questionDeck = shuffle(activeClips);

  if (!unlimitedMode && questionDeck.length < totalQuestions) {
    totalQuestions = questionDeck.length;
  }
}

function getNextClip() {
  if (questionDeck.length === 0) {
    if (unlimitedMode) questionDeck = shuffle(activeClips);
    else return null;
  }

  return questionDeck.shift();
}

function getAnswerChoices(correctInstrument) {
  const correct = displayText(correctInstrument);
  const allInstruments = getUniqueInstrumentsFromClips(clipData);

  let wrongAnswers = shuffle(
    getInstrumentsInSameFamily(correct)
      .filter(i => cleanText(i) !== cleanText(correct))
  ).slice(0, 3);

  if (wrongAnswers.length < 3) {
    const backup = allInstruments.filter(i =>
      cleanText(i) !== cleanText(correct) &&
      !wrongAnswers.some(w => cleanText(w) === cleanText(i))
    );

    wrongAnswers = wrongAnswers.concat(shuffle(backup).slice(0, 3 - wrongAnswers.length));
  }

  const choices = [correct, ...wrongAnswers]
    .filter(Boolean)
    .filter((choice, index, arr) => arr.findIndex(item => cleanText(item) === cleanText(choice)) === index)
    .slice(0, 4);

  if (correct && !choices.some(choice => cleanText(choice) === cleanText(correct))) {
    choices[0] = correct;
  }

  return shuffle(choices);
}

function updateScore() {
  scoreText.textContent = `Score: ${score} / ${questionsAnswered}`;
  streakText.textContent = `Streak: ${streak}`;
  xpText.textContent = `XP: ${xp}`;

  if (unlimitedMode) {
    roundText.textContent = `Question ${questionsAnswered + 1} / Unlimited`;
    progressInner.style.width = "0%";
  } else {
    roundText.textContent = `Question ${Math.min(questionsAnswered + 1, totalQuestions)} / ${totalQuestions}`;
    progressInner.style.width = `${(questionsAnswered / totalQuestions) * 100}%`;
  }
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

function renderReadyCard() {
  answerCard.innerHTML = `
    <div class="answerCard-empty">
      <p class="eyebrow">ANSWER PANEL</p>
      <h2>Ready when you are.</h2>
      <p class="muted">Start a round to see the correct answer, clip information and round summary here.</p>
    </div>
  `;
}

function showAnswerCard(wasCorrect) {
  const instrument = getField(currentClip, ["instrument"]);
  const family = getField(currentClip, ["family"]);
  const type = getField(currentClip, ["type"]);
  const difficulty = getField(currentClip, ["difficulty"]);
  const source = getField(currentClip, ["source"]);
  const rights = getField(currentClip, ["rights"]);

  answerCard.innerHTML = `
    <div class="answer-reveal ${wasCorrect ? "is-correct" : "is-wrong"}">
      <div class="answer-status-line">
        <span class="answer-status-dot" aria-hidden="true"></span>
        <p class="${wasCorrect ? "good" : "bad"}">${wasCorrect ? "Correct" : "Not quite"}</p>
      </div>

      <div class="reveal-icon">${getInstrumentIcon(instrument)}</div>

      <div class="answer-title-block">
        <p class="eyebrow">IDENTIFIED INSTRUMENT</p>
        <h2>${escapeHTML(instrument)}</h2>
      </div>

      <div class="answer-meta-card">
        ${buildMetaRow("Family", family)}
        ${buildMetaRow("Type", type)}
        ${buildMetaRow("Difficulty", difficulty)}
        ${buildMetaRow("Source", source)}
        ${buildMetaRow("Rights", rights)}
      </div>
    </div>
  `;
}

function triggerConfetti() {
  const box = document.createElement("div");
  box.className = "confettiBox";

  for (let i = 0; i < 18; i++) {
    const piece = document.createElement("span");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    box.appendChild(piece);
  }

  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1200);
}

function fadeOutAudio(callback) {
  if (!audio) {
    callback?.();
    return;
  }

  const fade = setInterval(() => {
    if (audio.volume > 0.05) {
      audio.volume = Math.max(0, audio.volume - 0.05);
    } else {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      callback?.();
    }
  }, 40);
}

function playCurrentClip() {
  if (!audio || gameOver) return;

  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(() => {
    alert("Audio could not play. Check the file path in clips.js.");
  });

  playButton.textContent = "Replay Clip";
}

function loadQuestion() {
  if (gameOver) return;

  setQuizVisualState("active");

  currentClip = getNextClip();

  if (!currentClip) {
    endGame();
    return;
  }

  questionText.textContent = getClipQuestion(currentClip);

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  audio = new Audio(currentClip.file);
  audio.volume = 1;

  answersDiv.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "";
  playButton.style.display = "block";
  playButton.disabled = false;
  playButton.textContent = "Replay Clip";

  const instrument = getField(currentClip, ["instrument"]);
  const choices = getAnswerChoices(instrument);

  choices.forEach(choice => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.dataset.instrument = choice;
    button.setAttribute("aria-label", `Choose ${choice}`);

    button.innerHTML = `
      <span class="option-icon">${getInstrumentIcon(choice)}</span>
      <span class="option-label">${escapeHTML(choice)}</span>
    `;

    button.addEventListener("click", () => checkAnswer(choice, button));
    answersDiv.appendChild(button);
  });

  updateScore();
  playCurrentClip();
}

function checkAnswer(selectedInstrument, selectedButton) {
  if (gameOver || !currentClip) return;

  const correctInstrument = getField(currentClip, ["instrument"]);
  const wasCorrect = cleanText(selectedInstrument) === cleanText(correctInstrument);

  questionsAnswered++;

  if (wasCorrect) {
    score++;
    streak++;
    xp += 20;
    feedback.textContent = "Correct — well heard.";
    feedback.className = "good";
    triggerConfetti();
  } else {
    streak = 0;
    xp += 5;
    feedback.textContent = `Not quite — it was ${correctInstrument}.`;
    feedback.className = "bad";
  }

  roundHistory.push({
    questionId: getField(currentClip, ["id", "ID", "clipId"]) || `II-Q${questionsAnswered}`,
    selectedInstrument,
    correctInstrument,
    wasCorrect,
    family: getField(currentClip, ["family"]),
    type: getField(currentClip, ["type"]),
    difficulty: getField(currentClip, ["difficulty"])
  });

  Array.from(answersDiv.querySelectorAll("button")).forEach(button => {
    const label = button.dataset.instrument || button.textContent.trim();
    button.disabled = true;

    if (cleanText(label) === cleanText(correctInstrument)) button.classList.add("correct");
    if (button === selectedButton && !wasCorrect) button.classList.add("wrong");
  });

  showAnswerCard(wasCorrect);
  updateScore();

  setTimeout(() => {
    fadeOutAudio(() => {
      if (!unlimitedMode && questionsAnswered >= totalQuestions) endGame();
      else loadQuestion();
    });
  }, 2400);
}

function getMedal(percentage) {
  if (percentage === 100) return { title: "Perfect Ear", stars: "★★★★★" };
  if (percentage >= 90) return { title: "Gold Ear", stars: "★★★★★" };
  if (percentage >= 80) return { title: "Excellent", stars: "★★★★" };
  if (percentage >= 70) return { title: "Great Work", stars: "★★★" };
  if (percentage >= 60) return { title: "Good Effort", stars: "★★" };
  return { title: "Keep Practising", stars: "★" };
}

function buildRoundSummaryGrid() {
  if (!roundHistory.length) return "";

  return `
    <div class="summary-grid" aria-label="Question-by-question round summary">
      ${roundHistory.map((item, index) => `
        <div class="${item.wasCorrect ? "summaryCorrect" : "summaryWrong"}" title="Question ${index + 1}: ${escapeAttr(item.correctInstrument)}">
          <small>${index + 1}</small>
          <span class="summary-mini-icon">${getInstrumentIcon(item.correctInstrument)}</span>
          <span class="summary-mark">${item.wasCorrect ? "✓" : "×"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function resetInstrumentProgressRound() {
  eaProgressRoundId = window.EchoAuralTracking
    ? window.EchoAuralTracking.createClientRoundId("instrument-identifier")
    : `instrument-identifier-${Date.now()}`;
}

function saveInstrumentProgress(divisor, percentage) {
  if (!window.EchoAuralTracking || !roundHistory.length) {
    eaLastRoundSave = Promise.resolve({ saved: false, reason: "no-round" });
    return eaLastRoundSave;
  }
  const learningMode = getInstrumentLearningMode();
  if (learningMode === "practice") {
    eaLastRoundSave = Promise.resolve({ saved: false, reason: "practice-mode" });
    return eaLastRoundSave;
  }

  if (!eaProgressRoundId) resetInstrumentProgressRound();
  const medal = getMedal(percentage);
  const metadata = {
    mode: selectedMode,
    difficulty: selectedDifficulty,
    families: selectedFamilies,
    medal: medal.title
  };

  if (learningMode === "progression") {
    const progression = window.EAInstrumentIdentifierProgression;
    metadata.source = "student_progression";
    metadata.learningMode = "progression";
    metadata.progressionStage = progression?.level?.name || "";
    metadata.progressionLevel = progression?.currentLevel ?? "";
  }

  eaLastRoundSave = window.EchoAuralTracking.saveRound({
    moduleId: "instrument-identifier",
    clientRoundId: eaProgressRoundId,
    score,
    maximumScore: divisor,
    roundFeedback: percentage >= 85
      ? "Secure instrument recognition. Increase the difficulty or use accompanied extracts."
      : percentage >= 65
        ? "Good progress. Compare instruments from the same family and listen for register, attack and tone colour."
        : "Keep practising. Focus on one instrument family at a time and compare contrasting tone colours.",
    metadata,
    questions: roundHistory.map((item, index) => ({
      questionId: item.questionId || `II-Q${index + 1}`,
      score: item.wasCorrect ? 1 : 0,
      maximumScore: 1,
      feedback: item.wasCorrect
        ? `Correct: ${item.correctInstrument}.`
        : `You chose ${item.selectedInstrument || "—"}; the answer was ${item.correctInstrument}.`,
      answerData: {
        selectedInstrument: item.selectedInstrument || "",
        correctInstrument: item.correctInstrument || "",
        family: item.family || "",
        type: item.type || "",
        difficulty: item.difficulty || "",
        wasCorrect: Boolean(item.wasCorrect)
      }
    }))
  });

  return eaLastRoundSave;
}

function endGame() {
  setQuizVisualState("complete");
  gameOver = true;
  answersDiv.innerHTML = "";
  playButton.disabled = true;
  playButton.textContent = "Round Complete";
  restartButton.style.display = "block";
  progressInner.style.width = "100%";
  roundText.textContent = "Round complete";

  const divisor = unlimitedMode ? questionsAnswered : totalQuestions;
  const percentage = divisor > 0 ? Math.round((score / divisor) * 100) : 0;
  const medal = getMedal(percentage);
  const roundSave = saveInstrumentProgress(divisor, percentage);

  answerCard.innerHTML = `
    <div class="summary">
      <div class="summary-medal">
        <div class="reveal-icon">${getInstrumentIcon("Violin")}</div>
        <p class="eyebrow">ROUND SUMMARY</p>
        <h2>${escapeHTML(medal.title)}</h2>
        <p class="stars">${escapeHTML(medal.stars)}</p>
      </div>

      <div class="summary-stats">
        <div><strong>${score}/${divisor}</strong><span>Score</span></div>
        <div><strong>${percentage}%</strong><span>Accuracy</span></div>
        <div><strong>${xp}</strong><span>XP</span></div>
      </div>

      ${buildRoundSummaryGrid()}
    </div>
  `;

  return roundSave;
}

function startGame() {
  readSetupOptions();
  buildQuestionDeck();

  if (activeClips.length === 0) {
    setupMessage.textContent = "No clips match those settings. Try Mixed mode or select more families.";
    return;
  }

  setAdvancedSettingsOpen(false);
  setQuizVisualState("active");

  setupMessage.textContent = "";
  score = 0;
  questionsAnswered = 0;
  streak = 0;
  xp = 0;
  roundHistory = [];
  resetInstrumentProgressRound();
  gameOver = false;

  restartButton.style.display = "none";
  startButton.style.display = "none";
  playButton.style.display = "block";

  questionText.textContent = "Loading question...";

  loadQuestion();
}

function restartGame() {
  fadeOutAudio(() => {
    score = 0;
    questionsAnswered = 0;
    streak = 0;
    xp = 0;
    roundHistory = [];
    gameOver = false;
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
    restartButton.style.display = "none";
  });
}

function setAdvancedSettingsOpen(isOpen) {
  advancedSettings.style.display = isOpen ? "block" : "none";
  advancedSettings.classList.toggle("is-open", isOpen);
  advancedSettings.setAttribute("aria-hidden", String(!isOpen));
  settingsToggle.setAttribute("aria-expanded", String(isOpen));
}

function toggleAdvancedSettings() {
  const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
  setAdvancedSettingsOpen(!isOpen);
}

settingsToggle.addEventListener("click", event => {
  event.stopPropagation();
  toggleAdvancedSettings();
});

advancedSettings.addEventListener("click", event => {
  event.stopPropagation();
});

document.addEventListener("click", event => {
  const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
  const clickedInsideSettings = advancedSettings.contains(event.target);
  const clickedToggle = settingsToggle.contains(event.target);

  if (isOpen && !clickedInsideSettings && !clickedToggle) {
    setAdvancedSettingsOpen(false);
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && settingsToggle.getAttribute("aria-expanded") === "true") {
    setAdvancedSettingsOpen(false);
    settingsToggle.focus();
  }
});

playButton.addEventListener("click", playCurrentClip);
restartButton.addEventListener("click", restartGame);
startButton.addEventListener("click", startGame);

setAdvancedSettingsOpen(false);
setQuizVisualState("ready");
