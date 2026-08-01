function safeString(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalisePitch(value) {
  return String(value || '').trim().toUpperCase();
}

function normaliseTextAnswer(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textMatches(answer, acceptedValues = []) {
  const clean = normaliseTextAnswer(answer);
  return acceptedValues.some((value) => clean === normaliseTextAnswer(value));
}

function textIncludes(answer, acceptedValues = []) {
  const clean = normaliseTextAnswer(answer);
  return acceptedValues.some((value) => {
    const target = normaliseTextAnswer(value);
    return target && (clean === target || clean.includes(target));
  });
}

function normaliseScoring(adapterScoring = {}, fallback = {}) {
  const fallbackTotal = Math.max(0, Number(fallback.total || 0));
  const rawMax = Number(adapterScoring.maxMarks ?? adapterScoring.total ?? fallbackTotal);
  const maxMarks = Math.max(0, Number.isFinite(rawMax) ? Math.round(rawMax) : fallbackTotal);
  const awardedMarks = clampNumber(
    adapterScoring.awardedMarks ?? adapterScoring.score ?? fallback.score,
    0,
    maxMarks || fallbackTotal || 0,
    Number(fallback.score || 0)
  );

  const pitchMarksAvailable = clampNumber(adapterScoring.pitchMarksAvailable ?? fallback.pitchMarksAvailable ?? fallbackTotal, 0, Math.max(maxMarks, fallbackTotal, 0), fallbackTotal);
  const pitchMarksAwarded = clampNumber(adapterScoring.pitchMarksAwarded ?? fallback.pitchMarksAwarded ?? fallback.score, 0, pitchMarksAvailable, Number(fallback.score || 0));
  const shapeMarksAvailable = clampNumber(adapterScoring.shapeMarksAvailable ?? fallback.shapeMarksAvailable ?? 0, 0, Math.max(0, maxMarks - pitchMarksAvailable), 0);
  const shapeMarksAwarded = clampNumber(adapterScoring.shapeMarksAwarded ?? fallback.shapeMarksAwarded ?? 0, 0, shapeMarksAvailable, 0);

  const score = Math.round(awardedMarks);
  const total = Math.round(maxMarks || fallbackTotal || 0);

  return {
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : 0,
    correct: total ? score >= total : Boolean(adapterScoring.correct),
    pitchMarksAwarded: Math.round(pitchMarksAwarded),
    pitchMarksAvailable: Math.round(pitchMarksAvailable),
    shapeMarksAwarded: Math.round(shapeMarksAwarded),
    shapeMarksAvailable: Math.round(shapeMarksAvailable),
    shortComment: safeString(adapterScoring.shortComment ?? adapterScoring.feedback, ''),
    feedback: safeString(adapterScoring.feedback ?? adapterScoring.shortComment, ''),
    matchType: safeString(adapterScoring.matchType, ''),
    modelAnswer: safeString(adapterScoring.modelAnswer, ''),
    firstWrongNote: adapterScoring.firstWrongNote || null,
    firstContourError: safeString(adapterScoring.firstContourError, ''),
    firstIntervalSizeError: safeString(adapterScoring.firstIntervalSizeError, '')
  };
}

function scorePitchList(question = {}, answers = []) {
  const slots = Array.isArray(question.correctSlots) ? question.correctSlots : [];
  const fallbackAnswers = Array.isArray(question.answerPitches) ? question.answerPitches : [];
  const correctSlots = slots.length
    ? slots
    : fallbackAnswers.map((pitch) => ({ pitch, acceptedPitches: [pitch] }));

  let score = 0;
  correctSlots.forEach((slot, index) => {
    const answer = normalisePitch(answers[index]);
    const accepted = Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
      ? slot.acceptedPitches.map(normalisePitch)
      : [normalisePitch(slot.pitch)];
    if (answer && accepted.includes(answer)) score += 1;
  });
  return { score, total: correctSlots.length };
}

function buildCumulativeResults(room, studentId) {
  const allResults = room.quizResults instanceof Map ? room.quizResults : new Map();
  const results = allResults.get(studentId);
  if (!(results instanceof Map)) return [];
  return Array.from(results.values()).sort((a, b) => Number(a.quizQuestionNumber || 0) - Number(b.quizQuestionNumber || 0));
}

function getStudentCumulative(room, studentId) {
  const results = buildCumulativeResults(room, studentId);
  const score = results.reduce((sum, result) => sum + Number(result.score || 0), 0);
  const total = results.reduce((sum, result) => sum + Number(result.total || 0), 0);
  return {
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : null,
    questionsSubmitted: results.length,
    results
  };
}

function recordQuizSubmission(room, studentId, submission) {
  if (!(room.quizResults instanceof Map)) room.quizResults = new Map();
  if (!room.quizResults.has(studentId)) room.quizResults.set(studentId, new Map());
  const studentResults = room.quizResults.get(studentId);
  const resultKey = String(submission.questionRunId || room.questionRunId || `q-${room.questionIndex || 0}`);
  const activeModuleId = room.activeQuestion?.moduleId || room.questionModuleId || room.moduleId;
  studentResults.set(resultKey, {
    ...submission,
    questionIndex: room.questionIndex,
    quizQuestionNumber: Number(room.quizQuestionNumber || 0),
    questionId: room.activeQuestion ? room.activeQuestion.id : undefined,
    moduleId: activeModuleId,
    moduleTitle: room.activeQuestion?.moduleTitle || room.moduleTitle
  });
}

function buildLeaderboard(students = []) {
  return students.slice().sort((a, b) => {
    if (Number(b.cumulativePercentage || 0) !== Number(a.cumulativePercentage || 0)) return Number(b.cumulativePercentage || 0) - Number(a.cumulativePercentage || 0);
    if (Number(b.cumulativeScore || 0) !== Number(a.cumulativeScore || 0)) return Number(b.cumulativeScore || 0) - Number(a.cumulativeScore || 0);
    if (Number(b.questionsSubmitted || 0) !== Number(a.questionsSubmitted || 0)) return Number(b.questionsSubmitted || 0) - Number(a.questionsSubmitted || 0);
    return String(a.name).localeCompare(String(b.name));
  });
}

module.exports = {
  clampNumber,
  safeString,
  normalisePitch,
  normaliseTextAnswer,
  textMatches,
  textIncludes,
  normaliseScoring,
  scorePitchList,
  buildCumulativeResults,
  getStudentCumulative,
  recordQuizSubmission,
  buildLeaderboard
};
