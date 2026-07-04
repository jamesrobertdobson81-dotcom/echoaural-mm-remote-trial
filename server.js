const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = __dirname;
const MELODY_MASTER_DIR = path.join(PROJECT_ROOT, 'modules', 'melody-master');
const CLIPS_PATH = path.join(MELODY_MASTER_DIR, 'clips.js');
const MAX_LISTENS = 4;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return 'localhost';
}

function getBaseUrl(reqOrHost) {
  if (process.env.PUBLIC_HOST) {
    const configuredHost = String(process.env.PUBLIC_HOST).trim().replace(/\/$/, '');
    if (/^https?:\/\//i.test(configuredHost)) return configuredHost;
    const configuredProtocol = process.env.PUBLIC_PROTOCOL || 'https';
    return `${configuredProtocol}://${configuredHost}`;
  }

  const headers = reqOrHost && typeof reqOrHost === 'object' && reqOrHost.headers ? reqOrHost.headers : {};
  const rawHost = headers['x-forwarded-host'] || headers.host || reqOrHost || '';
  const requestHost = String(rawHost).split(',')[0].trim();
  const hostOnly = requestHost.split(':')[0];
  const isLocalhost = !hostOnly || hostOnly === 'localhost' || hostOnly === '127.0.0.1' || hostOnly === '0.0.0.0';

  if (isLocalhost) {
    return `http://${getLocalNetworkIp()}:${PORT}`;
  }

  const forwardedProto = headers['x-forwarded-proto'] ? String(headers['x-forwarded-proto']).split(',')[0].trim() : '';
  const protocol = process.env.PUBLIC_PROTOCOL || forwardedProto || 'https';
  return `${protocol}://${requestHost}`;
}

function loadMelodyQuestions() {
  try {
    const source = fs.readFileSync(CLIPS_PATH, 'utf8');
    const sandbox = {};
    const questions = vm.runInNewContext(`${source}\n;Array.isArray(melodyClips) ? melodyClips : clips;`, sandbox, {
      filename: CLIPS_PATH,
      timeout: 1000
    });
    if (!Array.isArray(questions) || !questions.length) throw new Error('No melodyClips array found.');
    return questions.slice().reverse(); // newest first, matching the solo testing flow
  } catch (error) {
    console.error('[Melody Master classroom] Could not load clips.js:', error.message);
    return [{
      id: 'MM001',
      file: 'questions/MM001/MM001-audio.mp3',
      questionImage: 'questions/MM001/MM001-question.png',
      question: 'Complete the melody.',
      answerPitches: ['G4', 'G4', 'A4', 'B4', 'C5', 'D5'],
      noteImage: 'assets/icons/notes/semiquaver-sibelius.png',
      noteImageFallback: 'assets/icons/notes/semiquaver-sibelis.png',
      dictationLayout: {
        topLinePitch: 'E5', staffTopY: 31.5, staffStepY: 4.95, homeY: 2,
        noteWidthPercent: 3.95, noteHeightPercent: 47, noteStretchX: 1.95,
        staffPitches: ['F5','E5','D5','C5','B4','A4','G4','F4','E4'],
        noteCountLabel: '6 semiquavers',
        slots: [
          { x: 70.6, pitch: 'G4' }, { x: 73.6, pitch: 'G4' }, { x: 76.6, pitch: 'A4' },
          { x: 79.6, pitch: 'B4' }, { x: 82.6, pitch: 'C5' }, { x: 85.6, pitch: 'D5' }
        ]
      }
    }];
  }
}

const questions = loadMelodyQuestions();
const rooms = new Map();

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function safeString(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
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

// School-safe name checking needs to catch obvious joined-up or disguised profanity
// such as "cunt face", "cuntymccunty", "c.u.n.t" or "c u n t".
// This is intentionally stricter than the display-name normaliser.
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

function validateStudentName(room, studentId, rawName) {
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

function normalisePitch(value) {
  return String(value || '').trim().toUpperCase();
}


const audioDurationCache = new Map();

function readSynchsafeInteger(buffer, offset) {
  return ((buffer[offset] & 0x7f) << 21) | ((buffer[offset + 1] & 0x7f) << 14) | ((buffer[offset + 2] & 0x7f) << 7) | (buffer[offset + 3] & 0x7f);
}

function getMp3DurationSeconds(filePath) {
  if (!filePath || audioDurationCache.has(filePath)) return audioDurationCache.get(filePath) || 0;
  let duration = 0;
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 8) throw new Error('Audio file is too small.');

    let offset = 0;
    if (buffer.slice(0, 3).toString('utf8') === 'ID3' && buffer.length >= 10) {
      offset = 10 + readSynchsafeInteger(buffer, 6);
      const flags = buffer[5] || 0;
      if (flags & 0x10) offset += 10; // ID3 footer
    }

    const bitrateTable = {
      V1L1: [0,32,64,96,128,160,192,224,256,288,320,352,384,416,448],
      V1L2: [0,32,48,56,64,80,96,112,128,160,192,224,256,320,384],
      V1L3: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],
      V2L1: [0,32,48,56,64,80,96,112,128,144,160,176,192,224,256],
      V2L2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160],
      V2L3: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
    };
    const sampleRateTable = {
      MPEG1: [44100, 48000, 32000],
      MPEG2: [22050, 24000, 16000],
      MPEG25: [11025, 12000, 8000]
    };

    let frames = 0;
    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
        offset += 1;
        continue;
      }

      const header = buffer.readUInt32BE(offset);
      const versionBits = (header >> 19) & 0x3;
      const layerBits = (header >> 17) & 0x3;
      const bitrateIndex = (header >> 12) & 0xf;
      const sampleRateIndex = (header >> 10) & 0x3;
      const padding = (header >> 9) & 0x1;
      if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
        offset += 1;
        continue;
      }

      const version = versionBits === 3 ? 'MPEG1' : versionBits === 2 ? 'MPEG2' : 'MPEG25';
      const layer = layerBits === 3 ? 1 : layerBits === 2 ? 2 : 3;
      const tableKey = `${version === 'MPEG1' ? 'V1' : 'V2'}L${layer}`;
      const bitrateKbps = bitrateTable[tableKey][bitrateIndex];
      const sampleRate = sampleRateTable[version][sampleRateIndex];
      if (!bitrateKbps || !sampleRate) {
        offset += 1;
        continue;
      }

      let samplesPerFrame;
      let frameLength;
      if (layer === 1) {
        samplesPerFrame = 384;
        frameLength = Math.floor(((12 * bitrateKbps * 1000) / sampleRate + padding) * 4);
      } else if (layer === 2 || version === 'MPEG1') {
        samplesPerFrame = 1152;
        frameLength = Math.floor((144 * bitrateKbps * 1000) / sampleRate + padding);
      } else {
        samplesPerFrame = 576;
        frameLength = Math.floor((72 * bitrateKbps * 1000) / sampleRate + padding);
      }

      if (!frameLength || frameLength < 4) {
        offset += 1;
        continue;
      }
      duration += samplesPerFrame / sampleRate;
      frames += 1;
      offset += frameLength;
    }

    // Some exported MP3s contain unusual headers. Use a cautious CBR estimate if frame scanning failed.
    if (!duration && buffer.length > 1024) duration = Math.max(1, buffer.length / 16000);
    duration = frames > 0 ? duration : Number(duration || 0);
  } catch (error) {
    console.warn('[Melody Master classroom] Could not read audio duration:', path.basename(filePath || ''), error.message);
    duration = 10;
  }

  const rounded = Math.max(1, Math.round(duration * 100) / 100);
  audioDurationCache.set(filePath, rounded);
  return rounded;
}

