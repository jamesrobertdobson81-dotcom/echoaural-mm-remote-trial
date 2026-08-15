(function attachKeySignatureSprintCore(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EAKeySignatureSprintCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createKeySignatureSprintCore() {
  'use strict';

  function hashSeed(value) {
    let hash = 2166136261;
    const text = String(value || 'echoaural');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
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

  function pick(items, random) {
    return items[Math.floor(random() * items.length)];
  }

  function shuffle(items, random) {
    const output = items.slice();
    for (let index = output.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [output[index], output[target]] = [output[target], output[index]];
    }
    return output;
  }

  function appLevel(value) {
    const level = String(value || 'foundation').toLowerCase();
    if (level === 'securing') return 'secure';
    if (level === 'mastering') return 'exam';
    return ['foundation', 'developing', 'secure', 'exam'].includes(level) ? level : 'foundation';
  }

  function canonicalLevel(value) {
    const level = appLevel(value);
    if (level === 'secure') return 'securing';
    if (level === 'exam') return 'mastering';
    return level;
  }

  /**
   * The canonical host-selected Key Signature Sprint generator. Both the
   * browser app and classroom adapter call this function with the same seed
   * and settings; neither side maintains a parallel question bank.
   */
  function buildQuestion(data, seed, options = {}) {
    if (!data || !data.LEVELS || !Array.isArray(data.SIGNATURES)) {
      throw new Error('Key Signature Sprint data is unavailable.');
    }
    const random = seededRandom(seed);
    const difficulty = appLevel(options.level || options.difficulty);
    const config = data.LEVELS[difficulty];
    const focus = ['major', 'minor'].includes(options.focus) ? options.focus : 'all';
    const range = options.range || 'all';
    const clefSetting = options.clef || 'auto';
    const answerMode = options.answerMode || 'choice';
    const pool = data.pool(config.maxAccidentals, range);
    if (!pool.length) throw new Error('No key signatures match the selected settings.');

    const signature = pick(pool, random);
    let types = config.types.slice();
    if (focus === 'major') types = types.filter((type) => type !== 'minor');
    if (focus === 'minor') types = types.filter((type) => type !== 'major');
    const type = pick(types.length ? types : ['major'], random);
    const clefs = clefSetting === 'auto' ? config.clefs : [clefSetting];
    let target = type;
    let prompt;
    if (type === 'relative') {
      target = focus === 'major' ? 'major' : focus === 'minor' ? 'minor' : pick(['major', 'minor'], random);
      prompt = target === 'minor'
        ? `What is the relative minor of ${signature.majorLabel}?`
        : `What is the relative major of ${signature.minorLabel}?`;
    } else {
      prompt = target === 'major' ? 'What is this major key signature?' : 'What is this minor key signature?';
    }
    const clef = pick(clefs, random);
    const answer = target === 'major' ? signature.majorLabel : signature.minorLabel;
    const nearby = data.SIGNATURES
      .filter((item) => item.id !== signature.id)
      .sort((left, right) => Math.abs(left.signedCount - signature.signedCount) - Math.abs(right.signedCount - signature.signedCount))
      .slice(0, 3)
      .map((item) => target === 'major' ? item.majorLabel : item.minorLabel);
    const typed = answerMode === 'typed';

    return {
      id: `key-signature:${clef}:${signature.type}:${signature.count}:${target}`,
      seed: String(seed),
      difficulty,
      level: canonicalLevel(difficulty),
      signature,
      type,
      target,
      clef,
      typed,
      prompt,
      answer,
      choices: shuffle([answer, ...nearby], random)
    };
  }

  return Object.freeze({ hashSeed, seededRandom, appLevel, canonicalLevel, buildQuestion });
});
