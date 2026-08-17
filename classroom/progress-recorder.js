'use strict';

const { buildCumulativeResults } = require('./scoring');
const { enrichAnswerData } = require('../shared/js/skill-metadata');

const MODULE_TITLES = {
  mixed: 'Mixed Apps',
  'melody-master': 'Melodic Dictation',
  'melodic-intervals': 'Melodic Intervals',
  'instrument-identifier': 'Instrument Identifier',
  'texture-trainer': 'Texture Trainer',
  'meter-master': 'Meter Master',
  'cadence-coach': 'Cadence Coach',
  'musical-language': 'ScoreDecoder Vocabulary',
  'ensemble-recognition': 'Ensemble Recognition',
  'key-signature-sprint': 'Key Signature Sprint',
  'exam-lab': 'Exam Lab'
};

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function cleanText(value, maximum = 1000) {
  return String(value || '').trim().slice(0, maximum);
}

function cleanJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const encoded = JSON.stringify(value);
    if (Buffer.byteLength(encoded) > 24_000) return {};
    return value;
  } catch (_error) {
    return {};
  }
}

function percentage(score, maximumScore) {
  return maximumScore > 0 ? Math.round((score / maximumScore) * 100) : 0;
}

function buildRoundFeedback(score, maximumScore, questionCount) {
  const value = percentage(score, maximumScore);
  const suffix = `${questionCount} ${questionCount === 1 ? 'question' : 'questions'} completed in Teacher Mode.`;
  if (value >= 85) return `Excellent listening accuracy. ${suffix}`;
  if (value >= 70) return `Strong listening progress. Review any missed answers, then repeat a short round. ${suffix}`;
  if (value >= 50) return `Developing well. Revisit the feedback for incorrect answers and practise the weakest feature. ${suffix}`;
  return `Keep building recognition through short, repeated listening rounds. Review the model answers before trying again. ${suffix}`;
}

function buildAnswerData(room, rawQuestion, result) {
  const moduleId = result.moduleId || room.questionModuleId || room.moduleId;
  const answerData = {
    ...cleanJson(result.answerData),
    source: 'teacher_mode',
    roomCode: room.code,
    classroomRoundId: Number(room.roundId || 1),
    moduleId,
    moduleTitle: cleanText(result.moduleTitle || MODULE_TITLES[moduleId] || moduleId, 120),
    quizQuestionNumber: Number(result.quizQuestionNumber || 0),
    questionIndex: Number(result.questionIndex || 0),
    answer: cleanText(result.answer, 500),
    answers: Array.isArray(result.answers) ? result.answers.slice(0, 30).map((item) => cleanText(item, 120)) : [],
    correct: Boolean(result.correct),
    matchType: cleanText(result.matchType, 80),
    modelAnswer: cleanText(result.modelAnswer, 500),
    pitchMarksAwarded: number(result.pitchMarksAwarded),
    pitchMarksAvailable: number(result.pitchMarksAvailable),
    shapeMarksAwarded: number(result.shapeMarksAwarded),
    shapeMarksAvailable: number(result.shapeMarksAvailable),
    firstWrongNote: result.firstWrongNote ?? null,
    firstContourError: cleanText(result.firstContourError, 500),
    firstIntervalSizeError: cleanText(result.firstIntervalSizeError, 500)
  };

  // Several modules (melody-master, musical-language, era-explorer) cover
  // more than one Progress Mode sub-app/area and already tag each question
  // with the finer sourceKey their own teacher-adapter uses (see e.g.
  // modules/melody-master/teacher-adapter.js's cachedQuestions mapping) —
  // carried through here so server-side aggregation (accounts/account-
  // server.js's buildProgressSummary) can attribute marks to the correct
  // sub-app/area instead of only the coarser moduleId. No-op for every
  // other module, whose question objects have no sourceKey at all.
  if (rawQuestion?.sourceKey) {
    answerData.sourceKey = cleanText(rawQuestion.sourceKey, 80);
  }

  if (moduleId === 'instrument-identifier') {
    answerData.family = cleanText(rawQuestion?.family, 120);
    answerData.difficulty = cleanText(rawQuestion?.difficulty, 120);
    answerData.type = cleanText(rawQuestion?.type, 120);
  }

  if (moduleId === 'melodic-intervals') {
    answerData.intervalCorrect = Boolean(result.correct);
    answerData.mode = 'recognition';
    answerData.intervalLabel = cleanText(rawQuestion?.intervalLabel || result.modelAnswer, 120);
    answerData.intervalFullLabel = cleanText(rawQuestion?.intervalFullLabel || result.modelAnswer, 120);
    answerData.intervalQuality = cleanText(rawQuestion?.intervalQuality, 80);
    answerData.answerMode = cleanText(rawQuestion?.answerMode, 80);
    answerData.direction = cleanText(rawQuestion?.direction, 80);
    answerData.level = cleanText(rawQuestion?.level, 80);
    answerData.levelKey = cleanText(rawQuestion?.levelKey, 80);
    answerData.progressionLevel = rawQuestion?.levelIndex ?? null;
    answerData.keySignatureLabel = cleanText(rawQuestion?.keySignatureLabel, 120);
  }

  if (moduleId === 'texture-trainer') {
    answerData.textureFocus = cleanText(rawQuestion?.textureFocus, 240);
  }

  return cleanJson(answerData);
}

