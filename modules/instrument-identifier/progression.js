/*
  EchoAural Instrument Identifier
  Progression Path + Free Practice

  This file adds navigation and progression around the existing game.
  It deliberately leaves the original layout classes, stylesheet, audio,
  question rendering, answer choices, scoring, XP, timing, feedback,
  restart flow and quiz gameplay in script.js unchanged.
*/

(() => {
  "use strict";

  const EXPERIENCE = Object.freeze({
    PATH: "progression",
    PRACTICE: "practice"
  });

  const LEVELS = Object.freeze([
    Object.freeze({
      id: "foundation",
      label: "Foundation",
      description: "Clear solo instruments"
    }),
    Object.freeze({
      id: "developing",
      label: "Developing",
      description: "Solo and supported contexts"
    }),
    Object.freeze({
      id: "secure",
      label: "Secure",
      description: "Harder listening contexts"
    }),
    Object.freeze({
      id: "exam",
      label: "Exam",
      description: "Embedded and demanding clips"
    })
  ]);

  const STORAGE_KEY = "echoaural.ii.progression.v1";
  const EXPERIENCE_KEY = "echoaural.ii.experience.v1";
  const PASS_PERCENTAGE = 80;
  const PATH_QUESTION_COUNT = 10;

  const legacyReadSetupOptions = readSetupOptions;
  const legacyClipMatchesMode = clipMatchesMode;
  const legacyClipMatchesDifficulty = clipMatchesDifficulty;
  const legacyClipMatchesFamily = clipMatchesFamily;
  const legacyEndGame = endGame;

  let selectedExperience = readExperiencePreference();
  let routeSection = null;
  let contextSection = null;
  let progressionSection = null;
  let advancedShell = null;
  let progressionStatus = null;

  function normalise(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim().toLowerCase();
  }

  function valueFrom(clip, names) {
    if (typeof getField === "function") return getField(clip, names);

    for (const name of names) {
      const value = clip?.[name];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function safeReadJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function safeWriteJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // Local storage can be unavailable in some private/file contexts.
    }
  }

  function readExperiencePreference() {
    try {
      const stored = window.localStorage.getItem(EXPERIENCE_KEY);
      return stored === EXPERIENCE.PRACTICE
        ? EXPERIENCE.PRACTICE
        : EXPERIENCE.PATH;
    } catch (_error) {
      return EXPERIENCE.PATH;
    }
  }

  function saveExperiencePreference(value) {
    try {
      window.localStorage.setItem(EXPERIENCE_KEY, value);
    } catch (_error) {
      // The selected mode still works for the current page session.
    }
  }

  function defaultProgress() {
    return {
      unlockedIndex: 0,
      levels: Object.fromEntries(
        LEVELS.map(level => [
          level.id,
          {
            attempts: 0,
            bestPercentage: 0,
            lastPercentage: null,
            passed: false
          }
        ])
      )
    };
  }

  function readProgress() {
    const saved = safeReadJSON(STORAGE_KEY, defaultProgress());
    const fallback = defaultProgress();

    const progress = {
      unlockedIndex: Math.max(
        0,
        Math.min(
          LEVELS.length - 1,
          Number(saved.unlockedIndex) || 0
        )
      ),
      levels: fallback.levels
    };

    LEVELS.forEach(level => {
      const item = saved.levels?.[level.id] || {};
      progress.levels[level.id] = {
        attempts: Math.max(0, Number(item.attempts) || 0),
        bestPercentage: Math.max(
          0,
          Math.min(100, Number(item.bestPercentage) || 0)
        ),
        lastPercentage:
          item.lastPercentage === null || item.lastPercentage === undefined
            ? null
            : Math.max(0, Math.min(100, Number(item.lastPercentage) || 0)),
        passed: Boolean(item.passed)
      };
    });

    return progress;
  }

  function saveProgress(progress) {
    safeWriteJSON(STORAGE_KEY, progress);
  }

  function getDifficulty(clip) {
    return normalise(valueFrom(clip, [
      "difficulty",
      "DIFFICULTY",
      "Difficulty",
      "difficultyClean",
      "Difficulty Clean"
    ]));
  }

  function getType(clip) {
    return normalise(valueFrom(clip, [
      "type",
      "TYPE",
      "Type",
      "clipType",
      "Clip Type Clean"
    ]));
  }

  function isSoloClip(clip) {
    const type = getType(clip);

    return (
      type === "solo" ||
      type === "unaccompanied" ||
      type === "solo instrument" ||
      type.includes("solo only")
    );
  }

  function deriveProgressionLevel(clip) {
    const override = normalise(valueFrom(clip, [
      "progressionLevel",
      "progression level",
      "LEVEL_OVERRIDE",
      "Level Override"
    ]));

    if (LEVELS.some(level => level.id === override)) return override;

    const difficulty = getDifficulty(clip);
    const solo = isSoloClip(clip);
    const recognisedDifficulty = [
      "easy",
      "medium",
      "hard",
      "very hard"
    ].includes(difficulty);

    // User-approved temporary rule:
    // a solo clip with missing/unrecognised difficulty enters Foundation.
    if (solo && (difficulty === "easy" || !recognisedDifficulty)) {
      return "foundation";
    }

    if (
      (difficulty === "easy" && !solo) ||
      (difficulty === "medium" && solo)
    ) {
      return "developing";
    }

    if (
      (difficulty === "medium" && !solo) ||
      (difficulty === "hard" && solo)
    ) {
      return "secure";
    }

    if (
      difficulty === "very hard" ||
      (difficulty === "hard" && !solo)
    ) {
      return "exam";
    }

    return "ungraded";
  }

  function findSectionContaining(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    return element.closest(".panel-section") || element.parentElement;
  }

  function setElementVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.setAttribute("aria-hidden", String(!visible));
  }

  function replacePracticeDifficultyControls() {
    const existingInput = document.querySelector(
      'input[name="difficultyFilter"]'
    );

    if (!existingInput) return;

    const row = existingInput.closest(".pillRow") || existingInput.parentElement;
    if (!row) return;

    const heading = row.previousElementSibling;
    if (heading && /^h[1-6]$/i.test(heading.tagName)) {
      heading.textContent = "Difficulty";
    }

    row.innerHTML = `
      <label class="pill">
        <input type="radio" name="difficultyFilter" value="all" checked />
        <span>Mixed</span>
      </label>
      <label class="pill">
        <input type="radio" name="difficultyFilter" value="easy" />
        <span>Easy</span>
      </label>
      <label class="pill">
        <input type="radio" name="difficultyFilter" value="medium" />
        <span>Medium</span>
      </label>
      <label class="pill">
        <input type="radio" name="difficultyFilter" value="hard" />
        <span>Hard</span>
      </label>
    `;
  }

  function createRouteSection() {
    const section = document.createElement("div");
    section.className = "panel-section";
    section.id = "iiExperienceSection";

    section.innerHTML = `
      <h2 class="section-label">Choose how to learn</h2>
      <div class="cardGrid">
        <label class="quizCard">
          <input
            type="radio"
            name="iiExperience"
            value="progression"
            ${selectedExperience === EXPERIENCE.PATH ? "checked" : ""}
          />
          <span class="cardIcon" data-icon="violin"></span>
          <span class="card-title">Progression Path</span>
          <span class="card-subtitle">Build skill level by level</span>
        </label>

        <label class="quizCard">
          <input
            type="radio"
            name="iiExperience"
            value="practice"
            ${selectedExperience === EXPERIENCE.PRACTICE ? "checked" : ""}
          />
          <span class="cardIcon" data-icon="ensemble"></span>
          <span class="card-title">Free Practice</span>
          <span class="card-subtitle">Choose your own round</span>
        </label>
      </div>
    `;

    return section;
  }

  function createProgressionSection() {
    const section = document.createElement("div");
    section.className = "panel-section";
    section.id = "iiProgressionSection";

    section.innerHTML = `
      <h2 class="section-label">Choose your stage</h2>
      <div id="iiProgressionLevels" class="pillRow"></div>
      <p id="iiProgressionStatus" class="subtitle"></p>
    `;

    return section;
  }

  function getSelectedProgressionLevel() {
    return document.querySelector(
      'input[name="progressionLevel"]:checked'
    )?.value || LEVELS[0].id;
  }

  function chooseHighestUnlockedLevel(progress) {
    const current = getSelectedProgressionLevel();
    const currentIndex = LEVELS.findIndex(level => level.id === current);

    if (currentIndex >= 0 && currentIndex <= progress.unlockedIndex) return;

    const target = LEVELS[progress.unlockedIndex]?.id || LEVELS[0].id;
    const input = document.querySelector(
      `input[name="progressionLevel"][value="${target}"]`
    );

    if (input) input.checked = true;
  }

  function renderProgressionControls(preferredLevelId = "") {
    const container = document.getElementById("iiProgressionLevels");
    if (!container) return;

    const progress = readProgress();
    const previousSelection = preferredLevelId || getSelectedProgressionLevel();

    container.innerHTML = LEVELS.map((level, index) => {
      const state = progress.levels[level.id];
      const locked = index > progress.unlockedIndex;
      const selected = !locked && level.id === previousSelection;

      let suffix = "";
      if (locked) suffix = " · Locked";
      else if (state.passed) suffix = " · Passed";
      else if (index === progress.unlockedIndex) suffix = " · Current";

      return `
        <label class="pill">
          <input
            type="radio"
            name="progressionLevel"
            value="${level.id}"
            ${selected ? "checked" : ""}
            ${locked ? "disabled" : ""}
          />
          <span>${level.label}${suffix}</span>
        </label>
      `;
    }).join("");

    chooseHighestUnlockedLevel(progress);

    const selectedLevelId = getSelectedProgressionLevel();
    const level = LEVELS.find(item => item.id === selectedLevelId) || LEVELS[0];
    const state = progress.levels[level.id];

    if (progressionStatus) {
      const best = state.bestPercentage
        ? ` Best score: ${state.bestPercentage}%.`
        : "";

      progressionStatus.textContent =
        `${level.description}. Complete a 10-question round with ` +
        `${PASS_PERCENTAGE}% to progress.${best}`;
    }
  }

  function setTenQuestionRound() {
    const ten = document.querySelector(
      'input[name="questionCount"][value="10"]'
    );

    if (ten) ten.checked = true;
  }

  function allFamilyValues() {
    const values = Array.from(
      document.querySelectorAll('input[name="familyFilter"]')
    )
      .map(input => normalise(input.value))
      .filter(Boolean);

    return [...new Set(values)];
  }

  function applyExperienceUI() {
    const isPath = selectedExperience === EXPERIENCE.PATH;

    setElementVisible(contextSection, !isPath);
    setElementVisible(progressionSection, isPath);
    setElementVisible(advancedShell, !isPath);

    if (startButton) {
      startButton.textContent = isPath
        ? "▶ Continue progression"
        : "▶ Start practice";
    }

    if (setupMessage) {
      setupMessage.textContent = isPath
        ? "Progress is saved on this device."
        : "Practice rounds do not affect your Progression Path.";
    }

    if (isPath) {
      setTenQuestionRound();
      renderProgressionControls();
    }
  }

  function initialiseNavigation() {
    contextSection = findSectionContaining('input[name="quizMode"]');
    advancedShell =
      document.getElementById("advancedSettings")?.closest(".advanced-shell") ||
      document.getElementById("advancedSettings")?.parentElement ||
      null;

    if (!contextSection) {
      console.warn("EchoAural II: quiz-mode section was not found.");
      return;
    }

    replacePracticeDifficultyControls();

    routeSection = createRouteSection();
    progressionSection = createProgressionSection();

    contextSection.parentNode.insertBefore(routeSection, contextSection);
    contextSection.parentNode.insertBefore(progressionSection, contextSection);

    progressionStatus = document.getElementById("iiProgressionStatus");

    document.querySelectorAll('input[name="iiExperience"]').forEach(input => {
      input.addEventListener("change", () => {
        selectedExperience = input.value === EXPERIENCE.PRACTICE
          ? EXPERIENCE.PRACTICE
          : EXPERIENCE.PATH;

        saveExperiencePreference(selectedExperience);
        applyExperienceUI();
      });
    });

    progressionSection.addEventListener("change", event => {
      if (event.target?.name === "progressionLevel") {
        renderProgressionControls(event.target.value);
      }
    });

    applyExperienceUI();
  }

  readSetupOptions = function readIISetupOptions() {
    legacyReadSetupOptions();

    if (selectedExperience !== EXPERIENCE.PATH) return;

    selectedMode = "all";
    selectedDifficulty = getSelectedProgressionLevel();
    selectedFamilies = allFamilyValues();
    unlimitedMode = false;
    totalQuestions = PATH_QUESTION_COUNT;
    setTenQuestionRound();
  };

  clipMatchesMode = function clipMatchesIIExperienceMode(clip) {
    if (selectedExperience === EXPERIENCE.PATH) return true;
    return legacyClipMatchesMode(clip);
  };

  clipMatchesDifficulty = function clipMatchesIIExperienceDifficulty(clip) {
    if (selectedExperience === EXPERIENCE.PATH) {
      return deriveProgressionLevel(clip) === selectedDifficulty;
    }

    return legacyClipMatchesDifficulty(clip);
  };

  clipMatchesFamily = function clipMatchesIIExperienceFamily(clip) {
    if (selectedExperience === EXPERIENCE.PATH) return true;
    return legacyClipMatchesFamily(clip);
  };

  function recordProgressionRound(levelId, percentage) {
    const progress = readProgress();
    const levelIndex = LEVELS.findIndex(level => level.id === levelId);
    const state = progress.levels[levelId];

    if (levelIndex < 0 || !state) {
      return {
        progress,
        unlockedNext: false,
        nextLevelId: "",
        message: "Round completed."
      };
    }

    state.attempts += 1;
    state.lastPercentage = percentage;
    state.bestPercentage = Math.max(state.bestPercentage, percentage);

    const passed = percentage >= PASS_PERCENTAGE;
    if (passed) state.passed = true;

    let unlockedNext = false;
    let nextLevelId = "";
    let message = "";

    if (
      passed &&
      levelIndex === progress.unlockedIndex &&
      levelIndex < LEVELS.length - 1
    ) {
      progress.unlockedIndex = levelIndex + 1;
      unlockedNext = true;
      nextLevelId = LEVELS[levelIndex + 1].id;
      message = `${LEVELS[levelIndex + 1].label} unlocked.`;
    } else if (passed && levelIndex === LEVELS.length - 1) {
      message = "Exam stage completed.";
    } else if (passed) {
      message = `${LEVELS[levelIndex].label} passed.`;
    } else {
      message =
        `Score ${PASS_PERCENTAGE}% to progress. ` +
        `Your best is ${state.bestPercentage}%.`;
    }

    saveProgress(progress);

    return { progress, unlockedNext, nextLevelId, message };
  }

  function appendProgressionResult(levelId, percentage, result) {
    if (!answerCard) return;

    const summary = answerCard.querySelector(".summary") || answerCard;
    const level = LEVELS.find(item => item.id === levelId) || LEVELS[0];
    const state = result.progress.levels[level.id];

    const panel = document.createElement("div");
    panel.className = "answer-meta-card";
    panel.innerHTML = `
      <div class="meta-row">
        <span>Progression stage</span>
        <strong>${level.label}</strong>
      </div>
      <div class="meta-row">
        <span>Progress result</span>
        <strong>${percentage}%</strong>
      </div>
      <div class="meta-row">
        <span>Best score</span>
        <strong>${state.bestPercentage}%</strong>
      </div>
      <div class="meta-row">
        <span>Next step</span>
        <strong>${result.message}</strong>
      </div>
    `;

    summary.appendChild(panel);
  }

  endGame = function endIIExperienceRound() {
    const wasProgression = selectedExperience === EXPERIENCE.PATH;
    const completedLevel = selectedDifficulty;
    const divisor = unlimitedMode ? questionsAnswered : totalQuestions;
    const percentage = divisor > 0
      ? Math.round((score / divisor) * 100)
      : 0;

    legacyEndGame();

    if (!wasProgression) return;

    const result = recordProgressionRound(completedLevel, percentage);
    appendProgressionResult(completedLevel, percentage, result);
    renderProgressionControls(result.nextLevelId || completedLevel);
  };

  window.EchoAuralIIProgression = Object.freeze({
    EXPERIENCE,
    LEVELS,
    PASS_PERCENTAGE,
    deriveProgressionLevel,
    readProgress,
    resetProgress() {
      const progress = defaultProgress();
      saveProgress(progress);
      renderProgressionControls(LEVELS[0].id);
      return progress;
    }
  });

  initialiseNavigation();

  const counts = clipData.reduce((summary, clip) => {
    const level = deriveProgressionLevel(clip);
    summary[level] = (summary[level] || 0) + 1;
    return summary;
  }, {});

  console.info("EchoAural II learning modes active.", counts);
})();
