'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/pool');

const TEACHER_COOKIE = 'ea_teacher_session';
const STUDENT_COOKIE = 'ea_student_session';
const TEACHER_SESSION_DAYS = 7;
const STUDENT_SESSION_HOURS = 12;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map();

function allowedAccountOrigin(origin) {
  const value = String(origin || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  const allowed = new Set([
    'https://echoaural.com',
    'https://www.echoaural.com',
    String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, ''),
    String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '')
  ].filter(Boolean));
  if (allowed.has(value)) return value;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value)) return value;
  if (/^http:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)(?::\d+)?$/i.test(value)) return value;
  return '';
}

function setAccountCorsHeaders(req, res) {
  const origin = allowedAccountOrigin(req.headers.origin);
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(body);
  return true;
}

function readJsonBody(req, maxBytes = 64_000) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        const error = new Error('Request body too large.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) return resolve({});
      try {
        return resolve(JSON.parse(body));
      } catch (_error) {
        const error = new Error('Invalid JSON.');
        error.statusCode = 400;
        return reject(error);
      }
    });

    req.on('error', reject);
  });
}

function parseCookies(req) {
  const output = {};
  const header = String(req.headers.cookie || '');
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try { output[key] = decodeURIComponent(value); }
    catch (_error) { output[key] = value; }
  }
  return output;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function isSecureRequest(req) {
  if (String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true') return true;
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookie(name, token, req, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(name, req) {
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanTeacherCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function cleanUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24);
}

function cleanDisplayName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}

function validPin(value) {
  return /^\d{4,6}$/.test(String(value || '').trim());
}

function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimitKey(req, type, identity) {
  return `${type}:${requestIp(req)}:${String(identity || '').toLowerCase()}`;
}

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 0, startedAt: now });
    return false;
  }
  return record.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, startedAt: now });
  } else {
    current.count += 1;
  }
}

function clearFailedLogins(key) {
  loginAttempts.delete(key);
}

async function getTeacherSession(req) {
  const token = parseCookies(req)[TEACHER_COOKIE];
  if (!token) return null;

  const result = await getPool().query(`
    SELECT
      t.id,
      t.email,
      t.display_name,
      t.teacher_code,
      t.role,
      t.status,
      t.must_change_password,
      l.id AS licence_id,
      l.plan,
      l.seat_limit,
      l.status AS licence_status,
      l.starts_at,
      l.expires_at
    FROM teacher_sessions s
    JOIN teachers t ON t.id = s.teacher_id
    LEFT JOIN licences l
      ON l.teacher_id = t.id
      AND l.status IN ('trial', 'active')
    WHERE s.token_hash = $1
      AND s.expires_at > NOW()
      AND t.status = 'active'
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT 1
  `, [hashToken(token)]);

  if (!result.rows[0]) return null;

  await getPool().query(`
    UPDATE teacher_sessions
    SET last_seen_at = NOW()
    WHERE token_hash = $1
  `, [hashToken(token)]);

  return result.rows[0];
}

async function getStudentSession(req) {
  const token = parseCookies(req)[STUDENT_COOKIE];
  if (!token) return null;

  const result = await getPool().query(`
    SELECT
      s.id,
      s.username,
      s.display_name,
      s.active,
      t.id AS teacher_id,
      t.display_name AS teacher_name,
      t.teacher_code,
      l.status AS licence_status,
      l.expires_at
    FROM student_sessions ss
    JOIN students s ON s.id = ss.student_id
    JOIN teachers t ON t.id = s.teacher_id
    LEFT JOIN licences l
      ON l.teacher_id = t.id
      AND l.status IN ('trial', 'active')
    WHERE ss.token_hash = $1
      AND ss.expires_at > NOW()
      AND s.active = TRUE
      AND t.status = 'active'
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT 1
  `, [hashToken(token)]);

  if (!result.rows[0]) return null;

  await getPool().query(`
    UPDATE student_sessions
    SET last_seen_at = NOW()
    WHERE token_hash = $1
  `, [hashToken(token)]);

  return result.rows[0];
}

function activeLicence(session) {
  if (!session || !['trial', 'active'].includes(session.licence_status)) return false;
  if (!session.expires_at) return true;
  return new Date(session.expires_at).getTime() > Date.now();
}

async function requireTeacher(req, res) {
  const teacher = await getTeacherSession(req);
  if (!teacher) {
    sendJson(res, 401, { ok: false, error: 'Teacher login required.' });
    return null;
  }
  if (!activeLicence(teacher)) {
    sendJson(res, 403, { ok: false, error: 'This teacher licence is not active.' });
    return null;
  }
  return teacher;
}

async function requireStudent(req, res) {
  const student = await getStudentSession(req);
  if (!student) {
    sendJson(res, 401, { ok: false, error: 'Student login required.' });
    return null;
  }
  if (!['trial', 'active'].includes(student.licence_status)) {
    sendJson(res, 403, { ok: false, error: 'This student account is not currently active.' });
    return null;
  }
  if (student.expires_at && new Date(student.expires_at).getTime() <= Date.now()) {
    sendJson(res, 403, { ok: false, error: 'This student account has expired.' });
    return null;
  }
  return student;
}

function publicTeacher(teacher, activeStudents = null) {
  return {
    id: teacher.id,
    email: teacher.email,
    displayName: teacher.display_name,
    teacherCode: teacher.teacher_code,
    role: teacher.role,
    mustChangePassword: Boolean(teacher.must_change_password),
    licence: {
      plan: teacher.plan || null,
      status: teacher.licence_status || null,
      seatLimit: Number(teacher.seat_limit || 0),
      activeStudents: activeStudents === null ? null : Number(activeStudents),
      startsAt: teacher.starts_at || null,
      expiresAt: teacher.expires_at || null
    }
  };
}

function publicStudent(student) {
  return {
    id: student.id,
    username: student.username,
    displayName: student.display_name,
    teacherName: student.teacher_name,
    teacherCode: student.teacher_code
  };
}



const PROGRESS_MODULE_DEFINITIONS = {
  'melody-master': {
    title: 'Melodic Dictation',
    group: 'Melody Master',
    icon: '/assets/icons/modules/melody-master.svg'
  },
  'melodic-intervals': {
    title: 'Melodic Intervals',
    group: 'Melody Master',
    icon: '/assets/icons/modules/melody-master.svg'
  },
  'instrument-identifier': {
    title: 'Instrument Identifier',
    group: 'Instrument Identifier',
    icon: '/assets/icons/modules/instrument-identifier.svg'
  },
  'texture-trainer': {
    title: 'Texture Trainer',
    group: 'Texture Trainer',
    icon: '/assets/icons/modules/texture-trainer.svg'
  }
};

const PROGRESS_MODULE_ORDER = [
  'melody-master',
  'melodic-intervals',
  'instrument-identifier',
  'texture-trainer'
];

const PROGRESSION_LEVEL_LABELS = ['Foundation', 'Developing', 'Securing', 'Mastering'];
const PROGRESSION_PASS_MARKS = {
  'melody-master': [100, 100, 100, 100],
  'melodic-intervals': [100, 100, 100, 100],
  'instrument-identifier': [70, 70, 80, 80]
};

