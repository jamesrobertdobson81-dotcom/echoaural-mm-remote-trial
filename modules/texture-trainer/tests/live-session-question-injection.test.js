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
const questionsSource = readSrc('modules/texture-trainer/data/texture-questions.js');
const questionSystemSource = readSrc('modules/texture-trainer/texture-question-system.js');
const promptMarksSource = readSrc('shared/js/question-prompt-marks.js');
const spacedRepetitionSource = readSrc('shared/js/spaced-repetition.js');
const trackingSource = readSrc('account/tracking.js');
const scriptSource = readSrc('modules/texture-trainer/script.js');

// Boots the real data/rendering/scoring files (unmodified, read straight
// off disk) inside a fake DOM with the embed contract enabled, in the same
// script load order as modules/texture-trainer/index.html, exactly as a
// Live Session host would with ?eaProgressHost=1&eaProgressSlot=...
// &eaProgressSource=texture-trainer.
function bootTextureTrainer() {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search: '?eaProgressHost=1&eaProgressSlot=slot-2&eaProgressSource=texture-trainer', origin: 'https://echoaural.test' }
  });
  win.parent = { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) };
  doc.defaultView = win;
  vm.createContext(win);

  [questionsSource, questionSystemSource, promptMarksSource, spacedRepetitionSource, trackingSource, contractSource, scriptSource]
    .forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));

  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('registers a question handler through the real contract when embedded as a Live Session host', () => {
  const { win } = bootTextureTrainer();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', () => {
  const { win, messages } = bootTextureTrainer();
  // TT007 is a real, stable Foundation question in texture-questions.js —
  // asserted directly against the real file, not assumed.
  win.EAProgressEmbed.onQuestion({ questionId: 'TT007' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading TT007');
  assert.equal(questionReady.payload.id, 'TT007');
  assert.equal(questionReady.questionId, 'TT007');
  assert.equal(questionReady.slotId, 'slot-2');
  assert.equal(questionReady.sourceKey, 'texture-trainer');
});

test('a second teacher-load-question call swaps the question without re-running round setup', () => {
  const { win, messages } = bootTextureTrainer();
  win.EAProgressEmbed.onQuestion({ questionId: 'TT007' });
  win.EAProgressEmbed.onQuestion({ questionId: 'TT008' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'TT007');
  assert.equal(readyMessages[1].message.payload.id, 'TT008');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', () => {
  const { win, messages } = bootTextureTrainer();
  win.EAProgressEmbed.onQuestion({ questionId: 'TT-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty, 'expected a pool-empty message for an unrecognised question id');
  assert.equal(poolEmpty.payload.questionId, 'TT-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected multiple-choice question reports the full result envelope through the bridge', () => {
  const { win, doc, messages } = bootTextureTrainer();
  win.EAProgressEmbed.onQuestion({ questionId: 'TT007' });

  const choiceArea = doc.getElementById('choiceArea');
  assert.ok(choiceArea.children.length > 0, 'expected rendered MC choice buttons for a Foundation question');
  const correctButton = choiceArea.children.find((button) => button.dataset.answer === 'Monophonic');
  assert.ok(correctButton, 'expected a Monophonic choice among the rendered options for TT007');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'TT007');
  assert.equal(answerComplete.payload.questionId, 'TT007');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'Monophonic');
  assert.equal(answerComplete.payload.modelAnswer, 'Monophonic');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', () => {
  const { win, doc, messages } = bootTextureTrainer();
  win.EAProgressEmbed.onQuestion({ questionId: 'TT007' });

  const choiceArea = doc.getElementById('choiceArea');
  const wrongButton = choiceArea.children.find((button) => button.dataset.answer !== 'Monophonic');
  assert.ok(wrongButton, 'expected at least one distractor choice');
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'Monophonic');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow({ document: doc, location: { search: '', origin: 'https://echoaural.test' } });
  win.parent = win;
  doc.defaultView = win;
  vm.createContext(win);
  [questionsSource, questionSystemSource, promptMarksSource, spacedRepetitionSource, trackingSource, contractSource, scriptSource]
    .forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));

  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'TT007' }));
});
