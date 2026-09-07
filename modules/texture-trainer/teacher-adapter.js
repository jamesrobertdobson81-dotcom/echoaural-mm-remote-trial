(function initTextureTrainerTeacherAdapter(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    root.EchoAuralTeacherAdapters = root.EchoAuralTeacherAdapters || {};
    root.EchoAuralTeacherAdapters['texture-trainer'] = factory({ browserGlobal: root });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTextureTrainerAdapter(context = {}) {
  const path = context.path || (typeof require === 'function' ? require('path') : null);
  const fs = context.fs || (typeof require === 'function' ? require('fs') : null);
  const vm = context.vm || (typeof require === 'function' ? require('vm') : null);
  const projectRoot = context.projectRoot || (path ? path.resolve(__dirname, '..', '..') : '');
  const moduleDir = path ? path.join(projectRoot, 'modules', 'texture-trainer') : '';
  const dataPath = path ? path.join(moduleDir, 'data', 'texture-questions.js') : '';
  const getAudioDurationSeconds = typeof context.getAudioDurationSeconds === 'function' ? context.getAudioDurationSeconds : () => 10;
  const questionSystem = context.questionSystem || (typeof require === 'function' && path
    ? require(path.join(moduleDir, 'texture-question-system.js'))
    : context.browserGlobal?.EchoAuralTextureQuestionSystem);
  let cachedQuestions = null;

  function fallbackQuestions() {
    return [{
      id: 'TT001',
      title: 'Monophonic Texture — Solo Flute',
      audio: '../instrument-identifier/audio/II201.mp3',
      prompt: 'Name the texture.',
      maxMarks: 1,
      acceptedAnswers: ['monophonic', 'single melodic line', 'one melody'],
      partialAnswers: ['one instrument', 'solo flute'],
      modelAnswer: 'The texture is monophonic because the solo flute plays a single unaccompanied melodic line.',
      feedbackCorrect: 'Correct. This is monophonic: one melodic line with no accompaniment.',
      feedbackPartial: 'Good. The precise GCSE term is monophonic.',
      feedbackIncorrect: 'Not quite. The texture is monophonic.'
    }];
  }

  function loadQuestions() {
    if (cachedQuestions) return cachedQuestions;
    if (context.browserGlobal) {
      const rawQuestions = Array.isArray(context.browserGlobal.textureQuestions) ? context.browserGlobal.textureQuestions.slice() : fallbackQuestions();
      cachedQuestions = rawQuestions.map((question, index) => questionSystem.normaliseQuestion(question, index));
      return cachedQuestions;
    }

    try {
      const source = fs.readFileSync(dataPath, 'utf8');
      const sandbox = { window: {} };
      vm.runInNewContext(source, sandbox, { filename: dataPath, timeout: 1000 });
      const questions = sandbox.window.textureQuestions;
      if (!Array.isArray(questions) || !questions.length) throw new Error('No window.textureQuestions array found.');
      cachedQuestions = questions.map((question, index) => questionSystem.normaliseQuestion(question, index));
    } catch (error) {
      console.error('[Texture Trainer adapter] Could not load texture-questions.js:', error.message);
      cachedQuestions = fallbackQuestions().map((question, index) => questionSystem.normaliseQuestion(question, index));
    }
    return cachedQuestions;
  }

  function normalise(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-–—]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function phraseToTokens(value) {
    return normalise(value).split(' ').filter(Boolean);
  }

  function findPhraseOccurrence(answer, phrase) {
    const normalisedAnswer = ` ${normalise(answer)} `;
    const normalisedPhrase = normalise(phrase);
    if (!normalisedPhrase || !normalisedAnswer.includes(` ${normalisedPhrase} `)) return null;

    const tokens = phraseToTokens(answer);
    const phraseTokens = phraseToTokens(phrase);
    const phraseLength = phraseTokens.length;

    for (let index = 0; index <= tokens.length - phraseLength; index += 1) {
      const segment = tokens.slice(index, index + phraseLength).join(' ');
      if (segment !== normalisedPhrase) continue;

      const previousTwo = tokens.slice(Math.max(0, index - 2), index);
      if (previousTwo.includes('not') || previousTwo.includes('no') || previousTwo.includes('isnt') || previousTwo.includes('isn')) continue;
      return { phrase, start: index, end: index + phraseLength };
    }

    return null;
  }

  function containsPhrase(answer, phrase) {
    return Boolean(findPhraseOccurrence(answer, phrase));
  }

  function findMatchingPhrase(answer, phrases = []) {
    return phrases.find((phrase) => containsPhrase(answer, phrase)) || '';
  }

  function phraseSpansOverlap(firstMatch, secondMatch) {
    return firstMatch.start < secondMatch.end && secondMatch.start < firstMatch.end;
  }

  function findUnusedMatchingPhrase(answer, phrases = [], usedMatches = []) {
    const matches = phrases
      .map((phrase) => findPhraseOccurrence(answer, phrase))
      .filter(Boolean);
    const match = matches.find((candidate) => !usedMatches.some((usedMatch) => phraseSpansOverlap(candidate, usedMatch)));
    if (match) usedMatches.push(match);
    return match ? match.phrase : '';
  }

  function checkMarkPoints(question = {}, studentAnswer = '') {
    const maxMarks = Number(question.maxMarks || 1);
    const usedMatches = [];
    const pointResults = [];
    let score = 0;

    question.markPoints.forEach((markPoint) => {
      const acceptedMatch = findUnusedMatchingPhrase(studentAnswer, markPoint.acceptedAnswers, usedMatches);
      if (acceptedMatch) {
        score += 1;
        pointResults.push({ label: markPoint.label || 'Mark point', status: 'correct', matchedPhrase: acceptedMatch });
        return;
      }

      const partialMatch = findUnusedMatchingPhrase(studentAnswer, markPoint.partialAnswers, usedMatches);
      if (partialMatch) {
        score += 0.5;
        pointResults.push({ label: markPoint.label || 'Mark point', status: 'partial', matchedPhrase: partialMatch });
        return;
      }

      pointResults.push({ label: markPoint.label || 'Mark point', status: 'missed', matchedPhrase: '' });
    });

    const cappedScore = Math.min(maxMarks, score);
    const correct = cappedScore >= maxMarks;
    const partial = !correct && cappedScore > 0;
    const feedback = correct
      ? (question.feedbackCorrect || 'Correct.')
      : partial
        ? (question.feedbackPartial || 'Good idea, but use the precise GCSE vocabulary.')
        : (question.feedbackIncorrect || `Not quite. ${question.modelAnswer || ''}`.trim());

    return {
      score: cappedScore,
      total: maxMarks,
      correct,
      matchType: correct ? 'correct' : partial ? 'partial' : 'incorrect',
      feedback,
      shortComment: feedback,
      modelAnswer: question.modelAnswer || '',
      answerData: { pointResults }
    };
  }

  function prepareQuestion(question = {}, options = {}) {
    const index = Number(options.index || 0);
    const normalisedQuestion = question.responseType ? question : questionSystem.normaliseQuestion(question, index);
    const rawAudioPath = question.sourceAudioPath || question.audio || '';
    const audioPath = /^(https?:)?\/\//i.test(rawAudioPath) || String(rawAudioPath).startsWith('/')
      ? rawAudioPath
      : `/modules/texture-trainer/${String(rawAudioPath).replace(/^\//, '')}`;
    const fullAudioPath = path && audioPath && !/^(https?:)?\/\//i.test(audioPath) && !audioPath.startsWith('/')
      ? path.join(moduleDir, audioPath)
      : path && audioPath.startsWith('/') ? path.join(projectRoot, audioPath) : audioPath;

    return {
      moduleId: 'texture-trainer',
      moduleTitle: 'Texture Trainer',
      level: questionSystem.getQuestionLevel(normalisedQuestion),
      answerType: normalisedQuestion.responseType === 'multiple-choice' ? 'choice' : 'text',
      responseType: normalisedQuestion.responseType,
      choices: Array.isArray(normalisedQuestion.answerChoices) ? normalisedQuestion.answerChoices : [],
      index,
      id: normalisedQuestion.id || `TT${String(index + 1).padStart(3, '0')}`,
      title: normalisedQuestion.title || normalisedQuestion.id || `Question ${index + 1}`,
      question: normalisedQuestion.prompt || 'Describe the texture.',
      prompt: normalisedQuestion.prompt || 'Describe the texture.',
      audio: audioPath,
      audioDurationSeconds: Number(normalisedQuestion.audioDurationSeconds || getAudioDurationSeconds(fullAudioPath) || 10),
      clipStart: Number(normalisedQuestion.clipStart || 0),
      clipEnd: Number(normalisedQuestion.clipEnd || normalisedQuestion.audioDurationSeconds || 0),
      clipDuration: Number(normalisedQuestion.clipDuration || normalisedQuestion.audioDurationSeconds || 0),
      composer: normalisedQuestion.composer || '',
      work: normalisedQuestion.work || '',
      textureFocus: normalisedQuestion.textureFocus || normalisedQuestion.broadTextureCategory || '',
      correctAnswer: normalisedQuestion.correctChoice || normalisedQuestion.preferredAnswer || '',
      modelAnswer: normalisedQuestion.modelAnswer || normalisedQuestion.preferredAnswer || '',
      preferredAnswer: normalisedQuestion.preferredAnswer || '',
      untimedTeacherLed: normalisedQuestion.responseType === 'extended-text',
      maxMarks: Number(normalisedQuestion.maxMarks || 1),
      totalNotes: Number(normalisedQuestion.maxMarks || 1)
    };
  }

  function checkAnswer(question = {}, studentAnswer = '') {
    const normalisedQuestion = question.responseType ? question : questionSystem.normaliseQuestion(question);
    const result = questionSystem.markAnswer(normalisedQuestion, studentAnswer);

    return {
      score: result.marksAwarded,
      total: result.maxMarks,
      correct: result.status === 'correct',
      matchType: result.status,
      feedback: result.feedback,
      shortComment: result.feedback,
      modelAnswer: normalisedQuestion.modelAnswer || normalisedQuestion.preferredAnswer || '',
      answerData: {
        pointResults: result.pointResults || [],
        preferredAnswer: normalisedQuestion.preferredAnswer || '',
        responseType: normalisedQuestion.responseType || '',
        missingConcepts: result.missingConcepts || []
      }
    };
  }

  return {
    id: 'texture-trainer',
    title: 'Texture Trainer',
    description: 'Students answer progressive Texture Trainer questions with multiple choice, terminology and short descriptions.',
    studentMode: 'generic',
    getQuestions: loadQuestions,
    prepareQuestion,
    checkAnswer
  };
});