function progressNumber(value) {
  return Number(value || 0);
}

function progressPercentage(score, maximum) {
  return maximum > 0 ? Math.round((score / maximum) * 100) : 0;
}

function progressionStageForModule(moduleId, moduleRounds) {
  const passMarks = PROGRESSION_PASS_MARKS[moduleId];
  if (!passMarks) return null;

  const levels = passMarks.map((passMark) => ({
    attempts: 0,
    bestPercentage: 0,
    lastPercentage: null,
    passed: false,
    passMark
  }));

  moduleRounds
    .filter((round) => progressSource(round) === 'progress')
    .slice()
    .reverse()
    .forEach((round) => {
      const metadata = round.metadata || {};
      const level = Math.max(0, Math.min(passMarks.length - 1, Number(metadata.progressionLevel) || 0));
      const percentage = progressPercentage(progressNumber(round.score), progressNumber(round.maximum_score));
      const state = levels[level];

      state.attempts += 1;
      state.lastPercentage = percentage;
      state.bestPercentage = Math.max(state.bestPercentage, percentage);
      state.passed = state.passed || percentage >= state.passMark;
      state.lastCompletedAt = round.completed_at;
    });

  const highestPassedLevel = levels
    .map((state, level) => ({ state, level }))
    .filter(({ state }) => state.passed)
    .map(({ level }) => level)
    .sort((a, b) => b - a)[0];
  const currentLevel = highestPassedLevel === undefined
    ? 0
    : Math.min(passMarks.length - 1, highestPassedLevel + 1);

  return {
    currentLevel,
    label: PROGRESSION_LEVEL_LABELS[currentLevel] || `Level ${currentLevel + 1}`,
    levels
  };
}

function progressLevel(value, questions) {
  if (!questions) return 'Not started';
  if (value >= 85) return 'Secure';
  if (value >= 70) return 'Strong';
  if (value >= 50) return 'Developing';
  return 'Keep practising';
}

function progressSource(round) {
  const metadata = round?.metadata || {};
  const source = String(metadata.source || '').trim().toLowerCase();
  const learningMode = String(metadata.learningMode || '').trim().toLowerCase();
  if (source === 'teacher_mode') return 'quizzes';
  if (source === 'homework') return 'homework';
  if (
    source === 'student_progression' ||
    source === 'progression' ||
    source === 'progress_mode' ||
    learningMode === 'progression' ||
    metadata.progressionLevel !== undefined
  ) return 'progress';
  return 'practice';
}

