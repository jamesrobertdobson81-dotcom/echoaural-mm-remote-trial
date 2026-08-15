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

function makeRoom() {
  const manager = new RoomManager({
    adapters: [adapter('texture-trainer', [{ id: 'A1' }, { id: 'A2' }])],
    defaultModuleId: 'texture-trainer'
  });
  const room = manager.createRoom({ moduleId: 'texture-trainer', baseUrl: 'http://localhost:3000' });
  manager.startQuestion(room, 0, { resetQuiz: true, quizLength: 2 });
  manager.joinRoom(room, 'student-1', 'Ada');
  return { manager, room };
}

test('accepts a submission with no questionRunId (legacy client) exactly as before', () => {
  const { manager, room } = makeRoom();
  const submission = manager.submitAnswer(room, 'student-1', { answer: 'Yes' });
  assert.equal(submission.correct, true);
});

test('accepts a submission whose questionRunId matches the room\'s current run', () => {
  const { manager, room } = makeRoom();
  const submission = manager.submitAnswer(room, 'student-1', { answer: 'Yes', questionRunId: room.questionRunId });
  assert.equal(submission.correct, true);
});

test('rejects a submission for a questionRunId that has since moved on', () => {
  const { manager, room } = makeRoom();
  const staleRunId = room.questionRunId;
  manager.startQuestion(room, 0, { advanceQuiz: true });
  assert.notEqual(room.questionRunId, staleRunId);

  assert.throws(
    () => manager.submitAnswer(room, 'student-1', { answer: 'Yes', questionRunId: staleRunId }),
    (error) => error.code === 'STALE_QUESTION'
  );
  // And the room's own state is untouched by the rejected attempt.
  assert.equal(room.submissions.has('student-1'), false);
});

test('rejects a submission for a roundId that has since ended', () => {
  const { manager, room } = makeRoom();
  const staleRoundId = room.roundId;
  manager.prepareNextRound(room);
  manager.startQuestion(room, 0, { resetQuiz: true, quizLength: 1 });
  manager.joinRoom(room, 'student-1', 'Ada');

  assert.throws(
    () => manager.submitAnswer(room, 'student-1', { answer: 'Yes', roundId: staleRoundId }),
    (error) => error.code === 'STALE_QUESTION'
  );
});

test('a valid current-run submission still succeeds after a prior stale attempt was rejected', () => {
  const { manager, room } = makeRoom();
  const staleRunId = room.questionRunId;
  manager.startQuestion(room, 0, { advanceQuiz: true });

  assert.throws(() => manager.submitAnswer(room, 'student-1', { answer: 'Yes', questionRunId: staleRunId }));
  const submission = manager.submitAnswer(room, 'student-1', { answer: 'Yes', questionRunId: room.questionRunId });
  assert.equal(submission.correct, true);
});
