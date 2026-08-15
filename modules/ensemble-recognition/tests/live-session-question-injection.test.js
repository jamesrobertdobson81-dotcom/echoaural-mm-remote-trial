'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ensembleQuestionsJson = JSON.parse(readSrc('modules/ensemble-recognition/data/ensemble-questions.json'));

const SCRIPTS = [
  'modules/ensemble-recognition/ensemble-core.js', 'shared/js/question-prompt-marks.js',
  'shared/js/spaced-repetition.js', 'shared/js/progress-embed-contract.js', 'modules/ensemble-recognition/script.js'
].map((relative) => readSrc(relative));

function wait() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function bootEnsembleRecognition(search = '?eaProgressHost=1&eaProgressSlot=slot-6&eaProgressSource=ensemble-recognition') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: (url) => {
      if (String(url).includes('ensemble-questions.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(ensembleQuestionsJson) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  // script.js does ensemblePanel.querySelector(".ensemble-options") against
  // a child the real index.html already contains statically (this harness
  // doesn't parse index.html, only runs script.js) — seed that one static
  // child so the app's own render code finds it exactly like it would in a
  // real page load.
  doc.getElementById('ensembleOptions').innerHTML = '<div class="ensemble-options" role="radiogroup" aria-label="Ensemble answer options" data-answer-count="4"></div>';
  SCRIPTS.forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  await wait();
  await wait();
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('ENS001 is really the fixed question this test relies on', () => {
  const first = ensembleQuestionsJson.questions.find((question) => question.id === 'ENS001');
  assert.ok(first);
  assert.equal(first.correctAnswer, 'String Quartet');
  assert.equal(first.level, 'Foundation');
});

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = await bootEnsembleRecognition();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', async () => {
  const { win, messages } = await bootEnsembleRecognition();
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS001' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading ENS001');
  assert.equal(questionReady.payload.id, 'ENS001');
  assert.equal(questionReady.slotId, 'slot-6');
});

test('a second teacher-load-question call swaps the question without re-running round setup', async () => {
  const { win, messages } = await bootEnsembleRecognition();
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS001' });
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS002' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'ENS001');
  assert.equal(readyMessages[1].message.payload.id, 'ENS002');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', async () => {
  const { win, messages } = await bootEnsembleRecognition();
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'ENS-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected question reports the full result envelope through the bridge', async () => {
  const { win, doc, messages } = await bootEnsembleRecognition();
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS001' });

  const optionsRoot = doc.querySelector('.ensemble-options');
  assert.ok(optionsRoot, 'expected an .ensemble-options container to have been found/rendered into');
  const correctButton = optionsRoot.children.find((button) => button.dataset.choice === 'String Quartet');
  assert.ok(correctButton, 'expected a String Quartet choice among the rendered options for ENS001');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'ENS001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'String Quartet');
  assert.equal(answerComplete.payload.modelAnswer, 'String Quartet');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', async () => {
  const { win, doc, messages } = await bootEnsembleRecognition();
  win.EAProgressEmbed.onQuestion({ questionId: 'ENS001' });

  const optionsRoot = doc.querySelector('.ensemble-options');
  const wrongButton = optionsRoot.children.find((button) => button.dataset.choice !== 'String Quartet');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'String Quartet');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = await bootEnsembleRecognition('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'ENS001' }));
});
