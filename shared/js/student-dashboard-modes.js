(() => {
  "use strict";

  const modules = Array.isArray(window.EAStudentModules)
    ? window.EAStudentModules
    : [];

  const LEVEL_NAMES = [
    "Introduction",
    "Foundation",
    "Developing",
    "Secure",
    "Exam"
  ];

  let overlay = null;

  function escapeHTML(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function wordmark() {
    return `
      <span class="ea-learning-brand" aria-label="EchoAural">
        <span class="ea-learning-wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </span>
        <span class="ea-learning-wordmark"><b>Echo</b><i>Aural</i></span>
      </span>
    `;
  }

  function inferStudentName() {
    const identity = window.EAProgressionStore?.getIdentity?.();
    if (identity?.displayName) return identity.displayName;

    for (const selector of [
      "[data-student-name]",
      ".student-name",
      ".dashboard-welcome strong",
      ".welcome-name"
    ]) {
      const text = document.querySelector(selector)?.textContent?.trim();
      if (text) return text;
    }

    return "";
  }

  function withParams(href, values) {
    const url = new URL(href, window.location.origin);

    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    return `${url.pathname}${url.search}${url.hash}`;
  }

  function closeOverlay() {
    overlay?.remove();
    overlay = null;
    document.body.classList.remove("ea-mode-open");
  }

  function renderShell(content) {
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.className = "ea-learning-mode-gate";
      overlay.setAttribute("aria-label", "EchoAural student learning mode");
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="ea-learning-shell">
        <header class="ea-learning-header">
          ${wordmark()}
          <button class="ea-learning-account" type="button">Account dashboard</button>
        </header>
        <div class="ea-learning-content">${content}</div>
        <footer class="ea-learning-footer">Listen. Identify. Improve.</footer>
      </div>
    `;

    overlay
      .querySelector(".ea-learning-account")
      ?.addEventListener("click", closeOverlay);
  }

  function renderModeChoice() {
    const name = inferStudentName();
    const greeting = name
      ? `Welcome back, ${escapeHTML(name)}.`
      : "Choose how you want to learn.";

    renderShell(`
      <section class="ea-learning-intro">
        <p class="ea-learning-kicker">Student dashboard</p>
        <h1>${greeting}</h1>
        <p>
          Practise freely in the existing apps, or build each listening skill
          through a saved progression pathway.
        </p>
      </section>

      <div class="ea-mode-grid">
        <button class="ea-mode-card" type="button" data-mode="practice">
          <span class="ea-mode-icon" aria-hidden="true">♪</span>
          <h2>Practice</h2>
          <p>
            Open the apps exactly as they are now. Choose your own settings and
            practise without changing your progression record.
          </p>
          <strong>Choose apps →</strong>
        </button>

        <button class="ea-mode-card" type="button" data-mode="progression">
          <span class="ea-mode-icon" aria-hidden="true">↗</span>
          <h2>Progression</h2>
          <p>
            Start each skill at Level 0. Complete rounds, save scores and unlock
            the next level as your listening improves.
          </p>
          <strong>View progression →</strong>
        </button>
      </div>
    `);

    overlay.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => renderApps(button.dataset.mode));
    });
  }

  function practiceCard(module) {
    const href = withParams(module.href, {
      eaMode: "practice",
      eaDashboard: window.location.pathname
    });

    return `
      <a class="ea-app-card" href="${escapeHTML(href)}">
        <span class="ea-module-mark" aria-hidden="true">${escapeHTML(module.mark || "♪")}</span>
        <h2>${escapeHTML(module.title)}</h2>
        <p>Existing settings, gameplay and feedback.</p>
        <div class="ea-progress-line">
          <span>Free practice</span><span>Open →</span>
        </div>
      </a>
    `;
  }

  function progressionCard(module) {
    if (!module.progressionEnabled) {
      return `
        <article class="ea-app-card is-disabled" aria-disabled="true">
          <span class="ea-module-mark" aria-hidden="true">${escapeHTML(module.mark || "♪")}</span>
          <h2>${escapeHTML(module.title)}</h2>
          <p>
            Level 0 is reserved. Progression will open after this module's
            question levels are defined.
          </p>
          <div class="ea-progress-line">
            <span>Level 0</span><span>Setup pending</span>
          </div>
          <div class="ea-progress-track"><span style="width:0%"></span></div>
        </article>
      `;
    }

    const progress = window.EAProgressionStore.getModule(module.id);
    const level = Math.max(0, Math.min(4, progress.unlockedLevel || 0));
    const current = progress.levels?.[level] || {};
    const completed = Object.values(progress.levels || {})
      .filter(item => item?.passed)
      .length;
    const completePercent = Math.round((completed / 5) * 100);

    const href = withParams(module.href, {
      eaMode: "progression",
      eaLevel: level,
      eaDashboard: window.location.pathname
    });

    return `
      <a class="ea-app-card" href="${escapeHTML(href)}">
        <span class="ea-module-mark" aria-hidden="true">${escapeHTML(module.mark || "♪")}</span>
        <h2>${escapeHTML(module.title)}</h2>
        <p>
          Level ${level} · ${escapeHTML(LEVEL_NAMES[level])}
          ${current.bestPercentage ? ` · Best ${current.bestPercentage}%` : ""}
        </p>
        <div class="ea-progress-line">
          <span>${completePercent}% pathway complete</span>
          <span>${current.attempts ? "Continue →" : "Start →"}</span>
        </div>
        <div class="ea-progress-track">
          <span style="width:${completePercent}%"></span>
        </div>
      </a>
    `;
  }

  function renderApps(mode) {
    const progression = mode === "progression";
    const cards = modules
      .map(module => progression ? progressionCard(module) : practiceCard(module))
      .join("");

    renderShell(`
      <div class="ea-learning-toolbar">
        <div>
          <p class="ea-learning-kicker">${progression ? "Progression mode" : "Practice mode"}</p>
          <h1>${progression ? "Build your listening skills." : "Choose an app."}</h1>
          <p>
            ${progression
              ? "Scores in enabled pathways are saved and unlock new levels."
              : "Practice rounds do not change progression results."}
          </p>
        </div>
        <button class="ea-learning-back" type="button">Change mode</button>
      </div>

      <div class="ea-app-grid">
        ${cards || `
          <article class="ea-app-card is-disabled">
            <h2>No apps found</h2>
            <p>The project module catalogue is empty.</p>
          </article>
        `}
      </div>
    `);

    overlay
      .querySelector(".ea-learning-back")
      ?.addEventListener("click", renderModeChoice);
  }

  async function initialise() {
    document.body.classList.add("ea-mode-open");
    await window.EAProgressionStore?.ready?.();
    renderModeChoice();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();