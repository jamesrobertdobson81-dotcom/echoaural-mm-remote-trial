'use strict';

const { buildCumulativeResults } = require('./scoring');

const MODULE_TITLES = {
  'melody-master': 'Melodic Dictation',
  'melodic-intervals': 'Melodic Intervals',
  'instrument-identifier': 'Instrument Identifier',
  'texture-trainer': 'Texture Trainer'
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
  const moduleId = room.moduleId;
  const answerData = {
    source: 'teacher_mode',
    roomCode: room.code,
    classroomRoundId: Number(room.roundId || 1),
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

  if (moduleId === 'instrument-identifier') {
    answerData.family = cleanText(rawQuestion?.family, 120);
    answerData.difficulty = cleanText(rawQuestion?.difficulty, 120);
    answerData.type = cleanText(rawQuestion?.type, 120);
  }

  if (moduleId === 'melodic-intervals') {
    answerData.intervalCorrect = Boolean(result.correct);
    answerData.mode = 'recognition';
    answerData.intervalLabel = cleanText(rawQuestion?.intervalLabel || result.modelAnswer, 120);
  }

  if (moduleId === 'texture-trainer') {
    answerData.textureFocus = cleanText(rawQuestion?.textureFocus, 240);
  }

  return cleanJson(answerData);
}

function buildTeacherModeRoundPayload(room, roomManager, participant) {
  if (!room || !roomManager || !participant?.accountStudentId || !participant?.accountTeacherId) return null;

  const results = buildCumulativeResults(room, participant.id);
  if (!results.length) return null;

  const questions = results.map((result, index) => {
    const rawQuestion = roomManager.getQuestion(room, result.questionIndex);
    const maximumScore = number(result.total);
    return {
      questionId: cleanText(result.questionId || rawQuestion?.id || `Q${index + 1}`, 120),
      score: Math.min(number(result.score), maximumScore || Number.MAX_SAFE_INTEGER),
      maximumScore,
      feedback: cleanText(result.feedback || result.shortComment, 1000),
      answerData: buildAnswerData(room, rawQuestion, result)
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
      teacherMode: true
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
        payload.moduleId,
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
