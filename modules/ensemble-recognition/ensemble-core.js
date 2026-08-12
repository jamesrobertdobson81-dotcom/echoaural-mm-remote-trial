/**
 * Ensemble Recognition — shared MC helpers (browser + Node tests).
 * Vocabulary and close-match neighbours are grounded in the Ensemble Spotter 50
 * pack plus Cambridge iGCSE ensemble terms from the Aug 2026 clip_plan builder.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.EnsembleRecognitionCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_CHOICES = 4;

  const TAG_TO_LABEL = Object.freeze({
    string_quartet: "String Quartet",
    orchestra: "Orchestra",
    duo: "Duet",
    chamber_ensemble: "Chamber Ensemble",
    trio_sonata: "Trio",
    gamelan_ensemble: "Gamelan",
    maqam_ensemble: "Arab Takht",
    ragtime_jazz: "Jazz Band"
  });

  const VOCABULARY = Object.freeze([
    "Orchestra",
    "String Orchestra",
    "String Quartet",
    "Chamber Ensemble",
    "Duet",
    "Trio",
    "Wind Ensemble",
    "Wind Band",
    "Brass Band",
    "Choir",
    "Jazz Band",
    "Gamelan",
    "Arab Takht",
    "Rock Band",
    "Piano Trio",
    "Pit Orchestra",
    "SATB Choir"
  ]);

  const CLOSE_MATCHES = Object.freeze({
    "String Quartet": Object.freeze(["Chamber Ensemble", "String Orchestra", "Orchestra"]),
    Orchestra: Object.freeze(["String Orchestra", "Chamber Ensemble", "Wind Ensemble"]),
    Duet: Object.freeze(["Trio", "Chamber Ensemble", "String Quartet"]),
    "Chamber Ensemble": Object.freeze(["String Quartet", "Trio", "Wind Ensemble"]),
    Trio: Object.freeze(["Duet", "Chamber Ensemble", "String Quartet"]),
    Gamelan: Object.freeze(["Arab Takht", "Chamber Ensemble", "Orchestra"]),
    "Arab Takht": Object.freeze(["Gamelan", "Chamber Ensemble", "Orchestra"]),
    "Jazz Band": Object.freeze(["Orchestra", "Chamber Ensemble", "Rock Band"]),
    "Pit Orchestra": Object.freeze(["Orchestra", "Wind Band", "Chamber Ensemble"]),
    "SATB Choir": Object.freeze(["Choir", "Chamber Ensemble", "Duet"]),
    Choir: Object.freeze(["SATB Choir", "Chamber Ensemble", "Trio"])
  });

  function cleanText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isVocabularyTerm(label) {
    return VOCABULARY.some((term) => cleanText(term) === cleanText(label));
  }

  function labelFromTeachingTag(tag) {
    return TAG_TO_LABEL[cleanText(tag).replace(/\s+/g, "_")] || "";
  }

  function closeMatchesFor(correctAnswer) {
    const key = VOCABULARY.find((term) => cleanText(term) === cleanText(correctAnswer));
    return key ? [...(CLOSE_MATCHES[key] || [])] : [];
  }

  function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * Build ≤4 MC options, all from vocabulary. Distractor difficulty is
   * levelled (see validateQuestion for the matching load-time rule):
   *   - "Foundation": close-match distractors are excluded outright — every
   *     option should be obviously different from the correct answer.
   *   - "Developing": no preference either way — plain shuffle of the pool,
   *     a close match may or may not turn up.
   *   - anything else (Securing/Mastering, or omitted): original behaviour —
   *     a close-match distractor is force-included and required.
   */
  function buildChoices(correctAnswer, options = {}) {
    const correct = VOCABULARY.find((term) => cleanText(term) === cleanText(correctAnswer));
    if (!correct) {
      throw new Error(`Correct answer "${correctAnswer}" is not in ensemble vocabulary.`);
    }

    const random = typeof options.random === "function" ? options.random : Math.random;
    const max = Math.min(MAX_CHOICES, Number(options.maxChoices) || MAX_CHOICES);
    const close = closeMatchesFor(correct).filter((term) => isVocabularyTerm(term) && cleanText(term) !== cleanText(correct));
    const closeKeys = new Set(close.map(cleanText));
    const level = options.level;

    if (level === "Foundation") {
      const farPool = VOCABULARY.filter((term) => cleanText(term) !== cleanText(correct) && !closeKeys.has(cleanText(term)));
      const choices = [correct, ...shuffle(farPool, random).slice(0, max - 1)];
      return shuffle(choices, random);
    }

    if (level === "Developing") {
      const pool = VOCABULARY.filter((term) => cleanText(term) !== cleanText(correct));
      const choices = [correct, ...shuffle(pool, random).slice(0, max - 1)];
      return shuffle(choices, random);
    }

    const pool = VOCABULARY.filter((term) => cleanText(term) !== cleanText(correct));
    const choices = [correct];
    if (close.length) {
      choices.push(close[0]);
    }

    for (const term of close.slice(1)) {
      if (choices.length >= max) break;
      if (!choices.some((item) => cleanText(item) === cleanText(term))) {
        choices.push(term);
      }
    }

    for (const term of shuffle(pool, random)) {
      if (choices.length >= max) break;
      if (!choices.some((item) => cleanText(item) === cleanText(term))) {
        choices.push(term);
      }
    }

    const finalChoices = shuffle(choices.slice(0, max), random);
    if (!hasCloseMatchDistractor(correct, finalChoices)) {
      throw new Error(`Failed to include a close-match distractor for ${correct}.`);
    }
    return finalChoices;
  }

  function hasCloseMatchDistractor(correctAnswer, choices) {
    const close = new Set(closeMatchesFor(correctAnswer).map(cleanText));
    return choices.some((choice) => {
      const value = cleanText(choice);
      return value !== cleanText(correctAnswer) && close.has(value);
    });
  }

  function markAnswer(selectedAnswer, question) {
    const correct = String(question?.correctAnswer || "");
    const accepted = Array.isArray(question?.acceptedAnswers) && question.acceptedAnswers.length
      ? question.acceptedAnswers
      : [correct];
    const selected = String(selectedAnswer || "").trim();
    const isCorrect = accepted.some((answer) => cleanText(answer) === cleanText(selected));
    const maxMarks = Number(question?.marks) || 1;
    return {
      selectedAnswer: selected,
      correctAnswer: correct,
      isCorrect,
      awardedMarks: isCorrect ? maxMarks : 0,
      maxMarks,
      shortComment: isCorrect
        ? "Secure ensemble recognition."
        : (question?.feedback || "Review the performing forces in the excerpt.")
    };
  }

  function validateQuestion(question) {
    if (!question || typeof question !== "object") return false;
    if (!question.id || !question.audio) return false;
    // Typed-answer questions (additive; none of the original 50 use this)
    // skip the vocabulary/choices checks below entirely — they're marked
    // by markPoints, not a closed multiple-choice set.
    if (question.responseType === "typed") {
      return Array.isArray(question.markPoints) && question.markPoints.length > 0;
    }
    // Custom-choice MC (additive, mirrors instrument-identifier's mc-custom):
    // for question sets outside the fixed ensemble-TYPE vocabulary above —
    // e.g. "which country is this ensemble from?" — where the choices are a
    // closed set the question itself supplies, not drawn from VOCABULARY.
    // Rendering/answer-marking already work purely off question.choices and
    // question.correctAnswer with no vocabulary dependency, so this is the
    // only gate that needs a bypass.
    if (question.responseType === "mc-custom") {
      return Array.isArray(question.choices)
        && question.choices.length >= 2
        && question.choices.length <= MAX_CHOICES
        && question.choices.includes(question.correctAnswer);
    }
    if (!isVocabularyTerm(question.correctAnswer)) return false;
    if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > MAX_CHOICES) {
      return false;
    }
    if (!question.choices.includes(question.correctAnswer)) return false;
    if (!question.choices.every(isVocabularyTerm)) return false;
    // Distractor difficulty is levelled: Foundation questions must be
    // obviously different (no close match at all); Developing has no
    // requirement either way; Securing/Mastering/unset keep the original
    // rule that a close-match distractor is required.
    const closeMatchPresent = hasCloseMatchDistractor(question.correctAnswer, question.choices);
    if (question.level === "Foundation") {
      if (closeMatchPresent) return false;
    } else if (question.level !== "Developing") {
      if (!closeMatchPresent) return false;
    }
    return true;
  }

  function filterByLevel(questions, levelLabel) {
    const wanted = cleanText(levelLabel);
    if (!wanted || wanted === "all" || wanted === "mixed") return [...questions];
    const matched = questions.filter((question) => cleanText(question.level) === wanted);
    return matched.length ? matched : [...questions];
  }

  /**
   * options.seenIds — Set of question ids already shown in the current spaced-repetition
   * cycle; when supplied, unseen questions are drawn before any repeat is allowed.
   */
  function pickRound(questions, count = 5, random = Math.random, options = {}) {
    const seenIds = options.seenIds instanceof Set ? options.seenIds : null;
    let pool;
    if (seenIds) {
      const unseen = questions.filter((question) => !seenIds.has(question.id));
      const alreadyShown = questions.filter((question) => seenIds.has(question.id));
      const orderedUnseen = unseen.length ? unseen : questions;
      const orderedShown = unseen.length ? alreadyShown : [];
      pool = [...shuffle(orderedUnseen, random), ...shuffle(orderedShown, random)];
    } else {
      pool = shuffle(questions, random);
    }
    const size = Math.max(1, Math.min(Number(count) || 5, pool.length));
    return pool.slice(0, size);
  }

  return {
    MAX_CHOICES,
    TAG_TO_LABEL,
    VOCABULARY,
    CLOSE_MATCHES,
    cleanText,
    isVocabularyTerm,
    labelFromTeachingTag,
    closeMatchesFor,
    buildChoices,
    hasCloseMatchDistractor,
    markAnswer,
    validateQuestion,
    filterByLevel,
    pickRound,
    shuffle
  };
});
