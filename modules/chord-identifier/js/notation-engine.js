/**
 * Chord Identifier — js/notation-engine.js
 *
 * Turns a generated question object into a list of things to draw: which
 * grand-stave PNG, and where every notehead/accidental/ledger-line sits,
 * expressed as PERCENTAGES of a fixed-aspect canvas so the caller can just
 * position absolutely-positioned elements inside a responsive container.
 *
 * Calibration below was measured directly from the supplied grand-stave
 * PNG assets (assets/staves/*.png, all cropped to 480x401) — see the
 * stave-line pixel rows documented inline. Do not hand-tune these without
 * re-measuring the source art.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;

  var CANVAS_WIDTH = 480;
  var CANVAS_HEIGHT = 401;

  // Measured from assets/staves/*.png: treble lines at rows 42.5/63.5/84.5/105.5/126.5,
  // bass lines at rows 315.5/336.5/357.5/378.5/399.5 — both 21px line-spacing.
  var HALF_SPACE = 10.5;
  var TREBLE_TOP_LINE_Y = 42.5;
  var TREBLE_BOTTOM_LINE_Y = 126.5;
  var BASS_TOP_LINE_Y = 315.5;
  var BASS_BOTTOM_LINE_Y = 399.5;

  var TREBLE_TOP_LINE_STEP = PU.diatonicStep('F5'); // top line of treble = F5
  var TREBLE_BOTTOM_LINE_STEP = PU.diatonicStep('E4'); // bottom line of treble = E4
  var BASS_TOP_LINE_STEP = PU.diatonicStep('A3'); // top line of bass = A3
  var BASS_BOTTOM_LINE_STEP = PU.diatonicStep('G2'); // bottom line of bass = G2

  var CLEF_SPLIT_STEP = PU.diatonicStep('C4'); // >= middle C -> treble, below -> bass

  var NOTE_CENTER_X = 340; // canvas units — chord cluster's horizontal centre
  var COLLISION_OFFSET_X = 27; // how far a colliding (2nd-apart) note shifts right
  var ACCIDENTAL_GAP_X = 25; // distance an accidental sits left of its notehead
  var LEDGER_WIDTH = 58; // canvas units — wider than NOTEHEAD_NATIVE.width so it overhangs both sides

  var NOTEHEAD_NATIVE = { width: 44, height: 22 };
  var ACCIDENTAL_ASSETS = {
    1: { src: 'assets/notation/sharp.png', width: 23, height: 59 },
    '-1': { src: 'assets/notation/flat.png', width: 21, height: 52 },
    0: { src: 'assets/notation/natural.png', width: 20, height: 61 }
  };

  function clefForPitch(pitch) {
    return PU.diatonicStep(pitch) >= CLEF_SPLIT_STEP ? 'treble' : 'bass';
  }

  function yForPitch(pitch) {
    var step = PU.diatonicStep(pitch);
    var clef = clefForPitch(pitch);
    var topLineY = clef === 'treble' ? TREBLE_TOP_LINE_Y : BASS_TOP_LINE_Y;
    var topLineStep = clef === 'treble' ? TREBLE_TOP_LINE_STEP : BASS_TOP_LINE_STEP;
    return topLineY - (step - topLineStep) * HALF_SPACE;
  }

  /** Steps (not pixels) at which a short ledger line is needed for this pitch. */
  function ledgerStepsForPitch(pitch) {
    var step = PU.diatonicStep(pitch);
    var clef = clefForPitch(pitch);
    var bottomStep = clef === 'treble' ? TREBLE_BOTTOM_LINE_STEP : BASS_BOTTOM_LINE_STEP;
    var topStep = clef === 'treble' ? TREBLE_TOP_LINE_STEP : BASS_TOP_LINE_STEP;
    var steps = [];
    if (step < bottomStep) {
      for (var s = bottomStep - 2; s >= step; s -= 2) steps.push(s);
    } else if (step > topStep) {
      for (var t = topStep + 2; t <= step; t += 2) steps.push(t);
    }
    return { clef: clef, steps: steps };
  }

  function ledgerStepToY(step, clef) {
    var topLineY = clef === 'treble' ? TREBLE_TOP_LINE_Y : BASS_TOP_LINE_Y;
    var topLineStep = clef === 'treble' ? TREBLE_TOP_LINE_STEP : BASS_TOP_LINE_STEP;
    return topLineY - (step - topLineStep) * HALF_SPACE;
  }

  /**
   * Only show an accidental when the pitch's actual accidental differs from
   * what the key signature alone implies for that letter (section 10).
   * Returns null (no accidental drawn) or the semitone offset to render
   * (-1 flat, 0 natural, 1 sharp; +/-2 rendered as the nearest we support).
   */
  function accidentalNeeded(pitch, key) {
    var p = PU.parsePitch(pitch);
    var implied = (key.accidentalMap && key.accidentalMap[p.letter]) || 0;
    if (p.accidental === implied) return null;
    // Clamp to what we have glyphs for; double sharps/flats fall back to single.
    if (p.accidental > 0) return 1;
    if (p.accidental < 0) return -1;
    return 0;
  }

  /**
   * Build the full render plan for a question: stave background + one entry
   * per chord tone (x%, y%, optional accidental, ledger lines), all as
   * percentages of the canvas so the caller can size the container however
   * it likes and everything scales together as one unit (section 5 & 37).
   */
  function buildRenderPlan(question, keyData) {
    var pitches = question.displayPitches;
    var collisions = question.secondCollisions || pitches.map(function () { return false; });

    var notes = pitches.map(function (pitch, index) {
      var y = yForPitch(pitch);
      var x = NOTE_CENTER_X + (collisions[index] ? COLLISION_OFFSET_X : 0);
      var accSemitone = accidentalNeeded(pitch, keyData);
      var ledgerInfo = ledgerStepsForPitch(pitch);

      var accidental = null;
      if (accSemitone !== null) {
        var asset = ACCIDENTAL_ASSETS[String(accSemitone)];
        accidental = {
          src: asset.src,
          widthPct: (asset.width / CANVAS_WIDTH) * 100,
          heightPct: (asset.height / CANVAS_HEIGHT) * 100,
          xPct: ((x - ACCIDENTAL_GAP_X) / CANVAS_WIDTH) * 100,
          yPct: (y / CANVAS_HEIGHT) * 100
        };
      }

      var ledgers = ledgerInfo.steps.map(function (step) {
        var ly = ledgerStepToY(step, ledgerInfo.clef);
        return {
          xPct: ((x - LEDGER_WIDTH / 2) / CANVAS_WIDTH) * 100,
          yPct: (ly / CANVAS_HEIGHT) * 100,
          widthPct: (LEDGER_WIDTH / CANVAS_WIDTH) * 100
        };
      });

      return {
        pitch: pitch,
        clef: clefForPitch(pitch),
        xPct: (x / CANVAS_WIDTH) * 100,
        yPct: (y / CANVAS_HEIGHT) * 100,
        widthPct: (NOTEHEAD_NATIVE.width / CANVAS_WIDTH) * 100,
        heightPct: (NOTEHEAD_NATIVE.height / CANVAS_HEIGHT) * 100,
        accidental: accidental,
        ledgers: ledgers
      };
    });

    return {
      staveAsset: 'assets/staves/' + keyData.staveAsset,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      aspectRatio: CANVAS_WIDTH + ' / ' + CANVAS_HEIGHT,
      notes: notes
    };
  }

  root.EAChordNotation = {
    CANVAS_WIDTH: CANVAS_WIDTH,
    CANVAS_HEIGHT: CANVAS_HEIGHT,
    clefForPitch: clefForPitch,
    yForPitch: yForPitch,
    ledgerStepsForPitch: ledgerStepsForPitch,
    accidentalNeeded: accidentalNeeded,
    buildRenderPlan: buildRenderPlan
  };
})(typeof window !== 'undefined' ? window : globalThis);
