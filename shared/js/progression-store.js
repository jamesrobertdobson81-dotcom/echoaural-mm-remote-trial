(() => {
  "use strict";

  const VERSION = "v2";
  const STORE_PREFIX = `echoaural.progression.${VERSION}`;
  const PENDING_PREFIX = `echoaural.progression.pending.${VERSION}`;

  let identity = { id: "local", displayName: "" };
  let readyPromise = null;

  function parseJSON(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function normaliseIdentity(payload) {
    const source = payload?.student || payload?.user || payload?.account || payload || {};
    return {
      id: String(source.id || source.studentId || source.student_id || source.uuid || "local"),
      displayName: String(
        source.displayName || source.display_name || source.name || source.username || ""
      )
    };
  }

  async function findIdentity() {
    for (const endpoint of ["/api/student/me", "/api/auth/student/me", "/api/me"]) {
      try {
        const response = await fetch(endpoint, {
          credentials: "include",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) continue;
        const candidate = normaliseIdentity(await response.json());
        if (candidate.id !== "local") {
          identity = candidate;
          break;
        }
      } catch (_error) {}
    }
    return identity;
  }

  function ready() {
    if (!readyPromise) readyPromise = findIdentity();
    return readyPromise;
  }

  function key() {
    return `${STORE_PREFIX}:${identity.id}`;
  }

  function pendingKey() {
    return `${PENDING_PREFIX}:${identity.id}`;
  }

  function blankLevel() {
    return { attempts: 0, bestPercentage: 0, lastPercentage: null, passed: false };
  }

  function defaultModule(moduleId) {
    return {
      moduleId,
      unlockedLevel: 0,
      lastPlayedAt: null,
      levels: {
        0: blankLevel(),
        1: blankLevel(),
        2: blankLevel(),
        3: blankLevel(),
        4: blankLevel()
      }
    };
  }

  function readAll() {
    try {
      return parseJSON(localStorage.getItem(key()), { modules: {} });
    } catch (_error) {
      return { modules: {} };
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(key(), JSON.stringify(data));
    } catch (_error) {}
  }

  function getModule(moduleId) {
    const saved = readAll().modules?.[moduleId];
    const result = defaultModule(moduleId);
    if (!saved || typeof saved !== "object") return result;

    result.unlockedLevel = Math.max(0, Math.min(4, Number(saved.unlockedLevel) || 0));
    result.lastPlayedAt = saved.lastPlayedAt || null;

    Object.keys(result.levels).forEach(level => {
      const item = saved.levels?.[level] || {};
      result.levels[level] = {
        attempts: Math.max(0, Number(item.attempts) || 0),
        bestPercentage: Math.max(0, Math.min(100, Number(item.bestPercentage) || 0)),
        lastPercentage: item.lastPercentage == null
          ? null
          : Math.max(0, Math.min(100, Number(item.lastPercentage) || 0)),
        passed: Boolean(item.passed)
      };
    });

    return result;
  }

  function saveModule(moduleState) {
    const all = readAll();
    all.modules = all.modules || {};
    all.modules[moduleState.moduleId] = moduleState;
    writeAll(all);
  }

  function queueAttempt(attempt) {
    try {
      const pending = parseJSON(localStorage.getItem(pendingKey()), []);
      const list = Array.isArray(pending) ? pending : [];
      list.push(attempt);
      localStorage.setItem(pendingKey(), JSON.stringify(list.slice(-250)));
    } catch (_error) {}
  }

  async function syncAttempt(attempt) {
    try {
      const response = await fetch("/api/student/progression/attempts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(attempt)
      });
      if (!response.ok) queueAttempt(attempt);
    } catch (_error) {
      queueAttempt(attempt);
    }
  }

  async function recordAttempt({
    moduleId,
    level,
    score,
    maximumScore,
    percentage,
    passMark,
    passed
  }) {
    await ready();

    const state = getModule(moduleId);
    const safeLevel = Math.max(0, Math.min(4, Number(level) || 0));
    const safeMaximum = Math.max(0, Number(maximumScore) || 0);
    const safeScore = Math.max(0, Number(score) || 0);
    const safePercentage = Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(Number(percentage))
          ? Number(percentage)
          : safeMaximum
            ? (safeScore / safeMaximum) * 100
            : 0
      )
    );

    const item = state.levels[safeLevel] || blankLevel();
    item.attempts += 1;
    item.lastPercentage = Math.round(safePercentage);
    item.bestPercentage = Math.max(item.bestPercentage, Math.round(safePercentage));
    item.passed = item.passed || Boolean(passed);
    state.levels[safeLevel] = item;
    state.lastPlayedAt = new Date().toISOString();

    if (passed && safeLevel < 4) {
      state.unlockedLevel = Math.max(state.unlockedLevel, safeLevel + 1);
    } else {
      state.unlockedLevel = Math.max(state.unlockedLevel, safeLevel);
    }

    saveModule(state);

    const attempt = {
      studentId: identity.id === "local" ? null : identity.id,
      moduleId,
      mode: "progression",
      level: safeLevel,
      score: safeScore,
      maximumScore: safeMaximum,
      percentage: Math.round(safePercentage),
      passMark: Number(passMark) || 0,
      passed: Boolean(passed),
      completedAt: new Date().toISOString()
    };

    void syncAttempt(attempt);
    window.dispatchEvent(new CustomEvent("ea:progression-updated", {
      detail: { moduleState: state, attempt }
    }));

    return { moduleState: state, attempt };
  }

  function reset(moduleId = null) {
    if (!moduleId) {
      try {
        localStorage.removeItem(key());
        localStorage.removeItem(pendingKey());
      } catch (_error) {}
      return;
    }

    const all = readAll();
    if (all.modules) delete all.modules[moduleId];
    writeAll(all);
  }

  window.EAProgressionStore = Object.freeze({
    ready,
    getIdentity: () => ({ ...identity }),
    getModule,
    recordAttempt,
    reset
  });
})();