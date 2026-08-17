'use strict';

const ChordIdentifier = require('./chord-identifier-core');

module.exports = function createChordIdentifierTeacherAdapter() {
  const LEVELS = ChordIdentifier.LEVELS;

  // Procedural tickets give the classroom planner enough distinct catalogue
  // entries for its maximum 30-question round at any one selected level.
  // They describe generation settings, not a separately-authored bank: the
  // actual content still comes exclusively from the shared core + plan seed.
  const questions = LEVELS.flatMap((level) => Array.from({ length: 30 }, (_, ticketIndex) => {
    const ticket = ticketIndex + 1;
    const seed = `chord-identifier:catalogue:${level}:${ticket}`;
    const settings = ChordIdentifier.settingsForLevel(level);
    const generated = ChordIdentifier.buildQuestionFromSeed(seed, settings, []);
    return Object.freeze({
      id: `CI-${level}-${String(ticket).padStart(2, '0')}`,
      level,
      seed,
      settings,
      answer: ChordIdentifier.modelAnswer(generated),
      responseType: 'multiple-choice',
      musicalElement: 'Harmony and tonality',
      skillCode: 'HAR.CHORD_IDENTIFICATION',
      skillName: 'Chord identification'
    });
  }));

  function currentOrderSeed(room) {
    if (!room || !Array.isArray(room.questionOrder)) return '';
    const target = room.questionOrder[Math.max(0, Number(room.questionOrderPosition || 0))];
    return target && typeof target === 'object' ? String(target.seed || '') : '';
  }

  function roomSeed(question, room, scoring) {
    if (!room) return '';
    const runId = Math.max(1, Number(room.questionRunId || 0) + (scoring ? 0 : 1));
    return [room.code || 'room', room.roundId || 1, runId, question.id || 'chord'].join(':');
  }

  function resolveSeed(question, options = {}, scoring = false) {
    return String(
      options.seed
      || options.activeQuestion?.seed
      || (scoring ? options.room?.activeQuestion?.seed : '')
      || currentOrderSeed(options.room)
      || roomSeed(question, options.room, scoring)
      || question.seed
      || ''
    );
  }

  function settingsFor(question) {
    return ChordIdentifier.settingsForLevel(question.level, question.settings);
  }

  function generatedFor(question, seed) {
    return ChordIdentifier.buildQuestionFromSeed(seed, settingsFor(question), []);
  }

  function promptFor(question) {
    if (question.recognitionType === 'roman') return `What is the Roman numeral of this chord in ${question.key.label}?`;
    if (question.recognitionType === 'inversion') return 'What inversion is this chord in?';
    return 'What is the name of this chord?';
  }

  return {
    id: 'chord-identifier',
    title: 'Chord Identifier',
    description: 'Identify chords, Roman numerals and inversions from notation and sound.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions: () => questions,
    prepareQuestion(question = {}, options = {}) {
      const seed = resolveSeed(question, options, false);
      const settings = settingsFor(question);
      const generated = generatedFor(question, seed);
      const generatedQuestionId = ChordIdentifier.questionId(generated);
      return {
        moduleId: 'chord-identifier',
        moduleTitle: 'Chord Identifier',
        sourceKey: 'chord-identifier',
        id: generatedQuestionId,
        templateId: question.id,
        index: Number(options.index || 0),
        title: `${question.id} · ${generated.key.label}`,
        prompt: promptFor(generated),
        answerType: 'choice',
        responseType: 'multiple-choice',
        choices: ChordIdentifier.buildChoices(generated, seed),
        maxMarks: ChordIdentifier.questionMarkTotal(generated),
        seed,
        level: settings.difficulty,
        settings,
        signature: generatedQuestionId,
        generatedQuestionId
      };
    },
    checkAnswer(question = {}, answer = '', options = {}) {
      const seed = resolveSeed(question, options, true);
      const generated = generatedFor(question, seed);
      const correct = ChordIdentifier.checkAnswer(generated, answer);
      const total = ChordIdentifier.questionMarkTotal(generated);
      const modelAnswer = ChordIdentifier.modelAnswer(generated);
      return {
        score: correct ? total : 0,
        total,
        correct,
        feedback: correct ? 'Correct.' : `Not quite. The answer is ${modelAnswer}.`,
        modelAnswer,
        answerData: {
          skillCode: 'HAR.CHORD_IDENTIFICATION',
          skillName: 'Chord identification',
          musicalElement: 'Harmony and tonality',
          level: question.level,
          seed,
          generatedQuestionId: ChordIdentifier.questionId(generated),
          key: generated.key.label,
          recognitionType: generated.recognitionType,
          category: generated.category,
          keyMode: generated.key.mode,
          // Captured for concept-level feedback (accounts/account-server.js's
          // buildProgressSummary byConcept pass) — previously computed here
          // and discarded once the question was scored.
          inversion: generated.inversion,
          inversionLabel: generated.inversionLabel,
          quality: generated.quality
        }
      };
    }
  };
};