function getQuestionAudioDurationSeconds(question = {}) {
  const audioPath = question.file || question.audio || '';
  if (!audioPath) return 10;
  const fullPath = path.join(MELODY_MASTER_DIR, audioPath);
  return getMp3DurationSeconds(fullPath) || 10;
}

function getQuestion(index = 0) {
  const safeIndex = Math.max(0, Math.min(Number(index) || 0, questions.length - 1));
  return questions[safeIndex] || questions[0];
}

function normaliseLayout(question = {}) {
  const layout = question.dictationLayout || {};
  const slots = Array.isArray(layout.slots) && layout.slots.length
    ? layout.slots
    : Array.isArray(question.answerPitches)
      ? question.answerPitches.map((pitch, index) => ({ x: 70 + (index * 3), pitch }))
      : [];

  return {
    topLinePitch: layout.topLinePitch || 'E5',
    staffTopY: Number.isFinite(Number(layout.staffTopY)) ? Number(layout.staffTopY) : 31.5,
    staffStepY: Number.isFinite(Number(layout.staffStepY)) ? Number(layout.staffStepY) : 4.95,
    homeY: Number.isFinite(Number(layout.homeY)) ? Number(layout.homeY) : 2,
    snapToleranceY: Number.isFinite(Number(layout.snapToleranceY)) ? Number(layout.snapToleranceY) : 10,
    noteWidthPercent: Number.isFinite(Number(layout.noteWidthPercent)) ? Number(layout.noteWidthPercent) : 3.95,
    noteHeightPercent: Number.isFinite(Number(layout.noteHeightPercent)) ? Number(layout.noteHeightPercent) : 47,
    noteStretchX: Number.isFinite(Number(layout.noteStretchX)) ? Number(layout.noteStretchX) : 1.95,
    visualAnchorY: Number.isFinite(Number(layout.visualAnchorY)) ? Number(layout.visualAnchorY) : undefined,
    noteCountLabel: layout.noteCountLabel || `${slots.length} notes`,
    staffPitches: Array.isArray(layout.staffPitches) && layout.staffPitches.length
      ? layout.staffPitches
      : ['F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4'],
    slots
  };
}

