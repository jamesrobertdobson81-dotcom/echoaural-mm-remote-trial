let currentClip;
let audio;
let score = 0;
let questionsAnswered = 0;
let totalQuestions = 10;
let unlimitedMode = false;
let gameOver = false;
let streak = 0;
let xp = 0;
let selectedMode = "all";
let selectedDifficulty = "Foundation";
let selectedFamilies = ["strings", "woodwind", "brass", "guitar"];
let activeClips = [];
let questionDeck = [];
let roundHistory = [];
let eaProgressRoundId = "";
let eaLastRoundSave = Promise.resolve({ saved: false, reason: "not-started" });
let roundFeedbackOverlay = null;
let playMode = "play";
let hasSubmitted = false;
// True once a Live Session host has loaded its first question through the
// contract (see loadQuestionById below) — distinguishes "boot the round"
// from "load another question into an already-running round" without a
// second, duplicated setup path.
let contractSessionStarted = false;
let awardedSoFar = 0;
let possibleSoFar = 0;

const clipData = typeof clips !== "undefined" ? clips : [];
const iiLearningParams = new URLSearchParams(window.location.search);

function getInstrumentLearningMode() {
  const mode = cleanText(iiLearningParams.get("eaMode"));
  if (mode === "progress" || mode === "progression") return "progression";
  return "";
}

const INSTRUMENT_LEVELS = [
  { id: "foundation", label: "Foundation" },
  { id: "developing", label: "Developing" },
  { id: "securing", label: "Securing" },
  { id: "mastering", label: "Mastering" }
];

function normaliseInstrumentLevel(value) {
  const clean = cleanText(value);
  if (clean === "foundation") return "foundation";
  if (clean === "developing") return "developing";
  if (clean === "securing" || clean === "secure") return "securing";
  if (clean === "mastering" || clean === "exam") return "mastering";
  return "";
}

function getInstrumentLevelLabel(levelId) {
  return INSTRUMENT_LEVELS.find(level => level.id === levelId)?.label || "Foundation";
}

function selectedInstrumentLevelId() {
  const selected = document.querySelector('input[name="iiLevel"]:checked')?.value || selectedDifficulty;
  return normaliseInstrumentLevel(selected) || "foundation";
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
  "acoustic guitar": "acoustic-guitar.png",
  "classical guitar": "guitar.svg",
  "electric guitar": "electric-guitar.png",
  "bass guitar": "bass-guitar.png",
  "harp": "harp.svg",

  "bandoneon": "bandoneon.png",
  "bansuri": "bansuri.png",
  "bongos": "bongos.png",
  "claves": "claves.png",
  "congas": "congas.png",
  "cowbell": "cowbell.png",
  "darbuka": "darbuka.png",
  "dizi": "dizi.png",
  "erhu": "erhu.png",
  "guiro": "guiro.png",
  "guzheng": "guzheng.png",
  "guqin": "guqin.png",
  "maracas": "maracas.png",
  "nay": "nay.png",
  "oud": "oud.png",
  "pipa": "pipa.png",
  "qanun": "qanun.png",
  "riqq": "riqq.png",
  "sarangi": "sarangi.png",
  "sitar": "sitar.png",
  "sarod": "sarod.png",
  "tanpura": "tanpura.png",
  "tabla": "tabla.png",
  "timbales": "timbales.png",
  "yangqin": "yangqin.png",
  "steel pan drums": "steel-pan-drums.png",
  "steel pans": "steel-pan-drums.png",
  "steel drums": "steel-pan-drums.png",
  "electronic synth": "synthesiser.png",
  "chip synthesiser": "chip-synthesiser.png",
  "chip synthesizer": "chip-synthesiser.png",
  "gamelan": "gamelan.png",
  "koto": "koto.png",
  "panpipes": "panpipes.png",
  "pan pipes": "panpipes.png",
  "agogo": "agogo.png",
  "agogo bells": "agogo.png",
  "rebab": "rebab.png",
  "shakuhachi": "shakuhachi.png",
  "acoustic orchestra": "acoustic-orchestra.png",
  "orchestra": "acoustic-orchestra.png",

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

  "voice": "voice.png",
  "soprano": "voice.png",
  "alto": "voice.png",
  "tenor": "voice.png",
  "bass": "voice.png",
  "choir": "voice.png"
};

const playButton = document.getElementById("playButton");
const answersDiv = document.getElementById("answers");
const instrumentsCentrePanel = document.getElementById("instrumentsCentrePanel");
const trackInfo = document.getElementById("trackInfo");
const feedback = document.getElementById("feedback");
const iiResponseArea = document.getElementById("iiResponseArea");
const iiStudentAnswer = document.getElementById("iiStudentAnswer");
const scoreText = document.getElementById("scoreText");
const roundText = document.getElementById("roundText");
const progressInner = document.getElementById("progressInner");
const restartButton = document.getElementById("restartButton");
const streakText = document.getElementById("streakText");
const xpText = document.getElementById("xpText");
const questionText = document.getElementById("questionText");
const questionMarks = document.getElementById("questionMarks");
const startButton = document.getElementById("startButton");
const answerCard = document.getElementById("answerCard");
const setupMessage = document.getElementById("setupMessage");
const appShell = document.querySelector(".app-shell");
const quizPanel = document.getElementById("gameScreen");
const settingsToggle = document.getElementById("settingsToggle");
const advancedSettings = document.getElementById("advancedSettings");


