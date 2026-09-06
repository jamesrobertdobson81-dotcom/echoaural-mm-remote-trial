'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const projectRoot = path.resolve(__dirname, '..', '..');

test('Ensemble Recognition Live Sessions expose the complete PM question pool without filesystem filtering', () => {
  const bank = require('../../modules/ensemble-recognition/data/ensemble-questions.json').questions;
  const createAdapter = require('../../modules/ensemble-recognition/teacher-adapter');
  // A deliberately hostile existsSync proves catalogue membership is data-
  // driven. A missing asset should fail the separate content audit loudly,
  // never disappear invisibly from one mode only.
  const adapter = createAdapter({ path, projectRoot, fs: { existsSync: () => false } });
  assert.equal(bank.length, 66);
  assert.equal(adapter.getQuestions().length, bank.length);
  assert.deepEqual(adapter.getQuestions().map((question) => question.id), bank.map((question) => question.id));
});

test('ScoreDecoder Live Sessions expose exactly the same active-only rows as the PM app', () => {
  const createAdapter = require('../../modules/musical-language/teacher-adapter');
  const rows = createAdapter.parseCsv(fs.readFileSync(path.join(
    projectRoot, 'modules', 'musical-language', 'data', 'EA_Musical_Language_v1.csv'
  ), 'utf8'));
  const pmIds = rows.filter((question) => question.status === 'active').map((question) => question.question_id);
  const adapterIds = createAdapter({ path, fs, projectRoot }).getQuestions().map((question) => question.id);

  assert.equal(pmIds.length, 107);
  assert.equal(adapterIds.length, 107);
  assert.deepEqual(adapterIds, pmIds);
});
