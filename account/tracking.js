"use strict";

window.EchoAuralTracking = (() => {
  function currentLearningMode() {
    const mode = String(new URLSearchParams(window.location.search).get("eaMode") || "").trim().toLowerCase();
    if (mode === "progress" || mode === "progression") return "progression";
    return "";
  }

  function withLearningModeMetadata(payload, mode) {
    if (mode !== "progression") return payload;

    const metadata = {
      ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {})
    };
    metadata.source = metadata.source || "student_progression";
    metadata.learningMode = "progression";

    return { ...payload, metadata };
  }

  function createClientRoundId(prefix = "round") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  async function saveRound(payload = {}) {
    const learningMode = currentLearningMode();
    const roundPayload = withLearningModeMetadata(payload, learningMode);

    try {
      const response = await fetch("/api/student/rounds", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(roundPayload)
      });

      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; }
      catch (_error) { data = {}; }

      if (response.status === 401 || response.status === 403) {
        return { saved: false, reason: "student-login-required" };
      }

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `Progress save failed (${response.status}).`);
      }

      return { saved: true, ...data };
    } catch (error) {
      console.warn("[EchoAural progress] Round was not saved:", error.message || error);
      return { saved: false, reason: "request-failed" };
    }
  }

  return { createClientRoundId, saveRound };
})();
