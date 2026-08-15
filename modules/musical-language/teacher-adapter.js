'use strict';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
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

module.exports = function createMusicalLanguageTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const fs = context.fs || require('fs');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..');
  let cachedQuestions = null;

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9♩#]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function skillFor(question = {}) {
    const element = String(question.element || '').toLowerCase();
    if (element.includes('tempo')) return { code: 'RHY.TEMPO', name: 'Tempo' };
    if (element.includes('dynamic')) return { code: 'DYN.LEVEL', name: 'Dynamic level' };
    if (element.includes('articulation')) return { code: 'ART.TYPE', name: 'Articulation' };
    if (element.includes('ornament')) return { code: 'MEL.ORNAMENT', name: 'Ornamentation' };
    return { code: 'EXM.WRITTEN', name: question.subskill || 'Musical vocabulary' };
  }

  function sourceKeyFor(question = {}) {
    const element = String(question.element || '').toLowerCase();
    if (element.includes('tempo')) return 'musical-language-tempo';
    if (element.includes('dynamic')) return 'musical-language-dynamics';
    if (element.includes('articulation')) return 'musical-language-articulation';
    return 'musical-language-ornamentation';
  }

  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const csvPath = path.join(projectRoot, 'modules', 'musical-language', 'data', 'EA_Musical_Language_v1.csv');
    cachedQuestions = parseCsv(fs.readFileSync(csvPath, 'utf8'))
      // The student app's canonical pool is status:active. eligible_modes
      // currently happens to include teacher-mode for every active row, but
      // treating that coincidence as a second LS-only content filter allows
      // the two modes to drift silently.
      .filter((question) => question.status === 'active')
      .map((question) => {
        const skill = skillFor(question);
        return {
        ...question,
        id: question.question_id,
          sourceKey: sourceKeyFor(question),
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
    const hasMeaning = meaningWords.length && meaningWords.filter((word) => answer.includes(word)).length >= Math.max(1, Math.ceil(meaningWords.length * 0.6));
    return Number(hasTerm) + Number(hasMeaning);
  }

  return {
    id: 'musical-language',
    title: 'ScoreDecoder Vocabulary',
    description: 'Musical vocabulary, tempo, dynamics, articulation and ornamentation.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    prepareQuestion(question = {}, options = {}) {
      const multipleChoice = String(question.question_type || '').startsWith('multiple_choice');
      const termSlug = String(question.term || '').toLowerCase().trim().replace(/\s+/g, '-');
      const visual = question.visual_asset
        ? `/modules/musical-language/${question.visual_asset}`
        : (multipleChoice ? `/modules/musical-language/assets/markings/${termSlug}.png` : '');
      return {
        moduleId: 'musical-language',
        moduleTitle: 'ScoreDecoder Vocabulary',
        sourceKey: sourceKeyFor(question),
        id: question.question_id,
        index: Number(options.index || 0),
        title: `${question.element || 'Vocabulary'} · ${question.level || ''}`,
        prompt: question.prompt,
        answerType: multipleChoice ? 'choice' : 'text',
        responseType: multipleChoice ? 'multiple-choice' : 'typed',
        choices: multipleChoice ? String(question.options || '').split(' | ').filter(Boolean) : [],
        visual,
        visualAlt: question.symbol_display || question.term || 'Musical marking',
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
          term: question.term
        }
      };
    }
  };
};

module.exports.parseCsv = parseCsv;
