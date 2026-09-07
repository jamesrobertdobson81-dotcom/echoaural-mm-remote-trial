'use strict';

const { DEFAULT_RATING } = require('./elo');

const PURPOSE_DEFAULTS = Object.freeze({
  starter: { questionCount: 5, strategy: 'balanced' },
  main: { questionCount: 10, strategy: 'class-priorities' },
  plenary: { questionCount: 5, strategy: 'skill-focus' },
  diagnostic: { questionCount: 10, strategy: 'balanced' },
  exam: { questionCount: 5, strategy: 'balanced' },
  custom: { questionCount: 5, strategy: 'random' }
});

const STRATEGIES = new Set(['class-priorities', 'balanced', 'random', 'skill-focus', 'app-focus', 'teacher-picked', 'adaptive-per-student']);
const PURPOSES = new Set(Object.keys(PURPOSE_DEFAULTS));

function array(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value || 'echoaural')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function normaliseSpec(input = {}) {
  const purpose = PURPOSES.has(input.purpose) ? input.purpose : 'custom';
  const defaults = PURPOSE_DEFAULTS[purpose];
  const strategy = STRATEGIES.has(input.strategy) ? input.strategy : defaults.strategy;
  return {
    version: 1,
    purpose,
    strategy,
    classId: String(input.classId || '').trim(),
    questionCount: Math.max(1, Math.min(30, Number(input.questionCount || defaults.questionCount) || defaults.questionCount)),
    maxListens: Math.max(1, Math.min(8, Number(input.maxListens || 4) || 4)),
    moduleIds: array(input.moduleIds),
    sourceKeys: array(input.sourceKeys),
    musicalElements: array(input.musicalElements),
    skillCodes: array(input.skillCodes),
    levels: array(input.levels).map((item) => item.toLowerCase()),
    responseTypes: array(input.responseTypes),
    excludeQuestionIds: array(input.excludeQuestionIds),
    recentQuestionIds: array(input.recentQuestionIds),
    selectedQuestions: Array.isArray(input.selectedQuestions) ? input.selectedQuestions.slice(0, 30) : [],
    avoidRecent: input.avoidRecent !== false,
    seed: String(input.seed || `${Date.now()}`),
    leaderboard: input.leaderboard !== false
  };
}

function filterCandidates(catalogue, spec) {
  const excluded = new Set(spec.excludeQuestionIds);
  const recent = new Set(spec.recentQuestionIds);
  return catalogue.all().filter((item) => {
    if (spec.moduleIds.length && !spec.moduleIds.includes(item.moduleId)) return false;
    if (spec.sourceKeys.length && !spec.sourceKeys.includes(item.sourceKey)) return false;
    // Gated on "not exactly one specific app requested" rather than
    // "more than one", so an empty moduleIds list (no restriction at all —
    // e.g. a raw API caller, or a future 'any app' picker) still keeps
    // non-mixed-safe renderers like exam-lab out, the same as an explicit
    // multi-app list already did. Only a genuine single-app pick (launching
    // that whole app directly, not truly mixing) skips this gate.
    if (spec.moduleIds.length !== 1 && !item.mixedCompatible) return false;
    if (spec.musicalElements.length && !spec.musicalElements.includes(item.musicalElement)) return false;
    if (spec.skillCodes.length && !item.skillCodes.some((code) => spec.skillCodes.includes(code))) return false;
    if (spec.levels.length && item.level && !spec.levels.includes(item.level)) return false;
    if (spec.responseTypes.length && !spec.responseTypes.includes(item.responseType)) return false;
    if (excluded.has(item.questionId)) return false;
    if (spec.avoidRecent && recent.has(item.questionId)) return false;
    return true;
  });
}

