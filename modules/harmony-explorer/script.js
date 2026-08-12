"use strict";

/** Harmony Explorer suite landing screen. */
(function initHarmonyExplorerHomescreen() {
  const startButton = document.getElementById("startButton");
  const settingsToggle = document.getElementById("settingsToggle");
  const advancedSettings = document.getElementById("advancedSettings");
  const restartButton = document.getElementById("restartButton");
  const playButton = document.getElementById("playButton");
  const nextButton = document.getElementById("nextButton");

  function noop(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function selectedValue(name, fallback) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  }

  function setAdvancedSettingsOpen(isOpen) {
    if (!advancedSettings || !settingsToggle) return;
    advancedSettings.style.display = isOpen ? "block" : "none";
    advancedSettings.classList.toggle("is-open", isOpen);
    advancedSettings.setAttribute("aria-hidden", String(!isOpen));
    settingsToggle.setAttribute("aria-expanded", String(isOpen));
  }

  if (startButton) startButton.addEventListener("click", () => {
    if (selectedValue("harmonySkill", "key-signatures") === "cadences") {
      const cadenceParams = new URLSearchParams({
        level: selectedValue("harmonyLevel", "foundation"),
        answers: selectedValue("answerMode", "adaptive"),
        autostart: "1"
      });
      window.location.href = `../cadence-coach/index.html?${cadenceParams.toString()}`;
      return;
    }
    if (selectedValue("harmonySkill", "key-signatures") === "chord-identifier") {
      // Forward the level picked on this screen, same as the key-signature-sprint
      // redirect below does — without this, Chord Identifier always silently
      // started at Foundation regardless of what was selected here, since it had
      // no way to know. Chord Identifier's own script.js maps this "secure"/"exam"
      // naming to its own "securing"/"mastering" difficulty values.
      const chordParams = new URLSearchParams({
        level: selectedValue("harmonyLevel", "foundation"),
        autostart: "1"
      });
      window.location.href = `../chord-identifier/index.html?${chordParams.toString()}`;
      return;
    }
    const params = new URLSearchParams({
      level: selectedValue("harmonyLevel", "foundation"),
      questions: selectedValue("questionCount", "5"),
      clef: selectedValue("clefSetting", "auto"),
      focus: selectedValue("keyFocus", "mixed"),
      answers: selectedValue("answerMode", "adaptive"),
      accidentals: selectedValue("accidentalRange", "all"),
      autostart: "1"
    });
    window.location.href = `key-signature-sprint/index.html?${params.toString()}`;
  });

  if (settingsToggle) {
    settingsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setAdvancedSettingsOpen(settingsToggle.getAttribute("aria-expanded") !== "true");
    });
  }

  advancedSettings?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", () => setAdvancedSettingsOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settingsToggle?.getAttribute("aria-expanded") === "true") {
      setAdvancedSettingsOpen(false);
      settingsToggle.focus();
    }
  });

  if (restartButton) {
    restartButton.addEventListener("click", noop);
  }

  if (playButton) {
    playButton.addEventListener("click", noop);
  }

  if (nextButton) {
    nextButton.addEventListener("click", noop);
  }

  const CONSOLE_SKILL_ICONS = {
    "key-signatures": "../../assets/icons/modules/he-transparent/key-signatures-transparent.png",
    "chord-identifier": "../../assets/icons/modules/he-transparent/chord-identifier-transparent.png",
    "cadences": "../../assets/icons/modules/he-transparent/cadences-transparent.png"
  };
  const DEFAULT_CONSOLE_ICON = "../../assets/icons/modules/harmony-explorer.png";
  const consoleSkillIcon = document.getElementById("consoleSkillIcon");

  function syncConsoleSkillIcon() {
    if (!consoleSkillIcon) return;
    const checked = document.querySelector('input[name="harmonySkill"]:checked');
    consoleSkillIcon.src = checked ? (CONSOLE_SKILL_ICONS[checked.value] || DEFAULT_CONSOLE_ICON) : DEFAULT_CONSOLE_ICON;
  }

  /** Start cannot begin until the user has explicitly picked both a skill and a level. */
  function updateStartAvailability() {
    if (!startButton) return;
    const hasSkill = !!document.querySelector('input[name="harmonySkill"]:checked');
    const hasLevel = !!document.querySelector('input[name="harmonyLevel"]:checked');
    startButton.disabled = !(hasSkill && hasLevel);
  }

  /** Centre-panel heading: "Learning" until a skill is chosen, then that
   *  skill's short name (matching its own skill-button label). */
  const SKILL_HEADING_LABELS = {
    "key-signatures": "Keys",
    "chord-identifier": "Chords",
    "cadences": "Cadences"
  };
  const centreHeadingLabel = document.getElementById("centreHeadingLabel");
  function updateCentreHeading() {
    if (!centreHeadingLabel) return;
    const checked = document.querySelector('input[name="harmonySkill"]:checked');
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
    const checked = document.querySelector('input[name="harmonySkill"]:checked');
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

  document.querySelectorAll('input[name="harmonySkill"], input[name="harmonyLevel"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateStartAvailability();
      if (input.name === "harmonySkill") { syncConsoleSkillIcon(); updateCentreHeading(); updateConsoleTitle(); }
    });
  });

  updateStartAvailability();
  syncConsoleSkillIcon();
  updateCentreHeading();
  updateConsoleTitle();
})();
