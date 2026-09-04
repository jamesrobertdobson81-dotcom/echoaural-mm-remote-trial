const {
  safeString,
  normaliseScoring,
  buildCumulativeResults,
  getStudentCumulative,
  recordQuizSubmission,
  buildLeaderboard
} = require('./scoring');
const { QuestionCatalogue } = require('./question-catalogue');
const crypto = require('crypto');

const DEFAULT_MAX_LISTENS = 4;
const DEFAULT_QUIZ_TOTAL = 3;
const DEFAULT_ROOM_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const QUESTION_LEVELS = new Set(['all', 'foundation', 'developing', 'securing', 'mastering']);
const MIXED_MODULE_ID = 'mixed';
const MIXED_MODULE_TITLE = 'Mixed Apps';
const DEFAULT_MIXED_MODULE_IDS = ['instrument-identifier', 'melodic-intervals'];

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

function isMixedModuleId(value) {
  return String(value || '').trim().toLowerCase() === MIXED_MODULE_ID;
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

function melodyMasterQuestionMatchesLevel(question = {}, level = 'all') {
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
    // Built once from the adapters registered above (not lazily), so a
    // freshly-added adapter's questions are reflected in mixed-round
    // eligibility immediately, matching this.adapters' own timing.
    this.questionCatalogue = options.questionCatalogue || new QuestionCatalogue(this.getAdapters());
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

  getRequiredAdapter(moduleId = this.defaultModuleId) {
    const adapter = this.adapters.get(moduleId);
    if (!adapter) throw new Error(`Classroom module "${moduleId || 'unknown'}" is not available on this server.`);
    return adapter;
  }

  normaliseMixedModuleIds(moduleIds = DEFAULT_MIXED_MODULE_IDS) {
    const source = Array.isArray(moduleIds) ? moduleIds : String(moduleIds || '').split(',');
    const allowed = new Set(this.questionCatalogue.modules()
      .filter((module) => module.mixedCompatible)
      .map((module) => module.id));
    const unique = [];
    source.forEach((moduleId) => {
      const cleanModuleId = String(moduleId || '').trim();
      if (!allowed.has(cleanModuleId) || !this.adapters.has(cleanModuleId) || unique.includes(cleanModuleId)) return;
      unique.push(cleanModuleId);
    });
    return unique.length ? unique : DEFAULT_MIXED_MODULE_IDS.filter((moduleId) => this.adapters.has(moduleId));
  }

  isMixedRoom(room = {}) {
    return isMixedModuleId(room.moduleId);
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
      if (moduleId === 'melody-master') return melodyMasterQuestionMatchesLevel(questions[index], level);
      if (moduleId === 'melodic-intervals') return melodicIntervalsQuestionMatchesLevel(questions[index], level);
      return true;
    });
    return filtered.length ? filtered : indexes;
  }

  getQuestionCount(moduleId = this.defaultModuleId, options = {}) {
    return this.getQuestionIndexes(moduleId, options).length;
  }

  getRoomQuestionCount(room = {}, options = {}) {
    if (!this.isMixedRoom(room)) return this.getQuestionCount(room.moduleId, options);
    return this.normaliseMixedModuleIds(room.mixedModuleIds).reduce((total, moduleId) => {
      return total + this.getQuestionCount(moduleId, options);
    }, 0);
  }

  buildRandomQuestionOrder(moduleId, questionCount = 1, options = {}) {
    const indexes = this.getQuestionIndexes(moduleId, options);
    const totalQuestions = indexes.length || 1;
    const count = Math.max(1, Math.min(Number(questionCount) || 1, totalQuestions));
    return shuffleArray(indexes.length ? indexes : [0]).slice(0, count);
  }

  buildMixedQuestionOrder(moduleIds = DEFAULT_MIXED_MODULE_IDS, questionCount = 1, options = {}) {
    const pools = this.normaliseMixedModuleIds(moduleIds)
      .filter((moduleId) => moduleId !== 'melody-master')
      .map((moduleId) => ({
        moduleId,
        indexes: shuffleArray(this.getQuestionIndexes(moduleId, options))
      }))
      .filter((pool) => pool.indexes.length);

    const totalQuestions = pools.reduce((sum, pool) => sum + pool.indexes.length, 0);
    const count = Math.max(1, Math.min(Number(questionCount) || 1, totalQuestions || 1));
    const order = [];

    while (order.length < count && pools.some((pool) => pool.indexes.length)) {
      pools.forEach((pool) => {
        if (order.length >= count || !pool.indexes.length) return;
        order.push({
          moduleId: pool.moduleId,
          questionIndex: pool.indexes.shift()
        });
      });
    }

    return shuffleArray(order);
  }

  buildRoomQuestionOrder(room, questionCount = 1, options = {}) {
    if (this.isMixedRoom(room)) return this.buildMixedQuestionOrder(room.mixedModuleIds, questionCount, options);
    const adapter = this.getAdapter(room.moduleId);
    if (adapter && typeof adapter.getQuestionOrder === 'function') {
      const order = adapter.getQuestionOrder(room, questionCount, options);
      if (Array.isArray(order) && order.length) return order.slice(0, Math.max(1, Number(questionCount) || 1));
    }
    return this.buildRandomQuestionOrder(room.moduleId, questionCount, options);
  }

  getQuestionTargetFromOrder(room = {}, orderPosition = 0) {
    if (!Array.isArray(room.questionOrder) || !room.questionOrder.length) {
      if (this.isMixedRoom(room)) return { moduleId: this.normaliseMixedModuleIds(room.mixedModuleIds)[0], questionIndex: 0 };
      return Number(room.questionIndex || 0);
    }
    return room.questionOrder[Math.max(0, Number(orderPosition) || 0)] ?? (this.isMixedRoom(room)
      ? { moduleId: this.normaliseMixedModuleIds(room.mixedModuleIds)[0], questionIndex: 0 }
      : Number(room.questionIndex || 0));
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

  createRoom({
    moduleId,
    questionLevel = 'all',
    mixedModuleIds = DEFAULT_MIXED_MODULE_IDS,
    baseUrl,
    apiBase = '',
    ownerTeacherId = null,
    ownerTeacherCode = '',
    classId = null,
    className = ''
  }) {
    this.cleanupExpiredRooms();
    const mixedRoom = isMixedModuleId(moduleId);
    const adapter = mixedRoom ? null : this.getRequiredAdapter(moduleId);
    const cleanMixedModuleIds = this.normaliseMixedModuleIds(mixedModuleIds);
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
      classId: classId || null,
      className: String(className || '').trim().slice(0, 80),
      moduleId: mixedRoom ? MIXED_MODULE_ID : adapter.id,
      moduleTitle: mixedRoom ? MIXED_MODULE_TITLE : (adapter.title || adapter.id),
      activityType: mixedRoom ? 'quiz' : (adapter.activityType || 'quiz'),
      questionLevel: normaliseQuestionLevel(questionLevel),
      mixedModuleIds: cleanMixedModuleIds,
      studentMode: mixedRoom ? 'generic' : (adapter.studentMode || 'generic'),
      joinUrl,
      shortJoinUrl,
      studentShellUrl,
      laptopJoinUrl: mixedRoom
        ? studentShellUrl
        : adapter.id === 'melody-master'
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
      questionModuleId: mixedRoom ? cleanMixedModuleIds[0] : adapter.id,
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
    if (!mixedRoom && typeof adapter.initialiseRoom === 'function') adapter.initialiseRoom(room);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    this.cleanupExpiredRooms();
    const roomCode = String(code || '').trim().toUpperCase();
    if (!roomCode || !this.rooms.has(roomCode)) return null;
    return this.rooms.get(roomCode);
  }

  setRoomModule(room, moduleId, options = {}) {
    if (isMixedModuleId(moduleId)) {
      if (room.moduleId === MIXED_MODULE_ID && options.mixedModuleIds) room.mixedModuleIds = this.normaliseMixedModuleIds(options.mixedModuleIds);
      if (room.moduleId === MIXED_MODULE_ID) return room;
      room.moduleId = MIXED_MODULE_ID;
      room.moduleTitle = MIXED_MODULE_TITLE;
      room.activityType = 'quiz';
      room.studentMode = 'generic';
      room.mixedModuleIds = this.normaliseMixedModuleIds(options.mixedModuleIds);
      room.questionIndex = 0;
      room.questionModuleId = this.normaliseMixedModuleIds(room.mixedModuleIds)[0];
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
      delete room.examLab;
      room.laptopJoinUrl = `${room.baseUrl}/student/student-shell.html?room=${encodeURIComponent(room.code)}`;
      return room;
    }

    const adapter = this.getRequiredAdapter(moduleId);
    if (adapter.id === room.moduleId) return room;
    room.moduleId = adapter.id;
    room.moduleTitle = adapter.title || adapter.id;
    room.activityType = adapter.activityType || 'quiz';
    room.studentMode = adapter.studentMode || 'generic';
    room.mixedModuleIds = this.normaliseMixedModuleIds();
    room.questionIndex = 0;
    room.questionModuleId = adapter.id;
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
    delete room.examLab;
    if (typeof adapter.initialiseRoom === 'function') adapter.initialiseRoom(room);
    room.laptopJoinUrl = adapter.id === 'melody-master'
      ? `${room.baseUrl}/modules/melody-master/student-laptop.html?room=${encodeURIComponent(room.code)}`
      : adapter.id === 'instrument-identifier'
        ? `${room.baseUrl}/modules/instrument-identifier/student-classroom.html?room=${encodeURIComponent(room.code)}`
        : adapter.id === 'melodic-intervals'
          ? `${room.baseUrl}/modules/melodic-intervals/student-classroom.html?room=${encodeURIComponent(room.code)}`
          : `${room.baseUrl}/student/student-shell.html?room=${encodeURIComponent(room.code)}`;
    return room;
  }

  setQuestionLevel(room, questionLevel = 'all') {
    room.questionLevel = normaliseQuestionLevel(questionLevel);
    return room;
  }

  getQuestion(room, index = 0, moduleId = '') {
    const sourceModuleId = moduleId || room.moduleId;
    const questions = this.getQuestions(sourceModuleId);
    if (!questions.length) return null;
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, questions.length - 1));
    return questions[safeIndex] || questions[0];
  }

  startQuestion(room, index = 0, options = {}) {
    const mixedRoom = this.isMixedRoom(room);
    let activeModuleId = mixedRoom ? this.normaliseMixedModuleIds(room.mixedModuleIds)[0] : room.moduleId;
    let adapter = this.getAdapter(activeModuleId);
    let questions = this.getQuestions(activeModuleId);
    if (!mixedRoom && !questions.length) throw new Error(`No questions found for ${room.moduleTitle}.`);

    let target = mixedRoom && index && typeof index === 'object'
      ? { moduleId: index.moduleId, questionIndex: Number(index.questionIndex || 0) }
      : index;
    let targetIndex = Math.max(0, Math.min(Number(target) || 0, Math.max(questions.length - 1, 0)));

    if (options.resetQuiz) {
      room.dismissed = false;
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizResults = new Map();
      room.quizQuestionNumber = 1;
      this.setQuestionLevel(room, options.questionLevel || room.questionLevel);
      const availableQuestionCount = this.getRoomQuestionCount(room, { questionLevel: room.questionLevel }) || questions.length || 1;
      const requestedQuizLength = typeof adapter.normaliseQuizLength === 'function'
        ? adapter.normaliseQuizLength(options.quizLength, room)
        : options.quizLength;
      const requestedMaxListens = typeof adapter.normaliseMaxListens === 'function'
        ? adapter.normaliseMaxListens(options.maxListens, room)
        : options.maxListens;
      if (Number(requestedQuizLength)) room.quizTotal = Math.max(1, Math.min(Number(requestedQuizLength), availableQuestionCount));
      if (Number(requestedMaxListens)) room.maxListens = Math.max(1, Math.min(Number(requestedMaxListens), 8));
      room.questionOrder = this.buildRoomQuestionOrder(room, room.quizTotal || 1, { questionLevel: room.questionLevel });
      room.questionOrderPosition = 0;
      target = this.getQuestionTargetFromOrder(room, 0);
    } else if (options.advanceQuiz) {
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 0) + 1);
      room.questionOrderPosition = Math.max(0, Number(room.questionOrderPosition || 0) + 1);
      target = this.getQuestionTargetFromOrder(room, room.questionOrderPosition);
    } else if (!room.quizStarted) {
      room.quizStarted = true;
      room.quizEnded = false;
      room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 1));
      if (!Array.isArray(room.questionOrder) || !room.questionOrder.length) {
        this.setQuestionLevel(room, options.questionLevel || room.questionLevel);
        room.questionOrder = this.buildRoomQuestionOrder(room, room.quizTotal || 1, { questionLevel: room.questionLevel });
        room.questionOrderPosition = 0;
        target = this.getQuestionTargetFromOrder(room, 0);
      }
    }

    if (mixedRoom) {
      const cleanTarget = target && typeof target === 'object'
        ? target
        : { moduleId: activeModuleId, questionIndex: Number(target || 0) };
      activeModuleId = this.normaliseMixedModuleIds(room.mixedModuleIds).includes(cleanTarget.moduleId)
        ? cleanTarget.moduleId
        : this.normaliseMixedModuleIds(room.mixedModuleIds)[0];
      adapter = this.getAdapter(activeModuleId);
      questions = this.getQuestions(activeModuleId);
      if (!questions.length) throw new Error(`No questions found for ${MIXED_MODULE_TITLE}.`);
      targetIndex = Math.max(0, Math.min(Number(cleanTarget.questionIndex) || 0, questions.length - 1));
    } else {
      targetIndex = Math.max(0, Math.min(Number(target) || 0, Math.max(questions.length - 1, 0)));
    }

    room.questionIndex = Math.max(0, Math.min(Number(targetIndex) || 0, questions.length - 1));
    room.questionModuleId = activeModuleId;
    room.question = this.getQuestion(room, room.questionIndex, activeModuleId);
    room.activeQuestion = adapter.prepareQuestion(room.question, { index: room.questionIndex, room });
    if (room.activeQuestion && mixedRoom) {
      room.activeQuestion.roomModuleId = MIXED_MODULE_ID;
      room.activeQuestion.mixedQuestion = true;
    }
    if (activeModuleId === 'instrument-identifier') {
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
    room.questionModuleId = this.isMixedRoom(room) ? this.normaliseMixedModuleIds(room.mixedModuleIds)[0] : room.moduleId;
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
    const target = this.isMixedRoom(room)
      ? { moduleId: room.questionModuleId, questionIndex: room.questionIndex || 0 }
      : (room.questionIndex || 0);
    return this.startQuestion(room, target, { resetQuiz: false });
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
    const accessToken = room.moduleId === 'exam-lab'
      ? (existing.accessToken || crypto.randomBytes(24).toString('base64url'))
      : null;
    room.students.set(studentId, {
      ...existing,
      id: studentId,
      name: validation.name,
      lastSeen: Date.now(),
      accountStudentId: accountStudentId || existing.accountStudentId || null,
      accountTeacherId: accountTeacherId || existing.accountTeacherId || null,
      persistentAccount: Boolean(accountStudentId || existing.accountStudentId),
      accessToken
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

    const activeModuleId = room.activeQuestion?.moduleId || room.questionModuleId || room.moduleId;
    const adapter = this.getAdapter(activeModuleId);
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
      answerData: scoring.answerData,
      privateResult: scoring.privateResult,
      submittedAt: new Date().toISOString(),
      questionRunId: room.questionRunId
    };
    room.submissions.set(studentId, submission);
    recordQuizSubmission(room, studentId, submission);
    return submission;
  }

  createRoomState(room, studentId = '') {
    const now = Date.now();
    const roomAdapter = this.isMixedRoom(room) ? null : this.getAdapter(room.moduleId);
    const isExamLab = room.moduleId === 'exam-lab';
    const released = Boolean(room.quizEnded);
    const role = studentId ? 'student' : 'teacher';
    const canExposeClassScores = !isExamLab || (role === 'teacher' && released);
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
        score: canExposeClassScores ? score : null,
        total: canExposeClassScores ? total : null,
        percentage: canExposeClassScores ? percentage : null,
        submittedAt: submission ? submission.submittedAt : null,
        cumulativeScore: canExposeClassScores ? cumulative.score : null,
        cumulativeTotal: canExposeClassScores ? cumulative.total : null,
        cumulativePercentage: canExposeClassScores ? cumulative.percentage : null,
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
    const publicQuestion = roomAdapter && typeof roomAdapter.serialiseQuestion === 'function'
      ? roomAdapter.serialiseQuestion(room.activeQuestion, { role, room, released })
      : (room.activeQuestion || null);
    const publicStudentSubmission = roomAdapter && typeof roomAdapter.serialiseSubmission === 'function'
      ? roomAdapter.serialiseSubmission(studentSubmission, { role: 'student', room, released })
      : (studentSubmission || null);
    const classAnalysis = isExamLab && role === 'teacher' && released && typeof roomAdapter?.buildClassAnalysis === 'function'
      ? roomAdapter.buildClassAnalysis(room)
      : null;

    return {
      ok: true,
      serverNow: now,
      roomCode: room.code,
      moduleId: room.moduleId,
      moduleTitle: room.moduleTitle,
      activityType: room.activityType || 'quiz',
      classroom: room.classId || room.className ? {
        ...(role === 'teacher' && room.classId ? { id: room.classId } : {}),
        name: room.className || 'Selected class'
      } : null,
      questionModuleId: room.questionModuleId || room.moduleId,
      mixedModuleIds: this.isMixedRoom(room) ? this.normaliseMixedModuleIds(room.mixedModuleIds) : [],
      studentMode: room.studentMode,
      studentShellUrl: room.studentShellUrl,
      laptopJoinUrl: room.laptopJoinUrl,
      active: Boolean(room.activeQuestion),
      submissionsOpen: Boolean(room.submissionsOpen),
      submissionsClosed: Boolean(room.submissionsClosed),
      listens: room.listens,
      maxListens: Number(room.maxListens || DEFAULT_MAX_LISTENS),
      dismissed: Boolean(room.dismissed),
      feedbackReleased: released,
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
      question: publicQuestion,
      totalNotes: room.totalNotes || 0,
      totalMarks: room.totalMarks || 0,
      students,
      leaderboard: isExamLab ? [] : buildLeaderboard(students),
      examLabAnalysis: classAnalysis,
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
        submission: publicStudentSubmission,
        results: isExamLab ? [] : buildCumulativeResults(room, studentId),
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
