'use strict';

const path = require('path');
const { loadRegistry } = require('./server-data.js');
const core = require('./core/exam-lab-core.js');

const RECENT_LIMIT = 2;
const recentByTeacher = new Map();

function chooseExtract(extracts, recentIds = [], random = Math.random) {
  if (!Array.isArray(extracts) || !extracts.length) throw new Error('No Exam Lab extracts are available.');
  const recent = new Set((recentIds || []).slice(-RECENT_LIMIT));
  const preferred = extracts.filter((extract) => !recent.has(extract.id));
  const pool = preferred.length ? preferred : extracts;
  const raw = Number(random());
  const safeRandom = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999999999, raw)) : 0;
  return pool[Math.floor(safeRandom * pool.length)];
}

function createExamLabAdapter(context = {}) {
  const extracts = loadRegistry({ moduleDir: context.moduleDir });
  const random = typeof context.random === 'function' ? context.random : Math.random;
  const audioDuration = typeof context.getAudioDurationSeconds === 'function'
    ? context.getAudioDurationSeconds
    : () => 10;

  function initialiseRoom(room) {
    if (room.examLab?.extractId) return room;
    const teacherKey = String(room.ownerTeacherId || 'guest');
    const recent = recentByTeacher.get(teacherKey) || [];
    const extract = chooseExtract(extracts, recent, random);
    const extractIndex = extracts.findIndex((candidate) => candidate.id === extract.id);
    recentByTeacher.set(teacherKey, [...recent, extract.id].slice(-RECENT_LIMIT));
    room.examLab = {
      extractId: extract.id,
      extractIndex,
      selectedAt: new Date().toISOString()
    };
    room.questionIndex = extractIndex;
    room.questionModuleId = 'exam-lab';
    room.quizTotal = 1;
    room.maxListens = Number(extract.maxPlays || 1);
    room.totalMarks = Number(extract.totalMarks || 0);
    room.totalNotes = room.totalMarks;
    room.activityType = 'exam_lab';
    return room;
  }

  function getQuestionOrder(room) {
    initialiseRoom(room);
    return [room.examLab.extractIndex];
  }

  function prepareQuestion(extract, options = {}) {
    const room = options.room || {};
    initialiseRoom(room);
    const apiBase = String(room.apiBase || '').replace(/\/+$/, '');
    const roomQuery = `roomCode=${encodeURIComponent(room.code || '')}`;
    const publicExtract = core.serialisePublicExtract(extract, {
      includeAudio: true,
      scoreUrl: `${apiBase}/api/classroom/exam-lab/score?${roomQuery}`,
      audioUrl: `${apiBase}/api/classroom/exam-lab/audio?${roomQuery}`
    });
    return {
      moduleId: 'exam-lab',
      moduleTitle: 'Exam Lab',
      activityType: 'exam_lab',
      answerType: 'exam-lab',
      id: 'listening-extract',
      title: 'Exam Lab Live Session',
      prompt: 'Follow the score and answer all questions.',
      ...publicExtract,
      audioDurationSeconds: audioDuration(path.join(context.moduleDir || __dirname, extract.audio)),
      maxMarks: publicExtract.totalMarks,
      totalMarks: publicExtract.totalMarks,
      totalNotes: publicExtract.totalMarks
    };
  }

  function serialiseQuestion(question, options = {}) {
    if (!question) return null;
    const output = JSON.parse(JSON.stringify(question));
    if (options.role === 'student') {
      delete output.audio;
      delete output.audioSequence;
      delete output.file;
    }
    return output;
  }

  function checkAnswer(extract, _studentAnswer, context = {}) {
    const rawAnswers = context.answers;
    const privateResult = core.markExtract(extract, rawAnswers, { requireComplete: true });
    return {
      score: privateResult.score,
      total: privateResult.maximumScore,
      correct: privateResult.score >= privateResult.maximumScore,
      matchType: privateResult.score >= privateResult.maximumScore ? 'correct' : privateResult.score > 0 ? 'partial' : 'incorrect',
      feedback: 'Answers submitted. Feedback will be released when the teacher finishes the session.',
      shortComment: 'Exam Lab answers submitted.',
      privateResult
    };
  }

  function serialiseSubmission(submission, options = {}) {
    if (!submission) return null;
    if (!options.released) return { submitted: true, submittedAt: submission.submittedAt };
    return {
      submitted: true,
      submittedAt: submission.submittedAt,
      score: submission.score,
      total: submission.total,
      percentage: submission.percentage,
      examLabResult: core.studentResult(submission.privateResult)
    };
  }

  function buildClassAnalysis(room) {
    const extract = extracts[room.examLab?.extractIndex];
    if (!extract) return null;
    const students = Array.from(room.students.values()).map((student) => ({
      id: student.id,
      name: student.name,
      privateResult: room.submissions.get(student.id)?.privateResult || null
    }));
    return core.buildClassAnalysis(extract, students);
  }

  function getExtract(room) {
    return extracts[room?.examLab?.extractIndex] || null;
  }

  return {
    id: 'exam-lab',
    title: 'Exam Lab',
    description: 'A teacher-controlled Cambridge-style listening extract with private individual feedback.',
    studentMode: 'generic',
    activityType: 'exam_lab',
    getQuestions: () => extracts,
    initialiseRoom,
    normaliseQuizLength: () => 1,
    normaliseMaxListens: (_requested, room) => Number(room?.maxListens || 1),
    getQuestionOrder,
    prepareQuestion,
    serialiseQuestion,
    checkAnswer,
    serialiseSubmission,
    buildClassAnalysis,
    getExtract
  };
}

createExamLabAdapter.chooseExtract = chooseExtract;
createExamLabAdapter.resetRecentHistory = () => recentByTeacher.clear();
createExamLabAdapter.getRecentHistory = (teacherId) => (recentByTeacher.get(String(teacherId || 'guest')) || []).slice();

module.exports = createExamLabAdapter;
