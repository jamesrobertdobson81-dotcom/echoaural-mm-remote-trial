'use strict';

module.exports = function createCadenceCoachTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const fs = context.fs || require('fs');
  const vm = context.vm || require('vm');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..');
  let cachedQuestions = null;

  function normalise(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+cadence$/, '');
  }

  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const dataPath = path.join(projectRoot, 'modules', 'cadence-coach', 'data.js');
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(dataPath, 'utf8'), sandbox, { filename: dataPath, timeout: 1000 });
    cachedQuestions = (sandbox.window.EchoAuralCadenceQuestions || []).map((question) => ({
      ...question,
      level: 'developing',
      musicalElement: 'Harmony and tonality',
      skillCode: 'HAR.CADENCE',
      skillName: 'Cadence'
    }));
    return cachedQuestions;
  }

  return {
    id: 'cadence-coach',
    title: 'Cadence Coach',
    description: 'Identify perfect, imperfect, plagal and interrupted cadences.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    prepareQuestion(question = {}, options = {}) {
      return {
        moduleId: 'cadence-coach',
        moduleTitle: 'Cadence Coach',
        id: question.id,
        index: Number(options.index || 0),
        title: `${question.id} · ${question.key || 'Cadence'}`,
        prompt: question.prompt || 'What type of cadence do you hear?',
        answerType: 'choice',
        responseType: 'multiple-choice',
        choices: question.choices || [],
        audio: `/modules/cadence-coach/${question.audio}`,
        visual: question.score ? `/modules/cadence-coach/${question.score}` : '',
        visualAlt: question.key ? `Score extract in ${question.key}` : 'Cadence score extract',
        maxMarks: 1
      };
    },
    checkAnswer(question = {}, answer = '') {
      const correct = normalise(answer) === normalise(question.answer);
      return {
        score: correct ? 1 : 0,
        total: 1,
        correct,
        feedback: correct ? 'Correct.' : `Not quite. This is a ${question.answer} cadence.`,
        modelAnswer: question.answer,
        answerData: {
          skillCode: 'HAR.CADENCE',
          skillName: 'Cadence',
          musicalElement: 'Harmony and tonality',
          level: question.level,
          key: question.key
        }
      };
    }
  };
};
