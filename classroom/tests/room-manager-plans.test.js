'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../room-manager');

function adapter(id, questions, options = {}) {
  return {
    id,
    title: options.title || id,
    studentMode: 'generic',
    mixedCompatible: options.mixedCompatible !== false,
    getQuestions: () => questions,
    prepareQuestion: (question, context) => ({
      moduleId: id,
      moduleTitle: options.title || id,
      id: question.id,
      index: context.index,
      answerType: 'choice',
      choices: ['Yes', 'No'],
      maxMarks: 1
    }),
    checkAnswer: () => ({ score: 1, total: 1, correct: true })
  };
}

const manager = new RoomManager({
  adapters: [
    adapter('instrument-identifier', [{ id: 'A1' }, { id: 'A2' }]),
    adapter('melodic-intervals', [{ id: 'B1' }, { id: 'B2' }]),
    adapter('texture-trainer', [{ id: 'C1' }, { id: 'C2' }])
  ],
  defaultModuleId: 'instrument-identifier'
});

test('preserves the legacy default mixed sources', () => {
  assert.deepEqual(manager.normaliseMixedModuleIds(), ['instrument-identifier', 'melodic-intervals']);
});

test('accepts newly declared mixed-compatible adapters when explicitly selected', () => {
  assert.deepEqual(
    manager.normaliseMixedModuleIds(['texture-trainer', 'instrument-identifier']),
    ['texture-trainer', 'instrument-identifier']
  );
});

test('runs a deterministic planned queue by stable question ID', () => {
  const room = manager.createRoom({
    moduleId: 'mixed',
    mixedModuleIds: ['melodic-intervals', 'texture-trainer'],
    baseUrl: 'http://localhost:3000'
  });
  manager.setQuestionSet(room, {
    spec: { version: 1, purpose: 'starter', strategy: 'teacher-picked', maxListens: 3 },
    preview: { questionCount: 2, modules: { 'Texture Trainer': 1, 'Instrument Identifier': 1 } },
    questionPlan: [
      { moduleId: 'texture-trainer', questionId: 'C2', questionIndex: 0 },
      { moduleId: 'melodic-intervals', questionId: 'B2', questionIndex: 0 }
    ]
  });

  const first = manager.startQuestion(room, 0, { resetQuiz: true, quizLength: 5, maxListens: 3 });
  assert.equal(first.id, 'C2');
  assert.equal(room.questionIndex, 1);
  const second = manager.startQuestion(room, 0, { advanceQuiz: true });
  assert.equal(second.id, 'B2');
  assert.equal(room.questionIndex, 1);
  assert.equal(room.maxListens, 3);
  assert.equal(room.quizTotal, 2);
});

test('setQuestionSet carries the per-question seed through onto room.questionPlan, needed by seed-mode PM sources', () => {
  const room = manager.createRoom({
    moduleId: 'mixed',
    mixedModuleIds: ['texture-trainer'],
    baseUrl: 'http://localhost:3000'
  });
  manager.setQuestionSet(room, {
    spec: { version: 1, purpose: 'starter', strategy: 'teacher-picked', maxListens: 3 },
    preview: { questionCount: 1 },
    questionPlan: [
      { moduleId: 'texture-trainer', questionId: 'C2', questionIndex: 0, seed: 'round-9:0:C2' }
    ]
  });
  assert.equal(room.questionPlan[0].seed, 'round-9:0:C2');
});

test('setQuestionSet defaults a missing seed to an empty string rather than throwing', () => {
  const room = manager.createRoom({
    moduleId: 'mixed',
    mixedModuleIds: ['texture-trainer'],
    baseUrl: 'http://localhost:3000'
  });
  manager.setQuestionSet(room, {
    spec: { version: 1, purpose: 'starter', strategy: 'teacher-picked', maxListens: 3 },
    preview: { questionCount: 1 },
    questionPlan: [{ moduleId: 'texture-trainer', questionId: 'C2', questionIndex: 0 }]
  });
  assert.equal(room.questionPlan[0].seed, '');
});

test('startQuestion carries the plan seed through onto room.activeQuestion, needed by a Live Session host driving seed-mode PM sources', () => {
  const room = manager.createRoom({
    moduleId: 'mixed',
    mixedModuleIds: ['texture-trainer', 'melodic-intervals'],
    baseUrl: 'http://localhost:3000'
  });
  manager.setQuestionSet(room, {
    spec: { version: 1, purpose: 'starter', strategy: 'teacher-picked', maxListens: 3 },
    preview: { questionCount: 2 },
    questionPlan: [
      { moduleId: 'texture-trainer', questionId: 'C2', questionIndex: 0, seed: 'round-9:0:C2' },
      { moduleId: 'melodic-intervals', questionId: 'B2', questionIndex: 0, seed: 'round-9:1:B2' }
    ]
  });

  const first = manager.startQuestion(room, 0, { resetQuiz: true, quizLength: 2, maxListens: 3 });
  assert.equal(first.seed, 'round-9:0:C2');
  const second = manager.startQuestion(room, 0, { advanceQuiz: true });
  assert.equal(second.seed, 'round-9:1:B2');
});

test('startQuestion defaults activeQuestion.seed to an empty string when the plan entry has none (and outside any plan at all)', () => {
  const room = manager.createRoom({
    moduleId: 'mixed',
    mixedModuleIds: ['texture-trainer'],
    baseUrl: 'http://localhost:3000'
  });
  const question = manager.startQuestion(room, { moduleId: 'texture-trainer', questionIndex: 0 }, { resetQuiz: true, quizLength: 1 });
  assert.equal(question.seed, '');
});
