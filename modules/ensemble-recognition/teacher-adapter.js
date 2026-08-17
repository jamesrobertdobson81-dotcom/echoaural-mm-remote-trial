'use strict';

module.exports = function createEnsembleRecognitionTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..');
  let cachedQuestions = null;
  const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const data = require(path.join(projectRoot, 'modules', 'ensemble-recognition', 'data', 'ensemble-questions.json'));
    // PM validates question content through EnsembleRecognitionCore, not by
    // probing the local filesystem at catalogue-build time. Keep Live
    // Sessions on the same full data pool: asset integrity belongs in the
    // content test suite, and must not silently make a valid question vanish
    // from teacher planning because of a deployment/path transient.
    cachedQuestions = (data.questions || []).map((question) => ({
      ...question,
      musicalElement: 'Instrumentation',
      skillCode: 'INS.ENSEMBLE',
      skillName: 'Ensemble and performing forces'
    }));
    return cachedQuestions;
  }

  return {
    id: 'ensemble-recognition',
    title: 'Ensemble Recognition',
    description: 'Recognise ensembles and performing forces from recorded extracts.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    prepareQuestion(question = {}, options = {}) {
      return {
        moduleId: 'ensemble-recognition',
        moduleTitle: 'Ensemble Recognition',
        id: question.id,
        index: Number(options.index || 0),
        title: `${question.id} · Ensemble`,
        prompt: question.question || 'Which ensemble is playing?',
        answerType: 'choice',
        responseType: 'multiple-choice',
        choices: question.choices || [],
        audio: `/modules/ensemble-recognition/${question.audio}`,
        audioDurationSeconds: Number(question.durationSec || 10),
        maxMarks: Number(question.marks || 1)
      };
    },
    checkAnswer(question = {}, answer = '') {
      const correct = [question.correctAnswer, ...(question.acceptedAnswers || [])].map(normalise).includes(normalise(answer));
      const total = Number(question.marks || 1);
      return {
        score: correct ? total : 0,
        total,
        correct,
        feedback: correct ? (question.feedback || 'Correct.') : `Not quite. The answer is ${question.correctAnswer}. ${question.feedback || ''}`.trim(),
        modelAnswer: question.correctAnswer,
        answerData: {
          skillCode: 'INS.ENSEMBLE',
          skillName: 'Ensemble and performing forces',
          musicalElement: 'Instrumentation',
          level: question.level,
          // Captured for concept-level feedback (shared/js/concept-extractors.js).
          ensembleLabel: question.ensembleLabel,
          category: question.category
        }
      };
    }
  };
};
