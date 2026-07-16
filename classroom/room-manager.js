const {
  safeString,
  normaliseScoring,
  buildCumulativeResults,
  getStudentCumulative,
  recordQuizSubmission,
  buildLeaderboard
} = require('./scoring');

const DEFAULT_MAX_LISTENS = 4;
const DEFAULT_QUIZ_TOTAL = 3;
const DEFAULT_ROOM_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const QUESTION_LEVELS = new Set(['all', 'foundation', 'developing', 'securing', 'mastering']);

function shuffleArray(items = []) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function cleanStudentName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function studentNameKey(value) {
  return cleanStudentName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PROFANITY_WORDS = [
  'fuck', 'fucking', 'fucker', 'motherfucker',
  'shit', 'shitty',
  'bitch', 'bastard',
  'wanker', 'bollocks',
  'twat', 'prick', 'cunt', 'cunty',
  'dickhead', 'dick',
  'cock', 'pussy',
  'arsehole', 'asshole',
  'slut', 'whore',
  'nigger', 'nigga',
  'faggot', 'retard',
  'pedo', 'paedo', 'nonce', 'rape', 'porn'
];

const PROFANITY_STEMS = [
  'fuck', 'shit', 'bitch', 'bastard', 'wank', 'bollock',
  'twat', 'prick', 'cunt', 'dick', 'cock', 'pussy',
  'arsehole', 'asshole', 'slut', 'whore', 'nigg', 'faggot',
  'retard', 'pedo', 'paedo', 'nonce', 'rape', 'porn'
];

function profanityKey(value) {
  return cleanStudentName(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[@]/g, 'a')
    .replace(/[4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[+]/g, 't')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactProfanityKey(value) {
  return profanityKey(value).replace(/\s+/g, '');
}

function collapseRepeatedLetters(value) {
  return String(value || '').replace(/([a-z])\1{1,}/g, '$1');
}

function containsProfanity(value) {
  const key = profanityKey(value);
  const spaced = ` ${key} `;
  const compact = compactProfanityKey(value);
  const collapsed = collapseRepeatedLetters(compact);

  return PROFANITY_WORDS.some((word) => spaced.includes(` ${word} `))
    || PROFANITY_STEMS.some((stem) => compact.includes(stem) || collapsed.includes(stem));
}


function normaliseAnswer(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classroomAnswersMatch(left, right) {
  return normaliseAnswer(left) === normaliseAnswer(right);
}

function getQuestionCorrectAnswer(question = {}) {
  return normaliseAnswer(
    question.instrument
    || question.answer
    || question.correctAnswer
    || question.correctInstrument
    || question.modelAnswer
  );
}

function buildClassroomUrl(baseUrl, route, params = {}) {
  const root = String(baseUrl || '').replace(/\/+$/, '');
  const url = new URL(route, `${root || 'http://localhost:3000'}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(key, String(value).trim());
  });
  return url.toString();
}

function assertInstrumentIdentifierChoicesAreSafe(rawQuestion = {}, preparedQuestion = {}) {
  const correct = getQuestionCorrectAnswer(rawQuestion);
  const choices = Array.isArray(preparedQuestion.choices) ? preparedQuestion.choices : [];
  const hasCorrectChoice = choices.some((choice) => classroomAnswersMatch(choice, correct));

  if (!correct || !hasCorrectChoice) {
    const questionId = rawQuestion.id || rawQuestion.file || preparedQuestion.id || 'unknown question';
    const availableChoices = choices.length ? choices.join(', ') : 'none';
    throw new Error(`Instrument Identifier setup error: ${questionId} prepared without the correct answer option. Correct answer: ${correct || 'unknown'}. Choices: ${availableChoices}.`);
  }
}

function normaliseQuestionLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  return QUESTION_LEVELS.has(level) ? level : 'all';
}

function normaliseClipValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function clipValue(clip = {}, keys = []) {
  for (const key of keys) {
    if (clip[key] !== undefined && clip[key] !== null && String(clip[key]).trim()) return String(clip[key]).trim();
  }
  return '';
}

function instrumentIdentifierQuestionMatchesLevel(question = {}, level = 'all') {
  const target = normaliseQuestionLevel(level);
  if (target === 'all') return true;

  const difficulty = normaliseClipValue(clipValue(question, ['difficulty', 'DIFFICULTY', 'Difficulty']));
  const type = normaliseClipValue(clipValue(question, ['type', 'TYPE', 'Type']));
  const solo = (
    type === 'solo' ||
    type === 'unaccompanied' ||
    type === 'solo instrument' ||
    type.includes('solo only')
  );
  const recognisedDifficulty = ['easy', 'medium', 'hard', 'very hard'].includes(difficulty);
  const hard = difficulty === 'hard' || difficulty === 'very hard';

  if (target === 'foundation') return solo && (difficulty === 'easy' || !recognisedDifficulty);
  if (target === 'developing') return (difficulty === 'easy' && !solo) || (solo && recognisedDifficulty && difficulty !== 'easy');
  if (target === 'securing') return difficulty === 'medium' && !solo;
  return hard && !solo;
}

function melodicIntervalsQuestionMatchesLevel(question = {}, level = 'all') {
  const target = normaliseQuestionLevel(level);
  if (target === 'all') return true;
  const questionLevel = normaliseClipValue(clipValue(question, ['levelKey', 'level', 'Level']));
  return questionLevel === target;
}

class RoomManager {
  constructor(options = {}) {
    this.rooms = new Map();
    this.adapters = new Map();
    this.defaultModuleId = options.defaultModuleId || 'melody-master';
    this.roomMaxAgeMs = Math.max(60 * 60 * 1000, Number(options.roomMaxAgeMs || process.env.ROOM_MAX_AGE_MS || DEFAULT_ROOM_MAX_AGE_MS));
    (options.adapters || []).forEach((adapter) => this.registerAdapter(adapter));
  }

  registerAdapter(adapter) {
    if (!adapter || !adapter.id) throw new Error('Classroom adapter needs an id.');
    this.adapters.set(adapter.id, adapter);
  }

  getAdapters() {
    return Array.from(this.adapters.values());
  }

  getModules() {
    return this.getAdapters().map((adapter) => {
      const questions = this.getQuestions(adapter.id);
      return {
        id: adapter.id,
        title: adapter.title || adapter.id,
        description: adapter.description || '',
        studentMode: adapter.studentMode || 'generic',
        questionCount: questions.length
      };
    });
  }

  getAdapter(moduleId = this.defaultModuleId) {
    return this.adapters.get(moduleId) || this.adapters.get(this.defaultModuleId) || this.getAdapters()[0];
  }

  getQuestions(moduleId = this.defaultModuleId) {
    const adapter = this.getAdapter(moduleId);
    if (!adapter || typeof adapter.getQuestions !== 'function') return [];
    const questions = adapter.getQuestions();
    return Array.isArray(questions) ? questions : [];
  }

  getQuestionIndexes(moduleId = this.defaultModuleId, options = {}) {
    const questions = this.getQuestions(moduleId);
    const indexes = Array.from({ length: questions.length }, (_, index) => index);
    const level = normaliseQuestionLevel(options.questionLevel);
    if (level === 'all') return indexes;

    const filtered = indexes.filter((index) => {
      if (moduleId === 'instrument-identifier') return instrumentIdentifierQuestionMatchesLevel(questions[index], level);
      if (moduleId === 'melodic-intervals') return melodicIntervalsQuestionMatchesLevel(questions[index], level);
      return true;
    });
    return filtered.length ? filtered : indexes;
  }

  getQuestionCount(moduleId = this.defaultModuleId, options = {}) {
    return this.getQuestionIndexes(moduleId, options).length;
  }

  buildRandomQuestionOrder(moduleId, questionCount = 1, options = {}) {
    const indexes = this.getQuestionIndexes(moduleId, options);
    const totalQuestions = indexes.length || 1;
    const count = Math.max(1, Math.min(Number(questionCount) || 1, totalQuestions));
    return shuffleArray(indexes.length ? indexes : [0]).slice(0, count);
  }

  makeRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  validateStudentName(room, studentId, rawName) {
    const name = cleanStudentName(rawName);
    if (!name) return { ok: false, error: 'Enter your name.' };
    if (containsProfanity(name)) return { ok: false, error: 'Please choose a school-appropriate name.' };

    const key = studentNameKey(name);
    if (!key) return { ok: false, error: 'Enter your name using letters or numbers.' };

    const duplicate = Array.from(room.students.values()).find((student) => {
      return student.id !== studentId && studentNameKey(student.name) === key;
    });

    if (duplicate) return { ok: false, error: 'That name is already taken in this quiz. Add an initial or number.' };
    return { ok: true, name };
  }

  cleanupExpiredRooms(now = Date.now()) {
    for (const [code, room] of this.rooms.entries()) {
      const age = now - Number(room.createdAt || 0);
      if (age > this.roomMaxAgeMs) this.rooms.delete(code);
    }
  }

  createRoom({ moduleId, questionLevel = 'all', baseUrl, apiBase = '', ownerTeacherId = null, ownerTeacherCode = '' }) {
    this.cleanupExpiredRooms();
    const adapter = this.getAdapter(moduleId);
    const code = this.makeRoomCode();
    const sharedUrlParams = apiBase ? { classroomApi: apiBase } : {};

    const cleanBaseUrl = String(baseUrl || '').replace(/\/+$/, '');
    const shortJoinUrl = `${cleanBaseUrl}/join/#${code}`;

    const joinUrl = buildClassroomUrl(baseUrl, '/student/join.html', { room: code, ...sharedUrlParams });

    const studentShellUrl = buildClassroomUrl(baseUrl, '/student/student-shell.html', { room: code, ...sharedUrlParams });
    const melodyStudentUrl = buildClassroomUrl(baseUrl, '/modules/melody-master/student-laptop.html', { room: code, ...sharedUrlParams });
    const instrumentStudentUrl = buildClassroomUrl(baseUrl, '/modules/instrument-identifier/student-classroom.html', { room: code, ...sharedUrlParams });
    const melodicIntervalsStudentUrl = buildClassroomUrl(baseUrl, '/modules/melodic-intervals/student-classroom.html', { room: code, ...sharedUrlParams });
    const room = {
      code,
      createdAt: Date.now(),
      baseUrl,
      apiBase,
      ownerTeacherId: ownerTeacherId || null,
      ownerTeacherCode: String(ownerTeacherCode || '').trim().toUpperCase(),
      moduleId: adapter.id,
      moduleTitle: adapter.title || adapter.id,
      questionLevel: normaliseQuestionLevel(questionLevel),
      studentMode: adapter.studentMode || 'generic',
      joinUrl,
      shortJoinUrl,
      studentShellUrl,
      laptopJoinUrl: adapter.id === 'melody-master'
        ? melodyStudentUrl
        : adapter.id === 'instrument-identifier'
          ? instrumentStudentUrl
          : adapter.id === 'melodic-intervals'
            ? melodicIntervalsStudentUrl
            : studentShellUrl,
      students: new Map(),
      submissions: new Map(),
      quizResults: new Map(),
      questionIndex: 0,
      question: null,
      activeQuestion: null,
      submissionsOpen: false,
      submissionsClosed: false,
      listens: 0,
      maxListens: DEFAULT_MAX_LISTENS,
      quizTotal: DEFAULT_QUIZ_TOTAL,
      quizStarted: false,
      quizEnded: false,
      quizQuestionNumber: 0,
      questionOrder: [],
      questionOrderPosition: 0,
      totalMarks: 0,
      totalNotes: 0,
      questionRunId: 0,
      playback: null,
      playbackSerial: 0,
      roundId: 1,
      lastProgressSave: null,
      dismissed: false
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    this.cleanupExpiredRooms();
    const roomCode = String(code || '').trim().toUpperCase();
    if (!roomCode || !this.rooms.has(roomCode)) return null;
    return this.rooms.get(roomCode);
  }

  setRoomModule(room, moduleId) {
    const adapter = this.getAdapter(moduleId);
    if (!adapter || adapter.id === room.moduleId) return room;
    room.moduleId = adapter.id;
    room.moduleTitle = adapter.title || adapter.id;
    room.studentMode = adapter.studentMode || 'generic';
    room.questionIndex = 0;
    room.question = null;
    room.activeQuestion = null;
    room.submissions.clear();
    room.quizResults = new Map();
    room.quizStarted = false;
    room.quizEnded = false;
    room.quizQuestionNumber = 0;
    room.questionOrder = [];
    room.questionOrderPosition = 0;
    room.totalMarks = 0;
    room.totalNotes = 0;
    room.questionRunId = 0;
    room.playback = null;
    room.roundId = Number(room.roundId || 1) + 1;
    room.lastProgressSave = null;
    room.dismissed = false;
    room.laptopJoinUrl = adapter.id === 'melody-master'
      ? `${room.baseUrl}/modules/melody-master/student-laptop.html?room=${encodeURIComponent(room.code)}`
      : adapter.id === 'instrument-identifier'
        ? `${room.baseUrl}/modules/instrument-identifier/student-classroom.html?room=${encodeURIComponent(room.code)}`
        : `${room.baseUrl}/student/student-shell.html?room=${encodeURIComponent(room.code)}`;
    return room;
  }

  setQuestionLevel(room, questionLevel = 'all') {
    room.questionLevel = normaliseQuestionLevel(questionLevel);
    return room;
  }

  getQuestion(room, index = 0) {
    const questions = this.getQuestions(room.moduleId);
    if (!questions.length) return null;
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, questions.length - 1));
    return questions[safeIndex] || questions[0];
  }

  startQuestion(room, index = 0, options = {}) {
    const adapter = this.getAdapter(room.moduleId);
    const questions = this.getQuestions(room.moduleId);
    if (!questions.length) throw new Error(`No questions found for ${room.moduleTitle}.`);

    let targetIndex = Math.max(0, Math.min(Number(index) || 0, questions.length - 1));

    if (options.resetQuiz) {
      room.dismissed = false;
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizResults = new Map();
      room.quizQuestionNumber = 1;
      this.setQuestionLevel(room, options.questionLevel || room.questionLevel);
      const availableQuestionCount = this.getQuestionCount(room.moduleId, { questionLevel: room.questionLevel }) || questions.length;
      if (Number(options.quizLength)) room.quizTotal = Math.max(1, Math.min(Number(options.quizLength), availableQuestionCount));
      if (Number(options.maxListens)) room.maxListens = Math.max(1, Math.min(Number(options.maxListens), 8));
      room.questionOrder = this.buildRandomQuestionOrder(room.moduleId, room.quizTotal || 1, { questionLevel: room.questionLevel });
      room.questionOrderPosition = 0;
      targetIndex = room.questionOrder[0] ?? targetIndex;
    } else if (options.advanceQuiz) {
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 0) + 1);
      room.questionOrderPosition = Math.max(0, Number(room.questionOrderPosition || 0) + 1);
      targetIndex = Array.isArray(room.questionOrder) && room.questionOrder.length
        ? (room.questionOrder[room.questionOrderPosition] ?? targetIndex)
        : targetIndex;
    } else if (!room.quizStarted) {
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 1));
      if (!Array.isArray(room.questionOrder) || !room.questionOrder.length) {
        this.setQuestionLevel(room, options.questionLevel || room.questionLevel);
        room.questionOrder = this.buildRandomQuestionOrder(room.moduleId, room.quizTotal || 1, { questionLevel: room.questionLevel });
        room.questionOrderPosition = 0;
        targetIndex = room.questionOrder[0] ?? targetIndex;
      }
    }

    room.questionIndex = Math.max(0, Math.min(Number(targetIndex) || 0, questions.length - 1));
    room.question = this.getQuestion(room, room.questionIndex);
    room.activeQuestion = adapter.prepareQuestion(room.question, { index: room.questionIndex, room });
    if (room.moduleId === 'instrument-identifier') {
      assertInstrumentIdentifierChoicesAreSafe(room.question, room.activeQuestion);
    }
    room.submissions.clear();
    room.submissionsOpen = true;
    room.submissionsClosed = false;
    room.listens = 0;
    room.playback = null;
    room.totalMarks = Number(room.activeQuestion.maxMarks || room.activeQuestion.totalMarks || room.activeQuestion.totalNotes || 1);
    room.totalNotes = Number(room.activeQuestion.totalNotes || room.activeQuestion.maxMarks || room.totalMarks || 1);
    room.questionRunId += 1;
    return room.activeQuestion;
  }

  closeSubmissions(room) {
    room.submissionsOpen = false;
    room.submissionsClosed = true;
  }

  endQuiz(room) {
    room.quizEnded = true;
    room.submissionsOpen = false;
    room.submissionsClosed = true;
    room.playback = null;
    // Keep the final question/submissions available until the teacher closes
    // the round-feedback modal. This lets student devices continue showing
    // their personalised round feedback instead of jumping to the holding
    // screen as soon as Finish Quiz is pressed.
  }

  prepareNextRound(room) {
    room.dismissed = false;
    room.questionIndex = 0;
    room.question = null;
    room.activeQuestion = null;
    room.submissions.clear();
    room.quizResults = new Map();
    room.quizStarted = false;
    room.quizEnded = false;
    room.quizQuestionNumber = 0;
    room.questionOrder = [];
    room.questionOrderPosition = 0;
    room.submissionsOpen = false;
    room.submissionsClosed = false;
    room.listens = 0;
    room.totalMarks = 0;
    room.totalNotes = 0;
    room.questionRunId = 0;
    room.playback = null;
    room.roundId = Number(room.roundId || 1) + 1;
    room.lastProgressSave = null;
    return room;
  }

  dismiss(room) {
    room.dismissed = true;
    this.endQuiz(room);
    room.activeQuestion = null;
  }

  resetQuestion(room) {
    if (!room.activeQuestion) throw new Error('No question active yet.');
    return this.startQuestion(room, room.questionIndex || 0, { resetQuiz: false });
  }

  joinRoom(room, studentId, name, account = {}) {
    const validation = this.validateStudentName(room, studentId, name);
    if (!validation.ok) return validation;

    const accountStudentId = String(account.studentId || '').trim();
    const accountTeacherId = String(account.teacherId || '').trim();

    if (accountStudentId) {
      const duplicateAccount = Array.from(room.students.values()).find((student) => {
        return student.id !== studentId && student.accountStudentId === accountStudentId;
      });
      if (duplicateAccount) {
        return { ok: false, error: 'This student account is already connected to the room.' };
      }
    }

    const existing = room.students.get(studentId) || {};
    room.students.set(studentId, {
      ...existing,
      id: studentId,
      name: validation.name,
      lastSeen: Date.now(),
      accountStudentId: accountStudentId || existing.accountStudentId || null,
      accountTeacherId: accountTeacherId || existing.accountTeacherId || null,
      persistentAccount: Boolean(accountStudentId || existing.accountStudentId)
    });
    return { ok: true, student: room.students.get(studentId) };
  }

  touchStudent(room, studentId) {
    if (studentId && room.students.has(studentId)) room.students.get(studentId).lastSeen = Date.now();
  }

  submitAnswer(room, studentId, payload = {}) {
    this.touchStudent(room, studentId);
    if (!studentId || !room.students.has(studentId)) throw new Error('Join the room before submitting.');
    if (!room.activeQuestion) throw new Error('No question active yet.');
    if (!room.submissionsOpen) {
      const error = new Error('Submissions are closed.');
      error.code = 'SUBMISSIONS_CLOSED';
      throw error;
    }
    if (room.submissions.has(studentId)) {
      const error = new Error('You have already submitted.');
      error.code = 'ALREADY_SUBMITTED';
      throw error;
    }

    const adapter = this.getAdapter(room.moduleId);
    const adapterScoring = adapter.checkAnswer(room.question, payload.answer ?? payload.answers ?? '', {
      ...payload,
      activeQuestion: room.activeQuestion,
      room
    });
    const scoring = normaliseScoring(adapterScoring, { score: 0, total: room.totalMarks || 1 });
    const submission = {
      answer: payload.answer ?? '',
      answers: Array.isArray(payload.answers) ? payload.answers : [],
      score: scoring.score,
      total: scoring.total,
      percentage: scoring.percentage,
      correct: scoring.correct,
      feedback: scoring.feedback,
      matchType: scoring.matchType,
      modelAnswer: scoring.modelAnswer,
      pitchMarksAwarded: scoring.pitchMarksAwarded,
      pitchMarksAvailable: scoring.pitchMarksAvailable,
      shapeMarksAwarded: scoring.shapeMarksAwarded,
      shapeMarksAvailable: scoring.shapeMarksAvailable,
      shortComment: scoring.shortComment,
      firstWrongNote: scoring.firstWrongNote,
      firstContourError: scoring.firstContourError,
      firstIntervalSizeError: scoring.firstIntervalSizeError,
      submittedAt: new Date().toISOString(),
      questionRunId: room.questionRunId
    };
    room.submissions.set(studentId, submission);
    recordQuizSubmission(room, studentId, submission);
    return submission;
  }

  createRoomState(room, studentId = '') {
    const now = Date.now();
    const students = Array.from(room.students.values()).map((student) => {
      const submission = room.submissions.get(student.id);
      const questionTotal = room.totalMarks || room.totalNotes || 0;
      const total = submission ? Number(submission.total || questionTotal) : questionTotal;
      const score = submission ? Number(submission.score || 0) : null;
      const percentage = submission && total ? Math.round((score / total) * 100) : null;
      const cumulative = getStudentCumulative(room, student.id);
      return {
        id: student.id,
        name: student.name,
        connected: now - Number(student.lastSeen || 0) < 15000,
        submitted: Boolean(submission),
        score,
        total,
        percentage,
        submittedAt: submission ? submission.submittedAt : null,
        cumulativeScore: cumulative.score,
        cumulativeTotal: cumulative.total,
        cumulativePercentage: cumulative.percentage,
        questionsSubmitted: cumulative.questionsSubmitted,
        persistentAccount: Boolean(student.accountStudentId)
      };
    });

    const submitted = students.filter((student) => student.submitted);
    const currentTotalPossible = submitted.reduce((sum, student) => sum + (student.total || 0), 0);
    const currentTotalCorrect = submitted.reduce((sum, student) => sum + (student.score || 0), 0);
    const cumulativeTotalPossible = students.reduce((sum, student) => sum + Number(student.cumulativeTotal || 0), 0);
    const cumulativeTotalCorrect = students.reduce((sum, student) => sum + Number(student.cumulativeScore || 0), 0);
    const studentSubmission = studentId ? room.submissions.get(studentId) : null;

    return {
      ok: true,
      serverNow: now,
      roomCode: room.code,
      moduleId: room.moduleId,
      moduleTitle: room.moduleTitle,
      studentMode: room.studentMode,
      studentShellUrl: room.studentShellUrl,
      laptopJoinUrl: room.laptopJoinUrl,
      active: Boolean(room.activeQuestion),
      submissionsOpen: Boolean(room.submissionsOpen),
      submissionsClosed: Boolean(room.submissionsClosed),
      listens: room.listens,
      maxListens: Number(room.maxListens || DEFAULT_MAX_LISTENS),
      dismissed: Boolean(room.dismissed),
      quiz: {
        totalQuestions: Number(room.quizTotal || DEFAULT_QUIZ_TOTAL),
        currentQuestionNumber: Number(room.quizQuestionNumber || 0),
        started: Boolean(room.quizStarted),
        ended: Boolean(room.quizEnded),
        questionsRemaining: Math.max(0, Number(room.quizTotal || DEFAULT_QUIZ_TOTAL) - Number(room.quizQuestionNumber || 0)),
        maxListens: Number(room.maxListens || DEFAULT_MAX_LISTENS)
      },
      questionIndex: room.questionIndex,
      questionRunId: room.questionRunId,
      roundId: Number(room.roundId || 1),
      questionLevel: normaliseQuestionLevel(room.questionLevel),
      progressSave: room.lastProgressSave || null,
      playback: room.playback || null,
      question: room.activeQuestion || null,
      totalNotes: room.totalNotes || 0,
      totalMarks: room.totalMarks || 0,
      students,
      leaderboard: buildLeaderboard(students),
      summary: {
        joined: students.length,
        connected: students.filter((student) => student.connected).length,
        submitted: submitted.length,
        classAverage: cumulativeTotalPossible ? Math.round((cumulativeTotalCorrect / cumulativeTotalPossible) * 100) : 0,
        totalCorrect: cumulativeTotalCorrect,
        totalPossible: cumulativeTotalPossible,
        currentTotalCorrect,
        currentTotalPossible
      },
      student: studentId ? {
        id: studentId,
        submitted: Boolean(studentSubmission),
        submission: studentSubmission || null,
        results: buildCumulativeResults(room, studentId),
        persistentAccount: Boolean(room.students.get(studentId)?.accountStudentId)
      } : null
    };
  }
}

module.exports = {
  RoomManager,
  DEFAULT_MAX_LISTENS,
  DEFAULT_QUIZ_TOTAL,
  cleanStudentName,
  studentNameKey
};
