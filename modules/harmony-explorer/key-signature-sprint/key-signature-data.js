(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EAKeySignatureSprintData = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LETTERS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'];
  const MINORS = ['A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'D', 'G', 'C', 'F', 'B♭', 'E♭', 'A♭'];
  const COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7];

  function textName(value) {
    return value.replace('♯', '-sharp').replace('♭', '-flat');
  }

  const SIGNATURES = COUNTS.map((signedCount, index) => {
    const type = signedCount > 0 ? 'sharp' : signedCount < 0 ? 'flat' : 'natural';
    const count = Math.abs(signedCount);
    const major = LETTERS[index];
    const minor = MINORS[index];
    return {
      id: `${type}-${count}`,
      signedCount,
      count,
      type,
      major,
      minor,
      majorLabel: `${major} major`,
      minorLabel: `${minor} minor`,
      pairLabel: `${major} major and ${minor} minor`,
      displayLabel: count ? `${count} ${type}${count === 1 ? '' : 's'}` : 'No sharps or flats',
      difficulty: count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4,
      supportedClefs: ['treble', 'bass'],
      accepted: {
        major: [major, `${major} major`, `${major} maj`, textName(major), `${textName(major)} major`],
        minor: [minor, `${minor} minor`, `${minor} min`, textName(minor), `${textName(minor)} minor`]
      }
    };
  });

  const LEVELS = {
    foundation: { name: 'Foundations', maxAccidentals: 2, clefs: ['treble'], writtenChance: 0, types: ['major'] },
    developing: { name: 'Developing', maxAccidentals: 4, clefs: ['treble', 'bass'], writtenChance: 0.15, types: ['major', 'minor', 'relative'] },
    secure: { name: 'Secure', maxAccidentals: 7, clefs: ['treble', 'bass'], writtenChance: 0.5, types: ['major', 'minor', 'relative'] },
    exam: { name: 'Exam Challenge', maxAccidentals: 7, clefs: ['treble', 'bass'], writtenChance: 0.9, types: ['major', 'minor', 'relative'] }
  };

  function normalise(value) {
    return String(value || '').toLowerCase().trim()
      .replace(/[‐‑–—-]/g, ' ')
      .replace(/♯|#/g, ' sharp ')
      .replace(/♭/g, ' flat ')
      .replace(/\bmaj\b/g, 'major')
      .replace(/\bmin\b/g, 'minor')
      .replace(/\band\b|&|\//g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function acceptable(answer, expected, mode) {
    if (mode === 'count') return Number.parseInt(answer, 10) === Number(expected);
    if (mode === 'pair') {
      const parts = expected.split('|');
      const input = normalise(answer);
      return parts.every((part) => input.includes(normalise(part)));
    }
    return normalise(answer) === normalise(expected)
      || normalise(answer) === normalise(expected).replace(` ${mode}`, '');
  }

  function pool(maxAccidentals, accidentalRange) {
    return SIGNATURES.filter((item) => item.count <= maxAccidentals
      && (accidentalRange === 'all' || accidentalRange === item.type || item.type === 'natural'));
  }

  return { SIGNATURES, LEVELS, normalise, acceptable, pool };
});
