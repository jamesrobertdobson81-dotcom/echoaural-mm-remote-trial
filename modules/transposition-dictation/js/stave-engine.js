/**
 * Transposition Dictation — js/stave-engine.js
 *
 * Reuses EXISTING EchoAural notation assets rather than drawing new ones:
 *   - Treble/bass: the SAME grand-stave PNGs and clef-split calibration as
 *     Chord Identifier (assets/staves/*.png, forked from its
 *     js/notation-engine.js). A "single-clef" excerpt is just a grand stave
 *     whose other half never receives any notes — the asset is unchanged.
 *   - Noteheads: the SAME Sibelius-exported note glyph Melody Master's
 *     dictation skill uses (assets/notes/semiquaver-sibelius.png), not a
 *     custom-drawn shape.
 *   - Accidentals: Chord Identifier's sharp/flat/natural glyphs.
 *   - Alto clef: there is no existing EchoAural asset for this (Chord
 *     Identifier's grand stave is treble+bass only) — this is the one
 *     necessary exception, using the alto-clef image supplied directly by
 *     the user, with a plainly-drawn 5-line staff.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;

  // ---- Grand-stave mode (treble/bass) — forked from Chord Identifier ----
  var GRAND_CANVAS_WIDTH = 480;
  var GRAND_CANVAS_HEIGHT = 401;
  var HALF_SPACE = 10.5;
  var TREBLE_TOP_LINE_Y = 42.5;
  var TREBLE_BOTTOM_LINE_Y = 126.5;
  var BASS_TOP_LINE_Y = 315.5;
  var BASS_BOTTOM_LINE_Y = 399.5;
  var TREBLE_TOP_LINE_STEP = PU.diatonicStep('F5');
  var TREBLE_BOTTOM_LINE_STEP = PU.diatonicStep('E4');
  var BASS_TOP_LINE_STEP = PU.diatonicStep('A3');
  var BASS_BOTTOM_LINE_STEP = PU.diatonicStep('G2');

  var ACCIDENTAL_ASSETS = {
    1: { src: 'assets/notation/sharp.png', width: 23, height: 59 },
    '-1': { src: 'assets/notation/flat.png', width: 21, height: 52 },
    0: { src: 'assets/notation/natural.png', width: 20, height: 61 }
  };

  // Melody Master's semiquaver note glyph (stem + flag baked in). Calibrated
  // by measuring assets/notes/notehead-masks/semiquaver-sibelius-notehead-mask.png:
  // the notehead's own centre sits at 30.1% / 85.5% of the full glyph's own
  // width/height, and the glyph's native aspect ratio is 941:1671.
  var NOTE_GLYPHS = {
    'semiquaver-sibelius': { src: 'assets/notes/semiquaver-sibelius.png', nativeW: 941, nativeH: 1671, anchorXPct: 30.1, anchorYPct: 85.5 }
  };
  var NOTE_RENDER_HEIGHT_GRAND = 112; // px within the 480x401 grand-stave canvas — ~1 line-space tall notehead
  var NOTE_GAP_X_GRAND = 44;
  var NOTE_START_X_GRAND_TREBLE = 220;
  var NOTE_START_X_GRAND_BASS = 220;

  function clefRangeForClef(clef) {
    if (clef === 'treble') return { topY: TREBLE_TOP_LINE_Y, topStep: TREBLE_TOP_LINE_STEP, bottomStep: TREBLE_BOTTOM_LINE_STEP };
    return { topY: BASS_TOP_LINE_Y, topStep: BASS_TOP_LINE_STEP, bottomStep: BASS_BOTTOM_LINE_STEP };
  }

  function yForPitchGrand(pitch, clef) {
    var step = PU.diatonicStep(pitch);
    var range = clefRangeForClef(clef);
    return range.topY - (step - range.topStep) * HALF_SPACE;
  }

  function ledgerStepsForPitchGrand(pitch, clef) {
    var step = PU.diatonicStep(pitch);
    var range = clefRangeForClef(clef);
    var steps = [];
    if (step < range.bottomStep) {
      for (var s = range.bottomStep - 2; s >= step; s -= 2) steps.push(s);
    } else if (step > range.topStep) {
      for (var t = range.topStep + 2; t <= step; t += 2) steps.push(t);
    }
    return steps;
  }

  function accidentalOf(pitch) {
    return PU.parsePitch(pitch).accidental;
  }

  /**
   * `excerpt`: { clef: 'treble'|'bass', keyId: <chord-identifier key id>,
   *   notes: [{ pitch, showAccidental }] }
   * Uses Chord Identifier's own key data (data/keys.js) so the SAME
   * staveAsset + key-signature accidental map are reused unchanged.
   */
  function buildGrandStaveRenderPlan(excerpt, KeysData) {
    var key = KeysData.findKey(excerpt.keyId);
    var clef = excerpt.clef;
    var noteStartX = clef === 'treble' ? NOTE_START_X_GRAND_TREBLE : NOTE_START_X_GRAND_BASS;
    var glyph = NOTE_GLYPHS['semiquaver-sibelius'];
    var renderW = NOTE_RENDER_HEIGHT_GRAND * (glyph.nativeW / glyph.nativeH);

    var notes = excerpt.notes.map(function (note, index) {
      var pitch = note.pitch;
      var targetY = yForPitchGrand(pitch, clef);
      var x = noteStartX + index * NOTE_GAP_X_GRAND;
      // Position the glyph so ITS OWN notehead anchor point lands on targetY/x.
      var glyphLeft = x - (glyph.anchorXPct / 100) * renderW;
      var glyphTop = targetY - (glyph.anchorYPct / 100) * NOTE_RENDER_HEIGHT_GRAND;

      var ledgerSteps = ledgerStepsForPitchGrand(pitch, clef);
      var ledgers = ledgerSteps.map(function (step) {
        var range = clefRangeForClef(clef);
        var ly = range.topY - (step - range.topStep) * HALF_SPACE;
        return {
          xPct: ((x - 29) / GRAND_CANVAS_WIDTH) * 100,
          yPct: (ly / GRAND_CANVAS_HEIGHT) * 100,
          widthPct: (58 / GRAND_CANVAS_WIDTH) * 100
        };
      });

      var accidental = null;
      if (note.showAccidental) {
        var asset = ACCIDENTAL_ASSETS[String(accidentalOf(pitch))];
        accidental = {
          src: asset.src,
          xPct: ((x - 25) / GRAND_CANVAS_WIDTH) * 100,
          yPct: (targetY / GRAND_CANVAS_HEIGHT) * 100,
          widthPct: (asset.width / GRAND_CANVAS_WIDTH) * 100,
          heightPct: (asset.height / GRAND_CANVAS_HEIGHT) * 100
        };
      }

      return {
        pitch: pitch,
        src: glyph.src,
        xPct: (glyphLeft / GRAND_CANVAS_WIDTH) * 100,
        yPct: (glyphTop / GRAND_CANVAS_HEIGHT) * 100,
        widthPct: (renderW / GRAND_CANVAS_WIDTH) * 100,
        heightPct: (NOTE_RENDER_HEIGHT_GRAND / GRAND_CANVAS_HEIGHT) * 100,
        accidental: accidental,
        ledgers: ledgers
      };
    });

    return {
      mode: 'grand',
      staveAsset: 'assets/staves/' + key.staveAsset,
      canvasWidth: GRAND_CANVAS_WIDTH,
      canvasHeight: GRAND_CANVAS_HEIGHT,
      aspectRatio: GRAND_CANVAS_WIDTH + ' / ' + GRAND_CANVAS_HEIGHT,
      notes: notes
    };
  }

  // ---- Alto-clef mode — no existing EA asset; the one necessary exception ----
  var ALTO_CANVAS_WIDTH = 480;
  var ALTO_CANVAS_HEIGHT = 160;
  var ALTO_LINE_SPACING = 16;
  var ALTO_TOP_LINE_Y = 48;
  var ALTO_BOTTOM_LINE_Y = ALTO_TOP_LINE_Y + ALTO_LINE_SPACING * 4;
  var ALTO_BOTTOM_LINE_STEP = PU.diatonicStep('F3');
  var ALTO_NOTE_START_X = 210;
  var ALTO_NOTE_GAP_X = 46;
  var ALTO_NOTE_RENDER_HEIGHT = 46; // px, ~1 line-space tall notehead in this smaller canvas

  function yForPitchAlto(pitch) {
    var step = PU.diatonicStep(pitch);
    return ALTO_BOTTOM_LINE_Y - (step - ALTO_BOTTOM_LINE_STEP) * (ALTO_LINE_SPACING / 2);
  }

  function ledgerStepsForPitchAlto(pitch) {
    var step = PU.diatonicStep(pitch);
    var topStep = ALTO_BOTTOM_LINE_STEP + 8;
    var steps = [];
    if (step < ALTO_BOTTOM_LINE_STEP) {
      for (var s = ALTO_BOTTOM_LINE_STEP - 2; s >= step; s -= 2) steps.push(s);
    } else if (step > topStep) {
      for (var t = topStep + 2; t <= step; t += 2) steps.push(t);
    }
    return steps;
  }

  function buildAltoRenderPlan(excerpt) {
    var glyph = NOTE_GLYPHS['semiquaver-sibelius'];
    var renderW = ALTO_NOTE_RENDER_HEIGHT * (glyph.nativeW / glyph.nativeH);

    var notes = excerpt.notes.map(function (note, index) {
      var pitch = note.pitch;
      var targetY = yForPitchAlto(pitch);
      var x = ALTO_NOTE_START_X + index * ALTO_NOTE_GAP_X;
      var glyphLeft = x - (glyph.anchorXPct / 100) * renderW;
      var glyphTop = targetY - (glyph.anchorYPct / 100) * ALTO_NOTE_RENDER_HEIGHT;

      var ledgerSteps = ledgerStepsForPitchAlto(pitch);
      var ledgers = ledgerSteps.map(function (step) {
        var ly = ALTO_BOTTOM_LINE_Y - (step - ALTO_BOTTOM_LINE_STEP) * (ALTO_LINE_SPACING / 2);
        return {
          xPct: ((x - 15) / ALTO_CANVAS_WIDTH) * 100,
          yPct: (ly / ALTO_CANVAS_HEIGHT) * 100,
          widthPct: (30 / ALTO_CANVAS_WIDTH) * 100
        };
      });

      return {
        pitch: pitch,
        src: glyph.src,
        xPct: (glyphLeft / ALTO_CANVAS_WIDTH) * 100,
        yPct: (glyphTop / ALTO_CANVAS_HEIGHT) * 100,
        widthPct: (renderW / ALTO_CANVAS_WIDTH) * 100,
        heightPct: (ALTO_NOTE_RENDER_HEIGHT / ALTO_CANVAS_HEIGHT) * 100,
        accidental: null,
        ledgers: ledgers
      };
    });

    return {
      mode: 'alto',
      clefSrc: 'assets/notation/alto-clef.png',
      canvasWidth: ALTO_CANVAS_WIDTH,
      canvasHeight: ALTO_CANVAS_HEIGHT,
      aspectRatio: ALTO_CANVAS_WIDTH + ' / ' + ALTO_CANVAS_HEIGHT,
      lineYs: [0, 1, 2, 3, 4].map(function (i) { return ALTO_TOP_LINE_Y + i * ALTO_LINE_SPACING; }),
      // alto-clef.png is a crop that still has its OWN baked-in 5 lines
      // (21px spacing in its native 80x88 frame) — scaled so those coincide
      // exactly with the lines drawn above, per the original calibration.
      clefGlyph: {
        xPct: (24 / ALTO_CANVAS_WIDTH) * 100,
        yPct: ((ALTO_TOP_LINE_Y - 1.5 * (ALTO_LINE_SPACING * 4 / 84)) / ALTO_CANVAS_HEIGHT) * 100,
        widthPct: ((80 / 88) * (ALTO_LINE_SPACING * 4 / 84) * 88 / ALTO_CANVAS_WIDTH) * 100,
        heightPct: ((ALTO_LINE_SPACING * 4 * (88 / 84)) / ALTO_CANVAS_HEIGHT) * 100
      },
      notes: notes
    };
  }

  function buildRenderPlan(excerpt, KeysData) {
    if (excerpt.clef === 'alto') return buildAltoRenderPlan(excerpt);
    return buildGrandStaveRenderPlan(excerpt, KeysData);
  }

  root.EATranspositionStave = {
    buildRenderPlan: buildRenderPlan
  };
})(typeof window !== 'undefined' ? window : globalThis);
