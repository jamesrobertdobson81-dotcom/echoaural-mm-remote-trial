'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const SCRIPTS = [
  'modules/melodic-intervals/interval-data.js', 'account/tracking.js', 'shared/js/progression-store.js',
  'shared/js/question-prompt-marks.js', 'shared/js/spaced-repetition.js', 'shared/js/progress-embed-contract.js',
  'modules/melodic-intervals/script.js'
].map((relative) => readSrc(relative));

function wait() {
  return new Promise((resolve) => setImmediate(resolve));
}

function bootMelodicIntervals(search = '?eaProgressHost=1&eaProgressSlot=slot-10&eaProgressSource=melodic-intervals') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  SCRIPTS.forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('MI001 is really the fixed question this test relies on', () => {
  const dataSource = readSrc('modules/melodic-intervals/interval-data.js');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(dataSource, sandbox);
  const questions = sandbox.EchoAuralMelodicIntervals.buildQuestions();
  const first = questions.find((question) => question.id === 'MI001');
  assert.ok(first);
  assert.equal(first.intervalLabel, '2nd');
  assert.equal(first.answerMode, 'number');
});

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = bootMelodicIntervals();
  await wait();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', async () => {
  const { win, messages } = bootMelodicIntervals();
  await wait();
  win.EAProgressEmbed.onQuestion({ questionId: 'MI001' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading MI001');
  assert.equal(questionReady.payload.id, 'MI001');
  assert.equal(questionReady.slotId, 'slot-10');
});

test('a second teacher-load-question call swaps the question without re-running round setup', async () => {
  const { win, messages } = bootMelodicIntervals();
  await wait();
  win.EAProgressEmbed.onQuestion({ questionId: 'MI001' });
  win.EAProgressEmbed.onQuestion({ questionId: 'MI002' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'MI001');
  assert.equal(readyMessages[1].message.payload.id, 'MI002');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', async () => {
  const { win, messages } = bootMelodicIntervals();
  await wait();
  win.EAProgressEmbed.onQuestion({ questionId: 'MI-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'MI-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected multiple-choice question reports the full result envelope through the bridge', async () => {
  const { win, doc, messages } = bootMelodicIntervals();
  await wait();
  win.EAProgressEmbed.onQuestion({ questionId: 'MI001' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons');
  const correctButton = answersDiv.children.find((button) => button.dataset.answer === '2nd');
  assert.ok(correctButton, 'expected a "2nd" choice among the rendered options for MI001');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'MI001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, '2nd');
  assert.equal(answerComplete.payload.modelAnswer, '2nd');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', async () => {
  const { win, doc, messages } = bootMelodicIntervals();
  await wait();
  win.EAProgressEmbed.onQuestion({ questionId: 'MI001' });

  const answersDiv = doc.getElementById('answers');
  const wrongButton = answersDiv.children.find((button) => button.dataset.answer !== '2nd');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, '2nd');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = bootMelodicIntervals('');
  await wait();
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'MI001' }));
});
