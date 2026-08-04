(function initExamLabCore(root, factory) {
  const marking = typeof module === "object" && module.exports
    ? require("../marking.js")
    : root.ExamLabMarking;
  const api = factory(marking);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ExamLabCore = api;
})(typeof window !== "undefined" ? window : globalThis, (marking) => {
  "use strict";

  if (!marking || typeof marking.markQuestion !== "function") {
    throw new Error("Exam Lab marking support is required.");
  }

  const { normalise, markQuestion } = marking;

  function cleanText(value, maximum = 2000) {
    return String(value ?? "").trim().slice(0, maximum);
  }

  function publicQuestionId(index) {
    return `question-${Number(index) + 1}`;
  }

  function moduleAssetPath(value) {
    const raw = cleanText(value, 500);
    if (!raw || /^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return raw;
    return `/modules/exam-lab/${raw.replace(/^\.\//, "")}`;
  }

  function validateExtract(extract) {
    if (!extract || typeof extract !== "object") throw new Error("Invalid Exam Lab extract.");
    const questions = Array.isArray(extract.questions) ? extract.questions : [];
    if (!extract.id || !questions.length) throw new Error("Exam Lab extract data is incomplete.");

    const ids = new Set();
    let derivedMaximum = 0;
    questions.forEach((question, index) => {
      if (!question?.id || ids.has(question.id)) throw new Error(`Invalid Exam Lab question at position ${index + 1}.`);
      if (!question.prompt || !question.responseType) throw new Error(`Exam Lab question ${question.id} is incomplete.`);
      const marks = Number(question.marks);
      if (!Number.isFinite(marks) || marks < 1) throw new Error(`Exam Lab question ${question.id} has invalid marks.`);
      ids.add(question.id);
      derivedMaximum += marks;
    });

    if (Number(extract.totalMarks) !== derivedMaximum) {
      throw new Error(`Exam Lab extract ${extract.id} totals ${derivedMaximum}, not ${extract.totalMarks}.`);
    }

    return { extract, questions, derivedMaximum };
  }

  function serialisePublicQuestion(question, index) {
    const responseType = cleanText(question.responseType, 40);
    return {
      id: publicQuestionId(index),
      number: Number(question.number || index + 1),
      prompt: cleanText(question.prompt, 1000),
      responseType,
      options: responseType === "multiple-choice"
        ? (Array.isArray(question.options) ? question.options.map((option) => cleanText(option, 240)) : [])
        : [],
      placeholder: cleanText(question.placeholder, 240),
      marks: Number(question.marks || 1)
    };
  }

  function serialisePublicExtract(extract, options = {}) {
    validateExtract(extract);
    const includeAudio = Boolean(options.includeAudio);
    return {
      activityType: "exam_lab",
      title: "Exam Lab listening extract",
      description: "Cambridge-style listening questions based on one complete extract.",
      totalMarks: Number(extract.totalMarks || 0),
      maxPlays: Number(extract.maxPlays || 1),
      questionCount: extract.questions.length,
      score: extract.score ? moduleAssetPath(options.scoreUrl || "") : "",
      scoreAlt: extract.score ? "Printed score for the listening extract." : "",
      scoreRequired: Boolean(extract.scoreRequired || extract.score),
      questions: extract.questions.map(serialisePublicQuestion),
      ...(includeAudio ? { audio: moduleAssetPath(options.audioUrl || "") } : {})
    };
  }

  function answerEntries(rawAnswers) {
    if (Array.isArray(rawAnswers)) return rawAnswers;
    if (rawAnswers && typeof rawAnswers === "object") {
      return Object.entries(rawAnswers).map(([questionId, answer]) => ({ questionId, answer }));
    }
    throw new Error("Answers must be submitted as a question list.");
  }

  function normaliseAnswers(extract, rawAnswers, options = {}) {
    const { questions } = validateExtract(extract);
    const entries = answerEntries(rawAnswers);
    if (entries.length > questions.length) throw new Error("The answer list contains unexpected questions.");

    const acceptedIds = new Map();
    questions.forEach((question, index) => {
      acceptedIds.set(publicQuestionId(index), index);
      if (options.allowInternalIds) acceptedIds.set(question.id, index);
    });

    const answers = Array.from({ length: questions.length }, () => "");
    const seen = new Set();
    entries.forEach((entry) => {
      const suppliedId = cleanText(entry?.questionId ?? entry?.id, 120);
      const index = acceptedIds.get(suppliedId);
      if (!Number.isInteger(index) || seen.has(index)) throw new Error("The answer list contains an invalid question reference.");
      const value = entry?.answer;
      if (value !== null && value !== undefined && typeof value !== "string" && typeof value !== "number") {
        throw new Error("An answer has an invalid format.");
      }
      answers[index] = cleanText(value, 2000);
      seen.add(index);
    });

    if (options.requireComplete !== false) {
      const missing = answers.some((answer) => !normalise(answer));
      if (seen.size !== questions.length || missing) throw new Error("Answer every question before submitting.");
    }

    return answers;
  }

  function safeRoute(route = {}) {
    return {
      module: cleanText(route.module, 120),
      path: cleanText(route.path, 300),
      status: route.status === "live" ? "live" : "planned",
      focus: cleanText(route.focus, 300)
    };
  }

  function feedbackFor(question, outcome) {
    if (outcome.correct) return cleanText(question.feedback || "Correct.", 1000);
    if (outcome.marks > 0) return `Partial credit awarded: ${outcome.marks} of ${question.marks} marks.`;
    return cleanText(question.feedback || `Review the model answer: ${question.modelAnswer || ""}`, 1000);
  }

  function buildSkillOutcomes(outcomes) {
    const skills = new Map();
    outcomes.forEach((outcome) => {
      outcome.skills.forEach((skill) => {
        const current = skills.get(skill) || { skill, awarded: 0, available: 0, questions: 0 };
        current.awarded += outcome.marks;
        current.available += outcome.maxMarks;
        current.questions += 1;
        skills.set(skill, current);
      });
    });
    return Array.from(skills.values()).map((skill) => ({
      ...skill,
      percentage: skill.available ? Math.round((skill.awarded / skill.available) * 100) : 0,
      secure: skill.available > 0 && skill.awarded >= skill.available
    }));
  }

  function buildRecommendations(outcomes) {
    const recommendations = new Map();
    outcomes.filter((outcome) => outcome.marks < outcome.maxMarks).forEach((outcome) => {
      const route = outcome.route;
      const key = route.module || `unresolved-${outcome.publicQuestionId}`;
      const current = recommendations.get(key) || {
        route,
        skills: new Set(),
        questionNumbers: new Set(),
        reason: ""
      };
      outcome.skills.forEach((skill) => current.skills.add(skill));
      current.questionNumbers.add(outcome.number);
      current.reason = route.focus || `Review Question ${outcome.number}.`;
      recommendations.set(key, current);
    });
    return Array.from(recommendations.values()).map((item) => ({
      route: item.route,
      skills: Array.from(item.skills),
      questionNumbers: Array.from(item.questionNumbers),
      reason: item.reason
    }));
  }

  function sourceTitle(extract) {
    const source = extract.source || {};
    return [source.composer, source.work, source.movement].map((item) => cleanText(item, 240)).filter(Boolean).join(" — ");
  }

  function markExtract(extract, rawAnswers, options = {}) {
    const { questions } = validateExtract(extract);
    const answers = normaliseAnswers(extract, rawAnswers, options);
    const outcomes = questions.map((question, index) => {
      const markingResult = markQuestion(question, answers[index]);
      const marks = Math.max(0, Math.min(Number(question.marks || 0), Number(markingResult.marks || 0)));
      const details = Array.isArray(markingResult.details) ? markingResult.details.map((detail) => ({
        id: cleanText(detail.id, 120),
        label: cleanText(detail.label, 500),
        explanation: cleanText(detail.explanation, 1000),
        suggestion: cleanText(detail.suggestion, 1000),
        credited: Boolean(detail.credited),
        matchedPhrases: Array.isArray(detail.matchedPhrases) ? detail.matchedPhrases.map((phrase) => cleanText(phrase, 240)) : []
      })) : [];
      const outcome = {
        internalQuestionId: question.id,
        publicQuestionId: publicQuestionId(index),
        number: Number(question.number || index + 1),
        prompt: cleanText(question.prompt, 1000),
        responseType: cleanText(question.responseType, 40),
        answer: answers[index],
        marks,
        maxMarks: Number(question.marks || 0),
        correct: marks >= Number(question.marks || 0),
        correctResponse: cleanText(question.modelAnswer || question.correctChoice, 1000),
        evidence: Array.isArray(markingResult.evidence) ? markingResult.evidence.map((item) => cleanText(item, 120)) : [],
        details,
        missingMarkPoints: details.filter((detail) => !detail.credited).map((detail) => detail.label),
        issues: Array.isArray(markingResult.issues) ? markingResult.issues.map((issue) => cleanText(issue, 1000)) : [],
        skills: Array.isArray(question.skills) ? question.skills.map((skill) => cleanText(skill, 120)).filter(Boolean) : [],
        route: safeRoute(question.route)
      };
      outcome.feedback = feedbackFor(question, outcome);
      return outcome;
    });

    const score = outcomes.reduce((total, outcome) => total + outcome.marks, 0);
    const maximumScore = Number(extract.totalMarks || outcomes.reduce((total, outcome) => total + outcome.maxMarks, 0));
    return {
      internalExtractId: extract.id,
      displayTitle: "Exam Lab listening extract",
      sourceTitle: sourceTitle(extract),
      score,
      maximumScore,
      percentage: maximumScore ? Math.round((score / maximumScore) * 100) : 0,
      outcomes,
      skillOutcomes: buildSkillOutcomes(outcomes),
      recommendations: buildRecommendations(outcomes)
    };
  }

  function studentResult(privateResult) {
    if (!privateResult) return null;
    return {
      title: privateResult.displayTitle,
      sourceTitle: privateResult.sourceTitle,
      score: privateResult.score,
      maximumScore: privateResult.maximumScore,
      percentage: privateResult.percentage,
      outcomes: privateResult.outcomes.map((outcome) => ({
        questionId: outcome.publicQuestionId,
        number: outcome.number,
        prompt: outcome.prompt,
        answer: outcome.answer,
        marks: outcome.marks,
        maxMarks: outcome.maxMarks,
        correct: outcome.correct,
        correctResponse: outcome.correctResponse,
        feedback: outcome.feedback,
        missingMarkPoints: outcome.missingMarkPoints,
        issues: outcome.issues,
        details: outcome.details.map((detail) => ({
          label: detail.label,
          explanation: detail.explanation,
          suggestion: detail.suggestion,
          credited: detail.credited
        })),
        skills: outcome.skills,
        route: outcome.route
      })),
      skillOutcomes: privateResult.skillOutcomes,
      recommendations: privateResult.recommendations
    };
  }

  function buildClassAnalysis(extract, students = []) {
    validateExtract(extract);
    const joined = students.length;
    const submittedStudents = students.filter((student) => student.privateResult);
    const submitted = submittedStudents.length;
    const totalAwarded = submittedStudents.reduce((total, student) => total + Number(student.privateResult.score || 0), 0);
    const totalPossible = submitted * Number(extract.totalMarks || 0);

    const questions = extract.questions.map((question, index) => {
      const outcomes = submittedStudents.map((student) => student.privateResult.outcomes[index]).filter(Boolean);
      const awarded = outcomes.reduce((total, outcome) => total + Number(outcome.marks || 0), 0);
      const available = submitted * Number(question.marks || 0);
      return {
        questionId: publicQuestionId(index),
        number: Number(question.number || index + 1),
        prompt: cleanText(question.prompt, 1000),
        marks: Number(question.marks || 0),
        successPercentage: available ? Math.round((awarded / available) * 100) : 0,
        fullyCorrect: outcomes.filter((outcome) => outcome.marks >= outcome.maxMarks).length,
        partiallyCorrect: outcomes.filter((outcome) => outcome.marks > 0 && outcome.marks < outcome.maxMarks).length,
        incorrect: outcomes.filter((outcome) => outcome.marks <= 0).length,
        unanswered: Math.max(0, joined - outcomes.length),
        skills: Array.isArray(question.skills) ? question.skills.map((skill) => cleanText(skill, 120)) : []
      };
    });

    const skillMap = new Map();
    submittedStudents.forEach((student) => {
      student.privateResult.skillOutcomes.forEach((skill) => {
        const current = skillMap.get(skill.skill) || { skill: skill.skill, awarded: 0, available: 0, affectedStudents: new Set() };
        current.awarded += Number(skill.awarded || 0);
        current.available += Number(skill.available || 0);
        if (!skill.secure) current.affectedStudents.add(student.name);
        skillMap.set(skill.skill, current);
      });
    });
    const skills = Array.from(skillMap.values()).map((skill) => ({
      skill: skill.skill,
      awarded: skill.awarded,
      available: skill.available,
      percentage: skill.available ? Math.round((skill.awarded / skill.available) * 100) : 0,
      affectedStudents: Array.from(skill.affectedStudents)
    }));

    const routeMap = new Map();
    submittedStudents.forEach((student) => {
      student.privateResult.recommendations.forEach((recommendation) => {
        const key = recommendation.route.module || recommendation.reason;
        const current = routeMap.get(key) || {
          route: recommendation.route,
          skills: new Set(),
          affectedStudents: new Set(),
          reasons: new Set()
        };
        recommendation.skills.forEach((skill) => current.skills.add(skill));
        current.affectedStudents.add(student.name);
        current.reasons.add(recommendation.reason);
        routeMap.set(key, current);
      });
    });

    return {
      title: "Exam Lab Live Session",
      sourceTitle: sourceTitle(extract),
      totalMarks: Number(extract.totalMarks || 0),
      joined,
      submitted,
      classAverage: totalPossible ? Math.round((totalAwarded / totalPossible) * 100) : 0,
      totalAwarded,
      totalPossible,
      questions,
      skills,
      individuals: students.map((student) => ({
        id: student.id,
        name: student.name,
        submitted: Boolean(student.privateResult),
        result: studentResult(student.privateResult)
      })),
      recommendations: Array.from(routeMap.values()).map((item) => ({
        route: item.route,
        skills: Array.from(item.skills),
        affectedStudents: Array.from(item.affectedStudents),
        reasons: Array.from(item.reasons)
      }))
    };
  }

  return Object.freeze({
    publicQuestionId,
    moduleAssetPath,
    validateExtract,
    serialisePublicQuestion,
    serialisePublicExtract,
    normaliseAnswers,
    markExtract,
    studentResult,
    buildSkillOutcomes,
    buildRecommendations,
    buildClassAnalysis
  });
});
