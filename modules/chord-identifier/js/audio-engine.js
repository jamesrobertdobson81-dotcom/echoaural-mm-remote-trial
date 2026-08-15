/**
 * Chord Identifier — js/audio-engine.js
 *
 * Plays arrays of pitch strings through the Web Audio API using recorded
 * piano samples (together or arpeggiated). Knows nothing about chords, keys
 * or questions — just "play these pitches". Section 24-28 of the spec.
 *
 * Samples live in audio/piano/ and are named by sounding pitch class + the
 * scientific-pitch octave (e.g. "Cs4.mp3" for C#4), covering every pitch
 * class across octaves 0-5 plus C6. Only sharp spellings exist as files, so
 * any pitch is resolved to its MIDI number first and re-spelled with sharps
 * to find its sample — this is what makes enharmonic spellings (Db3 vs C#3)
 * share the same sample automatically.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;

  var AUDIO_BASE = 'audio/piano/';
  var SHARP_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  // The raw recordings are labelled one octave below the pitch they actually
  // sound — confirmed by FFT: "A3.mp3" sounds concert-pitch A4 (440Hz) and
  // "C3.mp3" sounds middle C (C4), the manufacturer/MIDI octave convention
  // rather than the scientific-pitch one this app's pitch strings use.
  // sampleFileForMidi() corrects for that with an extra octave-down shift.
  var MIN_SAMPLE_MIDI = 24; // C1 (actual sounding pitch) — lowest note with a same-named file at every pitch class
  var MAX_SAMPLE_MIDI = 95; // B6 (actual sounding pitch) — highest note with a same-named file at every pitch class

  var ctx = null;
  var masterGain = null;
  var bufferCache = {}; // filename -> Promise<AudioBuffer>

  function getContext() {
    if (ctx) return ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  /** Must be called from a user-gesture handler (Play button click) to satisfy autoplay policies. */
  function unlock() {
    var c = getContext();
    if (c.state === 'suspended') return c.resume();
    return Promise.resolve();
  }

  /** Sample filename (no extension) for a given MIDI note, always sharp-spelled. */
  function sampleFileForMidi(midi) {
    var clamped = Math.max(MIN_SAMPLE_MIDI, Math.min(MAX_SAMPLE_MIDI, Math.round(midi)));
    var pitchClass = ((clamped % 12) + 12) % 12;
    var octave = Math.floor(clamped / 12) - 2;
    return SHARP_NAMES[pitchClass] + octave;
  }

  /** Fetch + decode a pitch's sample, caching the decode promise so repeats are free. */
  function loadBuffer(midi) {
    var file = sampleFileForMidi(midi);
    if (bufferCache[file]) return bufferCache[file];
    var promise = fetch(AUDIO_BASE + file + '.mp3')
      .then(function (response) { return response.arrayBuffer(); })
      .then(function (data) { return getContext().decodeAudioData(data); });
    bufferCache[file] = promise;
    return promise;
  }

  /** Schedule one decoded sample to start at `startTime`, scaled by `gainScale`. */
  function playBuffer(buffer, startTime, gainScale) {
    var c = getContext();
    var source = c.createBufferSource();
    source.buffer = buffer;

    var noteGain = c.createGain();
    var peak = Math.min(1, 0.95 * gainScale);
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + 0.008);

    source.connect(noteGain);
    noteGain.connect(masterGain);
    source.start(startTime);
  }

  function loadPitches(pitches) {
    return Promise.all(pitches.map(function (pitch) { return loadBuffer(PU.midiNumber(pitch)); }));
  }

  /** Play every pitch simultaneously (section 26). */
  function playChord(pitches, options) {
    return unlock().then(function () {
      return loadPitches(pitches).then(function (buffers) {
        var c = getContext();
        var gainScale = 1 / Math.sqrt(Math.max(1, pitches.length));
        var startTime = c.currentTime + 0.03;
        buffers.forEach(function (buffer) { playBuffer(buffer, startTime, gainScale); });
        return startTime;
      });
    });
  }

  /** Play bass-to-top with a short delay between each note (section 27). */
  function arpeggiateChord(pitches, options) {
    return unlock().then(function () {
      return loadPitches(pitches).then(function (buffers) {
        var c = getContext();
        var stepMs = (options && options.stepMs) || 180;
        var gainScale = 1 / Math.sqrt(Math.max(1, pitches.length)) * 1.15;
        var startTime = c.currentTime + 0.03;
        buffers.forEach(function (buffer, index) {
          playBuffer(buffer, startTime + (index * stepMs) / 1000, gainScale);
        });
        return startTime;
      });
    });
  }

  root.EAChordAudio = {
    unlock: unlock,
    playChord: playChord,
    arpeggiateChord: arpeggiateChord,
    getContext: getContext
  };
})(typeof window !== 'undefined' ? window : globalThis);
