'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ChordIdentifier = require('../chord-identifier-core');
const createAdapter = require('../teacher-adapter');

test('shared seeded generator is stable at every Chord Identifier level', () => {
  ChordIdentifier.LEVELS.forEach((level) => {
    for (let index = 0; index < 32; index += 1) {
      const seed = `round-parity:${level}:${index}`;
      const settings = ChordIdentifier.settingsForLevel(level);
      const first = ChordIdentifier.buildQuestionFromSeed(seed, settings, []);
      const second = ChordIdentifier.buildQuestionFromSeed(seed, settings, []);
      assert.deepEqual(second, first, `${level} seed ${index} should reproduce the complete question`);
      assert.equal(ChordIdentifier.buildChoices(second, seed).length, 4);
      assert.ok(ChordIdentifier.buildChoices(second, seed).includes(ChordIdentifier.modelAnswer(second)));
    }
  });
});

test('shared seededRandom matches classroom/question-set-builder.js exactly', () => {
  const { seededRandom } = require('../../../classroom/question-set-builder');
  ['alpha', 'round:4:CI-securing', '', '🎵'].forEach((seed) => {
    const classroomRandom = seededRandom(seed);
    const chordRandom = ChordIdentifier.seededRandom(seed);
    assert.deepEqual(
      Array.from({ length: 20 }, () => chordRandom()),
      Array.from({ length: 20 }, () => classroomRandom())
    );
  });
});

test('adapter exposes 30 stable procedural tickets per PM level', () => {
  const adapter = createAdapter();
  assert.equal(adapter.id, 'chord-identifier');
  assert.equal(adapter.mixedCompatible, true);
  assert.equal(adapter.getQuestions().length, 120);
  ChordIdentifier.LEVELS.forEach((level) => {
    assert.equal(adapter.getQuestions().filter((question) => question.level === level).length, 30);
  });
  assert.equal(new Set(adapter.getQuestions().map((question) => question.id)).size, 120);
});

test('adapter preparation and scoring reconstruct the same content from the same seed', () => {
  const adapter = createAdapter();
  adapter.getQuestions().filter((_, index) => index % 30 === 0).forEach((question, index) => {
    for (let seedIndex = 0; seedIndex < 24; seedIndex += 1) {
      const seed = `classroom:${question.level}:${seedIndex}`;
      const prepared = adapter.prepareQuestion(question, { index, seed });
      const expected = ChordIdentifier.buildQuestionFromSeed(seed, question.settings, []);
      const modelAnswer = ChordIdentifier.modelAnswer(expected);

      assert.equal(prepared.seed, seed);
      assert.equal(prepared.sourceKey, 'chord-identifier');
      assert.equal(prepared.templateId, question.id);
      assert.equal(prepared.id, ChordIdentifier.questionId(expected));
      assert.equal(prepared.signature, ChordIdentifier.questionId(expected));
      assert.equal(prepared.chordQuestion, undefined);
      assert.deepEqual(prepared.choices, ChordIdentifier.buildChoices(expected, seed));
      assert.ok(prepared.choices.includes(modelAnswer));

      const result = adapter.checkAnswer(question, modelAnswer, { activeQuestion: prepared });
      assert.equal(result.correct, true);
      assert.equal(result.score, prepared.maxMarks);
      assert.equal(result.answerData.generatedQuestionId, prepared.signature);
      assert.equal(adapter.checkAnswer(question, '__wrong__', { activeQuestion: prepared }).correct, false);
    }
  });
});

test('adapter reads the canonical plan seed from a real room-shaped context', () => {
  const adapter = createAdapter();
  const question = adapter.getQuestions()[2];
  const room = {
    code: 'ABCDE',
    roundId: 4,
    questionRunId: 6,
    questionOrderPosition: 1,
    questionOrder: [
      { moduleId: 'other', seed: 'ignore-me' },
      { moduleId: 'chord-identifier', questionId: question.id, seed: 'plan:1:CI-securing' }
    ]
  };
  const prepared = adapter.prepareQuestion(question, { room });
  assert.equal(prepared.seed, 'plan:1:CI-securing');
  const expected = ChordIdentifier.buildQuestionFromSeed(prepared.seed, question.settings, []);
  const result = adapter.checkAnswer(question, ChordIdentifier.modelAnswer(expected), {
    room: { ...room, activeQuestion: prepared },
    activeQuestion: prepared
  });
  assert.equal(result.correct, true);
});
