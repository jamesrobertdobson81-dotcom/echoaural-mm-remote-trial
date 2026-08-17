(function initInstrumentIdentifierTeacherAdapter(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    root.EchoAuralTeacherAdapters = root.EchoAuralTeacherAdapters || {};
    root.EchoAuralTeacherAdapters['instrument-identifier'] = factory({ browserGlobal: root });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createInstrumentIdentifierAdapter(context = {}) {
  const path = context.path || (typeof require === 'function' ? require('path') : null);
  const fs = context.fs || (typeof require === 'function' ? require('fs') : null);
  const vm = context.vm || (typeof require === 'function' ? require('vm') : null);
  const projectRoot = context.projectRoot || (path ? path.resolve(__dirname, '..', '..') : '');
  const moduleDir = path ? path.join(projectRoot, 'modules', 'instrument-identifier') : '';
  const clipsPath = path ? path.join(moduleDir, 'clips.js') : '';
  const getAudioDurationSeconds = typeof context.getAudioDurationSeconds === 'function' ? context.getAudioDurationSeconds : () => 10;
  let cachedQuestions = null;

  function fallbackQuestions() {
    return [{
      id: 'II001',
      file: 'audio/II001.mp3',
      instrument: 'VIOLIN',
      family: 'Strings',
      type: 'Orchestral',
      difficulty: 'MEDIUM',
      composer: 'Beethoven',
      work: 'Violin Concerto Op. 61',
      question: 'Identify the solo instrument.',
      answer: 'VIOLIN',
      source: 'MusOpen',
      rights: 'PD'
    }];
  }

  function loadQuestions() {
    if (cachedQuestions) return cachedQuestions;
    if (context.browserGlobal) {
      cachedQuestions = Array.isArray(context.browserGlobal.clips) ? context.browserGlobal.clips.slice() : fallbackQuestions();
      return cachedQuestions;
    }

    try {
      const source = fs.readFileSync(clipsPath, 'utf8');
      const sandbox = {};
      const questions = vm.runInNewContext(`${source}\n;Array.isArray(clips) ? clips : [];`, sandbox, {
        filename: clipsPath,
        timeout: 1000
      });
      if (!Array.isArray(questions) || !questions.length) throw new Error('No clips array found.');
      cachedQuestions = questions.slice();
    } catch (error) {
      console.error('[Instrument Identifier adapter] Could not load clips.js:', error.message);
      cachedQuestions = fallbackQuestions();
    }
    return cachedQuestions;
  }

  function normaliseAnswer(value) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function shuffleArray(items = []) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function sameInstrument(left, right) {
    return normaliseAnswer(left) === normaliseAnswer(right);
  }

  function getRawCorrectInstrument(question = {}) {
    return String(
      question.instrument
      || question.answer
      || question.correctAnswer
      || question.correctInstrument
      || question.modelAnswer
      || ''
    ).trim();
  }

  function getCorrectInstrument(question = {}) {
    return normaliseAnswer(getRawCorrectInstrument(question));
  }

  function uniqueInstrumentNames(items = []) {
    const seen = new Set();
    return items
      .map((item) => normaliseAnswer(item))
      .filter((item) => {
        if (!item || seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }

  function getAllInstrumentNames() {
    return uniqueInstrumentNames(loadQuestions().map((question) => question.answer || question.instrument)).sort();
  }

  function forceCorrectAnswerIntoChoices(choices = [], correctInstrument = '') {
    const correct = normaliseAnswer(correctInstrument);
    const uniqueChoices = uniqueInstrumentNames(choices);
    if (!correct) return uniqueChoices.slice(0, 4);

    const withoutCorrect = uniqueChoices.filter((choice) => !sameInstrument(choice, correct));
    const finalChoices = [correct, ...withoutCorrect].filter(Boolean).slice(0, 4);

    while (finalChoices.length < 4) {
      const filler = getAllInstrumentNames().find((item) => (
        item &&
        !sameInstrument(item, correct) &&
        !finalChoices.some((choice) => sameInstrument(choice, item))
      ));
      if (!filler) break;
      finalChoices.push(filler);
    }

    if (!finalChoices.some((choice) => sameInstrument(choice, correct))) {
      finalChoices.unshift(correct);
      finalChoices.length = Math.min(finalChoices.length, 4);
    }

    if (!finalChoices.some((choice) => sameInstrument(choice, correct))) {
      throw new Error(`Instrument Identifier question could not be prepared safely: missing correct option ${correct}.`);
    }

    return shuffleArray(finalChoices);
  }

  function buildChoices(question = {}) {
    const answer = getCorrectInstrument(question);
    const all = getAllInstrumentNames().filter((item) => item && !sameInstrument(item, answer));
    const familyMatches = uniqueInstrumentNames(loadQuestions()
      .filter((item) => item.family && question.family && item.family === question.family)
      .map((item) => item.answer || item.instrument))
      .filter((item) => item && !sameInstrument(item, answer));

    const pool = familyMatches.concat(all.filter((item) => !familyMatches.some((match) => sameInstrument(match, item))));
    const distractors = [];
    pool.forEach((item) => {
      if (distractors.length < 3 && !distractors.some((choice) => sameInstrument(choice, item))) distractors.push(item);
    });

    while (distractors.length < 3 && all.length) {
      const next = all.find((item) => !distractors.some((choice) => sameInstrument(choice, item)));
      if (!next) break;
      distractors.push(next);
    }

    return forceCorrectAnswerIntoChoices([answer, ...distractors], answer);
  }

  function assertChoicesContainCorrect(question = {}, choices = []) {
    const correct = getCorrectInstrument(question);
    const containsCorrect = Array.isArray(choices) && choices.some((choice) => sameInstrument(choice, correct));
    if (!correct || !containsCorrect) {
      const questionId = question.id || question.file || 'unknown question';
      throw new Error(`Instrument Identifier setup error: ${questionId} has no correct option in the answer choices. Correct answer: ${correct || 'unknown'}.`);
    }
  }

  function prepareQuestion(question = {}, options = {}) {
    const index = Number(options.index || 0);
    const audioPath = question.file || question.audio || '';
    const fullAudioPath = path && audioPath && !/^(https?:)?\/\//i.test(audioPath) && !audioPath.startsWith('/')
      ? path.join(moduleDir, audioPath)
      : audioPath;

    const choices = buildChoices(question);
    assertChoicesContainCorrect(question, choices);

    return {
      moduleId: 'instrument-identifier',
      moduleTitle: 'Instrument Identifier',
      answerType: 'choice',
      index,
      id: question.id || `II${String(index + 1).padStart(3, '0')}`,
      // Keep track/work/composer metadata out of the prepared classroom question.
      // Many II resource titles contain the answer (for example, "Viola Sonata"),
      // so the live classroom payload should only expose safe quiz-facing text.
      title: question.id || `Question ${index + 1}`,
      question: question.question || 'Identify the instrument.',
      prompt: question.question || 'Identify the instrument.',
      audio: audioPath,
      audioDurationSeconds: Number(question.audioDurationSeconds || getAudioDurationSeconds(fullAudioPath) || 10),
      choices,
      family: question.family || '',
      difficulty: question.difficulty || '',
      type: question.type || '',
      maxMarks: 1,
      totalNotes: 1
    };
  }

  function checkAnswer(question = {}, studentAnswer = '', context = {}) {
    const answer = normaliseAnswer(studentAnswer);
    const activeQuestion = context.activeQuestion || {};
    const correct = getCorrectInstrument(question) || normaliseAnswer(activeQuestion.modelAnswer);
    const isCorrect = answer === correct;
    return {
      score: isCorrect ? 1 : 0,
      total: 1,
      correct: isCorrect,
      matchType: isCorrect ? 'correct' : 'incorrect',
      feedback: isCorrect ? 'Correct.' : `Not quite. The answer was ${correct}.`,
      shortComment: isCorrect ? 'Correct.' : `Answer: ${correct}`,
      modelAnswer: correct,
      // Captured for concept-level feedback (shared/js/concept-extractors.js).
      // family/type/difficulty are also re-supplied for Live Session rounds
      // by classroom/progress-recorder.js's buildAnswerData override (same
      // values, from rawQuestion instead) — harmless duplication, and the
      // source of truth for any other caller of checkAnswer() directly.
      // instrument/responseType are untouched by that override, so they
      // need to originate here.
      answerData: {
        instrument: getRawCorrectInstrument(question),
        family: question.family || '',
        type: question.type || '',
        difficulty: question.difficulty || '',
        responseType: question.responseType || ''
      }
    };
  }

  return {
    id: 'instrument-identifier',
    title: 'Instrument Identifier',
    description: 'Students identify the featured instrument from the existing audio-resource bank.',
    studentMode: 'instrument-identifier',
    getQuestions: loadQuestions,
    prepareQuestion,
    checkAnswer
  };
});
