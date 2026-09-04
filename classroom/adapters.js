'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Cheap fallback duration used when no real getAudioDurationSeconds (mp3
// header parsing) is supplied — fine for callers that only need question
// metadata/ids (e.g. accounts/account-server.js's homework routes, which
// never serve audio directly), but classroom-server.js's own Live Session
// player passes its accurate getMp3DurationSeconds in instead.
const FALLBACK_AUDIO_DURATION_SECONDS = () => 10;

// The one canonical list of classroom teacher-adapters — shared by
// classroom-server.js (Live Session rooms) and accounts/account-server.js
// (homework assignment creation), so both build question sets from the
// identical live question banks rather than two independently-maintained
// adapter lists that could silently drift apart.
function createAdapters(projectRoot, options = {}) {
  const getAudioDurationSeconds = typeof options.getAudioDurationSeconds === 'function'
    ? options.getAudioDurationSeconds
    : FALLBACK_AUDIO_DURATION_SECONDS;
  const context = { path, fs, vm, projectRoot, getAudioDurationSeconds, useLevelledQuestions: false };
  const melodyAdapter = require(path.join(projectRoot, 'modules', 'melody-master', 'teacher-adapter.js'))(context);
  const instrumentAdapter = require(path.join(projectRoot, 'modules', 'instrument-identifier', 'teacher-adapter.js'))(context);
  const textureAdapter = require(path.join(projectRoot, 'modules', 'texture-trainer', 'teacher-adapter.js'))(context);
  const melodicIntervalsAdapter = require(path.join(projectRoot, 'modules', 'melodic-intervals', 'teacher-adapter.js'))(context);
  const cadenceAdapter = require(path.join(projectRoot, 'modules', 'cadence-coach', 'teacher-adapter.js'))(context);
  const meterAdapter = require(path.join(projectRoot, 'modules', 'meter-master', 'teacher-adapter.js'))(context);
  const musicalLanguageAdapter = require(path.join(projectRoot, 'modules', 'musical-language', 'teacher-adapter.js'))(context);
  const structureSpotterAdapter = require(path.join(projectRoot, 'modules', 'structure-spotter', 'teacher-adapter.js'))(context);
  const ensembleAdapter = require(path.join(projectRoot, 'modules', 'ensemble-recognition', 'teacher-adapter.js'))(context);
  const keySignatureAdapter = require(path.join(projectRoot, 'modules', 'harmony-explorer', 'key-signature-sprint', 'teacher-adapter.js'))(context);
  const chordIdentifierAdapter = require(path.join(projectRoot, 'modules', 'chord-identifier', 'teacher-adapter.js'))(context);
  const contextCoachAdapter = require(path.join(projectRoot, 'era-explorer', 'teacher-adapter.js'))(context);
  const examLabAdapter = require(path.join(projectRoot, 'modules', 'exam-lab', 'teacher-adapter.js'))({
    ...context,
    moduleDir: path.join(projectRoot, 'modules', 'exam-lab')
  });
  return [melodyAdapter, instrumentAdapter, textureAdapter, melodicIntervalsAdapter, ensembleAdapter, cadenceAdapter, meterAdapter, musicalLanguageAdapter, structureSpotterAdapter, keySignatureAdapter, chordIdentifierAdapter, contextCoachAdapter, examLabAdapter];
}

module.exports = { createAdapters };