function getCorrectSlots(question = {}) {
  const layout = normaliseLayout(question);
  return layout.slots.map((slot, index) => {
    const fallbackPitch = Array.isArray(question.answerPitches) ? question.answerPitches[index] : '';
    const pitch = slot.pitch || fallbackPitch;
    return {
      pitch: normalisePitch(pitch),
      acceptedPitches: Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
        ? slot.acceptedPitches.map(normalisePitch)
        : [normalisePitch(pitch)]
    };
  });
}

function normaliseGuidedPlayback(question = {}, audioDurationSeconds = 10) {
  const guide = question.guidedPlayback && typeof question.guidedPlayback === 'object' ? question.guidedPlayback : {};
  const visibleScoreRatio = Number(guide.visibleScoreRatio || 0.44);
  const visualStartSeconds = Math.max(0, Number(guide.visualStartSeconds || 0));
  const rawVisualEnd = Number(guide.visualEndSeconds);
  const useFullAudioDuration = guide.useFullAudioDuration === true || !Number.isFinite(rawVisualEnd) || rawVisualEnd <= 0;
  const visualEndSeconds = useFullAudioDuration
    ? Math.max(1, Number(audioDurationSeconds || 10))
    : Math.max(visualStartSeconds + 1, rawVisualEnd);

  return {
    mode: 'guided-thirds',
    scoreCoverage: useFullAudioDuration ? 'full-audio' : 'partial-audio',
    useFullAudioDuration,
    visualStartSeconds,
    visualEndSeconds,
    visualDurationSeconds: Math.max(1, visualEndSeconds - visualStartSeconds),
    visibleScoreRatio: Math.max(0.33, Math.min(0.72, Number.isFinite(visibleScoreRatio) ? visibleScoreRatio : 0.44)),
    leadInSeconds: Math.max(0, Number(guide.leadInSeconds || 2))
  };
}

