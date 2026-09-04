'use strict';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text || '').replace(/^﻿/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

module.exports = function createStructureSpotterTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const fs = context.fs || require('fs');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..');
  let cachedQuestions = null;

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function skillFor(question = {}) {
    const element = String(question.element || '').toLowerCase();
    if (element.includes('classical')) return { code: 'STR.CLASSICAL', name: 'Classical forms' };
    if (element.includes('popular') || element.includes('edm')) return { code: 'STR.POPULAR', name: 'Popular & EDM structure' };
    if (element.includes('world')) return { code: 'STR.WORLD', name: 'World structures' };
    return { code: 'STR.GENERAL', name: question.subskill || 'Musical structure' };
  }

  function sourceKeyFor() {
    // Structure Spotter is one CSV/one script.js serving a single, unified
    // topic area (unlike ScoreDecoder's 4-way tempo/dynamics/articulation/
    // ornamentation split) — there's only one sourceKey to route through.
    return 'structure-spotter';
  }

  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const csvPath = path.join(projectRoot, 'modules', 'structure-spotter', 'data', 'EA_Structure_Spotter_v1.csv');
    cachedQuestions = parseCsv(fs.readFileSync(csvPath, 'utf8'))
      .filter((question) => question.status === 'active')
      .map((question) => {
        const skill = skillFor(question);
        return {
          ...question,
          id: question.question_id,
          sourceKey: sourceKeyFor(),
          level: String(question.level || '').toLowerCase(),
          musicalElement: question.element,
          skillCode: skill.code,
          skillName: skill.name
        };
      });
    return cachedQuestions;
  }

  function scoreTyped(question, response) {
    const answer = normalise(response);
    const accepted = String(question.accepted_answers || '').split(' | ').map(normalise).filter(Boolean);
    const correct = normalise(question.correct_answer);
    if (Number(question.marks || 1) === 1) return accepted.includes(answer) || answer === correct ? 1 : 0;
    const hasTerm = accepted.some((term) => answer.includes(term));
    const meaningWords = normalise(question.meaning).split(' ').filter((word) => word.length > 2);
    const hasMeaning = meaningWords.length && meaningWords.filter((word) => answer.includes(word)).length >= Math.max(1, Math.ceil(meaningWords.length * 0.5));
    return Number(hasTerm) + Number(hasMeaning);
  }

  return {
    id: 'structure-spotter',
    title: 'Structure Spotter',
    description: 'Musical forms and structures — binary, ternary, rondo, sonata form, popular song and EDM structure, and raga performance structure.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    prepareQuestion(question = {}, options = {}) {
      const multipleChoice = String(question.question_type || '').startsWith('multiple_choice');
      return {
        moduleId: 'structure-spotter',
        moduleTitle: 'Structure Spotter',
        sourceKey: sourceKeyFor(),
        id: question.question_id,
        index: Number(options.index || 0),
        title: `${question.element || 'Structure'} · ${question.level || ''}`,
        prompt: question.prompt,
        answerType: multipleChoice ? 'choice' : 'text',
        responseType: multipleChoice ? 'multiple-choice' : 'typed',
        choices: multipleChoice ? String(question.options || '').split(' | ').filter(Boolean) : [],
        visual: '',
        visualAlt: question.symbol_display || question.term || 'Structure',
        pattern: question.symbol_display || '',
        maxMarks: Number(question.marks || 1)
      };
    },
    checkAnswer(question = {}, answer = '') {
      const total = Number(question.marks || 1);
      const multipleChoice = String(question.question_type || '').startsWith('multiple_choice');
      const score = multipleChoice
        ? (normalise(answer) === normalise(question.correct_answer) ? total : 0)
        : Math.min(total, scoreTyped(question, answer));
      return {
        score,
        total,
        correct: score >= total,
        feedback: score >= total ? 'Correct.' : (question.feedback || `The answer is ${question.correct_answer}.`),
        modelAnswer: question.correct_answer,
        answerData: {
          skillCode: question.skillCode,
          skillName: question.skillName,
          musicalElement: question.element,
          level: question.level,
          term: question.term,
          termType: question.term_type
        }
      };
    }
  };
};

module.exports.parseCsv = parseCsv;
