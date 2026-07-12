(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const learningMode = params.get("eaMode");
  const dashboardPath = params.get("eaDashboard") || "/student/dashboard.html";

  document.querySelectorAll(
    ".topbar-home-link, .brand[href], a[aria-label*='EchoAural home']"
  ).forEach(link => {
    if (learningMode === "practice" || learningMode === "progression") {
      link.href = dashboardPath;
    }
  });

  // Practice deliberately does nothing else. The existing app remains unchanged.
  if (learningMode !== "progression") return;

  const MODULE_ID = "instrument-identifier";
  const LEVELS = [
    { id: 0, name: "Introduction", questions: 5, passMark: 0, description: "clear, familiar solo instruments" },
    { id: 1, name: "Foundation", questions: 10, passMark: 70, description: "easy solo instruments" },
    { id: 2, name: "Developing", questions: 10, passMark: 70, description: "easy accompanied and medium solo instruments" },
    { id: 3, name: "Secure", questions: 10, passMark: 80, description: "medium accompanied and hard solo instruments" },
    { id: 4, name: "Exam", questions: 10, passMark: 80, description: "hard accompanied and very hard extracts" }
  ];

  const familiarLevelZero = new Set([
    "violin", "viola", "cello", "double bass",
    "flute", "oboe", "clarinet", "bassoon",
    "trumpet", "french horn", "horn", "trombone", "tuba",
    "piano", "acoustic guitar", "classical guitar", "electric guitar",
    "timpani", "snare drum", "side drum", "xylophone"
  ]);

  const requestedLevel = Math.max(0, Math.min(4, Number(params.get("eaLevel")) || 0));
  const saved = window.EAProgressionStore?.getModule?.(MODULE_ID) || { unlockedLevel: 0 };
  const currentLevel = Math.min(
    requestedLevel,
    Math.max(0, Number(saved.unlockedLevel) || 0)
  );
  const level = LEVELS[currentLevel];

  const legacyReadSetupOptions = readSetupOptions;
  const legacyClipMatchesMode = clipMatchesMode;
  const legacyClipMatchesDifficulty = clipMatchesDifficulty;
  const legacyClipMatchesFamily = clipMatchesFamily;
  const legacyStartGame = startGame;
  const legacyEndGame = endGame;
  const legacyRestartGame = restartGame;

  let recordedRound = false;

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

    if (currentLevel === 0) {
      return familiarLevelZero.has(instrumentOf(clip)) &&
        solo &&
        (difficulty === "easy" || !recognisedDifficulty(difficulty));
    }

    if (currentLevel === 1) {
      return solo && (difficulty === "easy" || !recognisedDifficulty(difficulty));
    }

    if (currentLevel === 2) {
      return (
        (difficulty === "easy" && !solo) ||
        (difficulty === "medium" && solo)
      );
    }

    if (currentLevel === 3) {
      return (
        (difficulty === "medium" && !solo) ||
        (difficulty === "hard" && solo)
      );
    }

    return (
      difficulty === "very hard" ||
      (difficulty === "hard" && !solo)
    );
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

  function setProgressionMessage() {
    if (!setupMessage) return;

    setupMessage.textContent =
      `Progression · Level ${currentLevel} — ${level.name}. ` +
      `${level.description}. Complete ${level.questions} questions` +
      (currentLevel === 0
        ? " to unlock Foundation."
        : ` and score ${level.passMark}% to pass.`);
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

    setProgressionMessage();
  }

  readSetupOptions = function readProgressionOptions() {
    legacyReadSetupOptions();
    selectedMode = "mixed";
    selectedDifficulty = "all";
    selectedFamilies = allFamilies();
    unlimitedMode = false;
    totalQuestions = level.questions;
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
    if (currentLevel === 0 && passed) {
      return "<strong>Introduction complete.</strong> Foundation is now unlocked.";
    }

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

  async function recordRound() {
    if (recordedRound) return;
    recordedRound = true;

    const maximumScore = Math.max(0, Number(questionsAnswered) || 0);
    const roundScore = Math.max(0, Number(score) || 0);
    const percentage = maximumScore
      ? Math.round((roundScore / maximumScore) * 100)
      : 0;
    const passed = currentLevel === 0
      ? maximumScore > 0
      : percentage >= level.passMark;

    const before = Math.max(
      0,
      Number(window.EAProgressionStore?.getModule?.(MODULE_ID)?.unlockedLevel) || 0
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

    const after = result?.moduleState?.unlockedLevel ?? before;
    const nextUnlocked = after > before;

    const panel = document.createElement("div");
    panel.className = "diagnostic-feedback-tile";
    panel.setAttribute("data-ea-progression-result", "");
    panel.innerHTML = `
      <p class="eyebrow">PROGRESSION RESULT</p>
      <p>${resultCopy(passed, percentage, nextUnlocked)}</p>
      <p class="muted">
        Level ${currentLevel} · ${level.name}. This score has been saved to
        your progression record.
      </p>
      <a class="primaryButton" href="${dashboardPath}">
        Return to student dashboard
      </a>
    `;

    answerCard?.querySelector("[data-ea-progression-result]")?.remove();
    answerCard?.appendChild(panel);
  }

  endGame = function endProgressionGame() {
    legacyEndGame();
    void recordRound();
  };

  restartGame = function restartProgressionGame() {
    legacyRestartGame();
    window.setTimeout(lockSettings, 0);
  };

  lockSettings();

  window.EAInstrumentIdentifierProgression = Object.freeze({
    currentLevel,
    level,
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
})();