function balancedOrder(candidates, random) {
  const pools = new Map();
  shuffled(candidates, random).forEach((item) => {
    const key = `${item.musicalElement || 'Other'}:${item.moduleId}`;
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key).push(item);
  });
  const keys = shuffled(Array.from(pools.keys()), random);
  const output = [];
  while (keys.some((key) => pools.get(key).length)) {
    keys.forEach((key) => {
      const next = pools.get(key).shift();
      if (next) output.push(next);
    });
  }
  return output;
}

function adaptiveOrder(candidates, evidence = {}, random, questionCount = 5) {
  const reliable = (evidence.skills || [])
    .filter((skill) => skill.reliable)
    .sort((left, right) => Number(left.percentage || 0) - Number(right.percentage || 0));
  const focusCodes = new Set(reliable.slice(0, Math.min(3, Math.max(1, Math.ceil(reliable.length / 2)))).map((skill) => skill.skillCode));
  const retrievalCodes = new Set(reliable.filter((skill) => !focusCodes.has(skill.skillCode)).map((skill) => skill.skillCode));
  const used = new Set();
  const selected = [];
  const levels = ['foundation', 'developing', 'securing', 'mastering'];
  const targetLevelIndex = levels.indexOf(String(evidence.recommendedLevel || '').toLowerCase());
  const atClassLevel = (item) => targetLevelIndex < 0 || !item.level || levels.indexOf(item.level) === targetLevelIndex;
  const atOrBelowClassLevel = (item) => targetLevelIndex < 0 || !item.level || levels.indexOf(item.level) <= targetLevelIndex;
  const atStretchLevel = (item) => targetLevelIndex < 0 || !item.level || levels.indexOf(item.level) === Math.min(3, targetLevelIndex + 1);
  const takeBalanced = (pool, count) => {
    balancedOrder(pool.filter((item) => !used.has(`${item.moduleId}:${item.questionId}`)), random)
      .slice(0, Math.max(0, count))
      .forEach((item) => {
        used.add(`${item.moduleId}:${item.questionId}`);
        selected.push(item);
      });
  };

  const focusCount = Math.ceil(questionCount * 0.6);
  const retrievalCount = Math.floor(questionCount * 0.25);
  takeBalanced(candidates.filter((item) => focusCodes.has(item.primarySkillCode) && atClassLevel(item)), focusCount);
  takeBalanced(candidates.filter((item) => focusCodes.has(item.primarySkillCode)), focusCount - selected.length);
  takeBalanced(candidates.filter((item) => retrievalCodes.has(item.primarySkillCode) && atOrBelowClassLevel(item)), retrievalCount);
  takeBalanced(candidates.filter(atStretchLevel), questionCount - selected.length);
  takeBalanced(candidates, candidates.length);
  return selected;
}

// Real per-student targeting (classroom/mastery.js + classroom/elo.js's
// approved design) — unlike adaptiveOrder above (one shared class-wide
// evidence object), this reads ONE student's own concept-mastery/due
// signal and Elo ratings. `evidence` here is shaped:
//   { priorityQuestionKeys: Set<"moduleId:questionId">,   // resolved from
//       rankConceptsForTargeting()'s output via questionIdsForConcepts —
//       the same concept->question resolution homework's "Selected" mode
//       already uses.
//     questionRatings: Map<"moduleId:questionId", number>,
//     skillRatings: Map<skillCode, number> }
// Priority-matched candidates are preferred first; within any pool,
// candidates whose difficulty rating is closest to the student's own
// skill rating are preferred — the same "target ~50% success probability"
// principle computerized adaptive testing uses, so a round isn't all
// review-repeats of questions already mastered nor all frustratingly hard.
function adaptivePerStudentOrder(candidates, evidence = {}, random, questionCount = 5) {
  const priorityKeys = evidence.priorityQuestionKeys instanceof Set ? evidence.priorityQuestionKeys : new Set();
  const questionRatings = evidence.questionRatings instanceof Map ? evidence.questionRatings : new Map();
  const skillRatings = evidence.skillRatings instanceof Map ? evidence.skillRatings : new Map();

  const scored = shuffled(candidates, random).map((item) => {
    const key = `${item.moduleId}:${item.questionId}`;
    const skillRating = skillRatings.get(item.primarySkillCode) ?? DEFAULT_RATING;
    const questionRating = questionRatings.get(key);
    // An unrated question (no attempts yet) gets a modest neutral gap
    // rather than being always-first or always-last — enough real
    // questions have some rating history that this mostly affects brand
    // new content, which still deserves a fair chance of selection.
    const gap = questionRating === undefined ? 200 : Math.abs(skillRating - questionRating);
    return { item, inPriority: priorityKeys.has(key) ? 1 : 0, gap };
  });

  scored.sort((left, right) => (right.inPriority - left.inPriority) || (left.gap - right.gap));

  const used = new Set();
  const selected = [];
  scored.forEach(({ item }) => {
    if (selected.length >= questionCount) return;
    const key = `${item.moduleId}:${item.questionId}`;
    if (used.has(key)) return;
    used.add(key);
    selected.push(item);
  });
  return selected;
}