function makePublicQuestionPayload(question = {}, index = 0) {
  const layout = normaliseLayout(question);
  const audioDurationSeconds = Number(question.audioDurationSeconds || getQuestionAudioDurationSeconds(question) || 10);
  const guidedPlayback = normaliseGuidedPlayback(question, audioDurationSeconds);
  return {
    index,
    id: question.id || `MM${String(index + 1).padStart(3, '0')}`,
    title: question.title || question.id || `Question ${index + 1}`,
    composer: question.composer || '',
    work: question.work || '',
    movement: question.movement || '',
    question: question.question || question.task || 'Complete the melody.',
    audio: question.file || question.audio || '',
    audioDurationSeconds,
    guidedPlayback,
    questionImage: question.questionImage || '',
    noteImage: question.noteImage || layout.slots.find((slot) => slot.icon)?.icon || 'assets/icons/notes/semiquaver-sibelius.png',
    noteImageFallback: question.noteImageFallback || 'assets/icons/notes/semiquaver-sibelis.png',
    dictationLayout: {
      topLinePitch: layout.topLinePitch,
      staffTopY: layout.staffTopY,
      staffStepY: layout.staffStepY,
      homeY: layout.homeY,
      snapToleranceY: layout.snapToleranceY,
      noteWidthPercent: layout.noteWidthPercent,
      noteHeightPercent: layout.noteHeightPercent,
      noteStretchX: layout.noteStretchX,
      visualAnchorY: layout.visualAnchorY,
      noteCountLabel: layout.noteCountLabel,
      staffPitches: layout.staffPitches,
      slots: layout.slots.map((slot, slotIndex) => ({
        index: slotIndex,
        x: Number(slot.x),
        icon: slot.icon || question.noteImage || 'assets/icons/notes/semiquaver-sibelius.png',
        iconFallback: slot.iconFallback || question.noteImageFallback || 'assets/icons/notes/semiquaver-sibelis.png',
        rhythm: slot.rhythm || '',
        homeY: slot.homeY,
        visualAnchorY: slot.visualAnchorY,
        snapYOffset: slot.snapYOffset
      }))
    }
  };
}

function getStudentQuizResults(room, studentId) {
  const allResults = room.quizResults instanceof Map ? room.quizResults : new Map();
  const results = allResults.get(studentId);
  if (!(results instanceof Map)) return [];
  return Array.from(results.values()).sort((a, b) => Number(a.quizQuestionNumber || 0) - Number(b.quizQuestionNumber || 0));
}

function getStudentCumulative(room, studentId) {
  const results = getStudentQuizResults(room, studentId);
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
  studentResults.set(resultKey, {
    ...submission,
    questionIndex: room.questionIndex,
    quizQuestionNumber: Number(room.quizQuestionNumber || 0),
    questionId: room.activeQuestion ? room.activeQuestion.id : undefined
  });
}

function createRoomState(room, studentId = '') {
  const now = Date.now();
  const students = Array.from(room.students.values()).map((student) => {
    const submission = room.submissions.get(student.id);
    const total = room.totalNotes || (room.question ? getCorrectSlots(room.question).length : 0);
    const score = submission ? submission.score : null;
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
      questionsSubmitted: cumulative.questionsSubmitted
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
    active: Boolean(room.activeQuestion),
    submissionsOpen: Boolean(room.submissionsOpen),
    submissionsClosed: Boolean(room.submissionsClosed),
    listens: room.listens,
    maxListens: Number(room.maxListens || MAX_LISTENS),
    quiz: {
      totalQuestions: Number(room.quizTotal || 3),
      currentQuestionNumber: Number(room.quizQuestionNumber || 0),
      started: Boolean(room.quizStarted),
      ended: Boolean(room.quizEnded),
      questionsRemaining: Math.max(0, Number(room.quizTotal || 3) - Number(room.quizQuestionNumber || 0)),
      maxListens: Number(room.maxListens || MAX_LISTENS)
    },
    questionIndex: room.questionIndex,
    questionRunId: room.questionRunId,
    playback: room.playback || null,
    question: room.activeQuestion || null,
    totalNotes: room.totalNotes || 0,
    students,
    leaderboard: students.slice().sort((a, b) => {
      if (Number(b.cumulativeScore || 0) !== Number(a.cumulativeScore || 0)) return Number(b.cumulativeScore || 0) - Number(a.cumulativeScore || 0);
      if (Number(b.cumulativePercentage || 0) !== Number(a.cumulativePercentage || 0)) return Number(b.cumulativePercentage || 0) - Number(a.cumulativePercentage || 0);
      if (Number(b.questionsSubmitted || 0) !== Number(a.questionsSubmitted || 0)) return Number(b.questionsSubmitted || 0) - Number(a.questionsSubmitted || 0);
      return String(a.name).localeCompare(String(b.name));
    }),
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
      submission: studentSubmission || null
    } : null
  };
}

