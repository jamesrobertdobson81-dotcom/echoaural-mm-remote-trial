'use strict';

// Drives the real, unmodified student/student.js inside a fake DOM to
// exercise the new Live Session iframe host (renderLiveIframeQuestion /
// handleLiveFrameMessage / sendLiveLoadQuestion / submitLiveIframeAnswer),
// which reuses Progress Mode's own iframe-loading and focus-mode CSS
// mechanism (modules/progress-mode/app-drivers.js's applyFocusMode) rather
// than reinventing it. Only the boundaries — fetch and the embedded app's
// own postMessage traffic — are faked; everything else is the real code.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..');
const registrySource = fs.readFileSync(path.join(root, 'shared/js/pm-registry.js'), 'utf8');
const driversSource = fs.readFileSync(path.join(root, 'modules/progress-mode/app-drivers.js'), 'utf8');
const studentSource = fs.readFileSync(path.join(root, 'student/student.js'), 'utf8');

const ROOM_CODE = 'ABCDE';
const STUDENT_ID = 'stu1';
const RUN_ID = 7;
const ROUND_ID = 3;
const SLOT_ID = `${ROOM_CODE}:${STUDENT_ID}:${RUN_ID}`;

function questionState(overrides = {}) {
  return {
    ok: true,
    serverNow: Date.now(),
    roomCode: ROOM_CODE,
    moduleId: 'mixed',
    moduleTitle: 'Mixed Apps',
    questionModuleId: 'instrument-identifier',
    mixedModuleIds: ['instrument-identifier'],
    active: true,
    submissionsOpen: true,
    listens: 0,
    maxListens: 3,
    dismissed: false,
    feedbackReleased: false,
    quiz: { totalQuestions: 2, currentQuestionNumber: 1, started: true, ended: false, questionsRemaining: 1, maxListens: 3 },
    questionIndex: 0,
    questionRunId: RUN_ID,
    roundId: ROUND_ID,
    playback: null,
    question: { moduleId: 'instrument-identifier', moduleTitle: 'Instrument Identifier', id: 'II001', title: 'Question 1' },
    students: [],
    leaderboard: [],
    student: { id: STUDENT_ID, submitted: false, submission: null },
    ...overrides
  };
}

function bootStudentShell({ initialState = questionState(), fetchHandlers = {} } = {}) {
  const doc = createFakeDocument();
  const fetchCalls = [];

  const win = createFakeWindow({
    document: doc,
    location: { search: `?room=${ROOM_CODE}&student=${STUDENT_ID}`, origin: 'https://echoaural.test', href: `https://echoaural.test/student-shell.html?room=${ROOM_CODE}` },
    sessionStorage: (() => {
      const store = new Map();
      return { getItem: (key) => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) };
    })(),
    EchoAuralClassroom: { buildApiUrl: (requestPath) => requestPath },
    fetch(url, options = {}) {
      fetchCalls.push({ url: String(url), options });
      let body = null;
      if (url.includes('/api/classroom/state')) body = fetchHandlers.state ? fetchHandlers.state(fetchCalls.length) : initialState;
      else if (url.includes('/api/classroom/submit')) body = fetchHandlers.submit ? fetchHandlers.submit(JSON.parse(options.body || '{}')) : { ok: true, state: questionState({ question: null }) };
      else body = { ok: true };
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
    }
  });
  doc.defaultView = win;
  vm.createContext(win);

  vm.runInContext(registrySource, win, { filename: 'pm-registry.js' });
  vm.runInContext(driversSource, win, { filename: 'app-drivers.js' });
  vm.runInContext(studentSource, win, { filename: 'student.js' });

  return { win, doc, fetchCalls };
}

async function flushMicrotasks(times = 8) {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
}

function fakeEmbeddedFrame() {
  const messages = [];
  const frameDoc = createFakeDocument();
  const frameWin = { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) };
  return { frameDoc, frameWin, messages };
}

test('a question from an id-mode PM source (instrument-identifier) renders through the live iframe host, not the bespoke answer panel', async () => {
  const { win, doc } = bootStudentShell();
  await flushMicrotasks();

  assert.equal(doc.getElementById('liveAppPanel').classList.contains('hidden'), false);
  assert.equal(doc.getElementById('questionPanel').classList.contains('hidden'), true);
  assert.equal(doc.getElementById('waitingPanel').classList.contains('hidden'), true);

  const iframe = doc.getElementById('liveAppFrame');
  const src = new URL(iframe.src, win.location.origin);
  assert.equal(src.pathname, '/modules/instrument-identifier/index.html');
  assert.equal(src.searchParams.get('eaProgressHost'), '1');
  assert.equal(src.searchParams.get('eaProgressSlot'), SLOT_ID);
  assert.equal(src.searchParams.get('eaProgressSource'), 'instrument-identifier');
  assert.equal(src.searchParams.get('eaProgressRoom'), ROOM_CODE);
  assert.equal(src.searchParams.get('eaProgressRound'), String(ROUND_ID));
});

