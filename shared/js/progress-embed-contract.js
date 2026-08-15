(function attachEchoAuralProgressEmbed(root) {
  "use strict";

  var params;
  try { params = new URLSearchParams(root.location.search); }
  catch (_error) { params = new URLSearchParams(); }

  var enabled = params.get("eaProgressHost") === "1";
  var slotId = String(params.get("eaProgressSlot") || "");
  var sourceKey = String(params.get("eaProgressSource") || "");
  // Only a Live Session host sets these — plain Progress Mode rounds have no
  // room/round concept and leave them blank, which is exactly what keeps
  // this additive for Progress Mode (see messageMatchesThisSlot below).
  var roomId = String(params.get("eaProgressRoom") || "");

  // Version 1 is the original Progress Mode envelope: namespace, version,
  // type, slotId, sourceKey, payload. Its shape must never change —
  // modules/progress-mode/script.js hard-checks `message.version !== 1` and
  // ignores anything it doesn't recognise, so every field this contract
  // adds below rides alongside it as extra, additively-ignored properties
  // rather than replacing it.
  var VERSION = 1;
  // contractVersion is the new, additive envelope for Live Sessions: room/
  // round/question identity on every message, so a host can confirm a
  // message belongs to the exact round/question it's currently showing
  // before acting on it. Old listeners that only read namespace/version/
  // slotId/sourceKey/type/payload never look at this field, so its
  // presence is invisible to them — this is what "backward compatible"
  // means here in practice, not a hypothetical.
  var CONTRACT_VERSION = 2;
  var NAMESPACE = "echoaural-progress";

  var state = {
    roundId: String(params.get("eaProgressRound") || ""),
    questionId: ""
  };

  function send(type, payload, questionId) {
    if (!enabled || !slotId || !root.parent || root.parent === root) return false;
    if (questionId !== undefined) state.questionId = String(questionId || "");
    root.parent.postMessage({
      namespace: NAMESPACE,
      version: VERSION,
      contractVersion: CONTRACT_VERSION,
      type: String(type || ""),
      slotId: slotId,
      sourceKey: sourceKey,
      roomId: roomId,
      roundId: state.roundId,
      questionId: state.questionId,
      payload: payload && typeof payload === "object" ? payload : {}
    }, root.location.origin);
    return true;
  }

  function questionReady(question) {
    var details = question && typeof question === "object" ? question : {};
    var id = String(details.id || details.questionId || details.signature || "").trim();
    return id ? send("question-ready", { ...details, id: id, signature: String(details.signature || id) }, id) : false;
  }

  function answerComplete(result) {
    var details = result && typeof result === "object" ? result : {};
    var maximumScore = Math.max(0, Number(details.maximumScore ?? 1) || 0);
    var score = Math.max(0, Math.min(maximumScore, Number(details.score ?? (details.correct ? maximumScore : 0)) || 0));
    return send("answer-complete", {
      ...details,
      score: score,
      maximumScore: maximumScore,
      correct: details.correct === undefined ? maximumScore > 0 && score >= maximumScore : Boolean(details.correct)
    });
  }

  function pauseAllMedia() {
    root.document.querySelectorAll("audio, video").forEach(function (media) {
      try { media.pause(); } catch (_error) {}
    });
  }

  function resumeAllMedia() {
    root.document.querySelectorAll("audio, video").forEach(function (media) {
      try {
        if (media.paused && media.currentTime > 0) {
          var attempt = media.play();
          if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
        }
      } catch (_error) {}
    });
  }

  // Shared gate for every inbound command. roomId/roundId are only ever
  // non-blank once a Live Session host has set them, so the match is only
  // enforced when BOTH sides have a value to compare — Progress Mode's
  // existing traffic (neither side ever sets either) is untouched by this.
  function messageMatchesThisSlot(message) {
    if (message.namespace !== NAMESPACE || message.version !== VERSION || message.slotId !== slotId) return false;
    if (roomId && message.roomId && message.roomId !== roomId) return false;
    if (state.roundId && message.roundId && message.roundId !== state.roundId) return false;
    return true;
  }

  function handleCommand(event) {
    if (!enabled || event.origin !== root.location.origin || event.source !== root.parent) return;
    var message = event.data || {};
    if (!messageMatchesThisSlot(message)) return;

    if (message.type === "load-question" || message.type === "teacher-load-question") {
      if (message.roundId) state.roundId = String(message.roundId);
      var questionHandler = root.EAProgressEmbed && root.EAProgressEmbed.onQuestion;
      if (typeof questionHandler === "function") questionHandler(message.payload || {});
      return;
    }
    if (message.type === "pause-media" || message.type === "teacher-pause") {
      pauseAllMedia();
      return;
    }
    if (message.type === "resume-media" || message.type === "teacher-resume" || message.type === "teacher-play") {
      resumeAllMedia();
      return;
    }
    if (message.type === "teacher-reset") {
      var resetHandler = root.EAProgressEmbed && root.EAProgressEmbed.onReset;
      if (typeof resetHandler === "function") resetHandler(message.payload || {});
      return;
    }
    if (message.type === "teacher-close") {
      var closeHandler = root.EAProgressEmbed && root.EAProgressEmbed.onClose;
      if (typeof closeHandler === "function") closeHandler(message.payload || {});
      return;
    }
  }

  root.addEventListener("message", handleCommand);
  root.addEventListener("DOMContentLoaded", function () { send("app-ready", {}); }, { once: true });
  var embedApi = {
    enabled: enabled,
    version: VERSION,
    contractVersion: CONTRACT_VERSION,
    slotId: slotId,
    sourceKey: sourceKey,
    roomId: roomId,
    send: send,
    questionReady: questionReady,
    answerComplete: answerComplete,
    poolEmpty: function (details) { return send("pool-empty", details); },
    onQuestion: null,
    onReset: null,
    onClose: null,
    registerQuestionHandler: function (handler) {
      embedApi.onQuestion = typeof handler === "function" ? handler : null;
    },
    // registerResetHandler/registerCloseHandler are new — apps migrated in
    // Phase 1 wire these to actually reset/tear down; unmigrated apps never
    // call them, so teacher-reset/teacher-close simply have no effect for
    // those apps yet (a no-op, not an error), matching the plan's
    // capability-flag/fallback approach rather than assuming every app
    // supports them from day one.
    registerResetHandler: function (handler) {
      embedApi.onReset = typeof handler === "function" ? handler : null;
    },
    registerCloseHandler: function (handler) {
      embedApi.onClose = typeof handler === "function" ? handler : null;
    }
  };
  root.EAProgressEmbed = embedApi;
})(window);
