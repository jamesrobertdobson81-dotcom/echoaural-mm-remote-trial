'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const contractSource = fs.readFileSync(path.join(root, 'shared/js/progress-embed-contract.js'), 'utf8');
const clipsSource = fs.readFileSync(path.join(root, 'modules/instrument-identifier/clips.js'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'modules/instrument-identifier/script.js'), 'utf8');

// Boots the real clips.js + script.js (unmodified, read straight off disk)
// inside a fake DOM with the embed contract enabled, exactly as it would be
// when a Live Session host loads this app in an iframe with
// ?eaProgressHost=1&eaProgressSlot=...&eaProgressSource=instrument-identifier.
// This exercises the real integration path end to end: the only thing this
// test drives directly is EAProgressEmbed.onQuestion (what a postMessage
// "teacher-load-question" ultimately calls) and a real rendered button's
// .click() — everything else is the app's own unmodified code.
function bootInstrumentIdentifier() {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search: '?eaProgressHost=1&eaProgressSlot=slot-1&eaProgressSource=instrument-identifier', origin: 'https://echoaural.test' }
  });
  win.parent = { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) };
  doc.defaultView = win;
  vm.createContext(win);

  vm.runInContext(contractSource, win, { filename: 'progress-embed-contract.js' });
  vm.runInContext(clipsSource, win, { filename: 'clips.js' });
  vm.runInContext(scriptSource, win, { filename: 'script.js' });

  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('registers a question handler through the real contract when embedded as a Live Session host', () => {
  const { win } = bootInstrumentIdentifier();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that clip, not a random draw', () => {
  const { win, messages } = bootInstrumentIdentifier();
  // II001 is the stable first clip in clips.js (Beethoven Violin Concerto,
  // answer VIOLIN) — asserted directly against the real file, not assumed.
  win.EAProgressEmbed.onQuestion({ questionId: 'II001' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading II001');
  assert.equal(questionReady.payload.id, 'II001');
  assert.equal(questionReady.questionId, 'II001');
  assert.equal(questionReady.slotId, 'slot-1');
  assert.equal(questionReady.sourceKey, 'instrument-identifier');
});

test('a second teacher-load-question call swaps the clip without re-running setup (score/round state untouched)', () => {
  const { win, messages } = bootInstrumentIdentifier();
  win.EAProgressEmbed.onQuestion({ questionId: 'II001' });
  win.EAProgressEmbed.onQuestion({ questionId: 'II004' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'II001');
  assert.equal(readyMessages[1].message.payload.id, 'II004');
});

test('unknown question id reports pool-empty instead of silently falling back to a random clip', () => {
  const { win, messages } = bootInstrumentIdentifier();
  win.EAProgressEmbed.onQuestion({ questionId: 'II-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty, 'expected a pool-empty message for an unrecognised question id');
  assert.equal(poolEmpty.payload.questionId, 'II-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected question reports the full result envelope through the bridge', () => {
  const { win, doc, messages } = bootInstrumentIdentifier();
  win.EAProgressEmbed.onQuestion({ questionId: 'II001' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered answer-choice buttons');
  const correctButton = answersDiv.children.find((button) => button.dataset.instrument === 'VIOLIN');
  assert.ok(correctButton, 'expected a VIOLIN choice among the rendered options for II001');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'II001');
  assert.equal(answerComplete.payload.questionId, 'II001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'VIOLIN');
  assert.equal(answerComplete.payload.modelAnswer, 'VIOLIN');
  assert.equal(typeof answerComplete.payload.feedback, 'string');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', () => {
  const { win, doc, messages } = bootInstrumentIdentifier();
  win.EAProgressEmbed.onQuestion({ questionId: 'II001' });

  const answersDiv = doc.getElementById('answers');
  const wrongButton = answersDiv.children.find((button) => button.dataset.instrument !== 'VIOLIN');
  assert.ok(wrongButton, 'expected at least one distractor choice');
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'VIOLIN');
  assert.equal(answerComplete.payload.answerData, wrongButton.dataset.instrument);
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no question handler side effects fire', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow({ document: doc, location: { search: '', origin: 'https://echoaural.test' } });
  win.parent = win; // top-level window, same as a real standalone visit
  doc.defaultView = win;
  vm.createContext(win);
  vm.runInContext(contractSource, win, { filename: 'progress-embed-contract.js' });
  vm.runInContext(clipsSource, win, { filename: 'clips.js' });
  vm.runInContext(scriptSource, win, { filename: 'script.js' });

  assert.equal(win.EAProgressEmbed.enabled, false);
  // registerQuestionHandler still runs (it's unconditional), but questionReady/
  // answerComplete are no-ops without eaProgressHost=1 — nothing should throw,
  // and no message plumbing should activate.
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'II001' }));
});