test('once the embedded app announces app-ready, the host applies focus mode and sends teacher-load-question for the exact server-picked question id', async () => {
  const { win, doc } = bootStudentShell();
  await flushMicrotasks();

  const iframe = doc.getElementById('liveAppFrame');
  const { frameDoc, frameWin, messages } = fakeEmbeddedFrame();
  iframe.contentWindow = frameWin;
  iframe.contentDocument = frameDoc;

  win.dispatchEvent({
    type: 'message',
    origin: win.location.origin,
    source: frameWin,
    data: { namespace: 'echoaural-progress', version: 1, slotId: SLOT_ID, sourceKey: 'instrument-identifier', type: 'app-ready' }
  });

  assert.equal(messages.length, 1);
  const loadMessage = messages[0].message;
  assert.equal(loadMessage.type, 'teacher-load-question');
  assert.equal(loadMessage.slotId, SLOT_ID);
  assert.equal(loadMessage.roomId, ROOM_CODE);
  assert.equal(loadMessage.roundId, String(ROUND_ID));
  assert.equal(loadMessage.questionId, 'II001');
  assert.equal(loadMessage.payload.questionId, 'II001');
  assert.equal(messages[0].targetOrigin, win.location.origin);
  // Focus-mode CSS injection is Progress Mode's own already-tested code
  // (app-drivers.js's applyFocusMode) — just confirm the host actually
  // reaches it rather than silently swallowing the call.
  assert.equal(typeof frameDoc.getElementById('pmFocusModeStyle'), 'object');
});

test('question-ready from the embedded app clears the loading overlay', async () => {
  const { win, doc } = bootStudentShell();
  await flushMicrotasks();
  const iframe = doc.getElementById('liveAppFrame');
  const { frameWin } = fakeEmbeddedFrame();
  iframe.contentWindow = frameWin;
  iframe.contentDocument = createFakeDocument();

  doc.getElementById('liveAppFrameLoading').classList.remove('hidden');
  win.dispatchEvent({
    type: 'message', origin: win.location.origin, source: frameWin,
    data: { namespace: 'echoaural-progress', version: 1, slotId: SLOT_ID, type: 'question-ready', payload: { id: 'II001' } }
  });

  assert.equal(doc.getElementById('liveAppFrameLoading').classList.contains('hidden'), true);
});

test('answer-complete from the embedded app submits the raw answer to the real classroom submit endpoint, scored server-side', async () => {
  let submittedBody = null;
  const { win, doc, fetchCalls } = bootStudentShell({
    fetchHandlers: {
      submit: (body) => { submittedBody = body; return { ok: true, state: questionState({ question: null, quiz: { totalQuestions: 2, currentQuestionNumber: 2, started: true, ended: false, questionsRemaining: 0, maxListens: 3 } }) }; }
    }
  });
  await flushMicrotasks();
  const iframe = doc.getElementById('liveAppFrame');
  const { frameWin } = fakeEmbeddedFrame();
  iframe.contentWindow = frameWin;
  iframe.contentDocument = createFakeDocument();

  win.dispatchEvent({
    type: 'message', origin: win.location.origin, source: frameWin,
    data: {
      namespace: 'echoaural-progress', version: 1, slotId: SLOT_ID, type: 'answer-complete',
      payload: { questionId: 'II001', score: 1, maximumScore: 1, correct: true, responseType: 'multiple-choice', answerData: 'VIOLIN', modelAnswer: 'VIOLIN', feedback: 'Correct.' }
    }
  });
  await flushMicrotasks();

  const submitCall = fetchCalls.find((call) => call.url.includes('/api/classroom/submit'));
  assert.ok(submitCall, 'expected a POST to /api/classroom/submit');
  assert.equal(submittedBody.roomCode, ROOM_CODE);
  assert.equal(submittedBody.studentId, STUDENT_ID);
  assert.equal(submittedBody.answer, 'VIOLIN');
  assert.equal(submittedBody.questionId, 'II001');
  assert.equal(submittedBody.questionRunId, RUN_ID);
  assert.equal(submittedBody.roundId, ROUND_ID);

  // The server's response (question: null) is treated as authoritative —
  // the host falls back to the waiting panel and tears the iframe down,
  // exactly as it would for any other end-of-round transition.
  assert.equal(doc.getElementById('waitingPanel').classList.contains('hidden'), false);
  assert.equal(doc.getElementById('liveAppPanel').classList.contains('hidden'), true);
  assert.equal(iframe.src, 'about:blank');
});

