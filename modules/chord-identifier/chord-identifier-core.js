(function attachChordIdentifierCore(root, factory) {
  'use strict';

  // The existing theory engines are browser-first IIFEs. Requiring them in
  // dependency order makes those same files available to this UMD core in
  // Node; the browser already loads them before this file in index.html.
  if (typeof module === 'object' && module.exports && root && !root.EAChordEngine) {
    require('./js/pitch-utils.js');
    require('./data/keys.js');
    require('./data/chords.js');
    require('./js/chord-engine.js');
    require('./js/answer-engine.js');
  }

  var api = factory(
    root && root.EAChordEngine,
    root && root.EAChordAnswers,
    root && root.EAChordKeys
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EAChordIdentifierCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createChordIdentifierCore(Engine, Answers, Keys) {
  'use strict';

  if (!Engine || !Answers || !Keys) {
    throw new Error('Chord Identifier core requires the chord, answer and key engines.');
  }

  var LEVELS = ['foundation', 'developing', 'securing', 'mastering'];
  var INVERSION_CHOICES = ['Root position', 'First inversion', 'Second inversion', 'Third inversion'];

  function hashSeed(value) {
    var hash = 2166136261;
    var text = String(value || 'echoaural');
    for (var index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
      // question-set-builder uses `for...of`, whose iteration treats a
      // surrogate pair as one character before calling charCodeAt(0).
      if (/^[\uD800-\uDBFF]$/.test(text.charAt(index)) && /^[\uDC00-\uDFFF]$/.test(text.charAt(index + 1))) index += 1;
    }
    return hash >>> 0;
  }

  // Canonical FNV-1a + mulberry32 implementation, byte-for-byte equivalent
  // to classroom/question-set-builder.js's seededRandom().
  function seededRandom(seed) {
    var state = hashSeed(seed);
    return function () {
      state += 0x6D2B79F5;
      var result = state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function settingsForLevel(level, overrides) {
    var requested = String(level || '').toLowerCase();
    var difficulty = LEVELS.indexOf(requested) === -1 ? 'foundation' : requested;
    var source = overrides && typeof overrides === 'object' ? overrides : {};
    var settings = {
      difficulty: difficulty,
      count: Math.max(1, Number(source.count || 1) || 1),
      tonality: String(source.tonality || 'major'),
      recognition: String(source.recognition || 'name'),
      answerMode: String(source.answerMode || 'choice')
    };

    // These are the app's existing difficulty rules from settings().
    if (difficulty === 'foundation') {
      settings.tonality = 'major';
      settings.answerMode = 'choice';
      settings.recognition = 'name';
    }
    if (difficulty === 'developing') {
      settings.tonality = 'major';
      settings.answerMode = 'choice';
    }
    if (difficulty === 'securing') settings.tonality = 'mixed';
    return settings;
  }

  function questionsSinceLastType(results, type) {
    var history = Array.isArray(results) ? results : [];
    if (!history.length) return 3;
    for (var index = history.length - 1; index >= 0; index--) {
      if (history[index].recognitionType === type) return history.length - 1 - index;
    }
    return history.length;
  }

  /** Pure round-level generator shared by Progress Mode and classroom Node. */
  function buildQuestion(roundSettings, results, random) {
    var settings = settingsForLevel(roundSettings && roundSettings.difficulty, roundSettings);
    var history = Array.isArray(results) ? results : [];
    var rng = typeof random === 'function' ? random : Math.random;
    var difficulty = settings.difficulty;
    var allowSeventh = difficulty === 'securing' || difficulty === 'mastering';
    var allowInversions = allowSeventh;

    var question = Engine.generateQuestion({
      difficulty: difficulty,
      tonality: settings.tonality,
      allowSeventh: allowSeventh,
      allowInversions: allowInversions,
      random: rng
    });

    var recognition = settings.recognition;
    if (recognition === 'mixed') recognition = rng() < 0.5 ? 'name' : 'roman';

    if (allowSeventh && question.category === 'secondary') {
      recognition = 'roman';
    } else if (allowSeventh) {
      var romanGap = questionsSinceLastType(history, 'roman');
      var romanDue = rng() < Math.min(0.7, 0.2 + romanGap * 0.15);
      var inversionEligible = allowInversions && question.inversion > 0;
      var inversionGap = questionsSinceLastType(history, 'inversion');
      var inversionBaseChance = difficulty === 'mastering' ? 0.65 : 0.45;
      var inversionGrowth = difficulty === 'mastering' ? 0.15 : 0.1;
      var inversionCap = difficulty === 'mastering' ? 0.95 : 0.8;
      var inversionDue = inversionEligible && rng() < Math.min(inversionCap, inversionBaseChance + inversionGap * inversionGrowth);

      if (romanDue && inversionDue) recognition = romanGap >= inversionGap ? 'roman' : 'inversion';
      else if (romanDue) recognition = 'roman';
      else if (inversionDue) recognition = 'inversion';
    }

    question.recognitionType = recognition;
    return question;
  }

  function buildQuestionFromSeed(seed, roundSettings, results) {
    if (seed === undefined || seed === null || seed === '') throw new Error('Chord Identifier needs a non-empty question seed.');
    return buildQuestion(roundSettings, results, seededRandom(seed));
  }

  function questionId(question) {
    return ['chord', question.key.id, question.romanNumeral, question.inversion, question.recognitionType].join(':');
  }

  function answerSignature(question) {
    if (question.recognitionType === 'roman') return 'roman|' + question.romanNumeral;
    if (question.recognitionType === 'inversion') return 'inversion|' + question.inversionLabel;
    return 'name|' + question.chordLabel;
  }

  function questionMarkTotal(question) {
    var isAdvanced = question.category === 'seventh' || question.category === 'extended';
    return question.recognitionType === 'inversion' || !isAdvanced ? 1 : 2;
  }

  function modelAnswer(question) {
    if (question.recognitionType === 'roman') return question.romanNumeral;
    if (question.recognitionType === 'inversion') return INVERSION_CHOICES[question.inversion];
    return question.chordLabel;
  }

  function checkAnswer(question, answer) {
    if (question.recognitionType === 'roman') return String(answer) === question.romanNumeral;
    if (question.recognitionType === 'inversion') return String(answer) === INVERSION_CHOICES[question.inversion];
    return Answers.checkChordNameAnswer(answer, question) || String(answer) === question.chordLabel;
  }

  function shuffle(items, random) {
    var output = items.slice();
    for (var index = output.length - 1; index > 0; index--) {
      var swap = Math.floor(random() * (index + 1));
      var value = output[index];
      output[index] = output[swap];
      output[swap] = value;
    }
    return output;
  }

  function buildChoices(question, seed) {
    var random = seed === undefined || seed === null || seed === ''
      ? Math.random
      : seededRandom(String(seed) + ':choices');
    if (question.recognitionType === 'inversion') return shuffle(INVERSION_CHOICES, random);
    var key = Keys.findKey(question.key.id);
    return Answers.buildMultipleChoice(question, key, question.recognitionType === 'roman' ? 'roman' : 'name', 3, random);
  }

  return Object.freeze({
    LEVELS: Object.freeze(LEVELS.slice()),
    INVERSION_CHOICES: Object.freeze(INVERSION_CHOICES.slice()),
    hashSeed: hashSeed,
    seededRandom: seededRandom,
    settingsForLevel: settingsForLevel,
    buildQuestion: buildQuestion,
    buildQuestionFromSeed: buildQuestionFromSeed,
    questionId: questionId,
    answerSignature: answerSignature,
    questionMarkTotal: questionMarkTotal,
    modelAnswer: modelAnswer,
    checkAnswer: checkAnswer,
    buildChoices: buildChoices
  });
});
