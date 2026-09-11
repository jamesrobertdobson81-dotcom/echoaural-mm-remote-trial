'use strict';

const path = require('path');
const Feedback = require('../modules/progress-mode/feedback.js');
const { extractConceptValues } = require('../shared/js/concept-extractors');

// The 3 modules this pass wires up for homework's concept-based "Selected"
// mode — see the homework plan's own module-scope note for why only these
// 3 (they're the ones this session already gave real concept tagging to).
const CONCEPT_SCOPED_MODULE_IDS = ['melody-master', 'texture-trainer', 'meter-master'];

let aosMapCache = null;
function loadMelodyAosMap(projectRoot) {
  if (aosMapCache) return aosMapCache;
  try {
    // eslint-disable-next-line global-require
    const raw = require(path.join(projectRoot, 'shared', 'data', 'question-aos-map.json'));
    aosMapCache = (raw && raw.questions) || {};
  } catch (error) {
    aosMapCache = {};
  }
  return aosMapCache;
}

// Maps one raw question object (as returned by a teacher-adapter's own
// getQuestions()) onto the camelCase field names shared/js/concept-
// extractors.js's CONCEPT_EXTRACTORS_BY_MODULE expects for this moduleId.
// This deliberately duplicates each adapter's own checkAnswer() field
// mapping rather than calling checkAnswer() itself — checkAnswer() scores a
// STUDENT ANSWER, whereas this needs a concept reading for every question in
// the bank regardless of whether anyone has ever answered it.
function conceptFieldsFor(moduleId, question, projectRoot) {
  if (moduleId === 'meter-master') {
    return {
      metreFamily: question.metre_family,
      mode: question.mode,
      requiresScore: question.requires_score,
      timeSignature: question.time_signature
    };
  }
  if (moduleId === 'texture-trainer') {
    return {
      textureFocus: question.textureFocus,
      specificTextureTerm: question.specificTextureTerm,
      target: question.target,
      responseType: question.responseType
    };
  }
  if (moduleId === 'melody-master') {
    const aosMap = loadMelodyAosMap(projectRoot);
    const aosEntry = aosMap[question.id];
    return {
      category: question.category,
      difficulty: question.difficulty,
      correctAnswer: question.correctAnswer,
      aosCode: aosEntry ? aosEntry.aos_code : undefined
    };
  }
  // The banks below name the concept fields close enough to what
  // shared/js/concept-extractors.js expects that a direct pass-through (or
  // a one-line derive) is all that's needed — verified against the real
  // question data in classroom/tests/concept-catalogue.test.js.
  if (moduleId === 'melodic-intervals') {
    return {
      intervalLabel: question.intervalLabel,
      intervalQuality: question.intervalQuality,
      direction: question.direction,
      keySignatureAccidentals: question.keySignatureAccidentals
    };
  }
  if (moduleId === 'instrument-identifier') {
    return {
      family: question.family,
      type: question.type,
      instrument: question.instrument,
      responseType: question.responseType,
      articulation: question.articulation
    };
  }
  if (moduleId === 'ensemble-recognition') {
    return {
      category: question.category,
      ensembleLabel: question.ensembleLabel
    };
  }
  if (moduleId === 'cadence-coach') {
    // `answer` is the cadence name ("Perfect"/"Imperfect"); `key` is
    // "F major" / "A minor" — the extractor's chordKeyModeTier wants just
    // "major" / "minor".
    return {
      cadenceType: question.answer,
      keyMode: String(question.key || '').trim().split(/\s+/).pop()
    };
  }
  if (moduleId === 'musical-language') {
    return {
      term: question.term,
      termType: question.term_type
    };
  }
  return {};
}

function questionConceptValues(moduleId, question, projectRoot) {
  return extractConceptValues(moduleId, conceptFieldsFor(moduleId, question, projectRoot));
}

// [{ value, label, count }] for a module's live bank — only concept values
// with real display copy (CONCEPT_PHRASES) and at least one matching
// question are surfaced, so the teacher's "Selected" picker never lists a
// concept it can't actually draw a question for.
function getConceptCatalogue(adapter, moduleId, projectRoot) {
  const phrases = (Feedback.CONCEPT_PHRASES && Feedback.CONCEPT_PHRASES[moduleId]) || {};
  const questions = typeof adapter?.getQuestions === 'function' ? adapter.getQuestions() : [];
  const counts = new Map();
  questions.forEach((question) => {
    questionConceptValues(moduleId, question, projectRoot).forEach((value) => {
      if (!phrases[value]) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: phrases[value].label || value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Real question ids in a module's live bank whose concept values intersect
// the given set — resolves a teacher's concept picks into an actual
// selectedQuestions list for buildQuestionSet's 'teacher-picked' strategy
// (classroom/question-set-builder.js).
function questionIdsForConcepts(adapter, moduleId, conceptValues, projectRoot) {
  const wanted = new Set(conceptValues);
  if (!wanted.size) return [];
  const questions = typeof adapter?.getQuestions === 'function' ? adapter.getQuestions() : [];
  return questions
    .filter((question) => questionConceptValues(moduleId, question, projectRoot).some((value) => wanted.has(value)))
    .map((question) => String(question.id || ''))
    .filter(Boolean);
}

module.exports = {
  CONCEPT_SCOPED_MODULE_IDS,
  conceptFieldsFor,
  getConceptCatalogue,
  questionIdsForConcepts,
  questionConceptValues
};
