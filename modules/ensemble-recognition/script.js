(() => {
  "use strict";

  const Core = window.EnsembleRecognitionCore;
  if (!Core) {
    throw new Error("EnsembleRecognitionCore failed to load.");
  }

  const DATA_URL = "data/ensemble-questions.json";
  const params = new URLSearchParams(window.location.search);

  const quizPanel = document.getElementById("gameScreen");
  const playButton = document.getElementById("playButton");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const questionText = document.getElementById("questionText");
  const questionMarks = document.getElementById("questionMarks");
  const scoreText = document.getElementById("scoreText");
  const streakText = document.getElementById("streakText");
  const xpText = document.getElementById("xpText");
  const roundText = document.getElementById("roundText");
  const progressInner = document.getElementById("progressInner");
  const answerCard = document.getElementById("answerCard");
  const setupMessage = document.getElementById("setupMessage");
  const ensemblePanel = document.getElementById("ensembleOptions");
  const trackInfo = document.getElementById("trackInfo");
  const ensResponseArea = document.getElementById("ensResponseArea");
  const ensStudentAnswer = document.getElementById("ensStudentAnswer");
  const ensSubmitButton = document.getElementById("ensSubmitButton");
  const settingsToggle = document.getElementById("settingsToggle");
  const advancedSettings = document.getElementById("advancedSettings");

  let questionBank = [];
  let pendingHostedQuestion = null;
  let roundDeck = [];
  let questionIndex = 0;
  let currentQuestion = null;
  let audio = null;
  let score = 0;
  let streak = 0;
  let xp = 0;
  let awardedSoFar = 0;
  let possibleSoFar = 0;
  let hasSubmitted = false;
  let playMode = "play";
  let gameOver = false;
  let roundHistory = [];
  let hasPlayedAudio = false;

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncSetupSelectionHighlights() {
    document.querySelectorAll('input[name="ensSkill"], input[name="ensLevel"]').forEach((input) => {
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

    if (locked) {
      syncSetupSelectionHighlights();
    }

    document.querySelectorAll('input[name="ensSkill"], input[name="ensLevel"]').forEach((input) => {
      const label = input.closest("label");
      if (locked) {
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

  function selectedLevel() {
    const fromUrl = params.get("level") || params.get("iiLevel") || "";
    const checked = document.querySelector('input[name="ensLevel"]:checked')?.value || "";
    return checked || fromUrl || "Foundation";
  }

  function selectedQuestionCount() {
    return Number(document.querySelector('input[name="questionCount"]:checked')?.value || 5);
  }

  function mixedDifficultyEnabled() {
    return Boolean(document.querySelector('input[name="mixedDifficulty"]:checked'));
  }

  function applyLevelFromUrl() {
    const level = String(params.get("level") || params.get("iiLevel") || "").trim();
    if (!level) return;
    document.querySelectorAll('input[name="ensLevel"]').forEach((input) => {
      if (input.value === level) input.checked = true;
    });
  }

  function setPlayButtonMode(mode) {
    playMode = mode;
    if (!playButton) return;
    if (mode === "next") {
      const isLast = questionIndex >= roundDeck.length - 1;
      const label = isLast ? "See Feedback" : "Next Question";
      playButton.textContent = label;
      playButton.setAttribute("aria-label", isLast ? "See round feedback" : "Next question");
    } else if (mode === "replay") {
      playButton.textContent = "Replay Clip";
      playButton.setAttribute("aria-label", "Replay clip");
    } else {
      playButton.textContent = "Play Clip";
      playButton.setAttribute("aria-label", "Play clip");
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

    const promptEl = questionText.querySelector(".ens-question-prompt") || questionText;
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

  function updateMarkTile() {
    if (!scoreText) return;
    scoreText.textContent = `Mark: ${awardedSoFar} / ${possibleSoFar}`;
  }

  function updateProgress() {
    const total = roundDeck.length || 1;
    const done = Math.min(questionIndex + (hasSubmitted ? 1 : 0), total);
    if (roundText) {
      roundText.textContent = gameOver
        ? `Round complete · ${score}/${total}`
        : `Question ${Math.min(questionIndex + 1, total)} of ${total}`;
    }
    if (progressInner) {
      progressInner.style.width = `${Math.round((done / total) * 100)}%`;
    }
    if (streakText) streakText.textContent = `Streak: ${streak}`;
    if (xpText) xpText.textContent = `XP: ${xp}`;
  }

  function stopAudio() {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (_error) {
      /* ignore */
    }
  }

  function playCurrentClip() {
    if (!currentQuestion || gameOver) return;
    if (playMode === "next") {
      goNext();
      return;
    }
    stopAudio();
    audio = new Audio(currentQuestion.audio);
    audio.play().catch(() => {
      if (setupMessage) setupMessage.textContent = "Audio could not play. Check the clip file.";
    });
    hasPlayedAudio = true;
    setPlayButtonMode("replay");
  }

  function buildTrackInfoHTML(question) {
    const title = [question.composer, question.work]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" – ");
    const movement = String(question.movement || "").trim() || "—";
    const sourceValue = String(question.sourceProvider || "").trim();
    const source = /musopen/i.test(sourceValue) ? "Musopen" : (/wikimedia|commons/i.test(sourceValue) ? "Wikimedia" : sourceValue);
    const licenceValue = String(question.licenceType || "").trim();
    const licenceMatch = licenceValue.match(/\b(?:PDM|CC0|CC BY(?:-NC)?(?:-SA)?|CC BY-SA)\s*\d(?:\.\d)?\b/i);
    const licence = licenceMatch ? licenceMatch[0].toUpperCase() : (/public domain|\bPD\b/i.test(licenceValue) ? "Public domain" : licenceValue);
    const details = [source, licence].filter(Boolean).join(" · ") || "—";
    return `
      <strong title="${escapeHTML(title)}">${escapeHTML(title || question.id)}</strong>
      <span class="score-track-info-movement" title="${escapeHTML(movement)}">${escapeHTML(movement)}</span>
      <small title="${escapeHTML(details)}">${escapeHTML(details)}</small>
    `;
  }

  function renderOptions(question) {
    if (!ensemblePanel) return;
    const optionsRoot = ensemblePanel.querySelector(".ensemble-options");
    if (!optionsRoot) return;

    const choices = question.choices.slice(0, Core.MAX_CHOICES);
    optionsRoot.setAttribute("data-answer-count", String(choices.length));
    optionsRoot.innerHTML = choices.map((choice) => `
      <button class="ensemble-option" type="button" data-choice="${escapeHTML(choice)}" role="radio" aria-checked="false">
        <span>${escapeHTML(choice)}</span>
      </button>
    `).join("");

    optionsRoot.querySelectorAll(".ensemble-option").forEach((button) => {
      button.addEventListener("click", () => submitAnswer(button.dataset.choice || ""));
    });

    if (trackInfo) {
      trackInfo.innerHTML = "";
      trackInfo.setAttribute("aria-hidden", "true");
    }
    ensemblePanel.hidden = false;
  }

  function renderAnswerIntro(question) {
    if (!answerCard) return;
    answerCard.innerHTML = `
      <div class="answerCard-empty ii-source-panel ensemble-feedback-panel">
        <div class="diagnostic-feedback-tile">
          <span>Feedback</span>
          <strong>Listen to the excerpt, then choose the ensemble you hear.</strong>
        </div>
        <div class="diagnostic-feedback-tile">
          <span>Answer options</span>
          <strong>${escapeHTML(question.choices.join(" · "))}</strong>
        </div>
      </div>
    `;
  }

  function renderAnswerSubmitted(result, question) {
    if (!answerCard) return;
    const panelClass = result.isCorrect ? "is-correct" : "is-wrong";
    answerCard.innerHTML = `
      <div class="answer-reveal ii-source-panel ${panelClass} ensemble-feedback-panel">
        <div class="ensemble-mark-metrics" aria-label="Ensemble mark breakdown">
          <div class="diagnostic-metric ${result.isCorrect ? "is-secure" : "is-focus"}">
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
        <div class="diagnostic-feedback-tile">
          <span>Feedback</span>
          <strong>${escapeHTML(question.feedback || result.shortComment)}</strong>
        </div>
      </div>
    `;
  }

  function renderRoundComplete() {
    if (!answerCard) return;
    const total = roundDeck.length;
    const percent = total ? Math.round((score / total) * 100) : 0;
    answerCard.innerHTML = `
      <div class="answer-reveal ii-source-panel is-correct ensemble-feedback-panel">
        <div class="diagnostic-feedback-tile">
          <span>Round complete</span>
          <strong>${escapeHTML(`${score}/${total} · ${percent}%`)}</strong>
        </div>
        <div class="ensemble-round-summary">
          ${roundHistory.map((item, index) => `
            <div class="diagnostic-feedback-tile">
              <span>Q${index + 1} · ${escapeHTML(item.correctAnswer)}</span>
              <strong>${item.isCorrect ? "Secure" : `You chose ${escapeHTML(item.selectedAnswer)}`}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function submitAnswer(choice) {
    if (!currentQuestion || hasSubmitted || gameOver) return;

    const result = Core.markAnswer(choice, currentQuestion);
    hasSubmitted = true;
    roundHistory[questionIndex] = result;
    awardedSoFar += result.awardedMarks;
    possibleSoFar += result.maxMarks;

    if (result.isCorrect) {
      score += 1;
      streak += 1;
      xp += 10 + Math.min(streak, 5);
    } else {
      streak = 0;
    }

    document.querySelectorAll(".ensemble-option").forEach((button) => {
      const buttonChoice = button.dataset.choice || "";
      const isSelected = Core.cleanText(buttonChoice) === Core.cleanText(choice);
      const isCorrect = Core.cleanText(buttonChoice) === Core.cleanText(currentQuestion.correctAnswer);
      button.disabled = true;
      button.classList.toggle("correct", isCorrect);
      button.classList.toggle("wrong", isSelected && !result.isCorrect);
      button.setAttribute("aria-checked", isSelected ? "true" : "false");
    });

    updateMarkTile();
    updateProgress();
    renderAnswerSubmitted(result, currentQuestion);
    window.EAProgressEmbed?.answerComplete({
      questionId: currentQuestion.id,
      score: result.awardedMarks,
      maximumScore: result.maxMarks,
      correct: result.isCorrect,
      responseType: "multiple-choice",
      answerData: choice,
      modelAnswer: currentQuestion.correctAnswer,
      feedback: result.shortComment || ""
    });
    if (trackInfo) {
      trackInfo.innerHTML = buildTrackInfoHTML(currentQuestion);
      trackInfo.removeAttribute("aria-hidden");
    }
    setPlayButtonMode("next");
  }

  // ---------- Typed-answer support (additive) ----------
  // Only used by questions with responseType:"typed" (none of the original
  // 50). submitAnswer() above is untouched; this is a self-contained
  // parallel path ending in the same shared state.

  function renderTypedAnswerIntro(question) {
    if (!answerCard) return;
    answerCard.innerHTML = `
      <div class="answerCard-empty ii-source-panel ensemble-feedback-panel">
        <div class="diagnostic-feedback-tile">
          <span>Feedback</span>
          <strong>Listen to the excerpt, then type your answer.</strong>
        </div>
      </div>
    `;
  }

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

  function markTypedAnswer(question, rawAnswer) {
    const maxMarks = Number(question.maxMarks) || 1;
    const points = Array.isArray(question.markPoints) ? question.markPoints : [];
    const segments = String(rawAnswer || "")
      .split(/,|;|\band\b|\n|\/|\+/i)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const remaining = points.slice();
    let awarded = 0;

    segments.forEach((segment) => {
      if (awarded >= maxMarks) return;
      const index = remaining.findIndex((point) => (point.acceptedAnswers || []).some((candidate) => fuzzyMatchAnswer(segment, candidate)));
      if (index !== -1) {
        awarded += 1;
        remaining.splice(index, 1);
      }
    });

    remaining.slice().forEach((point) => {
      if (awarded >= maxMarks) return;
      if ((point.acceptedAnswers || []).some((candidate) => fuzzyMatchAnswer(rawAnswer, candidate))) {
        awarded += 1;
        const index = remaining.indexOf(point);
        if (index !== -1) remaining.splice(index, 1);
      }
    });

    awarded = Math.min(awarded, maxMarks);
    return { awardedMarks: awarded, maxMarks, isCorrect: awarded >= maxMarks };
  }

  function checkTypedEnsembleAnswer() {
    if (!currentQuestion || hasSubmitted || gameOver) return;
    const rawAnswer = (ensStudentAnswer && ensStudentAnswer.value || "").trim();
    if (!rawAnswer) {
      if (ensStudentAnswer) ensStudentAnswer.focus();
      return;
    }

    const markResult = markTypedAnswer(currentQuestion, rawAnswer);
    const result = {
      selectedAnswer: rawAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: markResult.isCorrect,
      awardedMarks: markResult.awardedMarks,
      maxMarks: markResult.maxMarks,
      shortComment: markResult.isCorrect
        ? "Secure ensemble recognition."
        : (currentQuestion.feedback || "Review the performing forces in the excerpt.")
    };

    hasSubmitted = true;
    roundHistory[questionIndex] = result;
    awardedSoFar += result.awardedMarks;
    possibleSoFar += result.maxMarks;

    if (result.isCorrect) {
      score += 1;
      streak += 1;
      xp += 10 + Math.min(streak, 5);
    } else {
      streak = 0;
    }

    if (ensStudentAnswer) ensStudentAnswer.disabled = true;
    if (ensSubmitButton) ensSubmitButton.disabled = true;

    updateMarkTile();
    updateProgress();
    renderAnswerSubmitted(result, currentQuestion);
    window.EAProgressEmbed?.answerComplete({
      questionId: currentQuestion.id,
      score: result.awardedMarks,
      maximumScore: result.maxMarks,
      correct: result.isCorrect,
      responseType: "typed",
      answerData: rawAnswer,
      modelAnswer: currentQuestion.correctAnswer,
      feedback: result.shortComment || ""
    });
    if (trackInfo) {
      trackInfo.innerHTML = buildTrackInfoHTML(currentQuestion);
      trackInfo.removeAttribute("aria-hidden");
    }
    setPlayButtonMode("next");
  }

  if (ensSubmitButton) ensSubmitButton.addEventListener("click", checkTypedEnsembleAnswer);
  if (ensStudentAnswer) {
    ensStudentAnswer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        checkTypedEnsembleAnswer();
      }
    });
  }

  function loadQuestion() {
    currentQuestion = roundDeck[questionIndex] || null;
    if (!currentQuestion) {
      endRound();
      return;
    }

    hasSubmitted = false;
    window.EAProgressEmbed?.questionReady({ id: currentQuestion.id, level: currentQuestion.level });
    hasPlayedAudio = false;
    stopAudio();
    setQuestionPrompt(currentQuestion.question, currentQuestion.marks);
    if (currentQuestion.responseType === "typed") {
      if (ensemblePanel) ensemblePanel.hidden = true;
      if (ensResponseArea) {
        ensResponseArea.hidden = false;
        if (ensStudentAnswer) { ensStudentAnswer.value = ""; ensStudentAnswer.disabled = false; }
        if (ensSubmitButton) ensSubmitButton.disabled = false;
      }
      renderTypedAnswerIntro(currentQuestion);
    } else {
      if (ensResponseArea) ensResponseArea.hidden = true;
      renderOptions(currentQuestion);
      renderAnswerIntro(currentQuestion);
    }
    updateMarkTile();
    updateProgress();
    setPlayButtonMode("play");
    playButton.style.display = "inline-flex";
    restartButton.style.display = "none";

    // Auto-play first listening like Devices
    window.setTimeout(() => {
      if (!hasPlayedAudio && currentQuestion && !hasSubmitted) {
        playCurrentClip();
      }
    }, 180);
  }

  function goNext() {
    if (questionIndex >= roundDeck.length - 1) {
      endRound();
      return;
    }
    questionIndex += 1;
    loadQuestion();
  }

  function endRound() {
    gameOver = true;
    stopAudio();
    setQuizVisualState("complete");
    if (ensemblePanel) ensemblePanel.hidden = true;
    setQuestionPrompt("Round complete", 0);
    updateProgress();
    renderRoundComplete();
    setPlayButtonMode("play");
    playButton.style.display = "none";
    restartButton.style.display = "inline-flex";
    startButton.style.display = "none";
  }

  // True once a Live Session host has loaded its first question through the
  // contract (see loadQuestionById below) — distinguishes "boot the round"
  // from "load another question into an already-running round."
  let contractSessionStarted = false;

  function startRound(options = {}) {
    syncSetupSelectionHighlights();
    setSetupSettingsLocked(true);

    const mixed = mixedDifficultyEnabled();
    const level = selectedLevel();
    const pool = mixed ? [...questionBank] : Core.filterByLevel(questionBank, level);
    const count = selectedQuestionCount();

    if (!pool.length) {
      setSetupSettingsLocked(false);
      if (setupMessage) setupMessage.textContent = "No ensemble questions available for that level.";
      return;
    }

    const spacedKey = `ensemble:${mixed ? "mixed" : level}`;
    const SR = window.EchoAuralSpacedRepetition;
    let seenIds = SR ? new Set(SR.getSeenIds(spacedKey)) : null;
    if (SR && pool.length && pool.every((question) => seenIds.has(question.id))) {
      SR.resetCycle(spacedKey);
      seenIds = new Set();
    }
    // Pull the full seen-ordered pool (not pre-sliced) so a same-answer
    // dedup pass can pick around duplicates before trimming to `count`,
    // rather than getting stuck with whatever pickRound's first slice had.
    let orderedPool = Core.pickRound(pool, pool.length, Math.random, { seenIds });
    if (SR?.dedupeByAnswer) {
      orderedPool = SR.dedupeByAnswer(orderedPool, count, (question) => Core.cleanText(question.correctAnswer || question.ensembleLabel || ""));
    }
    roundDeck = orderedPool.slice(0, Math.max(1, Math.min(Number(count) || 5, orderedPool.length)));
    // Live Session host handed us a specific question via the contract
    // (see loadQuestionById below) — pin it to the front so the existing
    // loadQuestion()/goNext() flow picks it up completely unchanged.
    if (options.forcedQuestion) {
      roundDeck = roundDeck.filter((question) => question !== options.forcedQuestion);
      roundDeck.unshift(options.forcedQuestion);
    }
    SR?.markShown(roundDeck, { key: spacedKey, idOf: (question) => question.id });
    questionIndex = 0;
    score = 0;
    streak = 0;
    xp = 0;
    awardedSoFar = 0;
    possibleSoFar = 0;
    roundHistory = [];
    gameOver = false;

    setAdvancedSettingsOpen(false);
    setQuizVisualState("active");
    startButton.style.display = "none";
    if (setupMessage) setupMessage.textContent = "";
    loadQuestion();
  }

  // Live Sessions entry point: a teacher (via the classroom server) has
  // picked an exact question and the host wants this exact question
  // rendered, not whatever startRound()'s spaced-repetition draw would have
  // picked next. Reuses startRound()/loadQuestion() completely unchanged
  // (see the forcedQuestion handling above), so this app's real UI, audio
  // and scoring are exactly what a student sees in normal practice, just
  // pointed at a specific question instead of a random round draw.
  function loadQuestionById(rawId) {
    const id = String(rawId || "").trim();
    if (!id) return false;
    const target = questionBank.find((question) => question.id === id);
    if (!target) {
      window.EAProgressEmbed?.poolEmpty({ reason: "unknown-question-id", questionId: id });
      return false;
    }

    if (!contractSessionStarted) {
      contractSessionStarted = true;
      startRound({ forcedQuestion: target });
    } else {
      roundDeck = roundDeck.filter((question) => question !== target);
      roundDeck.unshift(target);
      questionIndex = 0;
      loadQuestion();
    }
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler((payload) => {
    // The ensemble bank is fetched during boot. Queue host selection until
    // it is ready instead of turning a valid ID into a false pool-empty state.
    if (!questionBank.length) {
      pendingHostedQuestion = payload || {};
      return true;
    }
    return loadQuestionById(payload && (payload.questionId || payload.id));
  });

  function restartRound() {
    stopAudio();
    setQuizVisualState("ready");
    gameOver = false;
    currentQuestion = null;
    if (ensemblePanel) ensemblePanel.hidden = true;
    if (trackInfo) trackInfo.innerHTML = "";
    setQuestionPrompt("", 0);
    roundText.textContent = "Ready";
    progressInner.style.width = "0%";
    scoreText.textContent = "Mark: 0 / 0";
    streakText.textContent = "Streak: 0";
    xpText.textContent = "XP: 0";
    playButton.style.display = "none";
    restartButton.style.display = "none";
    startButton.style.display = "block";
    renderReadyCard();
  }

  function renderReadyCard() {
    if (!answerCard) return;
    answerCard.innerHTML = `
      <div class="answerCard-empty ii-source-panel">
        <div class="answer-empty-stage" aria-hidden="true">
          <div class="answer-empty-orbit">
            <span class="answer-empty-icon">
              <img src="../../assets/icons/modes/mm-transparent/answers-transparent.png?v=3" alt="" />
            </span>
          </div>
        </div>
        <div class="answer-empty-copy">
          <h2>Your answers will appear here</h2>
          <p>Listen to each excerpt and choose the ensemble you hear.</p>
        </div>
      </div>
    `;
  }

  function setAdvancedSettingsOpen(isOpen) {
    if (!advancedSettings || !settingsToggle) return;
    advancedSettings.style.display = isOpen ? "block" : "none";
    advancedSettings.classList.toggle("is-open", isOpen);
    advancedSettings.setAttribute("aria-hidden", String(!isOpen));
    settingsToggle.setAttribute("aria-expanded", String(isOpen));
  }

  const CONSOLE_SKILL_ICONS = {
    instruments: "../../assets/icons/modules/instruments.png",
    ensembles: "../../assets/icons/modules/ensembles.png"
  };
  const DEFAULT_CONSOLE_ICON = "../../assets/icons/modules/instrument-identifier.png?v=8";
  const consoleSkillIcon = document.getElementById("consoleSkillIcon");

  function syncConsoleSkillIcon() {
    if (!consoleSkillIcon) return;
    const checked = document.querySelector('input[name="ensSkill"]:checked');
    consoleSkillIcon.src = checked ? (CONSOLE_SKILL_ICONS[checked.value] || DEFAULT_CONSOLE_ICON) : DEFAULT_CONSOLE_ICON;
  }

  /** Start cannot begin until the user has explicitly picked both a skill and a level. */
  function updateStartAvailability() {
    if (!startButton) return;
    const hasSkill = !!document.querySelector('input[name="ensSkill"]:checked');
    const hasLevel = !!document.querySelector('input[name="ensLevel"]:checked');
    startButton.disabled = !(hasSkill && hasLevel);
  }

  /** Centre-panel heading: "Learning" until a skill is chosen, then that
   *  skill's short name (matching its own skill-button label). */
  const SKILL_HEADING_LABELS = { ensembles: "Ensembles" };
  const centreHeadingLabel = document.getElementById("centreHeadingLabel");
  function updateCentreHeading() {
    if (!centreHeadingLabel) return;
    const checked = document.querySelector('input[name="ensSkill"]:checked');
    centreHeadingLabel.textContent = checked ? (SKILL_HEADING_LABELS[checked.value] || "Learning") : "Learning";
  }

  /** Big console title text: the suite wordmark until a skill is chosen,
   *  then that skill's short name in the app's own flat accent colour. */
  const consoleTitleMain = document.getElementById("consoleTitleMain");
  const consoleTitleGradient = document.getElementById("consoleTitleGradient");
  const DEFAULT_CONSOLE_TITLE_MAIN = consoleTitleMain ? consoleTitleMain.textContent : "";
  const DEFAULT_CONSOLE_TITLE_GRADIENT = consoleTitleGradient ? consoleTitleGradient.textContent : "";
  function updateConsoleTitle() {
    if (!consoleTitleMain || !consoleTitleGradient) return;
    const checked = document.querySelector('input[name="ensSkill"]:checked');
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

  async function init() {
    applyLevelFromUrl();
    setQuizVisualState("ready");
    syncSetupSelectionHighlights();
    updateStartAvailability();
    syncConsoleSkillIcon();
    updateCentreHeading();
    updateConsoleTitle();
    document.querySelectorAll('input[name="ensLevel"]').forEach((input) => {
      input.addEventListener("change", () => {
        syncSetupSelectionHighlights();
        updateStartAvailability();
      });
    });
    document.querySelectorAll('input[name="ensSkill"]').forEach((input) => {
      input.addEventListener("change", () => {
        // Locked mid-round: inputs are disabled/inert — no-op if a change slips through.
        const setupPanel = document.getElementById("homeScreen");
        if (setupPanel?.classList.contains("is-settings-locked")) {
          const ensemblesInput = document.querySelector('input[name="ensSkill"][value="ensembles"]');
          if (ensemblesInput) ensemblesInput.checked = true;
          syncSetupSelectionHighlights();
          return;
        }
        if (input.value === "instruments" && input.checked) {
          window.location.href = "../instrument-identifier/index.html";
          return;
        }
        syncSetupSelectionHighlights();
        updateStartAvailability();
        syncConsoleSkillIcon();
        updateCentreHeading();
        updateConsoleTitle();
      });
    });
    renderReadyCard();
    setAdvancedSettingsOpen(false);

    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const pack = await response.json();
      questionBank = Array.isArray(pack.questions) ? pack.questions.filter(Core.validateQuestion) : [];
      if (!questionBank.length) throw new Error("No valid questions in pack.");
      if (setupMessage) setupMessage.textContent = `${questionBank.length} ensemble clips ready.`;
      if (pendingHostedQuestion) {
        const request = pendingHostedQuestion;
        pendingHostedQuestion = null;
        loadQuestionById(request.questionId || request.id);
      }
    } catch (error) {
      if (setupMessage) setupMessage.textContent = `Could not load ensemble questions: ${error.message}`;
      startButton.disabled = true;
      return;
    }

    startButton.addEventListener("click", startRound);
    playButton.addEventListener("click", playCurrentClip);
    restartButton.addEventListener("click", restartRound);

    settingsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
      setAdvancedSettingsOpen(!isOpen);
    });

    advancedSettings.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("click", (event) => {
      const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
      if (isOpen && !advancedSettings.contains(event.target) && !settingsToggle.contains(event.target)) {
        setAdvancedSettingsOpen(false);
      }
    });

    if (params.get("autostart") === "1") {
      startRound();
    }
  }

  init();
})();