function buildTeacherModeRoundPayload(room, roomManager, participant) {
  if (!room || !roomManager || !participant?.accountStudentId || !participant?.accountTeacherId) return null;

  const results = buildCumulativeResults(room, participant.id);

  if (room.moduleId === 'exam-lab') {
    const privateResult = room.submissions.get(participant.id)?.privateResult
      || results.find((result) => result.privateResult)?.privateResult
      || null;
    const extract = roomManager.getQuestion(room, room.examLab?.extractIndex || room.questionIndex || 0, 'exam-lab');
    if (!extract || !Array.isArray(extract.questions)) return null;
    const submitted = Boolean(privateResult && Array.isArray(privateResult.outcomes));
    const source = extract.source || {};
    const sourceTitle = submitted
      ? privateResult.sourceTitle
      : [source.composer, source.work, source.movement].map((item) => cleanText(item, 240)).filter(Boolean).join(' — ');
    const outcomes = submitted ? privateResult.outcomes : extract.questions.map((question, index) => {
      const points = question.markPoints || question.markComponents || question.reasonCategories || [];
      return {
        internalQuestionId: question.id,
        publicQuestionId: `question-${index + 1}`,
        number: Number(question.number || index + 1),
        prompt: question.prompt,
        responseType: question.responseType,
        answer: '',
        marks: 0,
        maxMarks: Number(question.marks || 0),
        correct: false,
        correctResponse: question.modelAnswer || question.correctChoice || '',
        evidence: [],
        details: points.map((point) => ({
          label: point.label || point.id || 'Required musical point',
          explanation: point.explanation || '',
          suggestion: point.suggestion || '',
          credited: false
        })),
        missingMarkPoints: points.map((point) => point.label || point.id || 'Required musical point'),
        issues: ['No answer was submitted before the session finished.'],
        skills: Array.isArray(question.skills) ? question.skills : [],
        route: question.route || {},
        feedback: 'No answer was submitted before the session finished.'
      };
    });
    const questions = outcomes.map((outcome) => ({
      moduleId: 'exam-lab',
      moduleTitle: 'Exam Lab',
      questionId: cleanText(outcome.internalQuestionId, 120),
      score: number(outcome.marks),
      maximumScore: number(outcome.maxMarks),
      feedback: cleanText(outcome.feedback, 1000),
      answerData: cleanJson(enrichAnswerData(outcome.internalQuestionId, {
        source: 'classroom_live',
        submitted,
        roomCode: room.code,
        classroomRoundId: Number(room.roundId || 1),
        extractId: cleanText(privateResult?.internalExtractId || extract.id, 120),
        questionId: cleanText(outcome.publicQuestionId, 120),
        questionNumber: Number(outcome.number || 0),
        title: `Question ${Number(outcome.number || 0)}`,
        prompt: cleanText(outcome.prompt, 1000),
        responseType: cleanText(outcome.responseType, 80),
        answer: cleanText(outcome.answer, 2000),
        correctResponse: cleanText(outcome.correctResponse, 1000),
        correct: Boolean(outcome.correct),
        evidence: Array.isArray(outcome.evidence) ? outcome.evidence.slice(0, 20).map((item) => cleanText(item, 120)) : [],
        details: Array.isArray(outcome.details) ? outcome.details.slice(0, 20).map((detail) => ({
          label: cleanText(detail.label, 500),
          explanation: cleanText(detail.explanation, 1000),
          suggestion: cleanText(detail.suggestion, 1000),
          credited: Boolean(detail.credited)
        })) : [],
        missingMarkPoints: Array.isArray(outcome.missingMarkPoints) ? outcome.missingMarkPoints.slice(0, 20).map((item) => cleanText(item, 500)) : [],
        issues: Array.isArray(outcome.issues) ? outcome.issues.slice(0, 20).map((item) => cleanText(item, 1000)) : [],
        skills: Array.isArray(outcome.skills) ? outcome.skills.slice(0, 20).map((item) => cleanText(item, 120)) : [],
        route: outcome.route && typeof outcome.route === 'object' ? {
          module: cleanText(outcome.route.module, 120),
          path: cleanText(outcome.route.path, 300),
          status: outcome.route.status === 'live' ? 'live' : 'planned',
          focus: cleanText(outcome.route.focus, 300)
        } : {}
      }))
    }));
    const score = questions.reduce((sum, question) => sum + question.score, 0);
    const maximumScore = questions.reduce((sum, question) => sum + question.maximumScore, 0);
    return {
      teacherId: participant.accountTeacherId,
      studentId: participant.accountStudentId,
      moduleId: 'exam-lab',
      moduleTitle: 'Exam Lab',
      score,
      maximumScore,
      questions,
      roundFeedback: buildRoundFeedback(score, maximumScore, questions.length),
      metadata: {
        source: 'teacher_mode',
        attemptSource: 'classroom_live',
        roomCode: room.code,
        classroomRoundId: Number(room.roundId || 1),
        moduleId: 'exam-lab',
        activityType: 'exam_lab',
        extractId: cleanText(privateResult?.internalExtractId || extract.id, 120),
        sourceTitle: cleanText(sourceTitle, 500),
        classId: cleanText(room.classId, 120),
        className: cleanText(room.className, 120),
        submitted,
        teacherMode: true,
        feedbackReleased: Boolean(room.quizEnded),
        // Exam Lab's `questions` array already always covers the full
        // extract (unanswered questions are padded above as explicit
        // zero-score entries), so this always equals questions.length here
        // — present for a consistent field shape with the general path
        // below, where it can genuinely differ from questions.length.
        configuredQuestionCount: questions.length
      },
      clientRoundId: `teacher-mode:${room.code}:${Number(room.roundId || 1)}:${participant.accountStudentId}`
    };
  }

  if (!results.length) return null;

  const questions = results.map((result, index) => {
    const resultModuleId = result.moduleId || room.moduleId;
    const rawQuestion = roomManager.getQuestion(room, result.questionIndex, resultModuleId);
    const maximumScore = number(result.total);
    return {
      moduleId: resultModuleId,
      moduleTitle: cleanText(result.moduleTitle || MODULE_TITLES[resultModuleId] || resultModuleId, 120),
      questionId: cleanText(result.questionId || rawQuestion?.id || `Q${index + 1}`, 120),
      score: Math.min(number(result.score), maximumScore || Number.MAX_SAFE_INTEGER),
      maximumScore,
      feedback: cleanText(result.feedback || result.shortComment, 1000),
      answerData: enrichAnswerData(
        result.questionId || rawQuestion?.id || `Q${index + 1}`,
        buildAnswerData(room, rawQuestion, result)
      )
    };
  });

  const score = questions.reduce((sum, question) => sum + question.score, 0);
  const maximumScore = questions.reduce((sum, question) => sum + question.maximumScore, 0);
  const moduleTitle = MODULE_TITLES[room.moduleId] || cleanText(room.moduleTitle, 120) || room.moduleId;

  return {
    teacherId: participant.accountTeacherId,
    studentId: participant.accountStudentId,
    moduleId: room.moduleId,
    moduleTitle,
    score,
    maximumScore,
    questions,
    roundFeedback: buildRoundFeedback(score, maximumScore, questions.length),
    metadata: {
      source: 'teacher_mode',
      roomCode: room.code,
      classroomRoundId: Number(room.roundId || 1),
      moduleId: room.moduleId,
      mixedModuleIds: Array.isArray(room.mixedModuleIds) ? room.mixedModuleIds.slice() : [],
      teacherMode: true,
      questionLevel: cleanText(room.questionLevel, 80),
      questionSetPurpose: cleanText(room.questionSetSpec?.purpose, 80),
      questionSetStrategy: cleanText(room.questionSetSpec?.strategy, 80),
      questionSetSeed: cleanText(room.questionSetSpec?.seed, 160),
      classId: cleanText(room.classId, 120),
      className: cleanText(room.className, 120),
      // The room's configured round length — distinct from questions.length
      // above, which only ever contains entries a student actually
      // submitted (see classroom/scoring.js's buildCumulativeResults). In a
      // teacher-paced room a student who's still working when the teacher
      // advances legitimately has fewer submissions than this. Kept here in
      // metadata rather than changing questions/score/maximumScore, so
      // accuracy stays based only on what a student actually attempted —
      // this is purely for the dashboard to show "9 of 10 questions"
      // instead of silently showing "9 questions".
      configuredQuestionCount: Number(room.quizTotal || questions.length)
    },
    clientRoundId: `teacher-mode:${room.code}:${Number(room.roundId || 1)}:${participant.accountStudentId}`
  };
}

