'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const contractSource = readSrc('shared/js/progress-embed-contract.js');
const dataSource = readSrc('modules/cadence-coach/data.js');
const scriptSource = readSrc('modules/cadence-coach/script.js');

function bootCadenceCoach(search = '?eaProgressHost=1&eaProgressSlot=slot-3&eaProgressSource=cadence-coach') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({ document: doc, location: { search, origin: 'https://echoaural.test' } });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  [dataSource, contractSource, scriptSource].forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('registers a question handler through the real contract when embedded as a Live Session host', () => {
  const { win } = bootCadenceCoach();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', () => {
  const { win, messages } = bootCadenceCoach();
  // CC001 is a real, stable question in data.js (Perfect cadence, F major).
  win.EAProgressEmbed.onQuestion({ questionId: 'CC001' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading CC001');
  assert.equal(questionReady.payload.id, 'CC001');
  assert.equal(questionReady.questionId, 'CC001');
  assert.equal(questionReady.slotId, 'slot-3');
});

test('a second teacher-load-question call swaps the question without re-running round setup', () => {
  const { win, messages } = bootCadenceCoach();
  win.EAProgressEmbed.onQuestion({ questionId: 'CC001' });
  win.EAProgressEmbed.onQuestion({ questionId: 'CC002' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'CC001');
  assert.equal(readyMessages[1].message.payload.id, 'CC002');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', () => {
  const { win, messages } = bootCadenceCoach();
  win.EAProgressEmbed.onQuestion({ questionId: 'CC-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'CC-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected question reports the full result envelope through the bridge', () => {
  const { win, doc, messages } = bootCadenceCoach();
  win.EAProgressEmbed.onQuestion({ questionId: 'CC001' });

  const answersDiv = doc.getElementById('cadenceAnswers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons');
  const correctButton = answersDiv.children.find((button) => button.textContent === 'Perfect');
  assert.ok(correctButton, 'expected a Perfect choice among the rendered options for CC001');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'CC001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'Perfect');
  assert.equal(answerComplete.payload.modelAnswer, 'Perfect');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', () => {
  const { win, doc, messages } = bootCadenceCoach();
  win.EAProgressEmbed.onQuestion({ questionId: 'CC001' });

  const answersDiv = doc.getElementById('cadenceAnswers');
  const wrongButton = answersDiv.children.find((button) => button.textContent !== 'Perfect');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'Perfect');
  assert.equal(answerComplete.payload.answerData, wrongButton.textContent);
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', () => {
  const { win } = bootCadenceCoach('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'CC001' }));
});
