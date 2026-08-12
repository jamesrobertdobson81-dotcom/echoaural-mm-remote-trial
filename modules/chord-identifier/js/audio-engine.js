/**
 * Chord Identifier — js/audio-engine.js
 *
 * Plays arrays of pitch strings through the Web Audio API. Knows nothing
 * about chords, keys or questions — just "play these pitches" (together or
 * arpeggiated). Section 24-28 of the spec.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;

  var ctx = null;
  var masterGain = null;

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

  /**
   * One pleasant note: triangle body + quiet sine underneath, fast attack,
   * gentle decay, ~1.6s duration. `gainScale` divides loudness so chords
   * with more notes don't clip (volume ~ 1/sqrt(noteCount), section 25).
   */
  function playNote(pitch, startTime, duration, gainScale) {
    var c = getContext();
    var freq = PU.frequency(pitch);

    var body = c.createOscillator();
    body.type = 'triangle';
    body.frequency.value = freq;

    var sub = c.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq;

    var noteGain = c.createGain();
    var subGain = c.createGain();
    subGain.gain.value = 0.35;

    var attack = 0.012;
    var release = duration * 0.82;
    var peak = 0.85 * gainScale;

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + attack);
    noteGain.gain.setTargetAtTime(0, startTime + attack, release / 4);

    body.connect(noteGain);
    sub.connect(subGain);
    subGain.connect(noteGain);
    noteGain.connect(masterGain);

    body.start(startTime);
    sub.start(startTime);
    body.stop(startTime + duration + 0.05);
    sub.stop(startTime + duration + 0.05);
  }

  /** Play every pitch simultaneously (section 26). */
  function playChord(pitches, options) {
    return unlock().then(function () {
      var c = getContext();
      var duration = (options && options.duration) || 1.7;
      var gainScale = 1 / Math.sqrt(Math.max(1, pitches.length));
      var startTime = c.currentTime + 0.02;
      pitches.forEach(function (pitch) { playNote(pitch, startTime, duration, gainScale); });
      return startTime;
    });
  }

  /** Play bass-to-top with a short delay between each note (section 27). */
  function arpeggiateChord(pitches, options) {
    return unlock().then(function () {
      var c = getContext();
      var stepMs = (options && options.stepMs) || 180;
      var duration = (options && options.duration) || 1.4;
      var gainScale = 1 / Math.sqrt(Math.max(1, pitches.length)) * 1.15;
      var startTime = c.currentTime + 0.02;
      pitches.forEach(function (pitch, index) {
        playNote(pitch, startTime + (index * stepMs) / 1000, duration, gainScale);
      });
      return startTime;
    });
  }

  root.EAChordAudio = {
    unlock: unlock,
    playChord: playChord,
    arpeggiateChord: arpeggiateChord,
    getContext: getContext
  };
})(typeof window !== 'undefined' ? window : globalThis);