// A mixed classroom round should sample broadly enough that one sub-app does
// not dominate the shared experience. Source keys distinguish the four
// ScoreDecoder sub-apps even though they share one classroom module.
function capMixedSourceRuns(ordered, questionCount, mixed) {
  if (!mixed) return ordered.slice(0, questionCount);
  const cap = Math.min(2, Math.max(1, Number(questionCount) || 1));
  const selected = [];
  const deferred = [];
  const counts = new Map();
  let lastKey = '';
  ordered.forEach((item) => {
    const key = item.sourceKey || item.moduleId || 'unknown';
    if (selected.length < questionCount && key !== lastKey && (counts.get(key) || 0) < cap) {
      counts.set(key, (counts.get(key) || 0) + 1);
      selected.push(item);
      lastKey = key;
    } else deferred.push(item);
  });
  // The first pass may leave holes because a source was adjacent to itself.
  // Fill them from deferred candidates while preserving the no-adjacent-source
  // rule wherever another eligible source remains.
  while (selected.length < questionCount) {
    const index = deferred.findIndex((item) => {
      const key = item.sourceKey || item.moduleId || 'unknown';
      return key !== lastKey && (counts.get(key) || 0) < cap;
    });
    if (index < 0) break;
    const [item] = deferred.splice(index, 1);
    const key = item.sourceKey || item.moduleId || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
    selected.push(item);
    lastKey = key;
  }
  // If the requested round cannot be filled under the cap, return the short
  // set and let the existing warning report the shortfall rather than ever
  // exceeding the two-question source cap.
  return selected;
}

function teacherPickedOrder(catalogue, spec) {
  return spec.selectedQuestions.map((selection) => {
    const questionId = typeof selection === 'string' ? selection : selection.questionId;
    const moduleId = typeof selection === 'string' ? '' : selection.moduleId;
    return catalogue.get(String(questionId || ''), String(moduleId || ''));
  }).filter(Boolean);
}

function distribution(items, key) {
  return items.reduce((result, item) => {
    const label = item[key] || 'Unclassified';
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});
}

