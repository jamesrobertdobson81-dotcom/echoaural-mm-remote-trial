'use strict';

module.exports = function createKeySignatureTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..', '..');
  const moduleRoot = path.join(projectRoot, 'modules', 'harmony-explorer', 'key-signature-sprint');
  const data = require(path.join(moduleRoot, 'key-signature-data.js'));
  const core = require(path.join(moduleRoot, 'key-signature-core.js'));
  const levels = ['foundation', 'developing', 'securing', 'mastering'];

  // Procedural sources still need catalogue entries so the deterministic set
  // builder can schedule them. These are selection tickets, not a second
  // question bank: prepareQuestion derives all playable content from the
  // plan seed using the exact same core as the browser. Thirty tickets per
  // level covers the builder's documented maximum round length without
  // pretending that the generated content itself is fixed or enumerable.
  const questions = levels.flatMap((level) => Array.from({ length: 30 }, (_, index) => ({
    id: `KS-SEED-${level}-${String(index + 1).padStart(2, '0')}`,
    level,
    musicalElement: 'Harmony and tonality',
    skillCode: 'HAR.TONALITY',
    skillName: 'Tonality and key',
    responseType: 'multiple-choice',
    procedural: true
  })));

  function generatedQuestion(question = {}, options = {}) {
    const active = options.activeQuestion || {};
    const seed = String(options.seed || active.seed || question.seed || question.id || 'echoaural');
    const level = active.level || question.level || 'foundation';
    return core.buildQuestion(data, seed, { level, answerMode: 'choice' });
  }

  return {
    id: 'key-signature-sprint',
    title: 'Key Signatures',
    description: 'Recognise major and minor keys from key signatures.',
    studentMode: 'generic',
    mixedCompatible: true,
    questionSelectionMode: 'seed',
    getQuestions: () => questions,
    prepareQuestion(question = {}, options = {}) {
      const generated = generatedQuestion(question, options);
      return {
        moduleId: 'key-signature-sprint',
        sourceKey: 'harmony-key-signatures',
        moduleTitle: 'Key Signatures',
        id: generated.id,
        index: Number(options.index || 0),
        seed: generated.seed,
        level: generated.level,
        title: 'Key Signature Recognition',
        prompt: generated.prompt,
        answerType: generated.typed ? 'text' : 'choice',
        responseType: generated.typed ? 'typed' : 'multiple-choice',
        choices: generated.choices,
        keySignature: {
          clef: generated.clef,
          type: generated.signature.type,
          count: generated.signature.count,
          displayLabel: generated.signature.displayLabel
        },
        maxMarks: 1
      };
    },
    checkAnswer(question = {}, answer = '', options = {}) {
      const generated = generatedQuestion(question, options);
      const correct = data.acceptable(answer, generated.answer, generated.target);
      return {
        score: correct ? 1 : 0,
        total: 1,
        correct,
        feedback: correct ? `Correct. ${generated.signature.pairLabel} share this signature.` : `Not quite. The answer is ${generated.answer}.`,
        modelAnswer: generated.answer,
        answerData: {
          skillCode: 'HAR.TONALITY',
          skillName: 'Tonality and key',
          musicalElement: 'Harmony and tonality',
          level: generated.level,
          accidentalType: generated.signature.type,
          accidentalCount: generated.signature.count,
          type: generated.type,
          clef: generated.clef
        }
      };
    }
  };
};
