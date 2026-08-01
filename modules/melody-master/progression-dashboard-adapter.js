(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const rawLearningMode = String(params.get("eaMode") || "").trim().toLowerCase();
  const learningMode = rawLearningMode === "progress" ? "progression" : rawLearningMode;
  const dashboardPath = params.get("eaDashboard") || "/account/student-home/";

  document.querySelectorAll(
    ".topbar-home-link, .brand[href], a[aria-label*='EchoAural home']"
  ).forEach(link => {
    if (learningMode === "progression") link.href = dashboardPath;
  });

  if (learningMode !== "progression") return;

  const MODULE_ID = "melody-master";
  const LEVELS = [
    { id: 0, name: "Foundation", questions: 5, passMark: 100, description: "2–3 missing notes using steps or repeated notes" },
    { id: 1, name: "Developing", questions: 5, passMark: 100, description: "4–5 missing notes with movement up to a third" },
    { id: 2, name: "Securing", questions: 5, passMark: 100, description: "4–5 missing notes with movement up to a fourth" },
    { id: 3, name: "Mastering", questions: 5, passMark: 100, description: "fuller dictation questions with wider melodic movement" }
  ];

  let currentLevel = 0;
  let level = LEVELS[currentLevel];
  let accountProgressionState = null;
  let recordedRound = false;
  const startWasDisabled = Boolean(startButton?.disabled);

  const legacyGetQuizSettingsFromControls = getQuizSettingsFromControls;
  const legacyBuildRoundQuestionIndices = buildRoundQuestionIndices;
  const legacyShowRoundFeedbackWindow = showRoundFeedbackWindow;

  function safeHTML(value) {
    if (typeof escapeHTML === "function") return escapeHTML(value);
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function readAccountProgressionState() {
    try {
      const response = await fetch(`/api/student/progression-state?moduleId=${encodeURIComponent(MODULE_ID)}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.ok === false ? null : data;
    } catch (_error) {
      return null;
    }
  }

  function setCurrentLevelFromProgress(accountState = null) {
    const saved = window.EAProgressionStore?.getModule?.(MODULE_ID) || { unlockedLevel: 0 };
    const localUnlockedLevel = Math.max(0, Math.min(LEVELS.length - 1, Number(saved.unlockedLevel) || 0));
    const accountUnlockedLevel = Math.max(0, Math.min(LEVELS.length - 1, Number(accountState?.unlockedLevel) || 0));
    const unlockedLevel = Math.max(localUnlockedLevel, accountUnlockedLevel);
    const requestedLevel = params.has("eaLevel")
      ? Math.max(0, Math.min(LEVELS.length - 1, Number(params.get("eaLevel")) || 0))
      : unlockedLevel;
    currentLevel = Math.min(requestedLevel, unlockedLevel);
    level = LEVELS[currentLevel] || LEVELS[0];
  }

  function clipMatchesLevel(clip) {
    return String(clip?.level || clip?.hiddenMetadata?.level || "").trim().toLowerCase() === level.name.toLowerCase();
  }

  function levelQuestionIndexes() {
    return ALL_MELODY_CLIPS
      .map((clip, index) => (clipMatchesLevel(clip) ? index : -1))
      .filter(index => index >= 0);
  }

  function setProgressionMessage() {
    if (!setupMessage) return;

    setupMessage.textContent =
      `Progression · Level ${currentLevel} — ${level.name}. ` +
      `${level.description}. Complete ${level.questions} questions and get every answer correct to progress.`;
  }

  function renderProgressionLevelTile() {
    const modeGrid = document.querySelector(".melody-mode-grid") || document.querySelector(".progression-level-grid");
    if (!modeGrid) return;

    const heading = modeGrid.previousElementSibling;
    if (heading && /^h[1-6]$/i.test(heading.tagName)) heading.textContent = "Progress Mode";

    modeGrid.hidden = false;
    modeGrid.removeAttribute("aria-hidden");
    modeGrid.classList.add("progression-level-grid");
    modeGrid.setAttribute("aria-label", "Current Progress Mode level");
    modeGrid.innerHTML = `
      <div class="progression-level-tile" role="status" aria-live="polite">
        <span class="progression-level-kicker">Current level</span>
        <strong>${safeHTML(level.name)}</strong>
        <small>${safeHTML(level.description)}.</small>
        <span class="progression-level-rule">${level.questions} questions · all correct to pass</span>
      </div>
    `;
  }

  function lockSettings() {
    document.body.classList.add("ea-progression-app");

    document.querySelectorAll(
      'input[name="quizMode"], input[name="questionCount"], input[name="mmMixedDifficulty"], input[name="mmLevel"]'
    ).forEach(input => {
      input.disabled = true;
      input.closest("label")?.setAttribute("aria-disabled", "true");
    });

    document.querySelectorAll(".melody-skill-heading, .melody-skill-grid, .interval-mode-grid").forEach(element => {
      element.hidden = true;
      element.setAttribute("aria-hidden", "true");
    });

    if (settingsToggle) {
      settingsToggle.disabled = true;
      settingsToggle.setAttribute("aria-disabled", "true");
    }

    const settingsWrap = advancedSettings?.closest(".settings-popover-wrap");
    if (settingsWrap) {
      settingsWrap.hidden = true;
      settingsWrap.setAttribute("aria-hidden", "true");
    }

    setProgressionMessage();
    renderProgressionLevelTile();
  }

  function resultCopy(passed, percentage, nextUnlocked) {
    if (passed && nextUnlocked) {
      return `<strong>${safeHTML(level.name)} passed at ${percentage}%.</strong> ${safeHTML(LEVELS[currentLevel + 1].name)} is now unlocked.`;
    }

    if (passed) {
      return `<strong>${safeHTML(level.name)} passed at ${percentage}%.</strong> Replay it to keep your dictation sharp.`;
    }

    return `<strong>${percentage}% recorded.</strong> You need every answer correct to unlock the next level.`;
  }

  function insertProgressionResultPanel({ passed, percentage, nextUnlocked, saveResult }) {
    const host = roundFeedbackOverlay?.querySelector(".mm-round-review-panel") || answerCard;
    if (!host) return;

    host.querySelector("[data-ea-progression-result]")?.remove();

    const panel = document.createElement("div");
    panel.className = "diagnostic-card diagnostic-feedback-tile";
    panel.setAttribute("data-ea-progression-result", "");
    panel.innerHTML = `
      <span>Progression result</span>
      <strong>${resultCopy(passed, percentage, nextUnlocked)}</strong>
      <small>
        Level ${currentLevel} · ${safeHTML(level.name)}. ${saveResult?.saved === false
          ? "This score was kept on this device, but could not be saved to your account yet."
          : "This score has been saved to your account progress record."}
      </small>
      <a class="primary-button" href="${safeHTML(dashboardPath)}">Return to student dashboard</a>
    `;

    const finishButton = host.querySelector("#roundFinishButton");
    if (finishButton) host.insertBefore(panel, finishButton);
    else host.appendChild(panel);
  }

  async function recordRound(roundSave) {
    if (recordedRound) return;
    recordedRound = true;

    let saveResult = null;
    try {
      saveResult = await Promise.resolve(roundSave);
    } catch (_error) {
      saveResult = { saved: false, reason: "account-save-failed" };
    }

    const summary = getRoundScoreSummary();
    const maximumScore = Math.max(0, Number(summary.totalPossible) || 0);
    const roundScore = Math.max(0, Number(summary.awarded) || 0);
    const percentage = maximumScore ? Math.round((roundScore / maximumScore) * 100) : 0;
    const passed = percentage >= level.passMark && summary.attempted >= level.questions;
    const before = Math.max(
      0,
      Math.min(LEVELS.length - 1, Number(window.EAProgressionStore?.getModule?.(MODULE_ID)?.unlockedLevel) || 0)
    );

    const result = await window.EAProgressionStore?.recordAttempt?.({
      moduleId: MODULE_ID,
      level: currentLevel,
      score: roundScore,
      maximumScore,
      percentage,
      passMark: level.passMark,
      passed
    });

    const after = Math.max(0, Math.min(LEVELS.length - 1, Number(result?.moduleState?.unlockedLevel) || before));
    const nextUnlocked = after > before && currentLevel < LEVELS.length - 1;

    insertProgressionResultPanel({ passed, percentage, nextUnlocked, saveResult });

    if (after > currentLevel) {
      currentLevel = after;
      level = LEVELS[currentLevel] || level;
      setProgressionMessage();
      renderProgressionLevelTile();
    }
  }

  getQuizSettingsFromControls = function readProgressionQuizSettings() {
    return {
      ...legacyGetQuizSettingsFromControls(),
      questionCount: level.questions,
      playLimit: DEFAULT_QUIZ_SETTINGS.playLimit
    };
  };

  buildRoundQuestionIndices = function buildProgressionQuestionIndices(questionCount = level.questions) {
    setCurrentLevelFromProgress(accountProgressionState);
    const indexes = levelQuestionIndexes();
    const count = Math.max(1, Math.min(Number(questionCount) || level.questions, indexes.length));
    return shuffleArray(indexes).slice(0, count);
  };

  showRoundFeedbackWindow = function showProgressionRoundFeedbackWindow() {
    legacyShowRoundFeedbackWindow();
    void recordRound(eaLastRoundSave);
  };

  finishRound = function finishProgressionRound() {
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

    window.location.href = dashboardPath;
  };

  window.EAMelodyMasterProgression = Object.freeze({
    isActive: true,
    get currentLevel() {
      return currentLevel;
    },
    get level() {
      return level;
    },
    matchesLevel: clipMatchesLevel,
    reset() {
      window.EAProgressionStore?.reset?.(MODULE_ID);
    },
    legacy: {
      getQuizSettingsFromControls: legacyGetQuizSettingsFromControls,
      buildRoundQuestionIndices: legacyBuildRoundQuestionIndices
    }
  });

  async function initialiseProgressionMode() {
    if (startButton) startButton.disabled = true;

    try {
      await window.EAProgressionStore?.ready?.();
    } catch (_error) {}

    accountProgressionState = await readAccountProgressionState();
    setCurrentLevelFromProgress(accountProgressionState);
    lockSettings();

    if (startButton) startButton.disabled = startWasDisabled;
  }

  void initialiseProgressionMode();
})();
