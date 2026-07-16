(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const rawLearningMode = String(params.get("eaMode") || "").trim().toLowerCase();
  const learningMode = rawLearningMode === "progress" ? "progression" : rawLearningMode;
  const dashboardPath = params.get("eaDashboard") || "/account/student-home/";

  document.querySelectorAll(
    ".topbar-home-link, .brand[href], a[aria-label*='EchoAural home']"
  ).forEach(link => {
    if (learningMode === "practice" || learningMode === "progression") {
      link.href = dashboardPath;
    }
  });

  function initialisePracticeTimeTracking() {
    if (!window.EchoAuralTracking?.savePracticeTime) return;

    const startedAt = new Date();
    const startedMs = Date.now();
    const clientSessionId = window.EchoAuralTracking.createClientRoundId("instrument-identifier-practice");
    let saved = false;

    function savePracticeTime() {
      if (saved) return;

      const durationSeconds = Math.round((Date.now() - startedMs) / 1000);
      if (durationSeconds < 5) return;

      saved = true;
      void window.EchoAuralTracking.savePracticeTime({
        moduleId: "instrument-identifier",
        clientSessionId,
        durationSeconds,
        startedAt: startedAt.toISOString()
      }, { keepalive: true });
    }

    window.addEventListener("pagehide", savePracticeTime);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") savePracticeTime();
    });
  }

  if (learningMode === "practice") {
    initialisePracticeTimeTracking();
    return;
  }

  if (learningMode !== "progression") return;

  const MODULE_ID = "instrument-identifier";
  const LEVELS = [
    { id: 0, name: "Foundation", questions: 10, passMark: 70, description: "easy solo instruments and solo clips without difficulty labels" },
    { id: 1, name: "Developing", questions: 10, passMark: 70, description: "harder solo clips and easy accompanied clips" },
    { id: 2, name: "Securing", questions: 10, passMark: 80, description: "medium accompanied clips" },
    { id: 3, name: "Mastering", questions: 10, passMark: 80, description: "hard accompanied clips" }
  ];

  let currentLevel = 0;
  let level = LEVELS[currentLevel];

  const legacyReadSetupOptions = readSetupOptions;
  const legacyClipMatchesMode = clipMatchesMode;
  const legacyClipMatchesDifficulty = clipMatchesDifficulty;
  const legacyClipMatchesFamily = clipMatchesFamily;
  const legacyStartGame = startGame;
  const legacyEndGame = endGame;
  const legacyRestartGame = restartGame;

  let recordedRound = false;
  let accountProgressionState = null;
  const startWasDisabled = Boolean(startButton?.disabled);

  function normalise(value) {
    return String(value || "").trim().toLowerCase();
  }

  function clipValue(clip, names) {
    if (typeof getField === "function") return getField(clip, names);

    for (const name of names) {
      const value = clip?.[name];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function difficultyOf(clip) {
    return normalise(clipValue(clip, ["difficulty", "DIFFICULTY", "Difficulty"]));
  }

  function typeOf(clip) {
    return normalise(clipValue(clip, ["type", "TYPE", "Type"]));
  }

  function instrumentOf(clip) {
    return normalise(clipValue(clip, ["instrument", "INSTRUMENT", "Instrument"]));
  }

  function isSolo(clip) {
    const type = typeOf(clip);
    return (
      type === "solo" ||
      type === "unaccompanied" ||
      type === "solo instrument" ||
      type.includes("solo only")
    );
  }

  function recognisedDifficulty(value) {
    return ["easy", "medium", "hard", "very hard"].includes(value);
  }

  function matchesLevel(clip) {
    const difficulty = difficultyOf(clip);
    const solo = isSolo(clip);
    const hard = difficulty === "hard" || difficulty === "very hard";

    if (currentLevel === 0) {
      return solo && (difficulty === "easy" || !recognisedDifficulty(difficulty));
    }

    if (currentLevel === 1) {
      return (
        (difficulty === "easy" && !solo) ||
        (solo && recognisedDifficulty(difficulty) && difficulty !== "easy")
      );
    }

    if (currentLevel === 2) {
      return difficulty === "medium" && !solo;
    }

    return hard && !solo;
  }

  function allFamilies() {
    const values = new Set();

    clipData.forEach(clip => {
      if (typeof getFamilyBucket === "function") {
        const bucket = getFamilyBucket(clip);
        if (bucket) values.add(normalise(bucket));
      } else {
        const family = clipValue(clip, ["family", "FAMILY", "Family"]);
        if (family) values.add(normalise(family));
      }
    });

    return [...values];
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

  function setProgressionMessage() {
    if (!setupMessage) return;

    setupMessage.textContent =
      `Progression · Level ${currentLevel} — ${level.name}. ` +
      `${level.description}. Complete ${level.questions} questions` +
      ` and score ${level.passMark}% to pass.`;
  }

  function renderProgressionLevelTile() {
    const quizModeInput = document.querySelector('input[name="quizMode"]');
    const quizModeGrid = quizModeInput?.closest(".cardGrid") || document.querySelector(".progression-level-grid");
    if (!quizModeGrid) return;

    const heading = quizModeGrid.previousElementSibling;
    if (heading && /^h[1-6]$/i.test(heading.tagName)) heading.textContent = "Progress Mode";

    quizModeGrid.hidden = false;
    quizModeGrid.removeAttribute("aria-hidden");
    quizModeGrid.classList.add("progression-level-grid");
    quizModeGrid.setAttribute("aria-label", "Current Progress Mode level");
    quizModeGrid.innerHTML = `
      <div class="progression-level-tile" role="status" aria-live="polite">
        <span class="progression-level-kicker">Current level</span>
        <strong>${level.name}</strong>
        <small>${level.description}.</small>
        <span class="progression-level-rule">${level.questions} questions · ${level.passMark}% to pass</span>
      </div>
    `;
  }

  function lockSettings() {
    document.body.classList.add("ea-progression-app");

    document.querySelectorAll(
      'input[name="quizMode"], input[name="difficultyFilter"], ' +
      'input[name="questionCount"], input[name="familyFilter"]'
    ).forEach(input => {
      input.disabled = true;
      input.closest("label")?.setAttribute("aria-disabled", "true");
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

  readSetupOptions = function readProgressionOptions() {
    recordedRound = false;
    setCurrentLevelFromProgress(accountProgressionState);
    legacyReadSetupOptions();
    selectedMode = "all";
    selectedDifficulty = "all";
    selectedFamilies = allFamilies();
    unlimitedMode = false;
    totalQuestions = level.questions;
    setProgressionMessage();
    renderProgressionLevelTile();
  };

  clipMatchesMode = function progressionMode(_clip) {
    return true;
  };

  clipMatchesDifficulty = function progressionDifficulty(clip) {
    return matchesLevel(clip);
  };

  clipMatchesFamily = function progressionFamily(_clip) {
    return true;
  };

  startGame = function startProgressionGame() {
    recordedRound = false;
    legacyStartGame();
  };

  function resultCopy(passed, percentage, nextUnlocked) {
    if (passed && nextUnlocked) {
      return `<strong>${level.name} passed at ${percentage}%.</strong> ` +
        `${LEVELS[currentLevel + 1].name} is now unlocked.`;
    }

    if (passed) {
      return `<strong>${level.name} passed at ${percentage}%.</strong> ` +
        "Replay it to improve your best score.";
    }

    return `<strong>${percentage}% recorded.</strong> ` +
      `Reach ${level.passMark}% to unlock the next level.`;
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
    const maximumScore = Math.max(0, Number(questionsAnswered) || 0);
    const roundScore = Math.max(0, Number(score) || 0);
    const percentage = maximumScore
      ? Math.round((roundScore / maximumScore) * 100)
      : 0;
    const passed = percentage >= level.passMark;

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

    const panel = document.createElement("div");
    panel.className = "diagnostic-feedback-tile";
    panel.setAttribute("data-ea-progression-result", "");
    panel.innerHTML = `
      <p class="eyebrow">PROGRESSION RESULT</p>
      <p>${resultCopy(passed, percentage, nextUnlocked)}</p>
      <p class="muted">
        Level ${currentLevel} · ${level.name}. ${saveResult?.saved === false
          ? "This score was kept on this device, but could not be saved to your account yet."
          : "This score has been saved to your account progress record."}
      </p>
      <a class="primaryButton" href="${dashboardPath}">
        Return to student dashboard
      </a>
    `;

    answerCard?.querySelector("[data-ea-progression-result]")?.remove();
    answerCard?.appendChild(panel);

    if (after > currentLevel) {
      currentLevel = after;
      level = LEVELS[currentLevel] || level;
      setProgressionMessage();
      renderProgressionLevelTile();
    }
  }

  endGame = function endProgressionGame() {
    const roundSave = legacyEndGame();
    void recordRound(roundSave);
  };

  restartGame = function restartProgressionGame() {
    legacyRestartGame();
    window.setTimeout(lockSettings, 0);
  };

  window.EAInstrumentIdentifierProgression = Object.freeze({
    get currentLevel() {
      return currentLevel;
    },
    get level() {
      return level;
    },
    matchesLevel,
    reset() {
      window.EAProgressionStore?.reset?.(MODULE_ID);
    },
    legacy: {
      readSetupOptions: legacyReadSetupOptions,
      clipMatchesMode: legacyClipMatchesMode,
      clipMatchesDifficulty: legacyClipMatchesDifficulty,
      clipMatchesFamily: legacyClipMatchesFamily
    }
  });

  async function initialiseProgressionMode() {
    if (startButton) startButton.disabled = true;

    try {
      await window.EAProgressionStore?.ready?.();
    } catch (_error) {
      // If identity lookup fails, Foundation still works for the current session.
    }

    accountProgressionState = await readAccountProgressionState();
    setCurrentLevelFromProgress(accountProgressionState);
    lockSettings();

    if (startButton) startButton.disabled = startWasDisabled;
  }

  void initialiseProgressionMode();
})();