function buildQuestionSet(catalogue, rawSpec = {}, evidence = {}) {
  const spec = normaliseSpec(rawSpec);
  const random = seededRandom(spec.seed);
  let candidates = filterCandidates(catalogue, spec);
  const warnings = [];

  if (!candidates.length && spec.avoidRecent && spec.recentQuestionIds.length) {
    candidates = filterCandidates(catalogue, { ...spec, avoidRecent: false });
    warnings.push('Recently used questions were included because the filtered pool was exhausted.');
  }

  let ordered;
  if (spec.strategy === 'teacher-picked') ordered = teacherPickedOrder(catalogue, spec);
  else if (spec.strategy === 'balanced') ordered = balancedOrder(candidates, random);
  else if (spec.strategy === 'class-priorities') ordered = adaptiveOrder(candidates, evidence, random, spec.questionCount);
  else if (spec.strategy === 'adaptive-per-student') ordered = adaptivePerStudentOrder(candidates, evidence, random, spec.questionCount);
  else ordered = shuffled(candidates, random);

  let selected = capMixedSourceRuns(ordered, spec.questionCount, spec.moduleIds.length > 1);
  if (selected.length < spec.questionCount) warnings.push(`Only ${selected.length} compatible questions matched the selected filters.`);
  if (spec.strategy === 'class-priorities' && !(evidence.skills || []).some((skill) => skill.reliable)) {
    warnings.push('Class evidence is limited, so this set uses a balanced cold-start selection.');
    ordered = balancedOrder(candidates, seededRandom(spec.seed));
    selected = capMixedSourceRuns(ordered, spec.questionCount, spec.moduleIds.length > 1);
  }
  if (spec.strategy === 'class-priorities' && (evidence.skills || []).some((skill) => skill.reliable)) {
    const evidencedCodes = new Set((evidence.skills || []).filter((skill) => skill.reliable).map((skill) => skill.skillCode));
    if (!selected.some((item) => item.skillCodes.some((code) => evidencedCodes.has(code)))) {
      warnings.push('The selected app has no matching reliable class-skill evidence yet, so this set uses its balanced question pool.');
    }
  }

  // seed is deterministic per (round seed, position) — needed for PM
  // sources with no fixed question bank to select from by id (chord-
  // identifier, key-signature-sprint, both ContextCoach sources — see
  // shared/js/pm-registry.js's questionSelectionMode: "seed"). Included on
  // every entry, not just seed-mode ones: harmless for id-mode sources
  // (they simply ignore it), and means a source's selection mode can
  // change later without the round plan's shape needing to change too.
  const questionPlan = selected.map((item, index) => ({
    moduleId: item.moduleId,
    sourceKey: item.sourceKey || '',
    questionId: item.questionId,
    questionIndex: item.questionIndex,
    seed: `${spec.seed}:${index}:${item.questionId || item.questionIndex}`
  }));
  const focusSkills = Array.from(new Set(selected.map((item) => item.primarySkillName || item.primarySkillCode).filter(Boolean)));
  const estimatedSeconds = selected.reduce((sum, item) => sum + Math.max(20, item.estimatedSeconds || 0), 0);

  return {
    spec,
    questionPlan,
    preview: {
      questionCount: questionPlan.length,
      estimatedMinutes: Math.max(1, Math.ceil(estimatedSeconds / 60)),
      modules: distribution(selected, 'moduleTitle'),
      musicalElements: distribution(selected, 'musicalElement'),
      levels: distribution(selected, 'level'),
      responseTypes: distribution(selected, 'responseType'),
      focusSkills: focusSkills.slice(0, 8),
      questions: selected.map((item, index) => ({
        position: index + 1,
        moduleId: item.moduleId,
        sourceKey: item.sourceKey || '',
        moduleTitle: item.moduleTitle,
        questionId: item.questionId,
        musicalElement: item.musicalElement,
        skillName: item.primarySkillName || item.primarySkillCode,
        level: item.level,
        responseType: item.responseType
      })),
      rationale: spec.strategy === 'class-priorities'
        ? `Prioritises weaker reliable class skills, then adds retrieval and stretch${evidence.recommendedLevel ? ` around the class ${evidence.recommendedLevel} level` : ''}.`
        : spec.strategy === 'adaptive-per-student'
          ? "Targets this student's own weak or overdue concepts, matched to questions near their current ability."
        : spec.strategy === 'balanced'
          ? 'Balances questions across the selected apps and musical elements.'
          : spec.strategy === 'teacher-picked'
            ? 'Uses the teacher-selected question order.'
            : 'Uses a reproducible random order within the selected filters.',
      warnings
    }
  };
}

module.exports = {
  PURPOSE_DEFAULTS,
  normaliseSpec,
  seededRandom,
  buildQuestionSet
};
