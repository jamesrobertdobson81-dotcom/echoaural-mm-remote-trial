'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..', '..');
const context = { path, fs, vm, projectRoot, getAudioDurationSeconds: () => 10 };

const adapterFactories = [
  require('../../modules/cadence-coach/teacher-adapter'),
  require('../../modules/meter-master/teacher-adapter'),
  require('../../modules/musical-language/teacher-adapter'),
  require('../../modules/ensemble-recognition/teacher-adapter'),
  require('../../modules/harmony-explorer/key-signature-sprint/teacher-adapter')
];

test('Melody Master classroom adapter exposes the complete Devices bank alongside Dictation', () => {
  const createMelodyAdapter = require('../../modules/melody-master/teacher-adapter');
  const adapter = createMelodyAdapter(context);
  const devices = adapter.getQuestions().filter((question) => /^MDV\d+$/.test(question.id));
  const dictation = adapter.getQuestions().filter((question) => /^MM\d+$/.test(question.id));
  assert.ok(dictation.length > 0);
  assert.ok(dictation.every((question) => question.sourceKey === 'melody-master-dictation'));
  assert.equal(devices.length, 104);
  assert.equal(new Set(devices.map((question) => question.id)).size, 104);
  devices.forEach((question) => {
    const prepared = adapter.prepareQuestion(question, { index: 0 });
    assert.equal(prepared.sourceKey, 'melody-master-devices');
    assert.ok(prepared.audio);
    const answer = String(question.responseType || '').toLowerCase().includes('written')
      ? (question.markPoints || []).flatMap((point) => point.acceptedAnswers || []).join(' ')
      : question.correctAnswer;
    const result = adapter.checkAnswer(question, answer);
    assert.equal(result.score, result.total, `${question.id} should accept its model answer`);
  });
});

test('new live adapters expose non-empty stable question banks', () => {
  adapterFactories.forEach((factory) => {
    const adapter = factory(context);
    const questions = adapter.getQuestions();
    assert.ok(questions.length > 0, `${adapter.id} should expose questions`);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, `${adapter.id} IDs should be unique`);
    assert.equal(adapter.mixedCompatible, true);
  });
});

test('new live adapters prepare student-safe questions and score correct answers', () => {
  adapterFactories.forEach((factory) => {
    const adapter = factory(context);
    const question = adapter.getQuestions()[0];
    const prepared = adapter.prepareQuestion(question, { index: 0 });
    assert.equal(prepared.moduleId, adapter.id);
    assert.ok(prepared.prompt);
    assert.ok(['choice', 'text'].includes(prepared.answerType));

    const answer = question.answer
      || question.correct_answer
      || question.correctAnswer
      || (prepared.choices || []).find((choice) => adapter.checkAnswer(question, choice, { activeQuestion: prepared }).correct);
    const result = adapter.checkAnswer(question, answer, { activeQuestion: prepared });
    assert.ok(result.total > 0);
    assert.equal(result.score, result.total, `${adapter.id} should accept its model answer`);
  });
});

test('key-signature choices do not always put the answer first', () => {
  const adapter = adapterFactories[4](context);
  const prepared = adapter.getQuestions().slice(0, 12).map((question, index) => adapter.prepareQuestion(question, { index }));
  const positions = prepared.map((question, index) => question.choices.findIndex((choice) => (
    adapter.checkAnswer(adapter.getQuestions()[index], choice, { activeQuestion: question }).correct
  )));
  assert.ok(new Set(positions).size > 1);
});
