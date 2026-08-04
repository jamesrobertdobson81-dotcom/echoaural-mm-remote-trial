(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ExamLabMarking = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const normalise = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’']/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const splitClauses = (value) => String(value || "")
    .split(/[.!?;,\n]+|\b(?:but|however|although|yet|and then)\b/gi)
    .map(normalise)
    .filter(Boolean);

  const containsPhrase = (text, phrase) => {
    const cleanedText = normalise(text);
    const cleanedPhrase = normalise(phrase);
    return Boolean(cleanedPhrase) && ` ${cleanedText} `.includes(` ${cleanedPhrase} `);
  };

  const negationWords = new Set([
    "no", "not", "never", "without", "isnt", "doesnt", "dont", "didnt",
    "cannot", "cant", "wont", "wasnt", "werent", "hasnt", "havent"
  ]);

  function phraseIsNegated(clause, phrase) {
    const clauseTokens = normalise(clause).split(" ").filter(Boolean);
    const phraseTokens = normalise(phrase).split(" ").filter(Boolean);
    if (!phraseTokens.length) return false;

    for (let index = 0; index <= clauseTokens.length - phraseTokens.length; index += 1) {
      if (!phraseTokens.every((token, offset) => clauseTokens[index + offset] === token)) continue;
      const prefix = clauseTokens.slice(Math.max(0, index - 6), index);
      if (!prefix.some((token) => negationWords.has(token))) return false;
    }

    return true;
  }

  function findNonNegatedPhrases(answer, phrases) {
    const clauses = splitClauses(answer);
    const matches = [];
    (phrases || []).forEach((phrase) => {
      if (clauses.some((clause) => containsPhrase(clause, phrase) && !phraseIsNegated(clause, phrase))) {
        matches.push(phrase);
      }
    });
    return [...new Set(matches.map(normalise))];
  }

  function answerMatches(answer, accepted) {
    const cleaned = normalise(answer);
    if (!cleaned) return false;
    return (accepted || []).some((item) => {
      const target = normalise(item);
      return cleaned === target || findNonNegatedPhrases(answer, [item]).length > 0;
    });
  }

  function completeAnswerMatches(answer, accepted) {
    const cleaned = normalise(answer);
    if (!cleaned) return false;
    return (accepted || []).some((item) => cleaned === normalise(item));
  }

  function editDistance(left, right) {
    const a = normalise(left);
    const b = normalise(right);
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let aIndex = 1; aIndex <= a.length; aIndex += 1) {
      let diagonal = row[0];
      row[0] = aIndex;
      for (let bIndex = 1; bIndex <= b.length; bIndex += 1) {
        const previous = row[bIndex];
        row[bIndex] = Math.min(
          row[bIndex] + 1,
          row[bIndex - 1] + 1,
          diagonal + (a[aIndex - 1] === b[bIndex - 1] ? 0 : 1)
        );
        diagonal = previous;
      }
    }

    return row[b.length];
  }

  function fuzzyAnswerMatches(answer, accepted, maxDistance) {
    return splitClauses(answer).some((clause) => {
      const tokens = normalise(clause).split(" ").filter(Boolean);
      return (accepted || []).some((item) => {
        const target = normalise(item);
        return tokens.some((token) => (
          Math.abs(token.length - target.length) <= maxDistance
          && editDistance(token, target) <= maxDistance
          && !phraseIsNegated(clause, token)
        ));
      });
    });
  }

  function completeFuzzyAnswerMatches(answer, accepted, maxDistance) {
    const cleaned = normalise(answer);
    if (!cleaned) return false;
    return (accepted || []).some((item) => {
      const target = normalise(item);
      return Math.abs(cleaned.length - target.length) <= maxDistance
        && editDistance(cleaned, target) <= maxDistance;
    });
  }

  function findNonCreditIssues(question, answer) {
    const cleaned = normalise(answer);
    return (question.nonCreditRules || [])
      .filter((rule) => (rule.phrases || []).some((phrase) => {
        const target = normalise(phrase);
        return rule.exactOnly ? cleaned === target : containsPhrase(cleaned, target);
      }))
      .map((rule) => rule.feedback);
  }

  function markPointResponse(question, answer, points) {
    const details = (points || []).map((point) => {
      const matchedPhrases = findNonNegatedPhrases(answer, point.acceptedAnswers || point.keywords || []);
      return {
        id: point.id,
        label: point.label || point.id,
        explanation: point.explanation || "",
        suggestion: point.suggestion || "",
        credited: matchedPhrases.length > 0,
        matchedPhrases
      };
    });
    const credited = details.filter((detail) => detail.credited);
    const marks = Math.min(question.marks, credited.length);
    const issues = findNonCreditIssues(question, answer);

    credited.forEach((detail) => {
      if (detail.matchedPhrases.length > 1) {
        issues.push(`Repeated wording for ${detail.label.toLowerCase()} counts as one point.`);
      }
    });

    return {
      marks,
      correct: marks === question.marks,
      evidence: credited.map((detail) => detail.id),
      details,
      issues: [...new Set(issues)]
    };
  }

  function getPassageTexts(answer, firstMarkers = [], secondMarkers = []) {
    const prepared = String(answer || "")
      .replace(/,\s*(?=(?:whereas\s+)?(?:at\s+)?(?:30|65)\b)/gi, ". ");
    const clauses = prepared
      .split(/[.!?;\n]+|\b(?:whereas|whilst|while|compared with|compared to|in contrast(?: to)?|but)\b/gi)
      .map(normalise)
      .filter(Boolean);
    const passages = { first: [], second: [] };
    let activePassages = [];

    clauses.forEach((clause) => {
      const firstMentioned = firstMarkers.some((marker) => containsPhrase(clause, marker));
      const secondMentioned = secondMarkers.some((marker) => containsPhrase(clause, marker));
      if (firstMentioned || secondMentioned) {
        activePassages = [];
        if (firstMentioned) activePassages.push("first");
        if (secondMentioned) activePassages.push("second");
      }
      activePassages.forEach((passage) => passages[passage].push(clause));
    });

    return {
      first: passages.first.join(". "),
      second: passages.second.join(". ")
    };
  }

  function pairedComparisonResponse(question, answer) {
    const passageTexts = getPassageTexts(answer, question.firstPassageMarkers, question.secondPassageMarkers);
    const details = question.pairedComparisonPoints.map((point) => {
      const directMatches = findNonNegatedPhrases(answer, point.directComparisons || []);
      const firstMatches = findNonNegatedPhrases(passageTexts.first, point.firstPassageAnswers || []);
      const secondMatches = findNonNegatedPhrases(passageTexts.second, point.secondPassageAnswers || []);
      return {
        id: point.id,
        label: point.label || point.id,
        explanation: point.explanation || "",
        suggestion: point.suggestion || "",
        credited: directMatches.length > 0 || (firstMatches.length > 0 && secondMatches.length > 0),
        matchedPhrases: [...directMatches, ...firstMatches, ...secondMatches],
        firstPassageMatched: firstMatches.length > 0,
        secondPassageMatched: secondMatches.length > 0
      };
    });
    const credited = details.filter((detail) => detail.credited);
    const marks = Math.min(question.marks, credited.length);
    const issues = findNonCreditIssues(question, answer);
    if (details.some((detail) => !detail.credited && (detail.firstPassageMatched || detail.secondPassageMatched))) {
      issues.push(question.incompleteComparisonFeedback || "Each point must compare both passages.");
    }

    return {
      marks,
      correct: marks === question.marks,
      evidence: credited.map((detail) => detail.id),
      details,
      issues: [...new Set(issues)]
    };
  }

  function linkedExplanationResponse(question, answer) {
    const base = markPointResponse(question, answer, question.markPoints);
    const feature = base.details.find((detail) => detail.id === "feature");
    const effect = base.details.find((detail) => detail.id === "effect");
    const featureCredited = Boolean(feature?.credited);
    const effectRecognised = Boolean(effect?.credited);
    if (effect) effect.credited = featureCredited && effectRecognised;
    const marks = featureCredited ? 1 + (effectRecognised ? 1 : 0) : 0;
    const issues = [...base.issues];
    if (effectRecognised && !featureCredited) issues.push("Link the effect to an accurate musical feature.");
    return {
      marks,
      correct: marks === question.marks,
      evidence: base.details.filter((detail) => detail.credited).map((detail) => detail.id),
      details: base.details,
      issues: [...new Set(issues)]
    };
  }

  function markQuestion(question, answer) {
    if (question.responseType === "multiple-choice" || question.responseType === "rhythm-choice") {
      const correct = normalise(answer) === normalise(question.correctChoice)
        || (question.strictAnswerMatch
          ? completeAnswerMatches(answer, question.acceptedAnswers)
          : answerMatches(answer, question.acceptedAnswers));
      return { marks: correct ? question.marks : 0, correct, evidence: [], details: [], issues: [] };
    }

    if (Array.isArray(question.pairedComparisonPoints)) {
      return pairedComparisonResponse(question, answer);
    }

    if (question.linkedExplanation) {
      return linkedExplanationResponse(question, answer);
    }

    if (Array.isArray(question.markPoints)) {
      return markPointResponse(question, answer, question.markPoints);
    }

    if (question.responseType === "extended-text") {
      return markPointResponse(question, answer, question.reasonCategories);
    }

    if (Array.isArray(question.markComponents)) {
      return markPointResponse(question, answer, question.markComponents);
    }

    const answerMatcher = question.strictAnswerMatch ? completeAnswerMatches : answerMatches;
    const fuzzyMatcher = question.strictAnswerMatch ? completeFuzzyAnswerMatches : fuzzyAnswerMatches;
    const correct = answerMatcher(answer, question.acceptedAnswers)
      || (question.acceptMisspellings && fuzzyMatcher(answer, question.acceptedAnswers, question.maxEditDistance || 1));
    return { marks: correct ? question.marks : 0, correct, evidence: [], details: [], issues: [] };
  }

  return Object.freeze({
    normalise,
    containsPhrase,
    findNonNegatedPhrases,
    answerMatches,
    completeAnswerMatches,
    fuzzyAnswerMatches,
    completeFuzzyAnswerMatches,
    markQuestion
  });
});
