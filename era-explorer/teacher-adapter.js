'use strict';

module.exports = function createContextCoachTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..');
  const core = require(path.join(projectRoot, 'era-explorer', 'era-explorer-core.js'));
  const { seededRandom } = require(path.join(projectRoot, 'classroom', 'question-set-builder.js'));
  const catalogue = require(path.join(projectRoot, 'shared', 'data', 'clip-catalogue.json'));
  const curation = require(path.join(projectRoot, 'era-explorer', 'data', 'context-coach-curation.json'));

  const CURATION_LEVELS = Object.freeze({
    foundation: 'Foundation',
    developing: 'Developing',
    securing: 'Securing',
    mastering: 'Mastering'
  });
  const LEVEL_ALIASES = Object.freeze({
    foundation: 'foundation',
    developing: 'developing',
    secure: 'securing',
    securing: 'securing',
    exam: 'mastering',
    mastering: 'mastering'
  });
  const TYPE_METADATA = Object.freeze({
    composer: {
      sourceKey: 'context-coach-composer',
      skillCode: 'CON.COMPOSER',
      skillName: 'Composer recognition'
    },
    period: {
      sourceKey: 'context-coach-period',
      skillCode: 'CON.PERIOD',
      skillName: 'Musical period recognition'
    }
  });

  let cachedPool = null;
  let cachedQuestions = null;

  function normaliseLevel(value) {
    return LEVEL_ALIASES[String(value || '').trim().toLowerCase()] || '';
  }

  function questionType(question = {}) {
    if (question.questionType === 'period' || question.type === 'period' || question.sourceKey === 'context-coach-period') return 'period';
    return 'composer';
  }

  function getPool() {
    if (!cachedPool) cachedPool = core.auditEraExplorerClips(catalogue, curation).valid;
    return cachedPool;
  }

  // ContextCoach is procedural, so these are planning descriptors rather
  // than a second, server-authored question bank. One descriptor is exposed
  // for every curated (clip, skill) combination the real core can build.
  // This gives the classroom planner honest type/level counts and enough
  // distinct candidates for a full round; the descriptor never decides the
  // rendered clip, answer or distractors. The plan seed does that below.
  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const pool = getPool();
    cachedQuestions = pool.flatMap((clip) => ['composer', 'period'].map((type) => {
      const build = type === 'period' ? core.buildPeriodQuestion : core.buildComposerQuestion;
      const candidate = build(clip, pool, () => 0.5, curation);
      if (!core.validateEraQuestion(candidate)) return null;
      const metadata = TYPE_METADATA[type];
      return {
        id: `${clip.id}-${type}`,
        questionType: type,
        sourceKey: metadata.sourceKey,
        level: normaliseLevel(candidate.level),
        responseType: 'multiple-choice',
        musicalElement: 'Context',
        skillCode: metadata.skillCode,
        skillName: metadata.skillName,
        clipId: clip.id
      };
    })).filter(Boolean);
    return cachedQuestions;
  }

  function plannedSeed(options = {}) {
    if (options.seed !== undefined && options.seed !== null && options.seed !== '') return String(options.seed);
    if (options.activeQuestion?.seed) return String(options.activeQuestion.seed);
    if (options.room?.activeQuestion?.seed) return String(options.room.activeQuestion.seed);
    const room = options.room;
    const planTarget = room && Array.isArray(room.questionOrder)
      ? room.questionOrder[Math.max(0, Number(room.questionOrderPosition || 0))]
      : null;
    return planTarget && typeof planTarget === 'object' && planTarget.seed ? String(planTarget.seed) : '';
  }

  function resolveSeed(question = {}, options = {}) {
    // The question-id fallback keeps direct/legacy calls deterministic. A
    // planned Live Session always supplies its per-question seed and never
    // reaches this fallback.
    return plannedSeed(options) || String(question.seed || question.id || 'era-explorer');
  }

  function buildQuestionForSeed(question = {}, seedValue) {
    const seed = String(seedValue || question.seed || question.id || 'era-explorer');
    const type = questionType(question);
    const level = normaliseLevel(question.level);
    // This is intentionally the same fallback sequence as script.js:
    // create one canonical RNG, try the requested level, then (if that pool
    // cannot support the round) retry unrestricted with the already-advanced
    // RNG. Re-seeding for the fallback would make browser/server diverge.
    const random = seededRandom(seed);
    const tryBuild = (requestedLevel) => {
      try {
        return core.buildRoundQuestions(getPool(), 1, random, {
          questionType: type,
          curation,
          level: requestedLevel ? CURATION_LEVELS[requestedLevel] : null
        });
      } catch (_error) {
        return null;
      }
    };
    let built = tryBuild(level);
    if (!built && level) built = tryBuild('');
    if (!built || !built.length) throw new Error(`Could not build a deterministic ContextCoach ${type} question.`);
    return built[0];
  }

  function prepareQuestion(question = {}, options = {}) {
    const seed = resolveSeed(question, options);
    const generated = buildQuestionForSeed(question, seed);
    const metadata = TYPE_METADATA[generated.type];
    const clipStart = Number(generated.clip.startTime || 0);
    const suppliedEnd = Number(generated.clip.endTime);
    const audioWindowSeconds = Number.isFinite(suppliedEnd) && suppliedEnd > clipStart
      ? Math.min(10, suppliedEnd - clipStart)
      : 10;
    return {
      moduleId: 'era-explorer',
      moduleTitle: 'ContextCoach',
      sourceKey: metadata.sourceKey,
      questionType: generated.type,
      seed,
      id: generated.id,
      templateId: question.id,
      index: Number(options.index || 0),
      title: generated.type === 'period' ? 'Eras & Periods' : 'Composers',
      prompt: generated.prompt,
      answerType: 'choice',
      responseType: 'multiple-choice',
      choices: generated.options.slice(),
      audio: generated.clip.audioPath,
      audioDurationSeconds: Math.max(1, Number(audioWindowSeconds || 10)),
      clipStart,
      clipEnd: clipStart + audioWindowSeconds,
      level: normaliseLevel(generated.level),
      maxMarks: 1
    };
  }

  function comparisonKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function checkAnswer(question = {}, answer = '', options = {}) {
    const seed = resolveSeed(question, options);
    const generated = buildQuestionForSeed(question, seed);
    const metadata = TYPE_METADATA[generated.type];
    const correct = comparisonKey(answer) === comparisonKey(generated.correctAnswer);
    const feedback = generated.type === 'period'
      ? (correct
        ? `Correct — this extract is from the ${generated.clip.period} period. Composer: ${generated.clip.composer}.`
        : `Incorrect — you selected ${String(answer || 'no answer')}. Correct: ${generated.clip.period}. Composer: ${generated.clip.composer}.`)
      : (correct
        ? `Correct — ${generated.clip.composer}. Period: ${generated.clip.period}.`
        : `Incorrect — you selected ${String(answer || 'no answer')}. Correct: ${generated.clip.composer}. Period: ${generated.clip.period}.`);

    return {
      score: correct ? 1 : 0,
      total: 1,
      correct,
      feedback,
      modelAnswer: generated.correctAnswer,
      answerData: {
        skillCode: metadata.skillCode,
        skillName: metadata.skillName,
        musicalElement: 'Context',
        sourceKey: metadata.sourceKey,
        questionType: generated.type,
        level: normaliseLevel(generated.level),
        clipId: generated.clip.id,
        composer: generated.clip.composer,
        period: generated.clip.period
      }
    };
  }

  return {
    id: 'era-explorer',
    title: 'ContextCoach',
    description: 'Recognise composers and musical periods from listening extracts.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    buildQuestionForSeed,
    prepareQuestion,
    checkAnswer
  };
};