function practiceDurationSeconds(round) {
  const metadata = round?.metadata || {};
  const source = String(metadata.source || '').trim().toLowerCase();
  if (source !== 'practice_time') return 0;

  const seconds = Number(metadata.durationSeconds ?? metadata.practiceSeconds ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(0, Math.min(12 * 60 * 60, Math.round(seconds)));
}

function isPracticeTimeRound(round) {
  return (
    practiceDurationSeconds(round) > 0 &&
    Number(round?.question_count || 0) === 0 &&
    progressNumber(round?.maximum_score) === 0
  );
}

function isPracticeScoreRound(round) {
  return progressSource(round) === 'practice' && !isPracticeTimeRound(round);
}

function filterProgressBySource(allRounds, allAttempts, source) {
  const rounds = allRounds.filter((round) => progressSource(round) === source);
  const roundIds = new Set(rounds.map((round) => String(round.id)));
  const attempts = allAttempts.filter((attempt) => roundIds.has(String(attempt.round_id)));
  return { rounds, attempts };
}

function buildProgressCategories(allRounds, allAttempts) {
  const progress = filterProgressBySource(allRounds, allAttempts, 'progress');
  const practiceRounds = allRounds.filter(isPracticeTimeRound);
  const quizzes = filterProgressBySource(allRounds, allAttempts, 'quizzes');
  const homework = filterProgressBySource(allRounds, allAttempts, 'homework');
  return {
    progress: buildProgressSummary(progress.rounds, progress.attempts),
    practice: buildProgressSummary(practiceRounds, []),
    quizzes: buildProgressSummary(quizzes.rounds, quizzes.attempts),
    homework: buildProgressSummary(homework.rounds, homework.attempts)
  };
}

function buildProgressSummary(allRounds, allAttempts) {
  const scoredRounds = allRounds.filter((round) => !isPracticeTimeRound(round) && !isPracticeScoreRound(round));
  const practiceTimeRounds = allRounds.filter(isPracticeTimeRound);
  const totalPracticeSeconds = practiceTimeRounds.reduce((sum, round) => sum + practiceDurationSeconds(round), 0);

  const moduleSummaries = PROGRESS_MODULE_ORDER.map((moduleId) => {
    const definition = PROGRESS_MODULE_DEFINITIONS[moduleId];
    const moduleRounds = allRounds.filter((round) => round.module_id === moduleId);
    const rounds = scoredRounds.filter((round) => round.module_id === moduleId);
    const attempts = allAttempts.filter((attempt) => attempt.module_id === moduleId);
    const progressionStage = progressionStageForModule(moduleId, moduleRounds);
    const score = rounds.reduce((sum, round) => sum + progressNumber(round.score), 0);
    const maximumScore = rounds.reduce((sum, round) => sum + progressNumber(round.maximum_score), 0);
    const questionCount = rounds.reduce((sum, round) => sum + Number(round.question_count || 0), 0);
    const practiceSeconds = moduleRounds.reduce((sum, round) => sum + practiceDurationSeconds(round), 0);
    const practiceSessions = moduleRounds.filter(isPracticeTimeRound).length;
    const accuracy = progressPercentage(score, maximumScore);
    let feedback = 'Complete a round to start building personalised feedback.';
    let strength = 'No evidence yet';
    let nextStep = 'Open this activity and complete a first round.';

    if (questionCount) {
      if (moduleId === 'melody-master') {
        let pitchAwarded = 0;
        let pitchAvailable = 0;
        let shapeAwarded = 0;
        let shapeAvailable = 0;
        attempts.forEach((attempt) => {
          const data = attempt.answer_data || {};
          pitchAwarded += progressNumber(data.pitchMarksAwarded);
          pitchAvailable += progressNumber(data.pitchMarksAvailable);
          shapeAwarded += progressNumber(data.shapeMarksAwarded);
          shapeAvailable += progressNumber(data.shapeMarksAvailable);
        });
        const pitchAccuracy = progressPercentage(pitchAwarded, pitchAvailable);
        const contourAccuracy = progressPercentage(shapeAwarded, shapeAvailable);
        strength = pitchAccuracy >= contourAccuracy
          ? `Exact pitch · ${pitchAccuracy}%`
          : `Melodic contour · ${contourAccuracy}%`;
        nextStep = pitchAccuracy < contourAccuracy
          ? 'Use the first note as an anchor, then check the exact size of every step and leap.'
          : 'Decide whether each movement goes up, down or repeats before refining exact pitch.';
        feedback = accuracy >= 85
          ? 'Melodic dictation is secure across the questions completed so far.'
          : `The overall dictation score is ${accuracy}%. ${nextStep}`;
      } else if (moduleId === 'melodic-intervals') {
        const intervalAttempts = attempts.filter((attempt) => Object.prototype.hasOwnProperty.call(attempt.answer_data || {}, 'intervalCorrect'));
        const intervalCorrect = intervalAttempts.filter((attempt) => Boolean((attempt.answer_data || {}).intervalCorrect)).length;
        const constructionAttempts = intervalAttempts.filter((attempt) => (attempt.answer_data || {}).mode === 'construction');
        const pitchCorrect = constructionAttempts.filter((attempt) => Boolean((attempt.answer_data || {}).pitchCorrect)).length;
        const intervalAccuracy = progressPercentage(intervalCorrect, intervalAttempts.length);
        const constructionAccuracy = progressPercentage(pitchCorrect, constructionAttempts.length);
        strength = constructionAttempts.length && constructionAccuracy > intervalAccuracy
          ? `Pitch placement · ${constructionAccuracy}%`
          : `Interval recognition · ${intervalAccuracy}%`;
        nextStep = intervalAccuracy < 70
          ? 'Connect each stave distance to its sound, beginning with 2nds, 3rds, 4ths and 5ths.'
          : constructionAttempts.length && constructionAccuracy < 70
            ? 'Practise placing the second note after identifying the interval by ear.'
            : 'Keep mixing interval number, quality and note placement.';
        feedback = `${questionCount} interval ${questionCount === 1 ? 'question has' : 'questions have'} been completed at ${accuracy}% overall. ${nextStep}`;
      } else if (moduleId === 'instrument-identifier') {
        const incorrect = attempts.filter((attempt) => progressNumber(attempt.score) < progressNumber(attempt.maximum_score));
        const familyMisses = new Map();
        incorrect.forEach((attempt) => {
          const family = String((attempt.answer_data || {}).family || '').trim();
          if (family) familyMisses.set(family, (familyMisses.get(family) || 0) + 1);
        });
        const focusFamily = [...familyMisses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        strength = `${score}/${maximumScore} instruments identified`;
        nextStep = focusFamily
          ? `Revisit ${focusFamily.toLowerCase()} instruments and compare their tone colour and register.`
          : accuracy >= 85
            ? 'Increase the difficulty or use accompanied and mixed extracts.'
            : 'Compare instruments from the same family and listen for register, attack and tone colour.';
        feedback = `Instrument-identification accuracy is ${accuracy}% across ${questionCount} questions. ${nextStep}`;
      } else if (moduleId === 'texture-trainer') {
        const fullMarks = attempts.filter((attempt) => progressNumber(attempt.score) >= progressNumber(attempt.maximum_score) && progressNumber(attempt.maximum_score) > 0).length;
        const focusAttempt = attempts.find((attempt) => progressNumber(attempt.score) < progressNumber(attempt.maximum_score));
        const focusTitle = String((focusAttempt?.answer_data || {}).title || '').trim();
        strength = `${fullMarks}/${questionCount} full-mark responses`;
        nextStep = focusTitle
          ? `Revisit ${focusTitle} and use one precise texture term followed by audible evidence.`
          : accuracy >= 85
            ? 'Keep extending answers with precise evidence about layers and independence.'
            : 'Name the texture first, then explain the number and relationship of musical lines.';
        feedback = `Written texture answers are averaging ${accuracy}%. ${nextStep}`;
      }
    }

    return {
      moduleId,
      title: definition.title,
      group: definition.group,
      icon: definition.icon,
      score,
      maximumScore,
      percentage: accuracy,
      rounds: rounds.length,
      questions: questionCount,
      practiceSeconds,
      practiceSessions,
      level: progressLevel(accuracy, questionCount),
      strength,
      nextStep,
      feedback,
      progressionStage,
      lastCompletedAt: rounds[0]?.completed_at || null,
      lastPracticeAt: moduleRounds.find(isPracticeTimeRound)?.completed_at || null
    };
  });

  const totalScore = scoredRounds.reduce((sum, round) => sum + progressNumber(round.score), 0);
  const totalMaximum = scoredRounds.reduce((sum, round) => sum + progressNumber(round.maximum_score), 0);
  const totalQuestions = scoredRounds.reduce((sum, round) => sum + Number(round.question_count || 0), 0);
  const overallPercentage = progressPercentage(totalScore, totalMaximum);
  const startedModules = moduleSummaries.filter((module) => module.questions > 0);
  const strongestModule = startedModules.slice().sort((a, b) => b.percentage - a.percentage)[0] || null;
  const focusModule = startedModules.slice().sort((a, b) => a.percentage - b.percentage)[0] || null;
  let compiledFeedback = 'Complete an EchoAural round while logged in to start the progress record.';

  if (totalQuestions) {
    const opening = overallPercentage >= 85
      ? 'Excellent listening progress.'
      : overallPercentage >= 70
        ? 'Strong progress across the completed listening work.'
        : overallPercentage >= 50
          ? 'Listening skills are developing.'
          : 'Keep building listening recognition through short, repeated rounds.';
    const strengthText = strongestModule
      ? ` The strongest current area is ${strongestModule.title} at ${strongestModule.percentage}%.`
      : '';
    const focusText = focusModule
      ? ` The next priority is ${focusModule.title}: ${focusModule.nextStep}`
      : '';
    compiledFeedback = `${opening}${strengthText}${focusText}`;
  }

  const roundSourceById = new Map(
    allRounds.map((round) => [String(round.id), progressSource(round)])
  );

  return {
    overall: {
      score: totalScore,
      maximumScore: totalMaximum,
      percentage: overallPercentage,
      rounds: scoredRounds.length,
      questions: totalQuestions,
      practiceSeconds: totalPracticeSeconds,
      practiceSessions: practiceTimeRounds.length,
      modulesStarted: startedModules.length,
      level: progressLevel(overallPercentage, totalQuestions),
      compiledFeedback,
      strongestModule: strongestModule?.title || null,
      focusModule: focusModule?.title || null,
      lastCompletedAt: scoredRounds[0]?.completed_at || null,
      lastPracticeAt: practiceTimeRounds[0]?.completed_at || null
    },
    modules: moduleSummaries,
    recentRounds: scoredRounds.slice(0, 10).map((round) => ({
      id: round.id,
      moduleId: round.module_id,
      title: round.module_title,
      score: progressNumber(round.score),
      maximumScore: progressNumber(round.maximum_score),
      percentage: progressPercentage(progressNumber(round.score), progressNumber(round.maximum_score)),
      questions: Number(round.question_count || 0),
      feedback: round.round_feedback || '',
      source: progressSource(round),
      completedAt: round.completed_at
    })),
    recentQuestions: allAttempts.slice(0, 16).map((attempt) => ({
      id: attempt.id,
      moduleId: attempt.module_id,
      moduleTitle: PROGRESS_MODULE_DEFINITIONS[attempt.module_id]?.title || attempt.module_id,
      questionId: attempt.question_id,
      score: progressNumber(attempt.score),
      maximumScore: progressNumber(attempt.maximum_score),
      feedback: attempt.feedback || '',
      answerData: attempt.answer_data || {},
      source: roundSourceById.get(String(attempt.round_id)) || 'practice',
      completedAt: attempt.completed_at
    }))
  };
}

async function loadStudentProgress(studentId) {
  const [roundResult, attemptResult] = await Promise.all([
    getPool().query(`
      SELECT
        id,
        module_id,
        module_title,
        score,
        maximum_score,
        question_count,
        round_feedback,
        metadata,
        completed_at
      FROM rounds
      WHERE student_id = $1
      ORDER BY completed_at DESC
      LIMIT 500
    `, [studentId]),
    getPool().query(`
      SELECT
        id,
        round_id,
        module_id,
        question_id,
        score,
        maximum_score,
        feedback,
        answer_data,
        completed_at
      FROM attempts
      WHERE student_id = $1
      ORDER BY completed_at DESC, id DESC
      LIMIT 2000
    `, [studentId])
  ]);

  const combined = buildProgressSummary(roundResult.rows, attemptResult.rows);
  return {
    ...combined,
    categories: buildProgressCategories(roundResult.rows, attemptResult.rows)
  };
}

async function loadStudentProgressionState(studentId, moduleId) {
  const normalisedModuleId = String(moduleId || '').trim().toLowerCase();
  const modulePassMarks = PROGRESSION_PASS_MARKS[normalisedModuleId];

  if (!modulePassMarks) {
    return {
      moduleId: normalisedModuleId,
      unlockedLevel: 0,
      levels: {}
    };
  }

  const result = await getPool().query(`
    SELECT
      score,
      maximum_score,
      metadata,
      completed_at
    FROM rounds
    WHERE student_id = $1
      AND module_id = $2
      AND (
        LOWER(COALESCE(metadata->>'source', '')) IN ('student_progression', 'progression', 'progress_mode')
        OR LOWER(COALESCE(metadata->>'learningMode', '')) = 'progression'
        OR metadata ? 'progressionLevel'
      )
    ORDER BY completed_at DESC
    LIMIT 500
  `, [studentId, normalisedModuleId]);

  const levels = {};
  modulePassMarks.forEach((passMark, level) => {
    levels[level] = {
      attempts: 0,
      bestPercentage: 0,
      lastPercentage: null,
      passed: false,
      passMark
    };
  });

  result.rows.slice().reverse().forEach((round) => {
    const metadata = round.metadata || {};
    const level = Math.max(0, Math.min(modulePassMarks.length - 1, Number(metadata.progressionLevel) || 0));
    const maximumScore = progressNumber(round.maximum_score);
    const score = progressNumber(round.score);
    const percentage = progressPercentage(score, maximumScore);
    const state = levels[level];

    state.attempts += 1;
    state.lastPercentage = percentage;
    state.bestPercentage = Math.max(state.bestPercentage, percentage);
    state.passed = state.passed || percentage >= state.passMark;
    state.lastCompletedAt = round.completed_at;
  });

  const highestPassedLevel = Object.entries(levels)
    .filter(([, state]) => state.passed)
    .map(([level]) => Number(level))
    .sort((a, b) => b - a)[0];
  const unlockedLevel = highestPassedLevel === undefined
    ? 0
    : Math.min(modulePassMarks.length - 1, highestPassedLevel + 1);

  return {
    moduleId: normalisedModuleId,
    unlockedLevel,
    levels
  };
}

function buildClassModuleFeedback(moduleSummary) {
  if (!moduleSummary.questions && moduleSummary.practiceSeconds) return `${moduleSummary.title} practice time has been logged, but no progress-mode results have been saved yet.`;
  if (!moduleSummary.questions) return 'No class evidence yet. Students need to complete a round in this activity.';
  if (moduleSummary.percentage >= 85) return `${moduleSummary.title} is secure across the work completed by the class.`;
  if (moduleSummary.percentage >= 70) return `${moduleSummary.title} is a current class strength, with some individual gaps still worth checking.`;
  if (moduleSummary.percentage >= 50) return `${moduleSummary.title} is developing. Use a short whole-class round, then review students below the class average.`;
  return `${moduleSummary.title} needs focused class practice through short, repeated listening decisions.`;
}

function buildClassProgressSummary(allStudents, allRounds, allAttempts) {
  const scoredRounds = allRounds.filter((round) => !isPracticeTimeRound(round) && !isPracticeScoreRound(round));
  const practiceTimeRounds = allRounds.filter(isPracticeTimeRound);
  const totalPracticeSeconds = practiceTimeRounds.reduce((sum, round) => sum + practiceDurationSeconds(round), 0);
  const activeStudents = allStudents.filter((student) => student.active);
  const participatingIds = new Set(scoredRounds.map((round) => String(round.student_id)));
  const practiceStudentIds = new Set(practiceTimeRounds.map((round) => String(round.student_id)));

  const students = allStudents.map((student) => {
    const progress = buildProgressSummary(
      allRounds.filter((round) => String(round.student_id) === String(student.id)),
      allAttempts.filter((attempt) => String(attempt.student_id) === String(student.id))
    );
    return {
      id: student.id,
      username: student.username,
      displayName: student.display_name,
      active: student.active,
      createdAt: student.created_at,
      lastLoginAt: student.last_login_at,
      ...progress.overall
    };
  });

  const modules = PROGRESS_MODULE_ORDER.map((moduleId) => {
    const definition = PROGRESS_MODULE_DEFINITIONS[moduleId];
    const moduleRounds = allRounds.filter((round) => round.module_id === moduleId);
    const rounds = scoredRounds.filter((round) => round.module_id === moduleId);
    const score = rounds.reduce((sum, round) => sum + progressNumber(round.score), 0);
    const maximumScore = rounds.reduce((sum, round) => sum + progressNumber(round.maximum_score), 0);
    const questions = rounds.reduce((sum, round) => sum + Number(round.question_count || 0), 0);
    const practiceSeconds = moduleRounds.reduce((sum, round) => sum + practiceDurationSeconds(round), 0);
    const practiceSessions = moduleRounds.filter(isPracticeTimeRound).length;
    const studentCount = new Set(rounds.map((round) => String(round.student_id))).size;
    const practiceStudentCount = new Set(
      moduleRounds
        .filter(isPracticeTimeRound)
        .map((round) => String(round.student_id))
    ).size;
    const value = progressPercentage(score, maximumScore);
    const summary = {
      moduleId,
      title: definition.title,
      group: definition.group,
      icon: definition.icon,
      score,
      maximumScore,
      percentage: value,
      questions,
      rounds: rounds.length,
      students: studentCount,
      practiceSeconds,
      practiceSessions,
      practiceStudents: practiceStudentCount,
      level: progressLevel(value, questions),
      lastCompletedAt: rounds[0]?.completed_at || null,
      lastPracticeAt: moduleRounds.find(isPracticeTimeRound)?.completed_at || null
    };
    return { ...summary, feedback: buildClassModuleFeedback(summary) };
  });

  const totalScore = scoredRounds.reduce((sum, round) => sum + progressNumber(round.score), 0);
  const totalMaximum = scoredRounds.reduce((sum, round) => sum + progressNumber(round.maximum_score), 0);
  const totalQuestions = scoredRounds.reduce((sum, round) => sum + Number(round.question_count || 0), 0);
  const overallPercentage = progressPercentage(totalScore, totalMaximum);
  const startedModules = modules.filter((module) => module.questions > 0);
  const strongestModule = startedModules.slice().sort((a, b) => b.percentage - a.percentage)[0] || null;
  const focusModule = startedModules.slice().sort((a, b) => a.percentage - b.percentage)[0] || null;
  const participatingActiveStudents = activeStudents.filter((student) => participatingIds.has(String(student.id))).length;
  const participation = activeStudents.length
    ? Math.round((participatingActiveStudents / activeStudents.length) * 100)
    : 0;

  let compiledFeedback = 'Class feedback will appear after students complete logged-in EchoAural rounds.';
  if (totalQuestions) {
    const opening = overallPercentage >= 85
      ? 'The class is showing secure listening recognition across the completed work.'
      : overallPercentage >= 70
        ? 'The class is making strong listening progress.'
        : overallPercentage >= 50
          ? 'The class is developing, with clear areas for targeted practice.'
          : 'The class needs more short, repeated listening practice before recognition becomes reliable.';
    const strongest = strongestModule
      ? ` The strongest current area is ${strongestModule.title} at ${strongestModule.percentage}%.`
      : '';
    const focus = focusModule
      ? ` The next class priority is ${focusModule.title} at ${focusModule.percentage}%.`
      : '';
    const evidence = participation < 100
      ? ` Results currently include ${participatingActiveStudents} of ${activeStudents.length} active students.`
      : '';
    compiledFeedback = `${opening}${strongest}${focus}${evidence}`;
  }

  return {
    overall: {
      score: totalScore,
      maximumScore: totalMaximum,
      percentage: overallPercentage,
      questions: totalQuestions,
      rounds: scoredRounds.length,
      practiceSeconds: totalPracticeSeconds,
      practiceSessions: practiceTimeRounds.length,
      practiceStudents: practiceStudentIds.size,
      activeStudents: activeStudents.length,
      participatingStudents: participatingActiveStudents,
      participation,
      level: progressLevel(overallPercentage, totalQuestions),
      compiledFeedback,
      strongestModule: strongestModule?.title || null,
      focusModule: focusModule?.title || null,
      lastCompletedAt: scoredRounds[0]?.completed_at || null,
      lastPracticeAt: practiceTimeRounds[0]?.completed_at || null
    },
    modules,
    students
  };
}

function buildClassProgressCategories(allStudents, allRounds, allAttempts) {
  const progress = filterProgressBySource(allRounds, allAttempts, 'progress');
  const practiceRounds = allRounds.filter(isPracticeTimeRound);
  const quizzes = filterProgressBySource(allRounds, allAttempts, 'quizzes');
  const homework = filterProgressBySource(allRounds, allAttempts, 'homework');
  return {
    progress: buildClassProgressSummary(allStudents, progress.rounds, progress.attempts),
    practice: buildClassProgressSummary(allStudents, practiceRounds, []),
    quizzes: buildClassProgressSummary(allStudents, quizzes.rounds, quizzes.attempts),
    homework: buildClassProgressSummary(allStudents, homework.rounds, homework.attempts)
  };
}

async function handleAccountApi(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/teacher/') && !pathname.startsWith('/api/student/')) return false;
  setAccountCorsHeaders(req, res);

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store'
      });
      res.end();
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/auth/teacher/login') {
      const body = await readJsonBody(req);
      const email = cleanEmail(body.email);
      const password = String(body.password || '');
      const limitKey = rateLimitKey(req, 'teacher', email);

      if (!email || !password) return sendJson(res, 400, { ok: false, error: 'Enter your email and password.' });
      if (checkRateLimit(limitKey)) return sendJson(res, 429, { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' });

      const result = await getPool().query(`
        SELECT t.*, l.plan, l.seat_limit, l.status AS licence_status, l.starts_at, l.expires_at
        FROM teachers t
        LEFT JOIN licences l
          ON l.teacher_id = t.id
          AND l.status IN ('trial', 'active')
        WHERE LOWER(t.email) = $1
        ORDER BY l.created_at DESC NULLS LAST
        LIMIT 1
      `, [email]);

      const teacher = result.rows[0];
      const passwordMatches = teacher ? await bcrypt.compare(password, teacher.password_hash) : false;

      if (!teacher || !passwordMatches || teacher.status !== 'active' || !activeLicence(teacher)) {
        recordFailedLogin(limitKey);
        return sendJson(res, 401, { ok: false, error: 'Email or password not recognised.' });
      }

      clearFailedLogins(limitKey);
      const token = makeToken();
      const expiresAt = new Date(Date.now() + TEACHER_SESSION_DAYS * 24 * 60 * 60 * 1000);

      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM teacher_sessions WHERE expires_at <= NOW()`);
        await client.query(`
          INSERT INTO teacher_sessions (teacher_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `, [teacher.id, hashToken(token), expiresAt]);
        await client.query(`UPDATE teachers SET last_login_at = NOW() WHERE id = $1`, [teacher.id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return sendJson(res, 200, { ok: true, teacher: publicTeacher(teacher) }, {
        'Set-Cookie': sessionCookie(TEACHER_COOKIE, token, req, TEACHER_SESSION_DAYS * 24 * 60 * 60)
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/student/login') {
      const body = await readJsonBody(req);
      const teacherCode = cleanTeacherCode(body.teacherCode);
      const username = cleanUsername(body.username);
      const pin = String(body.pin || '').trim();
      const limitKey = rateLimitKey(req, 'student', `${teacherCode}:${username}`);

      if (!teacherCode || !username || !pin) return sendJson(res, 400, { ok: false, error: 'Enter the teacher code, username and PIN.' });
      if (checkRateLimit(limitKey)) return sendJson(res, 429, { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' });

      const result = await getPool().query(`
        SELECT
          s.*,
          t.display_name AS teacher_name,
          t.teacher_code,
          t.status AS teacher_status,
          l.status AS licence_status,
          l.expires_at
        FROM students s
        JOIN teachers t ON t.id = s.teacher_id
        LEFT JOIN licences l
          ON l.teacher_id = t.id
          AND l.status IN ('trial', 'active')
        WHERE UPPER(t.teacher_code) = $1
          AND LOWER(s.username) = $2
        ORDER BY l.created_at DESC NULLS LAST
        LIMIT 1
      `, [teacherCode, username]);

      const student = result.rows[0];
      const pinMatches = student ? await bcrypt.compare(pin, student.pin_hash) : false;
      const licenceValid = student
        && ['trial', 'active'].includes(student.licence_status)
        && (!student.expires_at || new Date(student.expires_at).getTime() > Date.now());

      if (!student || !pinMatches || !student.active || student.teacher_status !== 'active' || !licenceValid) {
        recordFailedLogin(limitKey);
        return sendJson(res, 401, { ok: false, error: 'Login details not recognised.' });
      }

      clearFailedLogins(limitKey);
      const token = makeToken();
      const expiresAt = new Date(Date.now() + STUDENT_SESSION_HOURS * 60 * 60 * 1000);

      await getPool().query(`DELETE FROM student_sessions WHERE expires_at <= NOW()`);
      await getPool().query(`
        INSERT INTO student_sessions (student_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `, [student.id, hashToken(token), expiresAt]);
      await getPool().query(`UPDATE students SET last_login_at = NOW() WHERE id = $1`, [student.id]);

      return sendJson(res, 200, { ok: true, student: publicStudent(student) }, {
        'Set-Cookie': sessionCookie(STUDENT_COOKIE, token, req, STUDENT_SESSION_HOURS * 60 * 60)
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/teacher/logout') {
      const token = parseCookies(req)[TEACHER_COOKIE];
      if (token) {
        await getPool().query(
          'DELETE FROM teacher_sessions WHERE token_hash = $1',
          [hashToken(token)]
        );
      }
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': clearCookie(TEACHER_COOKIE, req)
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/student/logout') {
      const token = parseCookies(req)[STUDENT_COOKIE];
      if (token) {
        await getPool().query(
          'DELETE FROM student_sessions WHERE token_hash = $1',
          [hashToken(token)]
        );
      }
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': clearCookie(STUDENT_COOKIE, req)
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const cookies = parseCookies(req);
      const operations = [];
      if (cookies[TEACHER_COOKIE]) operations.push(getPool().query('DELETE FROM teacher_sessions WHERE token_hash = $1', [hashToken(cookies[TEACHER_COOKIE])]));
      if (cookies[STUDENT_COOKIE]) operations.push(getPool().query('DELETE FROM student_sessions WHERE token_hash = $1', [hashToken(cookies[STUDENT_COOKIE])]));
      await Promise.all(operations);
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': [clearCookie(TEACHER_COOKIE, req), clearCookie(STUDENT_COOKIE, req)]
      });
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const requestedRole = String(parsedUrl.searchParams.get('role') || '').toLowerCase();

      if (requestedRole === 'teacher') {
        const teacher = await getTeacherSession(req);
        if (teacher && activeLicence(teacher)) {
          const count = await getPool().query(
            `SELECT COUNT(*)::int AS count
             FROM students
             WHERE teacher_id = $1 AND active = TRUE`,
            [teacher.id]
          );
          return sendJson(res, 200, {
            ok: true,
            role: 'teacher',
            teacher: publicTeacher(teacher, count.rows[0].count)
          });
        }
        return sendJson(res, 401, { ok: false, error: 'Teacher login required.' });
      }

      if (requestedRole === 'student') {
        const student = await getStudentSession(req);
        if (student) {
          return sendJson(res, 200, {
            ok: true,
            role: 'student',
            student: publicStudent(student)
          });
        }
        return sendJson(res, 401, { ok: false, error: 'Student login required.' });
      }

      const teacher = await getTeacherSession(req);
      if (teacher && activeLicence(teacher)) {
        const count = await getPool().query(
          `SELECT COUNT(*)::int AS count
           FROM students
           WHERE teacher_id = $1 AND active = TRUE`,
          [teacher.id]
        );
        return sendJson(res, 200, {
          ok: true,
          role: 'teacher',
          teacher: publicTeacher(teacher, count.rows[0].count)
        });
      }

      const student = await getStudentSession(req);
      if (student) {
        return sendJson(res, 200, {
          ok: true,
          role: 'student',
          student: publicStudent(student)
        });
      }

      return sendJson(res, 401, { ok: false, error: 'Not logged in.' });
    }

    if (req.method === 'POST' && pathname === '/api/student/practice-time') {
      const student = await requireStudent(req, res);
      if (!student) return true;

      const body = await readJsonBody(req, 16_000);
      const moduleDefinitions = {
        'instrument-identifier': 'Instrument Identifier'
      };
      const moduleId = String(body.moduleId || '').trim().toLowerCase();
      const moduleTitle = moduleDefinitions[moduleId];
      const durationSeconds = Math.max(0, Math.min(12 * 60 * 60, Math.round(Number(body.durationSeconds) || 0)));
      const clientRoundId = String(body.clientSessionId || body.clientRoundId || '').trim().slice(0, 120);

      if (!moduleTitle) return sendJson(res, 400, { ok: false, error: 'Unknown EchoAural practice module.' });
      if (!clientRoundId) return sendJson(res, 400, { ok: false, error: 'Practice session identifier is required.' });
      if (durationSeconds < 5) return sendJson(res, 200, { ok: true, ignored: true });

      const metadata = {
        source: 'practice_time',
        mode: 'practice',
        durationSeconds,
        startedAt: String(body.startedAt || '').slice(0, 40) || null,
        endedAt: new Date().toISOString()
      };

      try {
        const result = await getPool().query(`
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
          VALUES ($1,$2,$3,$4,0,0,0,NULL,$5,$6)
          RETURNING id, completed_at
        `, [
          student.teacher_id,
          student.id,
          moduleId,
          moduleTitle,
          metadata,
          clientRoundId
        ]);

        return sendJson(res, 201, {
          ok: true,
          practiceSessionId: result.rows[0].id,
          completedAt: result.rows[0].completed_at
        });
      } catch (error) {
        if (error.code === '23505') {
          const duplicate = await getPool().query(`
            SELECT id FROM rounds WHERE student_id = $1 AND client_round_id = $2 LIMIT 1
          `, [student.id, clientRoundId]);
          return sendJson(res, 200, { ok: true, duplicate: true, practiceSessionId: duplicate.rows[0]?.id || null });
        }
        throw error;
      }
    }

    if (req.method === 'POST' && pathname === '/api/student/rounds') {
      const student = await requireStudent(req, res);
      if (!student) return true;

      const body = await readJsonBody(req, 256_000);
      const moduleDefinitions = {
        'melody-master': 'Melodic Dictation',
        'melodic-intervals': 'Melodic Intervals',
        'instrument-identifier': 'Instrument Identifier',
        'texture-trainer': 'Texture Trainer'
      };
      const moduleId = String(body.moduleId || '').trim().toLowerCase();
      const moduleTitle = moduleDefinitions[moduleId];
      const clientRoundId = String(body.clientRoundId || '').trim().slice(0, 120);
      const questions = Array.isArray(body.questions) ? body.questions.slice(0, 50) : [];

      if (!moduleTitle) return sendJson(res, 400, { ok: false, error: 'Unknown EchoAural module.' });
      if (!clientRoundId) return sendJson(res, 400, { ok: false, error: 'Round identifier is required.' });
      if (!questions.length) return sendJson(res, 400, { ok: false, error: 'At least one completed question is required.' });

      const normaliseMark = (value) => {
        const mark = Number(value);
        if (!Number.isFinite(mark) || mark < 0) return 0;
        return Math.round(mark * 100) / 100;
      };
      const cleanShortText = (value, maximum = 300) => String(value || '').trim().slice(0, maximum);
      const cleanJson = (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        const encoded = JSON.stringify(value);
        if (Buffer.byteLength(encoded) > 24_000) return {};
        return value;
      };

      const cleanQuestions = questions.map((question, index) => {
        const maximumScore = normaliseMark(question.maximumScore);
        return {
          questionId: cleanShortText(question.questionId || `Q${index + 1}`, 120),
          score: Math.min(normaliseMark(question.score), maximumScore || Number.MAX_SAFE_INTEGER),
          maximumScore,
          feedback: cleanShortText(question.feedback, 1000),
          answerData: cleanJson(question.answerData)
        };
      });

      const calculatedScore = cleanQuestions.reduce((sum, question) => sum + question.score, 0);
      const calculatedMaximum = cleanQuestions.reduce((sum, question) => sum + question.maximumScore, 0);
      const suppliedScore = normaliseMark(body.score);
      const suppliedMaximum = normaliseMark(body.maximumScore);
      const score = Math.abs(calculatedScore - suppliedScore) <= 0.01 ? suppliedScore : calculatedScore;
      const maximumScore = Math.abs(calculatedMaximum - suppliedMaximum) <= 0.01 ? suppliedMaximum : calculatedMaximum;
      const roundFeedback = cleanShortText(body.roundFeedback, 1600);
      const metadata = cleanJson(body.metadata);
      const metadataSource = String(metadata.source || '').trim().toLowerCase();
      const metadataLearningMode = String(metadata.learningMode || '').trim().toLowerCase();
      if (
        PROGRESSION_PASS_MARKS[moduleId] &&
        (
          metadataSource === 'student_progression' ||
          metadataSource === 'progression' ||
          metadataSource === 'progress_mode' ||
          metadataLearningMode === 'progression' ||
          metadata.progressionLevel !== undefined
        )
      ) {
        metadata.source = 'student_progression';
        metadata.learningMode = 'progression';
      }

      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const existing = await client.query(`
          SELECT id
          FROM rounds
          WHERE student_id = $1 AND client_round_id = $2
          LIMIT 1
        `, [student.id, clientRoundId]);

        if (existing.rows[0]) {
          await client.query('ROLLBACK');
          return sendJson(res, 200, { ok: true, duplicate: true, roundId: existing.rows[0].id });
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
          student.teacher_id,
          student.id,
          moduleId,
          moduleTitle,
          score,
          maximumScore,
          cleanQuestions.length,
          roundFeedback || null,
          metadata,
          clientRoundId
        ]);

        const round = roundResult.rows[0];
        for (const question of cleanQuestions) {
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
            student.teacher_id,
            student.id,
            round.id,
            moduleId,
            question.questionId || null,
            question.score,
            question.maximumScore,
            question.feedback || null,
            question.answerData,
            round.completed_at
          ]);
        }

        await client.query('COMMIT');
        return sendJson(res, 201, { ok: true, roundId: round.id, completedAt: round.completed_at });
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
          const duplicate = await getPool().query(`
            SELECT id FROM rounds WHERE student_id = $1 AND client_round_id = $2 LIMIT 1
          `, [student.id, clientRoundId]);
          return sendJson(res, 200, { ok: true, duplicate: true, roundId: duplicate.rows[0]?.id || null });
        }
        throw error;
      } finally {
        client.release();
      }
    }

    if (req.method === 'GET' && pathname === '/api/student/progress') {
      const student = await requireStudent(req, res);
      if (!student) return true;
      const progress = await loadStudentProgress(student.id);
      return sendJson(res, 200, { ok: true, ...progress });
    }

    if (req.method === 'GET' && pathname === '/api/student/progression-state') {
      const student = await requireStudent(req, res);
      if (!student) return true;
      const moduleId = String(parsedUrl.searchParams.get('moduleId') || 'instrument-identifier').trim().toLowerCase();
      const progress = await loadStudentProgressionState(student.id, moduleId);
      return sendJson(res, 200, { ok: true, ...progress });
    }

    if (req.method === 'GET' && pathname === '/api/teacher/progress/class') {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;

      const [studentResult, roundResult, attemptResult] = await Promise.all([
        getPool().query(`
          SELECT id, username, display_name, active, created_at, last_login_at
          FROM students
          WHERE teacher_id = $1
          ORDER BY active DESC, LOWER(display_name), LOWER(username)
        `, [teacher.id]),
        getPool().query(`
          SELECT
            id,
            student_id,
            module_id,
            module_title,
            score,
            maximum_score,
            question_count,
            round_feedback,
            metadata,
            completed_at
          FROM rounds
          WHERE teacher_id = $1
          ORDER BY completed_at DESC
        `, [teacher.id]),
        getPool().query(`
          SELECT
            id,
            student_id,
            round_id,
            module_id,
            question_id,
            score,
            maximum_score,
            feedback,
            answer_data,
            completed_at
          FROM attempts
          WHERE teacher_id = $1
          ORDER BY completed_at DESC, id DESC
        `, [teacher.id])
      ]);

      const allStudents = studentResult.rows;
      const allRounds = roundResult.rows;
      const allAttempts = attemptResult.rows;
      const combined = buildClassProgressSummary(allStudents, allRounds, allAttempts);

      return sendJson(res, 200, {
        ok: true,
        ...combined,
        categories: buildClassProgressCategories(allStudents, allRounds, allAttempts)
      });
    }

    const studentProgressMatch = pathname.match(/^\/api\/teacher\/students\/([0-9a-f-]+)\/progress$/i);
    if (req.method === 'GET' && studentProgressMatch) {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;

      const studentResult = await getPool().query(`
        SELECT id, username, display_name, active, created_at, last_login_at
        FROM students
        WHERE id = $1 AND teacher_id = $2
        LIMIT 1
      `, [studentProgressMatch[1], teacher.id]);

      const student = studentResult.rows[0];
      if (!student) return sendJson(res, 404, { ok: false, error: 'Student not found.' });

      const progress = await loadStudentProgress(student.id);
      return sendJson(res, 200, {
        ok: true,
        student: {
          id: student.id,
          username: student.username,
          displayName: student.display_name,
          active: student.active,
          createdAt: student.created_at,
          lastLoginAt: student.last_login_at
        },
        progress
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/teacher/change-password') {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;
      const body = await readJsonBody(req);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');

      if (newPassword.length < 10) return sendJson(res, 400, { ok: false, error: 'The new password must contain at least 10 characters.' });

      const current = await getPool().query('SELECT password_hash FROM teachers WHERE id = $1', [teacher.id]);
      const matches = current.rows[0] && await bcrypt.compare(currentPassword, current.rows[0].password_hash);
      if (!matches) return sendJson(res, 401, { ok: false, error: 'The current password is incorrect.' });

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await getPool().query(`UPDATE teachers SET password_hash = $1, must_change_password = FALSE WHERE id = $2`, [passwordHash, teacher.id]);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/teacher/students') {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;

      const result = await getPool().query(`
        SELECT
          s.id,
          s.username,
          s.display_name,
          s.active,
          s.created_at,
          s.last_login_at,
          s.class_id,
          c.class_name,
          c.year_group,
          c.exam_board
        FROM students s
        LEFT JOIN classes c
          ON c.id = s.class_id
         AND c.teacher_id = s.teacher_id
        WHERE s.teacher_id = $1
        ORDER BY
          c.class_name NULLS LAST,
          s.active DESC,
          LOWER(s.display_name),
          LOWER(s.username)
      `, [teacher.id]);

      const activeCount = result.rows.filter((row) => row.active).length;
      return sendJson(res, 200, {
        ok: true,
        seatLimit: Number(teacher.seat_limit || 20),
        activeCount,
        students: result.rows.map((row) => ({
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          active: row.active,
          classId: row.class_id,
          className: row.class_name,
          yearGroup: row.year_group,
          examBoard: row.exam_board,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at
        }))
      });
    }

    if (req.method === 'POST' && pathname === '/api/teacher/students') {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;
      const body = await readJsonBody(req);
      const username = cleanUsername(body.username);
      const displayName = cleanDisplayName(body.displayName || body.username);
      const pin = String(body.pin || '').trim();
      const classId = String(body.classId || '').trim();

      if (username.length < 2) return sendJson(res, 400, { ok: false, error: 'Use a username of at least two characters.' });
      if (!displayName) return sendJson(res, 400, { ok: false, error: 'Enter a student display name or alias.' });
      if (!validPin(pin)) return sendJson(res, 400, { ok: false, error: 'Use a four-to-six digit PIN.' });
      if (!/^[0-9a-f-]{36}$/i.test(classId)) return sendJson(res, 400, { ok: false, error: 'Choose a class for this student.' });

      const client = await getPool().connect();
      try {
        await client.query('BEGIN');

        const classResult = await client.query(`
          SELECT id, class_name
          FROM classes
          WHERE id = $1
            AND teacher_id = $2
            AND active = TRUE
          FOR UPDATE
        `, [classId, teacher.id]);

        const classRow = classResult.rows[0];
        if (!classRow) {
          await client.query('ROLLBACK');
          return sendJson(res, 404, { ok: false, error: 'That class is not available.' });
        }

        const classCount = await client.query(`
          SELECT COUNT(*)::int AS count
          FROM students
          WHERE class_id = $1
            AND teacher_id = $2
            AND active = TRUE
        `, [classId, teacher.id]);

        if (Number(classCount.rows[0]?.count || 0) >= 20) {
          await client.query('ROLLBACK');
          return sendJson(res, 409, { ok: false, error: 'This class already contains 20 active students.' });
        }

        const licence = await client.query(`
          SELECT id, seat_limit, status, expires_at
          FROM licences
          WHERE teacher_id = $1
            AND status IN ('trial', 'active')
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        `, [teacher.id]);

        const currentLicence = licence.rows[0];
        if (!currentLicence || (currentLicence.expires_at && new Date(currentLicence.expires_at).getTime() <= Date.now())) {
          await client.query('ROLLBACK');
          return sendJson(res, 403, { ok: false, error: 'The teacher licence is not active.' });
        }

        const countResult = await client.query(`
          SELECT COUNT(*)::int AS count
          FROM students
          WHERE teacher_id = $1 AND active = TRUE
        `, [teacher.id]);

        if (Number(countResult.rows[0]?.count || 0) >= Number(currentLicence.seat_limit || 20)) {
          await client.query('ROLLBACK');
          return sendJson(res, 409, { ok: false, error: `All ${currentLicence.seat_limit} active student seats are in use.` });
        }

        const pinHash = await bcrypt.hash(pin, 10);
        const inserted = await client.query(`
          INSERT INTO students (teacher_id, class_id, username, display_name, pin_hash)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, display_name, active, created_at
        `, [teacher.id, classId, username, displayName, pinHash]);

        await client.query('COMMIT');
        const row = inserted.rows[0];
        return sendJson(res, 201, {
          ok: true,
          student: {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            active: row.active,
            classId,
            className: classRow.class_name,
            createdAt: row.created_at
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'That username is already used by this teacher.' });
        throw error;
      } finally {
        client.release();
      }
    }

    const studentMatch = pathname.match(/^\/api\/teacher\/students\/([0-9a-f-]+)$/i);
    if (req.method === 'PATCH' && studentMatch) {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;
      const body = await readJsonBody(req);
      const updates = [];
      const values = [];

      if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
        const displayName = cleanDisplayName(body.displayName);
        if (!displayName) return sendJson(res, 400, { ok: false, error: 'Display name cannot be empty.' });
        values.push(displayName);
        updates.push(`display_name = $${values.length}`);
      }

      const activating = Object.prototype.hasOwnProperty.call(body, 'active') && Boolean(body.active);
      if (Object.prototype.hasOwnProperty.call(body, 'active')) {
        values.push(Boolean(body.active));
        updates.push(`active = $${values.length}`);
      }

      if (!updates.length) return sendJson(res, 400, { ok: false, error: 'No changes supplied.' });

      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        if (activating) {
          const licence = await client.query(`
            SELECT seat_limit
            FROM licences
            WHERE teacher_id = $1
              AND status IN ('trial', 'active')
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `, [teacher.id]);
          const seatLimit = Number(licence.rows[0]?.seat_limit || teacher.seat_limit || 20);
          const count = await client.query(`SELECT COUNT(*)::int AS count FROM students WHERE teacher_id = $1 AND active = TRUE`, [teacher.id]);
          if (count.rows[0].count >= seatLimit) {
            await client.query('ROLLBACK');
            return sendJson(res, 409, { ok: false, error: `All ${seatLimit} active student seats are in use.` });
          }
        }

        values.push(studentMatch[1], teacher.id);
        const result = await client.query(`
          UPDATE students
          SET ${updates.join(', ')}
          WHERE id = $${values.length - 1}
            AND teacher_id = $${values.length}
          RETURNING id, username, display_name, active
        `, values);

        if (!result.rows[0]) {
          await client.query('ROLLBACK');
          return sendJson(res, 404, { ok: false, error: 'Student not found.' });
        }

        await client.query('COMMIT');
        const row = result.rows[0];
        return sendJson(res, 200, { ok: true, student: { id: row.id, username: row.username, displayName: row.display_name, active: row.active } });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const resetMatch = pathname.match(/^\/api\/teacher\/students\/([0-9a-f-]+)\/reset-pin$/i);
    if (req.method === 'POST' && resetMatch) {
      const teacher = await requireTeacher(req, res);
      if (!teacher) return true;
      const body = await readJsonBody(req);
      const pin = String(body.pin || '').trim();
      if (!validPin(pin)) return sendJson(res, 400, { ok: false, error: 'Use a four-to-six digit PIN.' });
      const pinHash = await bcrypt.hash(pin, 10);
      const result = await getPool().query(`
        UPDATE students
        SET pin_hash = $1
        WHERE id = $2 AND teacher_id = $3
        RETURNING id
      `, [pinHash, resetMatch[1], teacher.id]);
      if (!result.rows[0]) return sendJson(res, 404, { ok: false, error: 'Student not found.' });
      await getPool().query(`DELETE FROM student_sessions WHERE student_id = $1`, [resetMatch[1]]);
      return sendJson(res, 200, { ok: true });
    }

    return false;
  } catch (error) {
    console.error('[EchoAural accounts] API error:', error);
    const statusCode = Number(error.statusCode || (error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 500));
    const message = statusCode === 500 ? 'Account service error.' : error.message;
    return sendJson(res, statusCode, { ok: false, error: message });
  }
}

module.exports = {
  handleAccountApi,
  getTeacherSession,
  getStudentSession,
  TEACHER_COOKIE,
  STUDENT_COOKIE
};
