'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const devicesJson = JSON.parse(readSrc('modules/melody-master/data/melody-master-melodic-devices-50.json'));

const SCRIPTS = [
  'modules/melody-master/clips.js', 'shared/js/question-prompt-marks.js',
  'shared/js/spaced-repetition.js', 'account/tracking.js', 'shared/js/progress-embed-contract.js',
  'modules/melody-master/script.js'
].map((relative) => readSrc(relative));

function wait() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function bootMelodyMaster(search = '?eaProgressHost=1&eaProgressSlot=slot-8&eaProgressSource=melody-master-devices') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: (url) => {
      if (String(url).includes('melody-master-melodic-devices-50.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(devicesJson) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  // script.js finds several containers via class selectors against markup
  // the real index.html already provides statically (this harness doesn't
  // parse index.html, only runs script.js) — seed the one this app's own
  // logic actually depends on (ensureMelodicDevicesWorkspace()'s
  // insertion point) so it isn't silently null.
  const dictationConsole = doc.createElement('div');
  dictationConsole.className = 'listening-console dictation-console';
  doc.body.appendChild(dictationConsole);
  SCRIPTS.forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  await wait();
  await wait();
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('MDV040 (devices) and MM001 (dictation) are really the fixed questions this test relies on', () => {
  const devicesQuestion = devicesJson.questions.find((question) => question.id === 'MDV040');
  assert.ok(devicesQuestion);
  assert.equal(devicesQuestion.correctAnswer, 'Turn');
  assert.deepEqual(devicesQuestion.choices, ['Trill', 'Mordent', 'Turn', 'Acciaccatura']);

  const clipsSource = readSrc('modules/melody-master/clips.js');
  assert.match(clipsSource, /"id":\s*"MM001"/);
  assert.match(clipsSource, /"answerPitches":\s*\[\s*"G4",\s*"G4",\s*"A4",\s*"B4",\s*"C5",\s*"D5"/);
});

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = await bootMelodyMaster();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a devices question by id renders exactly that question, not a random draw', async () => {
  const { win, messages } = await bootMelodyMaster();
  await win.EAProgressEmbed.onQuestion({ questionId: 'MDV040' });
  await wait();

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading MDV040');
  assert.equal(questionReady.payload.id, 'MDV040');
  assert.equal(questionReady.slotId, 'slot-8');
});

test('loading a dictation question by id renders exactly that question (disambiguated automatically from a devices id)', async () => {
  const { win, messages } = await bootMelodyMaster('?eaProgressHost=1&eaProgressSlot=slot-9&eaProgressSource=melody-master-dictation');
  await win.EAProgressEmbed.onQuestion({ questionId: 'MM001' });
  await wait();

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading MM001');
  assert.equal(questionReady.payload.id, 'MM001');
});

test('a second teacher-load-question call swaps devices questions without re-running round setup', async () => {
  const { win, messages } = await bootMelodyMaster();
  await win.EAProgressEmbed.onQuestion({ questionId: 'MDV040' });
  await wait();
  await win.EAProgressEmbed.onQuestion({ questionId: 'MDV023' });
  await wait();

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'MDV040');
  assert.equal(readyMessages[1].message.payload.id, 'MDV023');
});

test('unknown question id (matching neither pool) reports pool-empty instead of silently falling back', async () => {
  const { win, messages } = await bootMelodyMaster();
  await win.EAProgressEmbed.onQuestion({ questionId: 'DOES-NOT-EXIST-ANYWHERE' });
  await wait();
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'DOES-NOT-EXIST-ANYWHERE');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected devices question reports the full result envelope through the bridge', async () => {
  const { win, doc, messages } = await bootMelodyMaster();
  await win.EAProgressEmbed.onQuestion({ questionId: 'MDV040' });
  await wait();

  const workspace = doc.getElementById('melodicDevicesPanel');
  assert.ok(workspace, 'expected the melodic devices workspace panel to have been created');
  const correctButton = workspace.querySelectorAll('.melodic-devices-option').find((button) => button.dataset.choice === 'Turn');
  assert.ok(correctButton, 'expected a Turn choice among the rendered options for MDV040');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'MDV040');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'Turn');
  assert.equal(answerComplete.payload.modelAnswer, 'Turn');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect devices answer still reports a complete, honest result envelope', async () => {
  const { win, doc, messages } = await bootMelodyMaster();
  await win.EAProgressEmbed.onQuestion({ questionId: 'MDV040' });
  await wait();

  const workspace = doc.getElementById('melodicDevicesPanel');
  const wrongButton = workspace.querySelectorAll('.melodic-devices-option').find((button) => button.dataset.choice !== 'Turn');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'Turn');
});

test('answering a host-selected dictation question (notes placed, then Check) reports the full result envelope', async () => {
  // Dictation's real UI places notes via drag-and-drop onto a stave — this
  // test bypasses simulating that specific interaction (out of scope for
  // this harness) and instead sets the same underlying state a completed
  // drag would leave behind (slot.selectedPitch), then drives the real,
  // unmodified checkAnswer() exactly as the Check button does. This proves
  // the injection + scoring + bridge envelope genuinely work; it does not
  // prove the drag gesture itself renders correctly (unchanged by this
  // migration either way — nothing about note placement was touched).
  const { win, doc, messages } = await bootMelodyMaster('?eaProgressHost=1&eaProgressSlot=slot-9&eaProgressSource=melody-master-dictation');
  await win.EAProgressEmbed.onQuestion({ questionId: 'MM001' });
  await wait();

  const sandbox = vm.runInContext('({ dictationSlots: dictationSlots })', win);
  const slots = sandbox.dictationSlots;
  assert.equal(slots.length, 6, 'expected 6 dictation slots for MM001 (answerPitches has 6 notes)');
  slots.forEach((slot) => { slot.selectedPitch = slot.pitch; slot.placed = true; }); // simulate a fully correct placement

  const checkAnswerButton = doc.getElementById('checkAnswerButton');
  checkAnswerButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete, 'expected an answer-complete message after Check with all notes correctly placed');
  assert.equal(answerComplete.questionId, 'MM001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.responseType, 'dictation');
  // Array.from(): the array crossed from the vm-context realm, where it
  // isn't `instanceof` this file's own Array — a real postMessage would
  // structured-clone it back into a plain host-realm array, so this just
  // restores that same normalization for the comparison below.
  assert.deepEqual(Array.from(answerComplete.payload.answerData), ['G4', 'G4', 'A4', 'B4', 'C5', 'D5']);
  assert.deepEqual(Array.from(answerComplete.payload.modelAnswer), ['G4', 'G4', 'A4', 'B4', 'C5', 'D5']);
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = await bootMelodyMaster('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  await assert.doesNotReject(() => win.EAProgressEmbed.onQuestion({ questionId: 'MDV040' }));
});
