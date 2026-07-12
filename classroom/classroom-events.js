const CLASSROOM_EVENTS = Object.freeze({
  HEALTH: 'classroom:health',
  MODULES: 'classroom:modules',
  ROOM_CREATED: 'classroom:room-created',
  ROOM_UPDATED: 'classroom:room-updated',
  STUDENT_JOINED: 'classroom:student-joined',
  QUESTION_STARTED: 'classroom:question-started',
  PLAYBACK_STARTED: 'classroom:playback-started',
  SUBMISSION_RECEIVED: 'classroom:submission-received',
  SUBMISSIONS_CLOSED: 'classroom:submissions-closed',
  QUIZ_ENDED: 'classroom:quiz-ended',
  SESSION_RESET: 'classroom:session-reset'
});

module.exports = { CLASSROOM_EVENTS };
