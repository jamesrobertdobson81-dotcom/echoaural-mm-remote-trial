'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeDocument, createFakeWindow } = require('../../../shared/tests/helpers/fake-dom');

const root = path.resolve(__dirname, '..', '..', '..');
const readSrc = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const csvText = readSrc('modules/musical-language/data/EA_Musical_Language_v1.csv');
const contractSource = readSrc('shared/js/progress-embed-contract.js');
const scriptSource = readSrc('modules/musical-language/script.js');

function wait() {
  return new Promise((resolve) => setImmediate(resolve));
}

// ScoreDecoder is one script.js/one CSV bank serving 4 separate PM sources
// (musical-language-tempo/dynamics/articulation/ornamentation) — the
// sourceKey in the URL is cosmetic for this app (the contract still just
// carries it through), the real per-source distinction is which
// question_id the host asks for.
async function bootScoreDecoder(search = '?eaProgressHost=1&eaProgressSlot=slot-7&eaProgressSource=musical-language-tempo') {
  const messages = [];
  const doc = createFakeDocument();
  const win = createFakeWindow({
    document: doc,
    location: { search, origin: 'https://echoaural.test' },
    fetch: (url) => {
      if (String(url).includes('EA_Musical_Language_v1.csv')) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(csvText) });
      }
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
  });
  win.parent = search ? { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) } : win;
  doc.defaultView = win;
  vm.createContext(win);
  // script.js looks up its question-prompt element via
  // document.querySelector(".he-question-prompt") against a child the real
  // index.html already contains statically (this harness doesn't parse
  // index.html, only runs script.js) — seed that one static fragment so the
  // app's own element lookups find it exactly like they would in a real
  // page load.
  doc.getElementById('questionText').innerHTML =
    '<span class="ii-question-prompt he-question-prompt"></span><span class="ii-question-marks he-question-marks" id="questionMarks" hidden></span>';
  [contractSource, scriptSource].forEach((source, index) => vm.runInContext(source, win, { filename: `script-${index}.js` }));
  await wait();
  await wait();
  return { win, doc, messages };
}

function lastMessageOfType(messages, type) {
  const matches = messages.filter((entry) => entry.message.type === type);
  return matches.length ? matches[matches.length - 1].message : null;
}

test('ML-TEM-LARGO-F is really the fixed question this test relies on', () => {
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    const source = text.replace(/^﻿/, '');
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += char;
    }
    if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }
  const bank = parseCsv(csvText);
  const question = bank.find((row) => row.question_id === 'ML-TEM-LARGO-F');
  assert.ok(question);
  assert.equal(question.correct_answer, 'broad and very slow');
  assert.equal(question.question_type, 'multiple_choice');
  assert.equal(question.status, 'active');
});

test('registers a question handler through the real contract when embedded as a Live Session host', async () => {
  const { win } = await bootScoreDecoder();
  assert.equal(typeof win.EAProgressEmbed.onQuestion, 'function');
});

test('loading a specific question by id renders exactly that question, not a random draw', async () => {
  const { win, messages } = await bootScoreDecoder();
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-LARGO-F' });

  const questionReady = lastMessageOfType(messages, 'question-ready');
  assert.ok(questionReady, 'expected a question-ready message after loading ML-TEM-LARGO-F');
  assert.equal(questionReady.payload.id, 'ML-TEM-LARGO-F');
  assert.equal(questionReady.slotId, 'slot-7');
});

test('a second teacher-load-question call swaps the question without re-running round setup', async () => {
  const { win, messages } = await bootScoreDecoder();
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-LARGO-F' });
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-ADAGIO-D' });

  const readyMessages = messages.filter((entry) => entry.message.type === 'question-ready');
  assert.equal(readyMessages.length, 2);
  assert.equal(readyMessages[0].message.payload.id, 'ML-TEM-LARGO-F');
  assert.equal(readyMessages[1].message.payload.id, 'ML-TEM-ADAGIO-D');
});

test('unknown question id reports pool-empty instead of silently falling back to a random question', async () => {
  const { win, messages } = await bootScoreDecoder();
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-DOES-NOT-EXIST' });
  const poolEmpty = lastMessageOfType(messages, 'pool-empty');
  assert.ok(poolEmpty);
  assert.equal(poolEmpty.payload.questionId, 'ML-DOES-NOT-EXIST');
  assert.equal(lastMessageOfType(messages, 'question-ready'), null);
});

test('answering a host-selected multiple-choice question reports the full result envelope through the bridge', async () => {
  const { win, doc, messages } = await bootScoreDecoder();
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-LARGO-F' });

  const answersDiv = doc.getElementById('answers');
  assert.ok(answersDiv.children.length > 0, 'expected rendered MC choice buttons');
  const correctButton = answersDiv.children.find((button) => button.dataset.answer === 'broad and very slow');
  assert.ok(correctButton, 'expected a "broad and very slow" choice among the rendered options for ML-TEM-LARGO-F');

  correctButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.ok(answerComplete);
  assert.equal(answerComplete.questionId, 'ML-TEM-LARGO-F');
  assert.equal(answerComplete.payload.correct, true);
  assert.equal(answerComplete.payload.score, 1);
  assert.equal(answerComplete.payload.maximumScore, 1);
  assert.equal(answerComplete.payload.responseType, 'multiple-choice');
  assert.equal(answerComplete.payload.answerData, 'broad and very slow');
  assert.equal(answerComplete.payload.modelAnswer, 'broad and very slow');
  assert.ok(answerComplete.payload.feedback.length > 0);
});

test('an incorrect answer still reports a complete, honest result envelope', async () => {
  const { win, doc, messages } = await bootScoreDecoder();
  win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-LARGO-F' });

  const answersDiv = doc.getElementById('answers');
  const wrongButton = answersDiv.children.find((button) => button.dataset.answer !== 'broad and very slow');
  assert.ok(wrongButton);
  wrongButton.click();

  const answerComplete = lastMessageOfType(messages, 'answer-complete');
  assert.equal(answerComplete.payload.correct, false);
  assert.equal(answerComplete.payload.score, 0);
  assert.equal(answerComplete.payload.modelAnswer, 'broad and very slow');
});

test('standalone Progress Mode / normal use is unaffected: contract disabled, no side effects fire', async () => {
  const { win } = await bootScoreDecoder('');
  assert.equal(win.EAProgressEmbed.enabled, false);
  assert.doesNotThrow(() => win.EAProgressEmbed.onQuestion({ questionId: 'ML-TEM-LARGO-F' }));
});
