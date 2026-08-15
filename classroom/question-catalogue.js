'use strict';

const { getQuestionSkillMetadata } = require('../shared/js/skill-metadata');

const LEVELS = new Set(['foundation', 'developing', 'securing', 'mastering']);
const DEFAULT_MIXED_COMPATIBLE = new Set([
  'melody-master',
  'instrument-identifier',
  'melodic-intervals',
  'texture-trainer',
  'ensemble-recognition',
  'cadence-coach',
  'meter-master',
  'musical-language',
  'key-signature-sprint',
  // These procedural sources are Mixed-safe because their browser and
  // classroom adapters now share one deterministic generator per seed.
  'chord-identifier',
  'era-explorer'
]);

function clean(value) {
  return String(value || '').trim();
}

function normaliseLevel(value) {
  const level = clean(value).toLowerCase();
  return LEVELS.has(level) ? level : '';
}

function instrumentLevel(question = {}) {
  const difficulty = clean(question.difficulty).toLowerCase().replace(/[_-]+/g, ' ');
  const type = clean(question.type).toLowerCase().replace(/[_-]+/g, ' ');
  const solo = type === 'solo' || type === 'unaccompanied' || type === 'solo instrument' || type.includes('solo only');
  if (solo && (!difficulty || difficulty === 'easy')) return 'foundation';
  if ((difficulty === 'easy' && !solo) || (solo && difficulty !== 'easy')) return 'developing';
  if (difficulty === 'medium') return 'securing';
  if (difficulty === 'hard' || difficulty === 'very hard') return 'mastering';
  return '';
}

function inferResponseType(moduleId, question = {}) {
  const explicit = clean(question.responseType || question.answerType || question.response_type || question.question_type).toLowerCase();
  if (explicit) {
    if (explicit === 'choice' || explicit.includes('choice')) return 'multiple-choice';
    if (explicit === 'text') return 'typed';
    return explicit;
  }
  if (moduleId === 'melody-master') return 'dictation';
  if (moduleId === 'instrument-identifier' || moduleId === 'melodic-intervals') return 'multiple-choice';
  return Array.isArray(question.choices || question.answerChoices) ? 'multiple-choice' : 'typed';
}

function descriptorFor(adapter, question, index) {
  const moduleId = clean(adapter.id);
  const questionId = clean(question?.id) || `${moduleId}:${index + 1}`;
  const metadata = getQuestionSkillMetadata(questionId);
  const level = normaliseLevel(
    question?.levelKey
    || question?.level
    || metadata.difficulty_band
    || (moduleId === 'instrument-identifier' ? instrumentLevel(question) : '')
  );
  const primarySkillCode = clean(metadata.primary_skill_code || question?.skillCode || question?.progress_skill_code);
  const primarySkillName = clean(metadata.primary_skill_name || question?.skillName || question?.subskill || primarySkillCode);
  const secondarySkillCodes = clean(metadata.secondary_skill_codes || question?.secondarySkillCodes)
    .split('|')
    .map(clean)
    .filter(Boolean);

  return Object.freeze({
    moduleId,
    sourceKey: clean(question?.sourceKey),
    moduleTitle: clean(adapter.title) || moduleId,
    questionId,
    questionIndex: index,
    level,
    difficulty: clean(question?.difficulty || metadata.difficulty_band),
    musicalElement: clean(metadata.musical_element || question?.musicalElement || question?.element),
    primarySkillCode,
    primarySkillName,
    skillCodes: [primarySkillCode, ...secondarySkillCodes].map(clean).filter(Boolean),
    learningStage: clean(metadata.learning_stage),
    responseType: inferResponseType(moduleId, question),
    clipId: clean(metadata.clip_id),
    estimatedSeconds: Math.max(0, Number(question?.audioDurationSeconds || question?.clipDuration || 0)),
    mixedCompatible: adapter.mixedCompatible !== undefined
      ? Boolean(adapter.mixedCompatible)
      : DEFAULT_MIXED_COMPATIBLE.has(moduleId)
  });
}

class QuestionCatalogue {
  constructor(adapters = []) {
    this.adapters = Array.isArray(adapters) ? adapters.filter((adapter) => adapter?.id) : [];
    this.descriptors = this.adapters.flatMap((adapter) => {
      const questions = typeof adapter.getQuestions === 'function' ? adapter.getQuestions() : [];
      return (Array.isArray(questions) ? questions : []).map((question, index) => descriptorFor(adapter, question, index));
    });
  }

  all() {
    return this.descriptors.slice();
  }

  get(questionId, moduleId = '') {
    return this.descriptors.find((item) => (
      item.questionId === questionId && (!moduleId || item.moduleId === moduleId)
    )) || null;
  }

  modules() {
    return this.adapters.map((adapter) => {
      const questions = this.descriptors.filter((item) => item.moduleId === adapter.id);
      const levels = Array.from(new Set(questions.map((item) => item.level).filter(Boolean)));
      const musicalElements = Array.from(new Set(questions.map((item) => item.musicalElement).filter(Boolean))).sort();
      const skills = Array.from(new Map(questions
        .filter((item) => item.primarySkillCode)
        .map((item) => [item.primarySkillCode, { code: item.primarySkillCode, name: item.primarySkillName || item.primarySkillCode }]))
        .values()).sort((a, b) => a.name.localeCompare(b.name));
      return {
        id: adapter.id,
        title: clean(adapter.title) || adapter.id,
        description: clean(adapter.description),
        studentMode: clean(adapter.studentMode) || 'generic',
        questionCount: questions.length,
        mixedCompatible: questions.some((item) => item.mixedCompatible),
        levels,
        musicalElements,
        skills,
        responseTypes: Array.from(new Set(questions.map((item) => item.responseType).filter(Boolean))).sort()
      };
    });
  }
}

module.exports = {
  QuestionCatalogue,
  descriptorFor,
  inferResponseType,
  normaliseLevel
};
