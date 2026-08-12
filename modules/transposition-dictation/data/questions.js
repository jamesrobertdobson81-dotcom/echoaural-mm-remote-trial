/**
 * Transposition Dictation — data/questions.js
 *
 * A FIXED set of questions (not randomly generated — see chat decision:
 * "Fixed set of exactly 10"). Each question pairs a real, rights-free
 * recording with a hand-verified 2-bar (or, where noted, 1-bar) excerpt in
 * its ORIGINAL clef, and asks the student to pick the correct transcription
 * of the SAME sounding pitches into a TARGET clef from 4 rendered options.
 *
 * `sourceNotes`: the excerpt exactly as it appears in the real score, in its
 *   original clef — what's shown alongside the audio.
 * `answerNotes`: the same pitches, correctly respelled for `targetClef`.
 * `distractors`: 3 plausible-wrong note sets in the target clef, each
 *   tagged with the specific misreading it represents (for feedback text).
 *
 * VERIFICATION STATUS is tracked per question — see each entry's `verified`
 * field and comment. Only `verified: true` questions have been checked
 * against the actual score; others are placeholders to fill in next.
 */
(function (root) {
  'use strict';

  var QUESTIONS = [
    {
      id: 'q01-bach-s1-prelude',
      verified: true,
      title: 'J.S. Bach — Cello Suite No.1 in G major, BWV 1007, Prélude (bar 1)',
      performer: 'Recording: Wikimedia Commons, public domain / CC-BY-SA — solo cello',
      audioSrc: 'assets/audio/bach-s1-prelude-bar1.ogg',
      sourceClef: 'bass',
      targetClef: 'treble',
      keyId: 'g-major',
      // Verified against the Grützmacher edition score (IMSLP/Internet
      // Archive, public domain): the famous "open G string" broken-chord
      // opening — G2 D3 B2 D3 repeated, outlining a G major chord.
      sourceNotes: ['G2', 'D3', 'B2', 'D3', 'G3', 'D3', 'B2', 'D3'],
      answerNotes: ['G2', 'D3', 'B2', 'D3', 'G3', 'D3', 'B2', 'D3'],
      distractors: [
        {
          label: 'Octave error',
          notes: ['G3', 'D4', 'B3', 'D4', 'G4', 'D4', 'B3', 'D4']
        },
        {
          label: 'Read bass-clef lines directly onto treble-clef lines (ignoring the clef change)',
          notes: ['A3', 'F4', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4']
        },
        {
          label: 'Wrong note on beat 3 (B mistaken for C)',
          notes: ['G2', 'D3', 'C3', 'D3', 'G3', 'D3', 'C3', 'D3']
        }
      ]
    }

    // Remaining 9 questions to be added once verified against the score /
    // supplied by the user (Telemann viola-part PDF for the alto-clef
    // questions; remaining Bach Suite 1 & 3 movements for more bass<->treble
    // variety).
  ];

  root.EATranspositionQuestions = QUESTIONS;
})(typeof window !== 'undefined' ? window : globalThis);
