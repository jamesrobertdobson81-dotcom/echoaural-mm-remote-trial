'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const SCRIPTS = [
  'modules/harmony-explorer/key-signature-sprint/key-signature-data.js',
  'modules/harmony-explorer/key-signature-sprint/key-signature-core.js', 'shared/js/spaced-repetition.js',
  'shared/js/progress-embed-contract.js', 'modules/harmony-explorer/key-signature-sprint/script.js'
].map((relative) => readSrc(relative));

function bootKeySignatureSprint(search = '?eaProgressHost=1&eaProgressSlot=slot-11&eaProgressSource=harmony-key-signatures') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({ document: doc, location: { search, origin: 'https://echoaural.test' } });
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

test('registers a question handler through the real contract when embedded as a Live Session host', () => {
  const { win } = bootKeySignatureSprint();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a question with a seed renders a question and reports it through the bridge', () => {
  const { win, messages } = bootKeySignatureSprint();
  win.EAProgressEmbed.onQuestion({ seed: 'room-ABCDE-round-1-q1' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading with a seed');
  assert.match(questionReady.payload.id, /^key-signature:/);
  assert.equal(questionReady.slotId, 'slot-11');
  assert.equal(questionReady.sourceKey, 'harmony-key-signatures');
});

test('the same seed produces the identical key signature in two completely independent app instances', () => {
  const boot1 = bootKeySignatureSprint();
  const boot2 = bootKeySignatureSprint();
  boot1.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-7' });
  boot2.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-7' });

  const id1 = lastMessageOfType(boot1.messages, 'question-ready').payload.id;
  const id2 = lastMessageOfType(boot2.messages, 'question-ready').payload.id;
  assert.equal(id1, id2);
});

test('the real classroom adapter and browser render the identical question from one seed and level', () => {
  const adapter = require('../teacher-adapter')({ projectRoot: root, path });
  const ticket = adapter.getQuestions().find((question) => question.level === 'mastering');
  const seed = 'shared-server-browser-key-signature';
  const prepared = adapter.prepareQuestion(ticket, { index: 0, seed });
  const { win, messages } = bootKeySignatureSprint();
  win.EAProgressEmbed.onQuestion({ seed, level: ticket.level });
  const rendered = lastMessageOfType(messages, 'question-ready');

  assert.equal(rendered.payload.id, prepared.id);
  assert.equal(rendered.payload.level, 'exam');
  const result = adapter.checkAnswer(ticket, prepared.choices.find((choice) => {
    const checked = adapter.checkAnswer(ticket, choice, { activeQuestion: prepared });
    return checked.correct;
  }), { activeQuestion: prepared });
  assert.equal(result.correct, true);
});

test('a different seed can produce a different key signature (not guaranteed distinct, but must not throw and must still be well-formed)', () => {
  const { win, messages } = bootKeySignatureSprint();
  win.EAProgressEmbed.onQuestion({ seed: 'seed-one' });
  win.EAProgressEmbed.onQuestion({ seed: 'seed-two' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  readyMessages.forEach((entry) => assert.match(entry.message.payload.id, /^key-signature:/));
});

test('answering a host-seeded question reports the full result envelope through the bridge', () => {
  const { win, doc, messages } = bootKeySignatureSprint();
  win.EAProgressEmbed.onQuestion({ seed: 'answer-envelope-check' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons at Foundation level');
  answersDiv.children[0].click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.match(answerComplete.questionId, /^key-signature:/);
  assert.equal(typeof answerComplete.payload.correct, 'boolean');
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, answersDiv.children[0].textContent);
  assert.ok(answerComplete.payload.modelAnswer.length > 0);
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('Math.random is restored after generation — later unrelated randomness is not left seeded', () => {
  const { win } = bootKeySignatureSprint();
  const before = win.Math.random;
  win.EAProgressEmbed.onQuestion({ seed: 'restore-check' });
  assert.equal(win.Math.random, before, 'Math.random should be restored to the original after seeded generation');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', () => {
  const { win } = bootKeySignatureSprint('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ seed: 'irrelevant' }));
});
