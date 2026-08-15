'use strict';

// Regression coverage for a real, verified content gap: Meter Master's
// classroom teacher-adapter used to silently drop every typed-response
// question (numeric/written/time-signature-entry rows correctly have an
// empty `options` array, but the adapter's own filter required a non-empty
// one) and one multiple-choice question whose audio_path borrows another
// module's clip with a "../"-relative convention the adapter resolved
// against the wrong base directory. Both meant those questions were fully
// available in Progress Mode (which reads the same data file directly) but
// invisible to every Live Session — see shared/js/pm-registry.js's own
// PM/LS parity story. Fixed in modules/meter-master/teacher-adapter.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..', '..');
const createMeterMasterAdapter = require('../../modules/meter-master/teacher-adapter');
const rawData = require('../../modules/meter-master/data/meter-master-exam-style-60.json');

function makeAdapter() {
  return createMeterMasterAdapter({ path, fs, projectRoot });
}

test('every question in the data file is now available to Live Sessions — none silently dropped', () => {
  const adapter = makeAdapter();
  const questions = adapter.getQuestions();
  assert.equal(questions.length, rawData.questions.length, 'expected the full 83-question bank, not a filtered subset');
});

test('MMX061 (a multiple-choice question that borrows a texture-trainer clip via a "../"-relative audio_path) is included and resolves to a real, servable audio URL', () => {
  const adapter = makeAdapter();
  const raw = adapter.getQuestions().find((question) => question.id === 'MMX061');
  assert.ok(raw, 'MMX061 should not be excluded');

  const prepared = adapter.prepareQuestion(raw, { index: 0 });
  assert.equal(prepared.audio, '/modules/texture-trainer/audio/TT097.mp3');
  assert.ok(fs.existsSync(path.join(projectRoot, prepared.audio)), 'the resolved audio URL should point at a real file on disk');
});

test('a normal repo-root-relative audio_path still resolves exactly as before', () => {
  const adapter = makeAdapter();
  const raw = adapter.getQuestions().find((question) => question.id === 'MMX007');
  const prepared = adapter.prepareQuestion(raw, { index: 0 });
  assert.equal(prepared.audio, '/modules/meter-master/audio/MTR007.mp3');
});

test('a numeric-response question (MMX007) is prepared as a typed answer, not an empty choice grid', () => {
  const adapter = makeAdapter();
  const raw = adapter.getQuestions().find((question) => question.id === 'MMX007');
  const prepared = adapter.prepareQuestion(raw, { index: 0 });
  assert.equal(prepared.answerType, 'text');
  assert.equal(prepared.responseType, 'typed');
  assert.deepEqual(prepared.choices, []);

  const result = adapter.checkAnswer(raw, '2');
  assert.equal(result.correct, true);
  assert.equal(result.score, result.total);
});

test('a written-time-signature question (MMX031) is prepared as typed and scores its accepted answers', () => {
  const adapter = makeAdapter();
  const raw = adapter.getQuestions().find((question) => question.id === 'MMX031');
  const prepared = adapter.prepareQuestion(raw, { index: 0 });
  assert.equal(prepared.answerType, 'text');
  assert.equal(prepared.responseType, 'typed');

  assert.equal(adapter.checkAnswer(raw, '3/4').correct, true);
  assert.equal(adapter.checkAnswer(raw, 'three-four').correct, true);
  assert.equal(adapter.checkAnswer(raw, '4/4').correct, false);
});

test('multiple-choice questions are unaffected: still prepared as a choice with real options', () => {
  const adapter = makeAdapter();
  const raw = adapter.getQuestions().find((question) => question.app_control === 'radio');
  assert.ok(raw);
  const prepared = adapter.prepareQuestion(raw, { index: 0 });
  assert.equal(prepared.answerType, 'choice');
  assert.equal(prepared.responseType, 'multiple-choice');
  assert.ok(prepared.choices.length > 0);
});