function syncSetupSelectionHighlights() {
  document.querySelectorAll('input[name="iiSkill"], input[name="iiLevel"]').forEach((input) => {
    const label = input.closest("label");
    if (!label) return;
    const selected = Boolean(input.checked);
    label.classList.toggle("is-selected", selected);
    label.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function setSetupSettingsLocked(locked) {
  const setupPanel = document.getElementById("homeScreen");
  if (setupPanel) {
    setupPanel.classList.toggle("is-settings-locked", locked);
    if (locked) {
      setupPanel.setAttribute("aria-disabled", "true");
    } else {
      setupPanel.removeAttribute("aria-disabled");
    }
  }

  // Snapshot selected tiles before disabling so blue selected chrome does not
  // depend on :has(input:checked) while inputs are disabled mid-round.
  if (locked) {
    syncSetupSelectionHighlights();
  }

  document.querySelectorAll('input[name="iiSkill"], input[name="iiLevel"]').forEach((input) => {
    const label = input.closest("label");
    if (locked) {
      // Keep the checked property; only block interaction.
      input.setAttribute("disabled", "");
      label?.classList.add("is-locked");
      label?.setAttribute("aria-disabled", "true");
    } else {
      input.removeAttribute("disabled");
      label?.classList.remove("is-locked");
      label?.removeAttribute("aria-disabled");
    }
  });

  if (!locked) {
    syncSetupSelectionHighlights();
  }

  const skillGrid = setupPanel?.querySelector(".melody-skill-grid");
  const levelGrid = setupPanel?.querySelector(".level-grid");
  [skillGrid, levelGrid].forEach((grid) => {
    if (!grid) return;
    if (locked) {
      grid.setAttribute("inert", "");
    } else {
      grid.removeAttribute("inert");
    }
  });
}

function setQuizVisualState(state) {
  if (!quizPanel) return;

  quizPanel.classList.remove("is-ready", "is-active", "is-complete");
  quizPanel.classList.add(`is-${state}`);
  setSetupSettingsLocked(state === "active" || state === "complete");
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

function getClipProgressionLevel(clip) {
  // Clips carrying an explicit reviewed level (from the II level-review
  // pass) use it directly rather than the difficulty/type heuristic below,
  // which was only ever a stand-in for a real per-clip level and could
  // never place a clip in Foundation for anything other than an easy solo.
  const explicitLevel = cleanText(getField(clip, ["level", "Level"]));
  if (["foundation", "developing", "securing", "mastering"].includes(explicitLevel)) {
    return explicitLevel;
  }

  const difficulty = cleanText(getField(clip, ["difficulty", "DIFFICULTY", "Difficulty"]));
  const type = cleanText(getField(clip, ["type", "TYPE", "Type", "clipType", "Clip Type Clean"]));
  const isSolo = (
    type === "solo" ||
    type === "unaccompanied" ||
    type === "solo instrument" ||
    type.includes("solo only")
  );
  const recognisedDifficulty = ["easy", "medium", "hard", "very hard"].includes(difficulty);

  if (isSolo && (difficulty === "easy" || !recognisedDifficulty)) return "foundation";

  if (
    (difficulty === "easy" && !isSolo) ||
    (isSolo && recognisedDifficulty && difficulty !== "easy")
  ) {
    return "developing";
  }

  if (difficulty === "medium" && !isSolo) return "securing";

  if ((difficulty === "hard" || difficulty === "very hard") && !isSolo) {
    return "mastering";
  }

  return "ungraded";
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

function usesGeneratedInstrumentChoices(clip) {
  return clip.responseType !== "typed" && clip.responseType !== "mc-custom";
}

function asksForIndividualInstrument(clip) {
  const question = cleanText(getField(clip, ["question"]));
  return (
    (question.includes("instrument") || question.includes("hand drums")) &&
    !question.includes("instrumental family") &&
    !question.includes("instrument family") &&
    !question.includes("acoustic instruments") &&
    !question.includes("how sound is produced")
  );
}

function splitInstrumentSummary(value) {
  const expanded = displayText(value).replace(/\(([^)]*)\)/g, (match, note) => {
    const cleanNote = displayText(note);
    if (/^any\s+/i.test(cleanNote)) return "";
    if (/^accept\s+/i.test(cleanNote)) return `, ${cleanNote.replace(/^accept\s+/i, "")}`;
    return "";
  });

  return expanded
    .split(/\s*(?:,|\band\b)\s*/i)
    .map(displayText)
    .filter(Boolean);
}

function getIndividualInstrumentNames(clip) {
  if (usesGeneratedInstrumentChoices(clip)) return [displayText(clip.instrument)].filter(Boolean);
  if (!asksForIndividualInstrument(clip)) return [];
  if (clip.responseType === "mc-custom") return (clip.choices || []).map(displayText).filter(Boolean);
  return splitInstrumentSummary(clip.instrument);
}

function getUniqueInstrumentsFromClips(clipList) {
  const instruments = clipList.flatMap(getIndividualInstrumentNames);
  return instruments.filter((instrument, index) =>
    instruments.findIndex(candidate => cleanText(candidate) === cleanText(instrument)) === index
  );
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
  const matchingClip = clipData.find(clip =>
    usesGeneratedInstrumentChoices(clip) &&
    cleanText(clip.instrument) === cleanText(correctInstrument)
  );
  if (!matchingClip) return [];

  const bucket = getFamilyBucket(matchingClip);
  return getUniqueInstrumentsFromClips(clipData.filter(clip => getFamilyBucket(clip) === bucket));
}

function readSetupOptions() {
  const levelId = selectedInstrumentLevelId();
  const mixedDifficulty = document.querySelector('input[name="mixedDifficulty"]')?.checked && getInstrumentLearningMode() !== "progression";
  selectedMode = document.querySelector('input[name="quizMode"]:checked')?.value || "all";
  selectedDifficulty = mixedDifficulty ? "Mixed Difficulty" : getInstrumentLevelLabel(levelId);

  selectedFamilies = Array.from(document.querySelectorAll('input[name="familyFilter"]:checked'))
    .map(box => cleanText(box.value));

  const count = document.querySelector('input[name="questionCount"]:checked')?.value || "5";
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
  const selectedDifficultyKey = cleanText(selectedDifficulty);
  if (selectedDifficultyKey === "all" || selectedDifficultyKey === "mixed difficulty") return true;

  const levelId = normaliseInstrumentLevel(selectedDifficulty);
  if (levelId) return getClipProgressionLevel(clip) === levelId;

  const difficulty = cleanText(clip.difficulty);

  if (selectedDifficultyKey === "hard") return difficulty === "hard" || difficulty === "very hard";

  return difficulty === selectedDifficultyKey;
}

function clipMatchesFamily(clip) {
  if (!selectedFamilies.length) return true;
  return selectedFamilies.includes(getFamilyBucket(clip));
}

function spacedRepetitionKey() {
  const families = selectedFamilies.slice().sort().join(",") || "all";
  return `ii:${cleanText(selectedMode)}:${cleanText(selectedDifficulty)}:${families}`;
}

function orderDeck(clips) {
  const SR = window.EchoAuralSpacedRepetition;
  if (!SR) return shuffle(clips);
  return SR.orderByLeastRecentlyShown(clips, { key: spacedRepetitionKey(), idOf: (clip) => clip.id });
}

function buildQuestionDeck() {
  activeClips = clipData.filter(clip =>
    clipMatchesMode(clip) &&
    clipMatchesDifficulty(clip) &&
    clipMatchesFamily(clip)
  );

  questionDeck = orderDeck(activeClips);

  if (!unlimitedMode && questionDeck.length < totalQuestions) {
    totalQuestions = questionDeck.length;
  }

  // Keep the same answer (instrument) from appearing twice within one
  // fixed-length round, without disturbing spaced-repetition order beyond
  // that. Unlimited mode has no fixed round length, so it's left alone.
  if (!unlimitedMode && window.EchoAuralSpacedRepetition?.dedupeByAnswer) {
    questionDeck = window.EchoAuralSpacedRepetition.dedupeByAnswer(
      questionDeck,
      totalQuestions,
      (clip) => cleanText(getField(clip, ["instrument", "answer"]))
    );
  }
}

function getNextClip() {
  if (questionDeck.length === 0) {
    if (unlimitedMode) questionDeck = orderDeck(activeClips);
    else return null;
  }

  const clip = questionDeck.shift();
  if (clip) window.EchoAuralSpacedRepetition?.markShown([clip], { key: spacedRepetitionKey(), idOf: (c) => c.id });
  return clip;
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
  if (scoreText) {
    scoreText.textContent = `Mark: ${awardedSoFar} / ${possibleSoFar}`;
  }
  if (streakText) streakText.textContent = `Streak: ${streak}`;
  if (xpText) xpText.textContent = `XP: ${xp}`;

  if (unlimitedMode) {
    roundText.textContent = `Question ${questionsAnswered + (hasSubmitted ? 0 : 1)} / Unlimited`;
    progressInner.style.width = "0%";
  } else {
    const displayIndex = Math.min(questionsAnswered + (hasSubmitted ? 0 : 1), totalQuestions);
    roundText.textContent = gameOver
      ? `Round complete · ${score}/${totalQuestions}`
      : `Question ${Math.max(displayIndex, 1)} of ${totalQuestions}`;
    const done = Math.min(questionsAnswered, totalQuestions);
    progressInner.style.width = `${(done / totalQuestions) * 100}%`;
  }
}

function stripTrailingQuestionMarkSuffix(text) {
  if (window.EAQuestionPromptMarks?.stripTrailing) {
    return window.EAQuestionPromptMarks.stripTrailing(text);
  }
  return String(text ?? "")
    .replace(/(?:[\s\u00A0\u202F]*)[(（]\s*\d+(?:\.\d+)?\s*[)）]\s*$/u, "")
    .replace(/[\s\u00A0\u202F]+$/u, "");
}

function setQuestionPrompt(text, marks = 1) {
  if (!questionText) return;

  const promptEl = questionText.querySelector(".ii-question-prompt") || questionText;
  promptEl.textContent = stripTrailingQuestionMarkSuffix(text || "");

  if (!questionMarks) return;

  if (marks > 0) {
    questionMarks.textContent = `\u00A0(${marks})`;
    questionMarks.hidden = false;
    questionMarks.setAttribute("aria-hidden", "false");
    questionMarks.setAttribute("aria-label", `${marks} mark${marks === 1 ? "" : "s"}`);
    return;
  }

  questionMarks.textContent = "";
  questionMarks.hidden = true;
  questionMarks.setAttribute("aria-hidden", "true");
  questionMarks.removeAttribute("aria-label");
}

function getNextButtonLabel() {
  if (!unlimitedMode && questionsAnswered >= totalQuestions) return "See Feedback";
  return "Next Question";
}

function setPlayButtonMode(mode) {
  playMode = mode;
  if (!playButton) return;
  if (mode === "next") {
    const label = getNextButtonLabel();
    playButton.textContent = label;
    playButton.setAttribute("aria-label", label === "See Feedback" ? "See round feedback" : "Next question");
  } else if (mode === "replay") {
    playButton.textContent = "Replay Clip";
    playButton.setAttribute("aria-label", "Replay clip");
  } else {
    playButton.textContent = "Play Clip";
    playButton.setAttribute("aria-label", "Play clip");
  }
}

function buildTrackInfoHTML(clip) {
  if (!clip) return "";
  const composer = getField(clip, ["composer"]);
  const work = getField(clip, ["work"]);
  const movement = getField(clip, ["movement", "Movement / Section"]);
  const title = [composer, work]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" – ");
  const sourceValue = getField(clip, ["source"]);
  const rightsValue = getField(clip, ["rights"]);
  const source = /musopen/i.test(sourceValue) ? "Musopen" : (/wikimedia|commons/i.test(sourceValue) ? "Wikimedia" : sourceValue);
  const licenceMatch = rightsValue.match(/\b(?:PDM|CC0|CC BY(?:-NC)?(?:-SA)?|CC BY-SA)\s*\d(?:\.\d)?\b/i);
  const licence = licenceMatch ? licenceMatch[0].toUpperCase() : (/public domain|\bPD\b/i.test(rightsValue) ? "Public domain" : rightsValue);
  const details = [source, licence].filter(Boolean).join(" · ") || "—";
  const fallbackId = getField(clip, ["id", "ID", "clipId"]) || "Clip";
  return `
    <strong title="${escapeAttr(title || fallbackId)}">${escapeHTML(title || fallbackId)}</strong>
    <span class="score-track-info-movement" title="${escapeAttr(movement || "—")}">${escapeHTML(movement || "—")}</span>
    <small title="${escapeAttr(details)}">${escapeHTML(details)}</small>
  `;
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
    <div class="answerCard-empty ii-source-panel">
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

  if (playMode === "next") {
    goToNextQuestion();
    return;
  }

  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(() => {
    alert("Audio could not play. Check the file path in clips.js.");
  });

  setPlayButtonMode("replay");
}

function goToNextQuestion() {
  fadeOutAudio(() => {
    if (!unlimitedMode && questionsAnswered >= totalQuestions) {
      endGame();
      return;
    }
    loadQuestion();
  });
}

function loadQuestion() {
  if (gameOver) return;

  setQuizVisualState("active");
  hasSubmitted = false;

  currentClip = getNextClip();

  if (!currentClip) {
    endGame();
    return;
  }

  window.EAProgressEmbed?.questionReady({
    id: getField(currentClip, ["id", "ID", "clipId"]),
    level: getField(currentClip, ["difficulty"])
  });

  setQuestionPrompt(getClipQuestion(currentClip), 1);

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  audio = new Audio(currentClip.file);
  audio.volume = 1;

  answersDiv.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "";
  playButton.style.display = "inline-flex";
  playButton.disabled = false;
  setPlayButtonMode("play");

  if (trackInfo) {
    trackInfo.innerHTML = "";
    trackInfo.setAttribute("aria-hidden", "true");
  }

  // Typed-answer clips (responseType:"typed") are new/additive — no clip in
  // the original 285 sets this, so every existing question falls straight
  // into the unchanged multiple-choice branch below exactly as before.
  if (currentClip.responseType === "typed") {
    if (instrumentsCentrePanel) instrumentsCentrePanel.hidden = true;
    if (iiResponseArea) {
      iiResponseArea.hidden = false;
      if (iiStudentAnswer) { iiStudentAnswer.value = ""; iiStudentAnswer.disabled = false; iiStudentAnswer.focus(); }
    }
  } else {
    if (iiResponseArea) iiResponseArea.hidden = true;
    if (instrumentsCentrePanel) instrumentsCentrePanel.hidden = false;

    const instrument = getField(currentClip, ["instrument"]);
    // mc-custom clips supply their own 4 options (e.g. "Acoustic orchestra /
    // Chip synthesiser / Solo piano / Rock band") instead of the auto-
    // generated same-family distractors — absent on every existing clip, so
    // getAnswerChoices(instrument) is still what runs for all 285 of them.
    const choices = (currentClip.responseType === "mc-custom" && Array.isArray(currentClip.choices) && currentClip.choices.length)
      ? shuffle(currentClip.choices)
      : getAnswerChoices(instrument);
    answersDiv.setAttribute("data-answer-count", String(choices.length));

    choices.forEach(choice => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "instruments-option";
      button.dataset.instrument = choice;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");
      button.setAttribute("aria-label", `Choose ${choice}`);

      button.innerHTML = `
        <span class="option-icon">${getInstrumentIcon(choice)}</span>
        <span class="option-label">${escapeHTML(choice)}</span>
      `;

      button.addEventListener("click", () => checkAnswer(choice, button));
      answersDiv.appendChild(button);
    });
  }

  updateScore();
  window.setTimeout(() => {
    if (!hasSubmitted && currentClip && !gameOver) {
      playCurrentClip();
    }
  }, 180);
}

function checkAnswer(selectedInstrument, selectedButton) {
  if (gameOver || !currentClip || hasSubmitted) return;

  const correctInstrument = getField(currentClip, ["instrument"]);
  const wasCorrect = cleanText(selectedInstrument) === cleanText(correctInstrument);

  hasSubmitted = true;
  questionsAnswered++;
  possibleSoFar += 1;

  if (wasCorrect) {
    score++;
    awardedSoFar += 1;
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
    awardedMarks: wasCorrect ? 1 : 0,
    maxMarks: 1,
    family: getField(currentClip, ["family"]),
    type: getField(currentClip, ["type"]),
    difficulty: getField(currentClip, ["difficulty"])
  });

  Array.from(answersDiv.querySelectorAll("button")).forEach(button => {
    const label = button.dataset.instrument || button.textContent.trim();
    button.disabled = true;
    const isSelected = button === selectedButton;
    const isCorrect = cleanText(label) === cleanText(correctInstrument);

    if (isCorrect) button.classList.add("correct");
    if (isSelected && !wasCorrect) button.classList.add("wrong");
    button.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  showAnswerCard(wasCorrect);
  window.EAProgressEmbed?.answerComplete({
    questionId: getField(currentClip, ["id", "ID", "clipId"]),
    score: wasCorrect ? 1 : 0,
    maximumScore: 1,
    correct: wasCorrect,
    // mc-custom clips also reach this call site (same button UI as
    // standard multiple-choice, see usesGeneratedInstrumentChoices/the
    // else-branch above) — hardcoding "multiple-choice" here previously
    // mislabelled all 22 mc-custom clips.
    responseType: currentClip.responseType === "mc-custom" ? "mc-custom" : "multiple-choice",
    answerData: selectedInstrument,
    modelAnswer: correctInstrument,
    feedback: feedback.textContent,
    family: getField(currentClip, ["family"]),
    type: getField(currentClip, ["type"]),
    instrument: getField(currentClip, ["instrument"])
  });
  if (trackInfo) {
    trackInfo.innerHTML = buildTrackInfoHTML(currentClip);
    trackInfo.removeAttribute("aria-hidden");
  }
  updateScore();
  setPlayButtonMode("next");
}

// ---------- Typed-answer support (additive) ----------
// Only used by clips with responseType:"typed" (none of the original 285).
// checkAnswer() above is completely untouched; this is a self-contained
// parallel path that ends in the same shared state (score/streak/xp/
// roundHistory/answer card) so round summaries behave identically either
// way.

function normaliseAnswerText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(left, right) {
  const a = normaliseAnswerText(left);
  const b = normaliseAnswerText(right);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
}

function fuzzyMatchAnswer(answer, target) {
  const a = normaliseAnswerText(answer);
  const b = normaliseAnswerText(target);
  if (!a || !b) return false;
  if (a === b) return true;
  if ((` ${a} `).includes(` ${b} `)) return true;
  const maxDistance = b.length <= 7 ? 1 : Math.max(2, Math.floor(b.length * 0.22));
  return levenshteinDistance(a, b) <= maxDistance;
}

function markTypedAnswer(clip, rawAnswer) {
  const maxMarks = Number(clip.maxMarks) || 1;
  const points = Array.isArray(clip.markPoints) && clip.markPoints.length ? clip.markPoints : null;

  if (!points) {
    const accepted = (Array.isArray(clip.acceptedAnswers) && clip.acceptedAnswers.length)
      ? clip.acceptedAnswers
      : [getField(clip, ["instrument"])];
    const matched = accepted.some(candidate => fuzzyMatchAnswer(rawAnswer, candidate));
    return { awardedMarks: matched ? maxMarks : 0, maxMarks, wasCorrect: matched };
  }

  // Multi-point (e.g. "name two percussion instruments"): split on common
  // list delimiters first so each named item can claim its own point;
  // anything left over is also checked against the whole raw answer.
  const segments = String(rawAnswer || "")
    .split(/,|;|\band\b|\n|\/|\+/i)
    .map(segment => segment.trim())
    .filter(Boolean);
  const remaining = points.slice();
  let awarded = 0;

  segments.forEach(segment => {
    if (awarded >= maxMarks) return;
    const index = remaining.findIndex(point => (point.acceptedAnswers || []).some(candidate => fuzzyMatchAnswer(segment, candidate)));
    if (index !== -1) {
      awarded += 1;
      remaining.splice(index, 1);
    }
  });

  remaining.slice().forEach(point => {
    if (awarded >= maxMarks) return;
    if ((point.acceptedAnswers || []).some(candidate => fuzzyMatchAnswer(rawAnswer, candidate))) {
      awarded += 1;
      const index = remaining.indexOf(point);
      if (index !== -1) remaining.splice(index, 1);
    }
  });

  awarded = Math.min(awarded, maxMarks);
  return { awardedMarks: awarded, maxMarks, wasCorrect: awarded >= maxMarks };
}

function checkTypedAnswer() {
  if (gameOver || !currentClip || hasSubmitted) return;
  const rawAnswer = (iiStudentAnswer && iiStudentAnswer.value || "").trim();
  if (!rawAnswer) {
    feedback.textContent = "Type an answer before submitting.";
    feedback.className = "bad";
    if (iiStudentAnswer) iiStudentAnswer.focus();
    return;
  }

  const result = markTypedAnswer(currentClip, rawAnswer);
  const correctInstrument = getField(currentClip, ["instrument"]);

  hasSubmitted = true;
  questionsAnswered++;
  possibleSoFar += result.maxMarks;

  if (result.wasCorrect) {
    score++;
    awardedSoFar += result.maxMarks;
    streak++;
    xp += 20;
    feedback.textContent = "Correct — well heard.";
    feedback.className = "good";
    triggerConfetti();
  } else if (result.awardedMarks > 0) {
    awardedSoFar += result.awardedMarks;
    streak = 0;
    xp += 10;
    feedback.textContent = `Partly right (${result.awardedMarks}/${result.maxMarks}) — full answer: ${correctInstrument}.`;
    feedback.className = "bad";
  } else {
    streak = 0;
    xp += 5;
    feedback.textContent = `Not quite — it was ${correctInstrument}.`;
    feedback.className = "bad";
  }

  roundHistory.push({
    questionId: getField(currentClip, ["id", "ID", "clipId"]) || `II-Q${questionsAnswered}`,
    selectedInstrument: rawAnswer,
    correctInstrument,
    wasCorrect: result.wasCorrect,
    awardedMarks: result.awardedMarks,
    maxMarks: result.maxMarks,
    family: getField(currentClip, ["family"]),
    type: getField(currentClip, ["type"]),
    difficulty: getField(currentClip, ["difficulty"])
  });

  if (iiStudentAnswer) iiStudentAnswer.disabled = true;

  showAnswerCard(result.wasCorrect);
  window.EAProgressEmbed?.answerComplete({
    questionId: getField(currentClip, ["id", "ID", "clipId"]),
    score: result.awardedMarks,
    maximumScore: result.maxMarks,
    correct: result.wasCorrect,
    responseType: "typed",
    answerData: rawAnswer,
    modelAnswer: correctInstrument,
    feedback: feedback.textContent,
    family: getField(currentClip, ["family"]),
    type: getField(currentClip, ["type"]),
    instrument: getField(currentClip, ["instrument"])
  });
  if (trackInfo) {
    trackInfo.innerHTML = buildTrackInfoHTML(currentClip);
    trackInfo.removeAttribute("aria-hidden");
  }
  updateScore();
  setPlayButtonMode("next");
}

if (iiStudentAnswer) {
  iiStudentAnswer.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      checkTypedAnswer();
    }
  });
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

function removeRoundFeedbackOverlay() {
  if (roundFeedbackOverlay && roundFeedbackOverlay.parentNode) {
    roundFeedbackOverlay.parentNode.removeChild(roundFeedbackOverlay);
  }
  roundFeedbackOverlay = null;
}

function closeRoundFeedbackWindow() {
  removeRoundFeedbackOverlay();
  document.body.classList.remove("ii-round-review-open");
  appShell?.classList.remove("is-round-feedback-open");
  quizPanel?.classList.remove("is-round-feedback-open");
}

function finishRoundFeedbackWindow() {
  closeRoundFeedbackWindow();
  restartGame();
}

function getInstrumentRoundFeedback(percentage) {
  if (percentage >= 85) return "Secure instrument recognition. Increase the difficulty or use accompanied extracts.";
  if (percentage >= 65) return "Good progress. Compare instruments from the same family and listen for register, attack and tone colour.";
  return "Keep practising. Focus on one instrument family at a time and compare contrasting tone colours.";
}

function renderInstrumentRoundQuestionRows() {
  if (!roundHistory.length) return "";

  return roundHistory.map((item, index) => `
    <div class="mm-round-review-row ${item.wasCorrect ? "is-secure" : "is-focus"}">
      <span>Question ${index + 1}</span>
      <strong>${item.wasCorrect ? "1/1" : "0/1"}</strong>
      <small>Your answer: ${escapeHTML(item.selectedInstrument || "—")} · Correct: ${escapeHTML(item.correctInstrument || "—")}</small>
    </div>
  `).join("");
}

function renderInstrumentRoundReviewPanel() {
  const divisor = unlimitedMode ? questionsAnswered : totalQuestions;
  const percentage = divisor > 0 ? Math.round((score / divisor) * 100) : 0;
  const medal = getMedal(percentage);
  const answeredText = `${questionsAnswered}/${divisor} ${divisor === 1 ? "question" : "questions"} answered`;

  return `
    <div class="mm-round-review-panel ii-round-review-panel">
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${escapeHTML(`${score}/${divisor}`)}</strong>
        <small>${escapeHTML(answeredText)} · ${escapeHTML(`${percentage}%`)}</small>
      </div>

      <div class="diagnostic-metrics ii-round-feedback-metrics" aria-label="Round mark breakdown">
        <div class="diagnostic-metric ${score === divisor ? "is-secure" : "is-focus"}">
          <span>Score</span>
          <strong>${escapeHTML(`${score}/${divisor}`)}</strong>
        </div>
        <div class="diagnostic-metric ${percentage >= 85 ? "is-secure" : "is-focus"}">
          <span>Accuracy</span>
          <strong>${escapeHTML(`${percentage}%`)}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile">
        <span>${escapeHTML(medal.title)}</span>
        <strong>${escapeHTML(getInstrumentRoundFeedback(percentage))}</strong>
      </div>

      <div class="mm-round-review-list" aria-label="Question-by-question round results">
        ${renderInstrumentRoundQuestionRows()}
      </div>

      <button id="roundFinishButton" class="primary-button mm-final-finish-button" type="button">Finish Quiz</button>
    </div>
  `;
}

function showRoundFeedbackWindow() {
  closeRoundFeedbackWindow();
  document.body.classList.add("ii-round-review-open");
  appShell?.classList.add("is-round-feedback-open");
  quizPanel?.classList.add("is-round-feedback-open");

  roundFeedbackOverlay = document.createElement("div");
  roundFeedbackOverlay.className = "ii-round-feedback-overlay";
  roundFeedbackOverlay.setAttribute("role", "dialog");
  roundFeedbackOverlay.setAttribute("aria-modal", "true");
  roundFeedbackOverlay.setAttribute("aria-label", "Instrument Identifier round feedback");
  roundFeedbackOverlay.innerHTML = renderInstrumentRoundReviewPanel();
  document.body.appendChild(roundFeedbackOverlay);

  roundFeedbackOverlay.querySelector("#roundFinishButton")?.addEventListener("click", finishRoundFeedbackWindow);
}

function endGame() {
  setQuizVisualState("complete");
  gameOver = true;
  hasSubmitted = true;
  answersDiv.innerHTML = "";
  if (instrumentsCentrePanel) instrumentsCentrePanel.hidden = true;
  setQuestionPrompt("Round complete", 0);
  playButton.style.display = "none";
  playButton.disabled = true;
  setPlayButtonMode("play");
  restartButton.style.display = "inline-flex";
  progressInner.style.width = "100%";
  roundText.textContent = "Round complete";
  updateScore();

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

  window.setTimeout(showRoundFeedbackWindow, 0);

  return roundSave;
}

function getSelectedIiSkill() {
  return document.querySelector('input[name="iiSkill"]:checked')?.value || "instruments";
}

const II_SKILL_HEADING_LABELS = {
  instruments: "Instruments",
  ensembles: "Ensembles"
};

function getIiSkillHeadingLabel(skill = getSelectedIiSkill()) {
  return II_SKILL_HEADING_LABELS[skill] || II_SKILL_HEADING_LABELS.instruments;
}

function syncCentrePanelHeading(skill = getSelectedIiSkill()) {
  const panelTitle = document.querySelector(".panel-section-heading-centre h2 span:not(.panel-heading-accent)");
  if (panelTitle) panelTitle.textContent = skill ? getIiSkillHeadingLabel(skill) : "Learning";
}

const consoleTitleMain = document.getElementById("consoleTitleMain");
const consoleTitleGradient = document.getElementById("consoleTitleGradient");
const DEFAULT_CONSOLE_TITLE_MAIN = consoleTitleMain ? consoleTitleMain.textContent : "";
const DEFAULT_CONSOLE_TITLE_GRADIENT = consoleTitleGradient ? consoleTitleGradient.textContent : "";

/** Big console title text: the suite wordmark until a skill is chosen, then
 *  that skill's short name in the app's own flat accent colour. */
function syncConsoleTitle(skill) {
  if (!consoleTitleMain || !consoleTitleGradient) return;
  if (skill) {
    consoleTitleMain.textContent = "";
    consoleTitleGradient.textContent = getIiSkillHeadingLabel(skill);
    consoleTitleGradient.classList.add("is-skill-active");
  } else {
    consoleTitleMain.textContent = DEFAULT_CONSOLE_TITLE_MAIN;
    consoleTitleGradient.textContent = DEFAULT_CONSOLE_TITLE_GRADIENT;
    consoleTitleGradient.classList.remove("is-skill-active");
  }
}

const CONSOLE_SKILL_ICONS = {
  instruments: "../../assets/icons/modules/ii-transparent/instruments-transparent.png",
  ensembles: "../../assets/icons/modules/ii-transparent/ensembles-transparent.png"
};
const DEFAULT_CONSOLE_ICON = "../../assets/icons/modules/instrument-identifier-home.png?v=1";
const consoleSkillIcon = document.getElementById("consoleSkillIcon");

function syncConsoleSkillIcon() {
  if (!consoleSkillIcon) return;
  const checked = document.querySelector('input[name="iiSkill"]:checked');
  consoleSkillIcon.src = checked ? (CONSOLE_SKILL_ICONS[checked.value] || DEFAULT_CONSOLE_ICON) : DEFAULT_CONSOLE_ICON;
}

/** Start cannot begin until the user has explicitly picked both a skill and a level. */
function updateStartAvailability() {
  if (!startButton) return;
  const hasSkill = !!document.querySelector('input[name="iiSkill"]:checked');
  const hasLevel = !!document.querySelector('input[name="iiLevel"]:checked');
  startButton.disabled = !(hasSkill && hasLevel);
}

function getEnsembleRecognitionLaunchUrl() {
  const level = document.querySelector('input[name="iiLevel"]:checked')?.value || "Foundation";
  const params = new URLSearchParams({
    level,
    autostart: "1"
  });
  return `../ensemble-recognition/index.html?${params.toString()}`;
}

function startGame(options = {}) {
  if (getSelectedIiSkill() === "ensembles") {
    window.location.href = getEnsembleRecognitionLaunchUrl();
    return;
  }

  // Freeze LHS settings from the Start Learning press (before loading delay).
  syncSetupSelectionHighlights();
  setSetupSettingsLocked(true);

  closeRoundFeedbackWindow();
  readSetupOptions();
  buildQuestionDeck();

  if (activeClips.length === 0) {
    setSetupSettingsLocked(false);
    setupMessage.textContent = "No clips match those settings. Try Mixed difficulty.";
    return;
  }

  // Live Session host handed us a specific clip via the contract (see
  // loadQuestionById below) — pin it to the front of the freshly-built deck
  // so the existing getNextClip()/loadQuestion() flow picks it up
  // completely unchanged, rather than the usual random deck draw.
  if (options.forcedClip) {
    questionDeck = questionDeck.filter(clip => clip !== options.forcedClip);
    questionDeck.unshift(options.forcedClip);
  }

  setAdvancedSettingsOpen(false);
  setQuizVisualState("active");

  setupMessage.textContent = "";
  score = 0;
  questionsAnswered = 0;
  streak = 0;
  xp = 0;
  awardedSoFar = 0;
  possibleSoFar = 0;
  hasSubmitted = false;
  roundHistory = [];
  resetInstrumentProgressRound();
  gameOver = false;

  restartButton.style.display = "none";
  startButton.style.display = "none";
  playButton.style.display = "inline-flex";

  setQuestionPrompt("Loading question...", 0);

  loadQuestion();
}

function restartGame() {
  closeRoundFeedbackWindow();
  fadeOutAudio(() => {
    score = 0;
    questionsAnswered = 0;
    streak = 0;
    xp = 0;
    awardedSoFar = 0;
    possibleSoFar = 0;
    hasSubmitted = false;
    roundHistory = [];
    gameOver = false;
    setQuizVisualState("ready");

    renderReadyCard();

    answersDiv.innerHTML = "";
    if (instrumentsCentrePanel) instrumentsCentrePanel.hidden = true;
    if (trackInfo) trackInfo.innerHTML = "";
    feedback.textContent = "";
    feedback.className = "";
    progressInner.style.width = "0%";

    roundText.textContent = "Ready";
    scoreText.textContent = "Mark: 0 / 0";
    streakText.textContent = "Streak: 0";
    xpText.textContent = "XP: 0";
    setQuestionPrompt("", 0);

    startButton.style.display = "block";
    playButton.style.display = "none";
    setPlayButtonMode("play");
    restartButton.style.display = "none";
  });
}

// Live Sessions entry point: a teacher (via the classroom server) has
// picked an exact clip and the host wants this exact question rendered,
// not whatever getNextClip() would have drawn next. Reuses startGame()/
// loadQuestion() completely unchanged — see the forcedClip handling added
// to startGame() above — so this app's real UI, audio and scoring are
// exactly what a student sees in normal practice, just pointed at a
// specific clip instead of a random deck draw. Level/skill/family filters
// are still whatever the host already configured via the same DOM controls
// Progress Mode's own driver uses (see modules/progress-mode/
// app-drivers.js's configure() for this source) — this function only adds
// "load this exact question," nothing about how settings are chosen.
function loadQuestionById(rawId) {
  const id = String(rawId || "").trim();
  if (!id) return false;
  const clip = clipData.find(candidate => String(getField(candidate, ["id", "ID", "clipId"]) || "").trim() === id);
  if (!clip) {
    window.EAProgressEmbed?.poolEmpty({ reason: "unknown-question-id", questionId: id });
    return false;
  }

  if (!contractSessionStarted) {
    contractSessionStarted = true;
    startGame({ forcedClip: clip });
  } else {
    questionDeck = questionDeck.filter(candidate => candidate !== clip);
    questionDeck.unshift(clip);
    loadQuestion();
  }
  return true;
}

window.EAProgressEmbed?.registerQuestionHandler(payload => {
  loadQuestionById(payload && (payload.questionId || payload.id));
});

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

document.querySelectorAll('input[name="iiSkill"], input[name="iiLevel"]').forEach((input) => {
  input.addEventListener("change", () => {
    syncSetupSelectionHighlights();
    updateStartAvailability();
    if (input.name === "iiSkill") {
      syncCentrePanelHeading(getSelectedIiSkill());
      syncConsoleTitle(getSelectedIiSkill());
      syncConsoleSkillIcon();
    }
  });
});

setAdvancedSettingsOpen(false);
setQuizVisualState("ready");
syncSetupSelectionHighlights();
updateStartAvailability();
syncConsoleSkillIcon();
syncCentrePanelHeading(document.querySelector('input[name="iiSkill"]:checked')?.value || null);
syncConsoleTitle(document.querySelector('input[name="iiSkill"]:checked')?.value || null);