function makeRoom(requestHost) {
  const code = makeRoomCode();
  const baseUrl = getBaseUrl(requestHost);
  const shortJoinUrl = `${baseUrl}/join`;
  const joinUrl = shortJoinUrl;
  const laptopJoinUrl = `${baseUrl}/modules/melody-master/student-laptop.html?room=${encodeURIComponent(code)}`;
  const room = {
    code,
    createdAt: Date.now(),
    baseUrl,
    joinUrl,
    shortJoinUrl,
    laptopJoinUrl,
    students: new Map(),
    submissions: new Map(),
    quizResults: new Map(),
    questionIndex: 0,
    question: null,
    activeQuestion: null,
    submissionsOpen: false,
    submissionsClosed: false,
    listens: 0,
    maxListens: MAX_LISTENS,
    quizTotal: 3,
    quizStarted: false,
    quizEnded: false,
    quizQuestionNumber: 0,
    totalNotes: 0,
    questionRunId: 0,
    playback: null,
    playbackSerial: 0
  };
  rooms.set(code, room);
  return room;
}

function startQuestion(room, index, options = {}) {
  room.questionIndex = Math.max(0, Math.min(Number(index) || 0, questions.length - 1));
  if (options.resetQuiz) {
    room.quizStarted = true;
    room.quizEnded = false;
    room.quizResults = new Map();
    room.quizQuestionNumber = 1;
    if (Number(options.quizLength)) room.quizTotal = Math.max(1, Math.min(Number(options.quizLength), questions.length));
    if (Number(options.maxListens)) room.maxListens = Math.max(1, Math.min(Number(options.maxListens), 8));
  } else if (options.advanceQuiz) {
    room.quizStarted = true;
    room.quizEnded = false;
    room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 0) + 1);
  } else if (!room.quizStarted) {
    room.quizStarted = true;
    room.quizEnded = false;
    room.quizQuestionNumber = Math.max(1, Number(room.quizQuestionNumber || 1));
  }
  room.question = getQuestion(room.questionIndex);
  room.activeQuestion = makePublicQuestionPayload(room.question, room.questionIndex);
  room.submissions.clear();
  room.submissionsOpen = true;
  room.submissionsClosed = false;
  room.listens = 0;
  room.playback = null;
  room.totalNotes = getCorrectSlots(room.question).length;
  room.questionRunId += 1;
  return room.activeQuestion;
}

function closeSubmissions(room) {
  room.submissionsOpen = false;
  room.submissionsClosed = true;
}

function scoreSubmission(room, answers = []) {
  const correctSlots = getCorrectSlots(room.question || {});
  let score = 0;
  correctSlots.forEach((slot, index) => {
    const answer = normalisePitch(answers[index]);
    if (answer && slot.acceptedPitches.includes(answer)) score += 1;
  });
  return { score, total: correctSlots.length };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (_error) { reject(new Error('Invalid JSON.')) }
    });
    req.on('error', reject);
  });
}

function getRoomOrError(code) {
  const roomCode = String(code || '').trim().toUpperCase();
  if (!roomCode || !rooms.has(roomCode)) return null;
  return rooms.get(roomCode);
}


