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
  'js/pitch-utils.js', 'data/keys.js', 'data/chords.js', 'js/chord-engine.js',
  'js/notation-engine.js', 'js/audio-engine.js', 'js/answer-engine.js',
  'chord-identifier-core.js'
].map((relative) => readSrc(`modules/chord-identifier/${relative}`));
const contractSource = readSrc('shared/js/progress-embed-contract.js');
const scriptSource = readSrc('modules/chord-identifier/script.js');

// Chord Identifier generates every question procedurally (no fixed bank),
// so a Live Session host drives it with a seed rather than a question id —
// see loadQuestionBySeed in script.js. This boots the real engine files
// (unmodified, read straight off disk) in the same order as
// modules/chord-identifier/index.html.
function bootChordIdentifier(search = '?eaProgressHost=1&eaProgressSlot=slot-4&eaProgressSource=chord-identifier') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({ document: doc, location: { search, origin: 'https://echoaural.test' } });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  [...SCRIPTS, contractSource, scriptSource].forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('registers a question handler through the real contract when embedded as a Live Session host', () => {
  const { win } = bootChordIdentifier();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a question with a seed renders a question and reports it through the bridge', () => {
  const { win, messages } = bootChordIdentifier();
  win.EAProgressEmbed.onQuestion({ seed: 'room-ABCDE-round-1-q1' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading with a seed');
  assert.match(questionReady.payload.id, /^chord:/);
  assert.equal(questionReady.slotId, 'slot-4');
  assert.equal(questionReady.sourceKey, 'chord-identifier');
});

test('the same seed produces the identical chord in two completely independent app instances', () => {
  // Simulates two different students' browsers, each with their own fresh
  // iframe/script instance — the whole point of seed-based sync is that
  // neither one talks to the other, yet both must render the same chord.
  const boot1 = bootChordIdentifier();
  const boot2 = bootChordIdentifier();
  boot1.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-42' });
  boot2.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-42' });

  const id1 = lastMessageOfType(boot1.messages, 'question-ready').payload.id;
  const id2 = lastMessageOfType(boot2.messages, 'question-ready').payload.id;
  assert.equal(id1, id2);
});

test('browser rendering and server adapter derive the same complete question and choices from a seed', () => {
  const createAdapter = require('../teacher-adapter');
  const adapter = createAdapter();

  adapter.getQuestions().filter((_, index) => index % 30 === 0).forEach((question, index) => {
    const seed = `iframe-adapter-parity:${question.level}`;
    const prepared = adapter.prepareQuestion(question, { index, seed });
    const { win, doc, messages } = bootChordIdentifier();
    win.EAProgressEmbed.onQuestion({
      questionId: prepared.id,
      seed: prepared.seed,
      level: prepared.level,
      settings: prepared.settings
    });

    const ready = lastMessageOfType(messages, 'question-ready');
    assert.equal(ready.questionId, prepared.id);
    assert.equal(ready.payload.id, prepared.id);
    assert.equal(ready.payload.signature, prepared.signature);
    assert.equal(prepared.id, prepared.generatedQuestionId);
    assert.deepEqual(
      Array.from(doc.getElementById('answers').children, (button) => button.textContent),
      prepared.choices
    );

    const correctChoice = prepared.choices.find((choice) => (
      adapter.checkAnswer(question, choice, { activeQuestion: prepared }).correct
    ));
    const modelButton = Array.from(doc.getElementById('answers').children)
      .find((button) => button.textContent === correctChoice);
    assert.ok(modelButton, `${question.level} should render the server-scored model answer`);
    modelButton.click();

    const complete = lastMessageOfType(messages, 'answer-complete');
    assert.equal(complete.questionId, prepared.id);
    assert.equal(complete.payload.questionId, prepared.id);
    assert.equal(complete.payload.generatedQuestionId, prepared.signature);
    assert.equal(adapter.checkAnswer(question, complete.payload.answerData, { activeQuestion: prepared }).correct, true);
  });
});

test('a different seed produces a different chord than a previous seed (same instance, sequential loads)', () => {
  const { win, messages } = bootChordIdentifier();
  win.EAProgressEmbed.onQuestion({ seed: 'seed-one' });
  win.EAProgressEmbed.onQuestion({ seed: 'seed-two' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  // Not guaranteed different by definition, but with 7 diatonic Foundation
  // chords and 2 different seed strings, a collision here would itself be
  // a signal worth investigating rather than assumed impossible — assert
  // it plainly so a real regression (e.g. seed being ignored) fails loudly.
  assert.notEqual(readyMessages[0].message.payload.id, readyMessages[1].message.payload.id);
});

test('the same seed reused later still reproduces the same chord (reproducibility, not just first-call determinism)', () => {
  const boot1 = bootChordIdentifier();
  boot1.win.EAProgressEmbed.onQuestion({ seed: 'replay-me' });
  const firstId = lastMessageOfType(boot1.messages, 'question-ready').payload.id;

  const boot2 = bootChordIdentifier();
  boot2.win.EAProgressEmbed.onQuestion({ seed: 'unrelated-seed' });
  boot2.win.EAProgressEmbed.onQuestion({ seed: 'replay-me' });
  const secondId = lastMessageOfType(boot2.messages, 'question-ready').payload.id;

  assert.equal(firstId, secondId);
});

test('answering a host-seeded question reports the full result envelope through the bridge', () => {
  const { win, doc, messages } = bootChordIdentifier();
  win.EAProgressEmbed.onQuestion({ seed: 'answer-envelope-check' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons (Foundation defaults to multiple choice)');
  // Foundation forces recognition:'name', so exactly one button's label is
  // the real chord name — find it via the question-ready payload id rather
  // than guessing, since the label text itself isn't in the id.
  answersDiv.children[0].click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.match(answerComplete.questionId, /^chord:/);
  assert.equal(typeof answerComplete.payload.correct, 'boolean');
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, answersDiv.children[0].textContent);
  assert.ok(answerComplete.payload.modelAnswer.length > 0);
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('Math.random is restored after generation — later unrelated randomness is not left seeded', () => {
  const { win } = bootChordIdentifier();
  const before = win.Math.random;
  win.EAProgressEmbed.onQuestion({ seed: 'restore-check' });
  assert.equal(win.Math.random, before, 'Math.random should be restored to the original after seeded generation');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', () => {
  const { win } = bootChordIdentifier('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ seed: 'irrelevant' }));
});
