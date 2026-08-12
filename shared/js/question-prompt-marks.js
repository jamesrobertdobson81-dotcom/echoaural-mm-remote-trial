(() => {
  "use strict";

  // Strip a trailing exam-style mark suffix such as " (1)", "(2)", or fullwidth （1）.
  // Only the final suffix is removed so mid-prompt part marks like "(a) … (1)" remain.
  const TRAILING_MARK_SUFFIX = /(?:[\s\u00A0\u202F]*)[(（]\s*\d+(?:\.\d+)?\s*[)）]\s*$/u;

  function stripTrailing(text) {
    return String(text ?? "")
      .replace(TRAILING_MARK_SUFFIX, "")
      .replace(/[\s\u00A0\u202F]+$/u, "");
  }

  window.EAQuestionPromptMarks = Object.freeze({
    stripTrailing
  });
})();