test('a second answer-complete for the same question is not submitted twice', async () => {
  let submitCount = 0;
  const { win, doc } = bootStudentShell({
    fetchHandlers: { submit: () => { submitCount += 1; return { ok: true, state: questionState() }; } }
  });
  await flushMicrotasks();
  const iframe = doc.getElementById('liveAppFrame');
  const { frameWin } = fakeEmbeddedFrame();
  iframe.contentWindow = frameWin;
  iframe.contentDocument = createFakeDocument();

  const answerMessage = {
    type: 'message', origin: win.location.origin, source: frameWin,
    data: { namespace: 'echoaural-progress', version: 1, slotId: SLOT_ID, type: 'answer-complete', payload: { questionId: 'II001', score: 1, maximumScore: 1, correct: true, answerData: 'VIOLIN' } }
  };
  win.dispatchEvent(answerMessage);
  await flushMicrotasks();
  win.dispatchEvent(answerMessage);
  await flushMicrotasks();

  assert.equal(submitCount, 1);
});

test('a deterministic seed-mode source uses the PM iframe and receives its exact seed and level', async () => {
  const { win, doc } = bootStudentShell({
    initialState: questionState({
      questionModuleId: 'key-signature-sprint',
      mixedModuleIds: ['key-signature-sprint'],
      question: { moduleId: 'key-signature-sprint', sourceKey: 'harmony-key-signatures', moduleTitle: 'Key Signature Sprint', id: 'key-signature:treble:sharp:2:major', seed: 'room-seed-3', level: 'securing' }
    })
  });
  await flushMicrotasks();

  assert.equal(doc.getElementById('liveAppPanel').classList.contains('hidden'), false);
  assert.equal(doc.getElementById('questionPanel').classList.contains('hidden'), true);
  const iframe = doc.getElementById('liveAppFrame');
  const { frameWin, messages } = fakeEmbeddedFrame();
  iframe.contentWindow = frameWin;
  iframe.contentDocument = createFakeDocument();
  win.dispatchEvent({
    type: 'message', origin: win.location.origin, source: frameWin,
    data: { namespace: 'echoaural-progress', version: 1, slotId: SLOT_ID, sourceKey: 'harmony-key-signatures', type: 'app-ready' }
  });
  assert.equal(messages[0].message.payload.seed, 'room-seed-3');
  assert.equal(messages[0].message.payload.level, 'securing');
  assert.equal(messages[0].message.payload.sourceKey, 'harmony-key-signatures');
});

test('a mixed-round Melodic Intervals question uses the PM iframe host', async () => {
  const { win, doc } = bootStudentShell({
    initialState: questionState({
      questionModuleId: 'melodic-intervals',
      mixedModuleIds: ['instrument-identifier', 'melodic-intervals'],
      question: { moduleId: 'melodic-intervals', moduleTitle: 'Melodic Intervals', id: 'MI-D-417', choices: ['Unison', 'Octave'] }
    })
  });
  await flushMicrotasks();
  assert.equal(doc.getElementById('liveAppPanel').classList.contains('hidden'), false);
  assert.equal(doc.getElementById('questionPanel').classList.contains('hidden'), true);
  const iframe = doc.getElementById('liveAppFrame');
  assert.equal(new URL(iframe.src, win.location.origin).pathname, '/modules/melodic-intervals/index.html');
});

test('an exam-lab room is entirely unaffected — its own layout renders, the live iframe host never activates', async () => {
  const { doc } = bootStudentShell({
    initialState: {
      ok: true, serverNow: Date.now(), roomCode: ROOM_CODE, moduleId: 'exam-lab', moduleTitle: 'Exam Lab',
      dismissed: false, feedbackReleased: false, submissionsOpen: true, listens: 0, maxListens: 1,
      questionRunId: 1, roundId: 1, playback: null, question: null, students: [], student: { id: STUDENT_ID, submitted: false, submission: null }
    }
  });
  await flushMicrotasks();

  assert.equal(doc.getElementById('examLabLiveLayout').hidden, false);
  assert.equal(doc.getElementById('liveAppPanel').classList.contains('hidden'), true);
});
