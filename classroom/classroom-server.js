const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { RoomManager, DEFAULT_MAX_LISTENS } = require('./room-manager');
const { getTeacherSession, getStudentSession } = require('../accounts/account-server');
const { saveTeacherModeProgress } = require('./progress-recorder');

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

function normalizePublicBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function createBaseUrlResolver({ port }) {
  return function getBaseUrl(reqOrHost) {
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

    if (isLocalhost) return `http://${getLocalNetworkIp()}:${port}`;

    const forwardedProto = headers['x-forwarded-proto'] ? String(headers['x-forwarded-proto']).split(',')[0].trim() : '';
    const protocol = process.env.PUBLIC_PROTOCOL || forwardedProto || 'https';
    return `${protocol}://${requestHost}`;
  };
}

const audioDurationCache = new Map();

function readSynchsafeInteger(buffer, offset) {
  return ((buffer[offset] & 0x7f) << 21) | ((buffer[offset + 1] & 0x7f) << 14) | ((buffer[offset + 2] & 0x7f) << 7) | (buffer[offset + 3] & 0x7f);
}

function getMp3DurationSeconds(filePath) {
  if (!filePath || audioDurationCache.has(filePath)) return audioDurationCache.get(filePath) || 0;
  let duration = 0;
  try {
    if (!fs.existsSync(filePath)) throw new Error('Audio file not found.');
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 8) throw new Error('Audio file is too small.');

    let offset = 0;
    if (buffer.slice(0, 3).toString('utf8') === 'ID3' && buffer.length >= 10) {
      offset = 10 + readSynchsafeInteger(buffer, 6);
      const flags = buffer[5] || 0;
      if (flags & 0x10) offset += 10;
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

      let samplesPerFrame = 1152;
      let frameLength = Math.floor((144 * bitrateKbps * 1000) / sampleRate + padding);

      if (layer === 1) {
        samplesPerFrame = 384;
        frameLength = Math.floor(((12 * bitrateKbps * 1000) / sampleRate + padding) * 4);
      } else if (layer === 3 && version !== 'MPEG1') {
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

    if (!duration && buffer.length > 1024) duration = Math.max(1, buffer.length / 16000);
    duration = frames > 0 ? duration : Number(duration || 0);
  } catch (error) {
    console.warn('[EchoAural classroom] Could not read audio duration:', path.basename(filePath || ''), error.message);
    duration = 10;
  }

  const rounded = Math.max(1, Math.round(duration * 100) / 100);
  audioDurationCache.set(filePath, rounded);
  return rounded;
}

function createAdapters(projectRoot) {
  const context = { path, fs, vm, projectRoot, getAudioDurationSeconds: getMp3DurationSeconds };
  const melodyAdapter = require(path.join(projectRoot, 'modules', 'melody-master', 'teacher-adapter.js'))(context);
  const instrumentAdapter = require(path.join(projectRoot, 'modules', 'instrument-identifier', 'teacher-adapter.js'))(context);
  const textureAdapter = require(path.join(projectRoot, 'modules', 'texture-trainer', 'teacher-adapter.js'))(context);
  const melodicIntervalsAdapter = require(path.join(projectRoot, 'modules', 'melodic-intervals', 'teacher-adapter.js'))(context);
  return [melodyAdapter, instrumentAdapter, textureAdapter, melodicIntervalsAdapter];
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
      try {
        resolve(JSON.parse(body));
      } catch (_error) {
        reject(new Error('Invalid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

function resolveQuestionAudioForBrowser(room, audioPath = '') {
  const raw = String(audioPath || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;

  if (room.moduleId === 'melody-master') return `/modules/melody-master/${raw.replace(/^\.\//, '')}`;
  if (room.moduleId === 'instrument-identifier') return `/modules/instrument-identifier/${raw.replace(/^\.\//, '')}`;
  if (room.moduleId === 'texture-trainer') return `/modules/texture-trainer/${raw.replace(/^\.\//, '')}`;
  if (room.moduleId === 'melodic-intervals') return `/modules/melodic-intervals/${raw.replace(/^\.\//, '')}`;

  return raw;
}

function resolveQuestionAudioSequenceForBrowser(room, question = {}) {
  const sequence = Array.isArray(question.audioSequence) ? question.audioSequence : [];
  return sequence.map((item) => resolveQuestionAudioForBrowser(room, item)).filter(Boolean);
}

function startPlayback(room, body = {}) {
  if (!room.activeQuestion) throw new Error('No question active yet.');

  const maxListens = Number(room.maxListens || DEFAULT_MAX_LISTENS);
  if (room.listens >= maxListens) {
    throw new Error(`The class has already used all ${maxListens} ${maxListens === 1 ? 'play' : 'plays'} for this question.`);
  }

  room.listens += 1;

  const now = Date.now();
  const question = room.activeQuestion || {};
  const guidedPlayback = question.guidedPlayback || {};

  const requestedLeadInSeconds = Object.prototype.hasOwnProperty.call(body, 'leadInSeconds')
    ? Number(body.leadInSeconds)
    : Number(guidedPlayback.leadInSeconds || 1);

  const leadInMs = Math.max(0, Math.round((Number.isFinite(requestedLeadInSeconds) ? requestedLeadInSeconds : 1) * 1000));
  const audioDurationSeconds = Number(question.audioDurationSeconds || 10);
  const durationSeconds = Number(guidedPlayback.visualDurationSeconds || audioDurationSeconds || 10);

  room.playbackSerial += 1;
  room.playback = {
    id: `${room.code}-${room.questionRunId}-${room.playbackSerial}`,
    mode: guidedPlayback.mode || (room.moduleId === 'melody-master' ? 'guided-thirds' : 'full-audio'),
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
    sections: room.moduleId === 'melody-master' ? 3 : 1
  };

  return {
    audio: question.audio,
    audioSequence: Array.isArray(question.audioSequence) ? question.audioSequence : [],
    audioSequenceUrls: resolveQuestionAudioSequenceForBrowser(room, question),
    playback: room.playback,
    shouldCloseAfterPlayback: room.listens >= maxListens
  };
}

function createClassroomServer(options = {}) {
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..');
  const port = Number(options.port || process.env.PORT || 3000);
  const getBaseUrl = createBaseUrlResolver({ port });

  const roomManager = options.roomManager || new RoomManager({
    adapters: createAdapters(projectRoot),
    defaultModuleId: 'melody-master'
  });

  function activeAccountSession(session) {
    if (!session || !['trial', 'active'].includes(session.licence_status)) return false;
    return !session.expires_at || new Date(session.expires_at).getTime() > Date.now();
  }

  async function optionalTeacherSession(req) {
    try {
      const teacher = await getTeacherSession(req);
      return activeAccountSession(teacher) ? teacher : null;
    } catch (error) {
      console.warn('[EchoAural classroom] Teacher account lookup unavailable:', error.message);
      return null;
    }
  }

  async function optionalStudentSession(req) {
    try {
      const student = await getStudentSession(req);
      return activeAccountSession(student) ? student : null;
    } catch (error) {
      console.warn('[EchoAural classroom] Student account lookup unavailable:', error.message);
      return null;
    }
  }

  async function persistentParticipantIsAuthorised(req, room, studentId) {
    const participant = room?.students?.get(studentId);
    if (!participant?.accountStudentId) return true;
    const student = await optionalStudentSession(req);
    return Boolean(student && student.id === participant.accountStudentId);
  }

  async function saveEndedRoomProgress(room) {
    try {
      return await saveTeacherModeProgress(room, roomManager);
    } catch (error) {
      console.error('[EchoAural classroom progress] Round save failed:', error);
      return { attempted: 0, saved: 0, duplicates: 0, skipped: 0, errors: [{ message: error.message || 'Save failed.' }] };
    }
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
        return sendJson(res, 200, {
          ok: true,
          message: 'EchoAural shared classroom server running.',
          modules: roomManager.getModules(),
          port,
          publicSiteUrl: normalizePublicBaseUrl(process.env.PUBLIC_SITE_URL) || '',
          publicHost: process.env.PUBLIC_HOST || '',
          publicApiUrl: normalizePublicBaseUrl(process.env.PUBLIC_API_URL) || ''
        });
      }

      if (req.method === 'GET' && pathname === '/api/classroom/modules') {
        return sendJson(res, 200, {
          ok: true,
          modules: roomManager.getModules()
        });
      }

      if (req.method === 'GET' && pathname === '/api/classroom/state') {
        const room = roomManager.getRoom(parsedUrl.searchParams.get('roomCode'));
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        const studentId = String(parsedUrl.searchParams.get('studentId') || '').trim();
        if (!(await persistentParticipantIsAuthorised(req, room, studentId))) {
          return sendJson(res, 401, { ok: false, error: 'Student account login required for this classroom place.' });
        }
        roomManager.touchStudent(room, studentId);

        return sendJson(res, 200, roomManager.createRoomState(room, studentId));
      }

      if (req.method === 'POST' && pathname === '/api/classroom/create') {
        const body = await readJsonBody(req);

        const frontendBase = normalizePublicBaseUrl(body.frontendBase)
          || normalizePublicBaseUrl(body.publicSiteUrl)
          || normalizePublicBaseUrl(process.env.PUBLIC_SITE_URL)
          || getBaseUrl(req);

        const apiBase = normalizePublicBaseUrl(body.apiBase)
          || normalizePublicBaseUrl(process.env.PUBLIC_API_URL);

        const teacherAccount = await optionalTeacherSession(req);
        const room = roomManager.createRoom({
          moduleId: body.moduleId || body.module || 'melody-master',
          questionLevel: body.questionLevel,
          baseUrl: frontendBase,
          apiBase,
          ownerTeacherId: teacherAccount?.id || null,
          ownerTeacherCode: teacherAccount?.teacher_code || ''
        });

        return sendJson(res, 200, {
          ok: true,
          roomCode: room.code,
          moduleId: room.moduleId,
          moduleTitle: room.moduleTitle,
          joinUrl: room.joinUrl,
          shortJoinUrl: room.shortJoinUrl,
          laptopJoinUrl: room.laptopJoinUrl,
          studentShellUrl: room.studentShellUrl,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/module') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        roomManager.setRoomModule(room, body.moduleId);

        return sendJson(res, 200, {
          ok: true,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/settings') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        if (body.moduleId && body.moduleId !== room.moduleId) roomManager.setRoomModule(room, body.moduleId);
        roomManager.setQuestionLevel(room, body.questionLevel);

        const questionCount = roomManager.getQuestionCount(room.moduleId, { questionLevel: room.questionLevel }) || 1;
        const quizLength = Math.max(1, Math.min(Number(body.quizLength) || room.quizTotal || 3, questionCount));
        const maxListens = Math.max(1, Math.min(Number(body.maxListens) || room.maxListens || DEFAULT_MAX_LISTENS, 8));

        room.quizTotal = quizLength;
        room.maxListens = maxListens;
        if (!room.quizStarted) room.quizQuestionNumber = 0;

        return sendJson(res, 200, {
          ok: true,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/start') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        if (room.quizEnded && body.resetQuiz) await saveEndedRoomProgress(room);
        if (body.moduleId && body.moduleId !== room.moduleId) roomManager.setRoomModule(room, body.moduleId);
        roomManager.setQuestionLevel(room, body.questionLevel);

        const question = roomManager.startQuestion(room, body.questionIndex || 0, {
          resetQuiz: Boolean(body.resetQuiz),
          quizLength: body.quizLength,
          maxListens: body.maxListens,
          questionLevel: body.questionLevel
        });

        return sendJson(res, 200, {
          ok: true,
          question,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/next') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        if (room.quizStarted && Number(room.quizQuestionNumber || 0) >= Number(room.quizTotal || 1)) {
          roomManager.endQuiz(room);
          const progressSaved = await saveEndedRoomProgress(room);
          return sendJson(res, 400, {
            ok: false,
            error: 'Quiz complete. End the quiz or adjust settings for a new one.',
            progressSaved,
            state: roomManager.createRoomState(room)
          });
        }

        const nextOrderPosition = Math.max(0, Number(room.questionOrderPosition || 0) + 1);
        const questions = roomManager.getQuestions(room.moduleId);

        const nextIndex = Array.isArray(room.questionOrder) && room.questionOrder.length
          ? (room.questionOrder[nextOrderPosition] ?? (room.questionIndex || 0))
          : Math.min((room.questionIndex || 0) + 1, questions.length - 1);

        const question = roomManager.startQuestion(room, nextIndex, { advanceQuiz: true });

        return sendJson(res, 200, {
          ok: true,
          question,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/play') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        if (!room.activeQuestion) roomManager.startQuestion(room, room.questionIndex || 0);

        const playback = startPlayback(room, body);

        return sendJson(res, 200, {
          ok: true,
          audio: playback.audio,
          audioUrl: resolveQuestionAudioForBrowser(room, playback.audio),
          audioSequence: playback.audioSequence || [],
          audioSequenceUrls: playback.audioSequenceUrls || [],
          playback: playback.playback,
          state: roomManager.createRoomState(room),
          shouldCloseAfterPlayback: playback.shouldCloseAfterPlayback
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/close') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        roomManager.closeSubmissions(room);

        return sendJson(res, 200, {
          ok: true,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/reset') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        const question = roomManager.resetQuestion(room);

        return sendJson(res, 200, {
          ok: true,
          question,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/end') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        roomManager.endQuiz(room);
        const progressSaved = await saveEndedRoomProgress(room);

        return sendJson(res, 200, {
          ok: true,
          progressSaved,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/next-round') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        if (room.quizEnded) await saveEndedRoomProgress(room);
        roomManager.prepareNextRound(room);

        return sendJson(res, 200, {
          ok: true,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/dismiss') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        roomManager.dismiss(room);
        const progressSaved = await saveEndedRoomProgress(room);

        return sendJson(res, 200, {
          ok: true,
          progressSaved,
          state: roomManager.createRoomState(room)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/join') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code. Check the teacher screen.' });

        const accountStudent = await optionalStudentSession(req);
        if (accountStudent && room.ownerTeacherId && room.ownerTeacherId !== accountStudent.teacher_id) {
          return sendJson(res, 403, { ok: false, error: 'This classroom belongs to a different teacher account.' });
        }

        const studentId = accountStudent
          ? `account-${accountStudent.id}`
          : safeStudentId(body.studentId);
        const studentName = accountStudent?.display_name || body.name;
        const joined = roomManager.joinRoom(room, studentId, studentName, accountStudent ? {
          studentId: accountStudent.id,
          teacherId: accountStudent.teacher_id
        } : {});

        if (!joined.ok) return sendJson(res, 400, { ok: false, error: joined.error });

        const submission = room.submissions.get(studentId) || null;

        return sendJson(res, 200, {
          ok: true,
          studentId,
          studentName: joined.student.name,
          persistentAccount: Boolean(joined.student.accountStudentId),
          roomCode: room.code,
          moduleId: room.moduleId,
          moduleTitle: room.moduleTitle,
          studentMode: room.studentMode,
          studentShellUrl: room.studentShellUrl,
          laptopJoinUrl: room.laptopJoinUrl,
          submissionsOpen: room.submissionsOpen,
          question: room.activeQuestion,
          alreadySubmitted: Boolean(submission),
          submission,
          state: roomManager.createRoomState(room, studentId)
        });
      }

      if (req.method === 'POST' && pathname === '/api/classroom/submit') {
        const body = await readJsonBody(req);
        const room = roomManager.getRoom(body.roomCode);
        if (!room) return sendJson(res, 404, { ok: false, error: 'Invalid room code.' });

        const studentId = String(body.studentId || '').trim();
        if (!(await persistentParticipantIsAuthorised(req, room, studentId))) {
          return sendJson(res, 401, { ok: false, error: 'Student account login required for this classroom place.' });
        }

        try {
          const submission = roomManager.submitAnswer(room, studentId, body);

          return sendJson(res, 200, {
            ok: true,
            submission,
            state: roomManager.createRoomState(room, studentId)
          });
        } catch (error) {
          const status = error.code === 'ALREADY_SUBMITTED' || error.code === 'SUBMISSIONS_CLOSED' ? 400 : 404;

          return sendJson(res, status, {
            ok: false,
            error: error.message,
            state: roomManager.createRoomState(room, studentId)
          });
        }
      }

      return false;
    } catch (error) {
      console.error('[EchoAural classroom] API error:', error);
      sendJson(res, 500, { ok: false, error: error.message || 'Server error.' });
      return true;
    }
  }

  function safeStudentId(value) {
    const supplied = String(value || '').trim();
    return supplied || `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function serveStatic(req, res, parsedUrl) {
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/') pathname = '/index.html';
    if (pathname === '/join' || pathname === '/join/') pathname = '/student/join.html';
    if (/^\/(?:join|j)\/[A-Z0-9]+\/?$/i.test(pathname)) pathname = '/student/join.html';
    if (pathname === '/teacher' || pathname === '/teacher/') pathname = '/teacher/index.html';
    if (pathname === '/login' || pathname === '/teacher-login') pathname = '/account/teacher-login/index.html';
    if (pathname === '/teacher-signup' || pathname === '/teacher-signup/') pathname = '/teacher-signup/index.html';
    if (pathname === '/account/setup' || pathname === '/account/setup/') pathname = '/account/setup/index.html';
    if (pathname === '/student-login') pathname = '/account/student-login/index.html';
    if (pathname === '/dashboard' || pathname === '/teacher-dashboard') pathname = '/account/teacher-dashboard/index.html';
    if (pathname === '/student-home') pathname = '/account/student-home/index.html';
    if (pathname === '/founding' || pathname === '/founding/' || pathname === '/founding.html') {
      pathname = '/founding/index.html';
    }

    const requestedPath = path.normalize(path.join(projectRoot, pathname));

    if (!requestedPath.startsWith(projectRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(requestedPath, (statError, stat) => {
      let filePath = requestedPath;
      let fileStat = stat;

      if (!statError && stat.isDirectory()) {
        filePath = path.join(requestedPath, 'index.html');
        try {
          fileStat = fs.statSync(filePath);
        } catch (_error) {
          fileStat = null;
        }
      }

      if (statError || !fileStat || !fileStat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();

      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=3600'
      });

      fs.createReadStream(filePath).pipe(res);
    });
  }

  function logStartup() {
    const networkIp = getLocalNetworkIp();
    const publicServer = process.env.PUBLIC_HOST ? createBaseUrlResolver({ port })(process.env.PUBLIC_HOST) : '';
    const publicSite = normalizePublicBaseUrl(process.env.PUBLIC_SITE_URL) || '';

    console.log('');
    console.log('EchoAural shared classroom server is running.');
    console.log(`Teacher signup on this laptop: http://localhost:${port}/teacher-signup/`);
    console.log(`Teacher login on this laptop: http://localhost:${port}/account/teacher-login/`);
    console.log(`Teacher dashboard on this laptop: http://localhost:${port}/account/teacher-dashboard/`);
    console.log(`Student login on this laptop: http://localhost:${port}/account/student-login/`);
    console.log(`Teacher Mode on this laptop: http://localhost:${port}/teacher/`);
    console.log(`Founding page on this laptop: http://localhost:${port}/founding/`);
    console.log(`Teacher on same Wi-Fi: http://${networkIp}:${port}/teacher/`);
    console.log(`Student short join link: http://${networkIp}:${port}/join`);

    if (publicServer) console.log(`Online API/server URL: ${publicServer}`);
    if (publicSite) console.log(`Public EchoAural site URL: ${publicSite}`);

    console.log('Students enter the room code shown on the teacher screen.');
    console.log('Keep this Terminal window open while using local Teacher Mode.');
    console.log('');
  }

  return {
    handleApi,
    serveStatic,
    roomManager,
    getLocalNetworkIp,
    logStartup,
    port,
    projectRoot
  };
}

module.exports = {
  createClassroomServer,
  getLocalNetworkIp,
  getMp3DurationSeconds,
  normalizePublicBaseUrl,
  MIME_TYPES
};
