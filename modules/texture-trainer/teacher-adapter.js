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
      cachedQuestions = Array.isArray(context.browserGlobal.textureQuestions) ? context.browserGlobal.textureQuestions.slice() : fallbackQuestions();
      return cachedQuestions;
    }

    try {
      const source = fs.readFileSync(dataPath, 'utf8');
      const sandbox = { window: {} };
      vm.runInNewContext(source, sandbox, { filename: dataPath, timeout: 1000 });
      const questions = sandbox.window.textureQuestions;
      if (!Array.isArray(questions) || !questions.length) throw new Error('No window.textureQuestions array found.');
      cachedQuestions = questions.slice();
    } catch (error) {
      console.error('[Texture Trainer adapter] Could not load texture-questions.js:', error.message);
      cachedQuestions = fallbackQuestions();
    }
    return cachedQuestions;
  }

  function normalise(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function containsAny(answer, list = []) {
    const clean = normalise(answer);
    return list.some((item) => {
      const target = normalise(item);
      return target && (clean === target || clean.includes(target));
    });
  }

  function prepareQuestion(question = {}, options = {}) {
    const index = Number(options.index || 0);
    const audioPath = question.sourceAudioPath
      ? `/${String(question.sourceAudioPath).replace(/^\//, '')}`
      : question.audio || '';
    const fullAudioPath = path && audioPath && !/^(https?:)?\/\//i.test(audioPath) && !audioPath.startsWith('/')
      ? path.join(moduleDir, audioPath)
      : path && audioPath.startsWith('/') ? path.join(projectRoot, audioPath) : audioPath;

    return {
      moduleId: 'texture-trainer',
      moduleTitle: 'Texture Trainer',
      answerType: 'text',
      index,
      id: question.id || `TT${String(index + 1).padStart(3, '0')}`,
      title: question.title || question.id || `Question ${index + 1}`,
      question: question.prompt || 'Describe the texture.',
      prompt: question.prompt || 'Describe the texture.',
      audio: audioPath,
      audioDurationSeconds: Number(question.audioDurationSeconds || getAudioDurationSeconds(fullAudioPath) || 10),
      composer: question.composer || '',
      work: question.work || '',
      textureFocus: question.textureFocus || '',
      maxMarks: Number(question.maxMarks || 1),
      totalNotes: Number(question.maxMarks || 1)
    };
  }

  function checkAnswer(question = {}, studentAnswer = '') {
    const maxMarks = Number(question.maxMarks || 1);
    const correct = containsAny(studentAnswer, question.acceptedAnswers || []);
    const partial = !correct && containsAny(studentAnswer, question.partialAnswers || []);
    const score = correct ? maxMarks : partial ? Math.max(1, Math.floor(maxMarks / 2)) : 0;
    const feedback = correct
      ? (question.feedbackCorrect || 'Correct.')
      : partial
        ? (question.feedbackPartial || 'Good idea, but use the precise GCSE vocabulary.')
        : (question.feedbackIncorrect || `Not quite. ${question.modelAnswer || ''}`.trim());

    return {
      score,
      total: maxMarks,
      correct,
      matchType: correct ? 'correct' : partial ? 'partial' : 'incorrect',
      feedback,
      shortComment: feedback,
      modelAnswer: question.modelAnswer || ''
    };
  }

  return {
    id: 'texture-trainer',
    title: 'Texture Trainer',
    description: 'Students type GCSE texture vocabulary answers and receive deterministic marking.',
    studentMode: 'generic-text',
    getQuestions: loadQuestions,
    prepareQuestion,
    checkAnswer
  };
});