async function handleApi(req, res, parsedUrl) {
  try {
    const pathname = parsedUrl.pathname;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/classroom/health') {
      sendJson(res, 200, { ok: true, message: 'EchoAural classroom server running.', questions: questions.length, port: PORT });
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/classroom/state') {
      const room = getRoomOrError(parsedUrl.searchParams.get('roomCode'));
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      const studentId = String(parsedUrl.searchParams.get('studentId') || '').trim();
      if (studentId && room.students.has(studentId)) room.students.get(studentId).lastSeen = Date.now();
      return sendJson(res, 200, createRoomState(room, studentId));
    }

    if (req.method === 'POST' && pathname === '/api/classroom/create') {
      const room = makeRoom(req);
      return sendJson(res, 200, {
        ok: true,
        roomCode: room.code,
        joinUrl: room.joinUrl,
        shortJoinUrl: room.shortJoinUrl,
        laptopJoinUrl: room.laptopJoinUrl,
        state: createRoomState(room)
      });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/settings') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      const quizLength = Math.max(1, Math.min(Number(body.quizLength) || room.quizTotal || 3, questions.length));
      const maxListens = Math.max(1, Math.min(Number(body.maxListens) || room.maxListens || MAX_LISTENS, 8));
      room.quizTotal = quizLength;
      room.maxListens = maxListens;
      if (!room.quizStarted) room.quizQuestionNumber = 0;
      return sendJson(res, 200, { ok: true, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/start') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      const question = startQuestion(room, body.questionIndex || 0, {
        resetQuiz: Boolean(body.resetQuiz),
        quizLength: body.quizLength,
        maxListens: body.maxListens
      });
      return sendJson(res, 200, { ok: true, question, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/next') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      if (room.quizStarted && Number(room.quizQuestionNumber || 0) >= Number(room.quizTotal || 1)) {
        room.quizEnded = true;
        room.submissionsOpen = false;
        return sendJson(res, 400, { ok: false, error: 'Quiz complete. End the quiz or adjust settings for a new one.', state: createRoomState(room) });
      }
      const nextIndex = Math.min((room.questionIndex || 0) + 1, questions.length - 1);
      const question = startQuestion(room, nextIndex, { advanceQuiz: true });
      return sendJson(res, 200, { ok: true, question, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/play') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      // Classroom-friendly behaviour: if the teacher presses Play before Start Question,
      // start the current/newest question automatically instead of leaving students waiting.
      if (!room.activeQuestion) startQuestion(room, room.questionIndex || 0);
      const maxListens = Number(room.maxListens || MAX_LISTENS);
      if (room.listens >= maxListens) return sendJson(res, 400, { ok: false, error: `The class has already used all ${maxListens} ${maxListens === 1 ? 'play' : 'plays'} for this question.`, state: createRoomState(room) });
      room.listens += 1;
      const now = Date.now();
      const guidedPlayback = room.activeQuestion.guidedPlayback || normaliseGuidedPlayback(room.question, room.activeQuestion.audioDurationSeconds || getQuestionAudioDurationSeconds(room.question) || 10);
      const requestedLeadInSeconds = Object.prototype.hasOwnProperty.call(body, 'leadInSeconds')
        ? Number(body.leadInSeconds)
        : Number(guidedPlayback.leadInSeconds || 2);
      const leadInMs = Math.max(0, Math.round((Number.isFinite(requestedLeadInSeconds) ? requestedLeadInSeconds : 2) * 1000));
      const audioDurationSeconds = Number(room.activeQuestion.audioDurationSeconds || getQuestionAudioDurationSeconds(room.question) || 10);
      const durationSeconds = Number(guidedPlayback.visualDurationSeconds || audioDurationSeconds || 10);
      room.playbackSerial += 1;
      room.playback = {
        id: `${room.code}-${room.questionRunId}-${room.playbackSerial}`,
        mode: 'guided-thirds',
        questionRunId: room.questionRunId,
        listen: room.listens,
        requestedAt: now,
        audioStartAt: now + leadInMs,
        leadInMs,
        durationSeconds,
        audioDurationSeconds,
        visualStartSeconds: Number(guidedPlayback.visualStartSeconds || 0),
        visualEndSeconds: Number(guidedPlayback.visualEndSeconds || durationSeconds),
        visibleScoreRatio: Number(guidedPlayback.visibleScoreRatio || 0.44),
        scoreCoverage: guidedPlayback.scoreCoverage || 'full-audio',
        sections: 3
      };
      return sendJson(res, 200, {
        ok: true,
        audio: room.activeQuestion.audio,
        playback: room.playback,
        state: createRoomState(room),
        shouldCloseAfterPlayback: room.listens >= Number(room.maxListens || MAX_LISTENS)
      });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/close') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      closeSubmissions(room);
      return sendJson(res, 200, { ok: true, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/reset') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      if (!room.activeQuestion) return sendJson(res, 400, { ok: false, error: 'No question active yet.' });
      const question = startQuestion(room, room.questionIndex || 0, {
        resetQuiz: false
      });
      return sendJson(res, 200, { ok: true, question, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/end') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      room.quizEnded = true;
      room.submissionsOpen = false;
      room.submissionsClosed = true;
      room.playback = null;
      return sendJson(res, 200, { ok: true, state: createRoomState(room) });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/join') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code. Check the teacher screen.' });
      const studentId = safeString(body.studentId, `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
      const validation = validateStudentName(room, studentId, body.name);
      if (!validation.ok) return sendJson(res, 400, { ok: false, error: validation.error });
      const name = validation.name;
      room.students.set(studentId, { id: studentId, name, lastSeen: Date.now() });
      const submission = room.submissions.get(studentId) || null;
      return sendJson(res, 200, {
        ok: true,
        studentId,
        roomCode: room.code,
        submissionsOpen: room.submissionsOpen,
        question: room.activeQuestion,
        alreadySubmitted: Boolean(submission),
        submission,
        state: createRoomState(room, studentId)
      });
    }

    if (req.method === 'POST' && pathname === '/api/classroom/submit') {
      const body = await readJsonBody(req);
      const room = getRoomOrError(body.roomCode);
      if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });
      const studentId = safeString(body.studentId);
      if (!studentId || !room.students.has(studentId)) return sendJson(res, 404, { ok: false, error: 'Join the room before submitting.' });
      room.students.get(studentId).lastSeen = Date.now();
      if (!room.activeQuestion) return sendJson(res, 400, { ok: false, error: 'No question active yet.' });
      if (!room.submissionsOpen) return sendJson(res, 400, { ok: false, error: 'Submissions are closed.', state: createRoomState(room, studentId) });
      if (room.submissions.has(studentId)) return sendJson(res, 400, { ok: false, error: 'You have already submitted.', state: createRoomState(room, studentId) });
      const answers = Array.isArray(body.answers) ? body.answers.map(normalisePitch) : [];
      const scored = scoreSubmission(room, answers);
      const submission = {
        answers,
        score: scored.score,
        total: scored.total,
        percentage: scored.total ? Math.round((scored.score / scored.total) * 100) : 0,
        submittedAt: new Date().toISOString(),
        questionRunId: room.questionRunId
      };
      room.submissions.set(studentId, submission);
      recordQuizSubmission(room, studentId, submission);
      return sendJson(res, 200, { ok: true, submission, state: createRoomState(room, studentId) });
    }

    return false;
  } catch (error) {
    console.error('[EchoAural classroom] API error:', error);
    sendJson(res, 500, { ok: false, error: error.message || 'Server error.' });
    return true;
  }
}

function serveStatic(req, res, parsedUrl) {
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/join' || pathname === '/join/') pathname = '/modules/melody-master/student-laptop.html';
  const requestedPath = path.normalize(path.join(PROJECT_ROOT, pathname));
  if (!requestedPath.startsWith(PROJECT_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(requestedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(requestedPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(requestedPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  if (parsedUrl.pathname.startsWith('/api/classroom/')) {
    const handled = await handleApi(req, res, parsedUrl);
    if (handled) return;
  }
  serveStatic(req, res, parsedUrl);
});

server.listen(PORT, '0.0.0.0', () => {
  const networkIp = getLocalNetworkIp();
  console.log('');
  console.log('EchoAural Melody Master classroom server is running.');
  console.log(`Teacher on this laptop: http://localhost:${PORT}/modules/melody-master/teacher-mode.html`);
  console.log(`Teacher on same Wi-Fi: http://${networkIp}:${PORT}/modules/melody-master/teacher-mode.html`);
  console.log(`Student short join link: http://${networkIp}:${PORT}/join`);
  console.log('Students enter the room code shown on the teacher screen.');
  console.log('Keep this Terminal window open while using Teacher Mode.');
  console.log('');
});