async function saveRoundPayload(payload) {
  if (!payload) return { saved: false, reason: 'no-results' };

  const { getPool } = require('../db/pool');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const studentCheck = await client.query(`
      SELECT id
      FROM students
      WHERE id = $1
        AND teacher_id = $2
        AND active = TRUE
      LIMIT 1
    `, [payload.studentId, payload.teacherId]);

    if (!studentCheck.rows[0]) {
      await client.query('ROLLBACK');
      return { saved: false, reason: 'student-not-active' };
    }

    const existing = await client.query(`
      SELECT id
      FROM rounds
      WHERE student_id = $1 AND client_round_id = $2
      LIMIT 1
    `, [payload.studentId, payload.clientRoundId]);

    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return { saved: true, duplicate: true, roundId: existing.rows[0].id };
    }

    const roundResult = await client.query(`
      INSERT INTO rounds (
        teacher_id,
        student_id,
        module_id,
        module_title,
        score,
        maximum_score,
        question_count,
        round_feedback,
        metadata,
        client_round_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, completed_at
    `, [
      payload.teacherId,
      payload.studentId,
      payload.moduleId,
      payload.moduleTitle,
      payload.score,
      payload.maximumScore,
      payload.questions.length,
      payload.roundFeedback || null,
      payload.metadata,
      payload.clientRoundId
    ]);

    const round = roundResult.rows[0];
    for (const question of payload.questions) {
      await client.query(`
        INSERT INTO attempts (
          teacher_id,
          student_id,
          round_id,
          module_id,
          question_id,
          score,
          maximum_score,
          feedback,
          answer_data,
          completed_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        payload.teacherId,
        payload.studentId,
        round.id,
        question.moduleId || payload.moduleId,
        question.questionId || null,
        question.score,
        question.maximumScore,
        question.feedback || null,
        question.answerData,
        round.completed_at
      ]);
    }

    await client.query('COMMIT');
    return { saved: true, roundId: round.id, completedAt: round.completed_at };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return { saved: true, duplicate: true };
    throw error;
  } finally {
    client.release();
  }
}

async function saveTeacherModeProgress(room, roomManager) {
  const participants = Array.from(room?.students?.values?.() || [])
    .filter((student) => student.accountStudentId && student.accountTeacherId);

  const summary = {
    attempted: participants.length,
    saved: 0,
    duplicates: 0,
    skipped: 0,
    errors: []
  };

  for (const participant of participants) {
    const payload = buildTeacherModeRoundPayload(room, roomManager, participant);
    if (!payload) {
      summary.skipped += 1;
      continue;
    }

    try {
      const result = await saveRoundPayload(payload);
      if (result.saved) summary.saved += 1;
      if (result.duplicate) summary.duplicates += 1;
      if (!result.saved) summary.skipped += 1;
    } catch (error) {
      console.error('[EchoAural classroom progress] Could not save student round:', error);
      summary.errors.push({ studentId: participant.accountStudentId, message: error.message || 'Save failed.' });
    }
  }

  room.lastProgressSave = {
    at: new Date().toISOString(),
    ...summary
  };

  return summary;
}

module.exports = {
  buildTeacherModeRoundPayload,
  saveTeacherModeProgress
};
