'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const meterQuestionsJson = JSON.parse(readSrc('modules/meter-master/data/meter-master-exam-style-60.json'));

const SCRIPTS = [
  'shared/js/progression-store.js', 'shared/js/question-prompt-marks.js', 'shared/js/spaced-repetition.js',
  'account/tracking.js', 'shared/js/progress-embed-contract.js', 'modules/meter-master/script.js'
].map((relative) => readSrc(relative));

function wait() {
  // Lets the fetch()/json()/await chain inside meter-master's own init()
  // actually resolve — matches a real Live Session host waiting for the
  // app to signal it's ready (app-ready) before ever sending
  // teacher-load-question, rather than racing it.
  return new Promise((resolve) => setImmediate(resolve));
}

async function bootMeterMaster(search = '?eaProgressHost=1&eaProgressSlot=slot-5&eaProgressSource=meter-master') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: (url) => {
      if (String(url).includes('meter-master-exam-style-60.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(meterQuestionsJson) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  SCRIPTS.forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  await wait();
  await wait();
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('MMX001 is really the fixed first Foundation question this test relies on', () => {
  const first = meterQuestionsJson.questions.find((question) => question.id === 'MMX001');
  assert.ok(first);
  assert.equal(first.correct_answer, 'simple');
  assert.deepEqual(first.options, ['Simple', 'Compound']);
});

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = await bootMeterMaster();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', async () => {
  const { win, messages } = await bootMeterMaster();
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX001' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading MMX001');
  assert.equal(questionReady.payload.id, 'MMX001');
  assert.equal(questionReady.slotId, 'slot-5');
});

test('a second teacher-load-question call swaps the question without re-running round setup', async () => {
  const { win, messages } = await bootMeterMaster();
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX001' });
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX002' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'MMX001');
  assert.equal(readyMessages[1].message.payload.id, 'MMX002');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', async () => {
  const { win, messages } = await bootMeterMaster();
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'MMX-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected question (via delegated click handling) reports the full result envelope', async () => {
  const { win, doc, messages } = await bootMeterMaster();
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX001' });

  const choiceGrid = doc.getElementById('choiceGrid');
  assert.ok(choiceGrid.children.length > 0, 'expected rendered MC choice buttons');
  const correctButton = choiceGrid.children.find((button) => button.dataset.choice === 'Simple');
  assert.ok(correctButton, 'expected a Simple choice among the rendered options for MMX001');

  // meter-master listens on the container and reads event.target.closest(),
  // not a per-button listener — click() must bubble for this to do anything.
  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete, 'expected an answer-complete message after clicking a delegated choice button');
  assert.equal(answerComplete.questionId, 'MMX001');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'Simple');
  assert.equal(answerComplete.payload.modelAnswer, 'Simple');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', async () => {
  const { win, doc, messages } = await bootMeterMaster();
  win.EAProgressEmbed.onQuestion({ questionId: 'MMX001' });

  const choiceGrid = doc.getElementById('choiceGrid');
  const wrongButton = choiceGrid.children.find((button) => button.dataset.choice !== 'Simple');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'Simple');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = await bootMeterMaster('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'MMX001' }));
});
