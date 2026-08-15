'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow, withCheckedInputs } = require('../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const clipCatalogueJson = JSON.parse(readSrc('shared/data/clip-catalogue.json'));
const curationJson = JSON.parse(readSrc('era-explorer/data/context-coach-curation.json'));
const createTeacherAdapter = require('../teacher-adapter.js');
const teacherAdapter = createTeacherAdapter({ path, fs, projectRoot: root, getAudioDurationSeconds: () => 10 });

const SCRIPTS = [
  'era-explorer/era-explorer-core.js', 'shared/js/question-prompt-marks.js',
  'shared/js/spaced-repetition.js', 'shared/js/progress-embed-contract.js', 'era-explorer/script.js'
].map((relative) => readSrc(relative));

function wait() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function bootContextCoach(search = '?eaProgressHost=1&eaProgressSlot=slot-12&eaProgressSource=context-coach-composer', checkedInputs = {}, waitForCatalogue = true) {
  const messages = [];
  const doc = createFakeDocument();
  withCheckedInputs(doc, checkedInputs);
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: (url) => {
      const href = String(url);
      if (href.includes('clip-catalogue.json')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(clipCatalogueJson) });
      if (href.includes('context-coach-curation.json')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(curationJson) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  // script.js finds its outer shell via a class selector against markup
  // the real index.html already provides statically (this harness doesn't
  // parse index.html, only runs script.js) — seed it so appShell isn't null.
  const appShell = doc.createElement('div');
  appShell.className = 'app-shell';
  doc.body.appendChild(appShell);
  SCRIPTS.forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  if (waitForCatalogue) {
    await wait();
    await wait();
    await wait();
  }
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = await bootContextCoach();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('an immediate host request waits for the async catalogue instead of becoming an empty-pool race', async () => {
  const { win, messages } = await bootContextCoach(
    '?eaProgressHost=1&eaProgressSlot=slot-race&eaProgressSource=context-coach-period',
    {},
    false
  );
  win.EAProgressEmbed.onQuestion({ seed: 'catalogue-race-seed', level: 'developing' });
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);

  await wait();
  await wait();
  await wait();
  const ready = lastMessageOfType(messages, 'question-ready');
  assert.ok(ready);
  assert.match(ready.payload.id, /-period$/);
  assert.equal(lastMessageOfType(messages, 'pool-empty'), null);
});

test('loading a composer question with a seed renders a question and reports it through the bridge', async () => {
  const { win, messages } = await bootContextCoach();
  win.EAProgressEmbed.onQuestion({ seed: 'room-ABCDE-round-1-q1' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading with a seed');
  assert.ok(questionReady.payload.id, 'expected the question to have a real id');
  assert.match(questionReady.payload.id, /-composer$/);
  assert.equal(questionReady.slotId, 'slot-12');
  assert.equal(questionReady.sourceKey, 'context-coach-composer');
});

test('the context-coach-period source selects a period question without relying on PM setup controls', async () => {
  const { win, messages } = await bootContextCoach('?eaProgressHost=1&eaProgressSlot=slot-13&eaProgressSource=context-coach-period');
  win.EAProgressEmbed.onQuestion({ seed: 'room-period-seed' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message for a period question');
  assert.match(questionReady.payload.id, /-period$/);
  assert.equal(questionReady.slotId, 'slot-13');
});

test('host source and level override stale setup controls and match the server adapter exactly', async () => {
  const seed = 'shared-browser-server-context-seed';
  const template = teacherAdapter.getQuestions().find((question) => (
    question.sourceKey === 'context-coach-composer' && question.level === 'securing'
  ));
  const expected = teacherAdapter.buildQuestionForSeed(template, seed);
  const { win, messages } = await bootContextCoach(
    '?eaProgressHost=1&eaProgressSlot=slot-14&eaProgressSource=context-coach-composer',
    { ccSkill: 'period', ccLevel: 'foundation' }
  );

  win.EAProgressEmbed.onQuestion({
    seed,
    sourceKey: template.sourceKey,
    questionType: template.questionType,
    level: template.level
  });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.equal(questionReady.payload.id, expected.id);
  assert.equal(questionReady.payload.level, expected.level);
  assert.deepEqual(Array.from(win.EraExplorerApp.getState().questionOptions[0]), expected.options);
});

test('the same seed produces the identical question in two completely independent app instances', async () => {
  const boot1 = await bootContextCoach();
  const boot2 = await bootContextCoach();
  boot1.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-9' });
  boot2.win.EAProgressEmbed.onQuestion({ seed: 'shared-round-seed-9' });

  const id1 = lastMessageOfType(boot1.messages, 'question-ready').payload.id;
  const id2 = lastMessageOfType(boot2.messages, 'question-ready').payload.id;
  assert.equal(id1, id2);
});

test('answering a host-seeded question reports the full result envelope through the bridge', async () => {
  const { win, doc, messages } = await bootContextCoach();
  win.EAProgressEmbed.onQuestion({ seed: 'answer-envelope-check' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons');
  answersDiv.children[0].click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(typeof answerComplete.payload.correct, 'boolean');
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, answersDiv.children[0].dataset.answer);
  assert.ok(answerComplete.payload.modelAnswer.length > 0);
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('unknown/unbuildable request (empty seed) does not silently render a random question', async () => {
  const { win, messages } = await bootContextCoach();
  win.EAProgressEmbed.onQuestion({ seed: '' });
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = await bootContextCoach('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ seed: 'irrelevant' }));
});
