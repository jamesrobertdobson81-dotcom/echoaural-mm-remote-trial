(function initMelodicIntervalsTeacherAdapter(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    root.EchoAuralTeacherAdapters = root.EchoAuralTeacherAdapters || {};
    root.EchoAuralTeacherAdapters['melodic-intervals'] = factory({ browserGlobal: root });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMelodicIntervalsAdapter(context = {}) {
  const path = context.path || (typeof require === 'function' ? require('path') : null);
  const projectRoot = context.projectRoot || (path ? path.resolve(__dirname, '..', '..') : '');
  const moduleDir = path ? path.join(projectRoot, 'modules', 'melodic-intervals') : '';
  let intervalData = null;
  let cachedQuestions = null;

  function getIntervalData() {
    if (intervalData) return intervalData;
    if (context.browserGlobal && context.browserGlobal.EchoAuralMelodicIntervals) {
      intervalData = context.browserGlobal.EchoAuralMelodicIntervals;
      return intervalData;
    }
    if (typeof require === 'function' && path) {
      intervalData = require(path.join(moduleDir, 'interval-data.js'));
      return intervalData;
    }
    throw new Error('Melodic Intervals data layer is unavailable.');
  }

  function loadQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const data = getIntervalData();
    cachedQuestions = data.buildQuestions({ level: 'all' }).map((question) => ({ ...question, mode: 'recognition' }));
    return cachedQuestions;
  }

  function shuffleArray(items = []) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function buildChoices(question = {}) {
    const data = getIntervalData();
    const correct = question.correctAnswer || (question.answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel);
    const pool = data.buildChoices({
      level: question.levelKey || question.level,
      answerMode: question.answerMode,
      includeOctave: question.intervalLabel === 'Octave'
    });
    return data.buildMcChoices({
      correctAnswer: correct,
      answerMode: question.answerMode,
      pool
    });
  }

  function prepareQuestion(question = {}, options = {}) {
    const index = Number(options.index || 0);
    const inputMode = question.inputMode || 'choice';
    const isWritten = inputMode === 'written';
    const choices = isWritten ? [] : buildChoices(question);
    return {
      moduleId: 'melodic-intervals',
      moduleTitle: 'Melodic Intervals',
      answerType: isWritten ? 'text' : 'choice',
      index,
      id: question.id || `MI${String(index + 1).padStart(3, '0')}`,
      title: 'Melodic Interval',
      question: 'Listen to the two piano notes and identify the interval.',
      prompt: 'Listen to the two piano notes and identify the interval.',
      clef: question.clef || 'treble',
      direction: question.direction || 'ascending',
      startNoteId: question.startNoteId,
      targetNoteId: question.targetNoteId,
      startNoteLabel: question.startNoteLabel,
      targetNoteLabel: question.targetNoteLabel,
      keySignatureLabel: question.keySignatureLabel,
      keySignatureId: question.keySignatureId,
      keySignatureAccidentals: question.keySignatureAccidentals,
      staffAsset: question.staffAsset,
      intervalLabel: question.intervalLabel,
      intervalFullLabel: question.intervalFullLabel,
      intervalQuality: question.intervalQuality,
      intervalId: question.intervalId,
      answerMode: question.answerMode || 'number',
      inputMode,
      correctAnswer: question.correctAnswer || (question.answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel),
      level: question.level || '',
      levelKey: question.levelKey || '',
      levelIndex: question.levelIndex,
      chromatic: Boolean(question.chromatic),
      hasAccidentals: Boolean(question.hasAccidentals),
      semitoneDistance: question.semitoneDistance,
      audio: question.startAudio || (Array.isArray(question.audioSequence) ? question.audioSequence[0] : ''),
      audioSequence: Array.isArray(question.audioSequence) ? question.audioSequence.slice() : [question.startAudio, question.targetAudio].filter(Boolean),
      sequenceGapMs: Number(question.sequenceGapMs || 280),
      audioDurationSeconds: Number(question.audioDurationSeconds || 2.4),
      choices,
      maxMarks: 1,
      totalNotes: 1
    };
  }

  function checkAnswer(question = {}, studentAnswer = '', contextPayload = {}) {
    const data = getIntervalData();
    const activeQuestion = contextPayload.activeQuestion || {};
    const correct = question.correctAnswer || activeQuestion.correctAnswer || question.intervalFullLabel || question.intervalLabel || activeQuestion.intervalLabel || question.answer || '';
    const isCorrect = data.sameInterval(studentAnswer, correct);
    return {
      score: isCorrect ? 1 : 0,
      total: 1,
      correct: isCorrect,
      matchType: isCorrect ? 'correct' : 'incorrect',
      feedback: isCorrect
        ? `Correct — this was a ${correct}.`
        : `Not quite. The answer was ${correct}.`,
      shortComment: isCorrect ? 'Correct interval.' : `Answer: ${correct}`,
      modelAnswer: correct
    };
  }

  return {
    id: 'melodic-intervals',
    title: 'Melodic Intervals',
    description: 'Generated piano-note interval recognition using the new sample bank.',
    studentMode: 'melodic-intervals',
    getQuestions: loadQuestions,
    prepareQuestion,
    checkAnswer
  };
});
