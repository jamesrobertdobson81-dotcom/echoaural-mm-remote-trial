// EchoAural concept-value extraction — the one canonical definition of how a
// raw answer's fields (inversionLabel, quality, family, type, textureFocus,
// metreFamily, accidentalType, accidentalCount, ...) turn into the small set
// of clean, whitelisted/bucketed "concept" values modules/progress-mode/
// feedback.js's CONCEPT_PHRASES bank has copy for.
//
// Moved out of accounts/account-server.js (where it originally lived inline,
// used only for Live Session/Homework evidence) so Progress Mode's own
// client-side code can derive concept values from a PM answer using the
// EXACT same rules — same whitelist casing, same bucket thresholds, same
// World/Ensemble collision exclusion — rather than a second, driftable copy.
// A concept value this produces is only ever meaningful if it also appears
// as a key in feedback.js's CONCEPT_PHRASES for the same moduleId; any value
// that doesn't match yet is presumed a genuine data/content gap, not a bug
// here.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EchoAuralConceptExtractors = factory();
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this), function createConceptExtractors() {
  "use strict";

  function chordExtensionTier(quality) {
    var q = String(quality || "").toLowerCase();
    if (!q) return null;
    if (q.includes("9") || q.includes("sus")) return "Extended chords";
    if (q.includes("7")) return "Seventh chords";
    if (["major", "minor", "diminished", "augmented"].includes(q)) return "Triads";
    return null;
  }

  function accidentalCountTier(count) {
    var n = Math.abs(Number(count));
    if (!Number.isFinite(n)) return null;
    return n <= 2 ? "Few accidentals (0-2)" : n <= 4 ? "Moderate accidentals (3-4)" : "Many accidentals (5-7)";
  }

  function simpleCompoundTier(metreFamily) {
    var value = String(metreFamily || "");
    if (value.startsWith("Simple")) return "Simple time";
    if (value.startsWith("Compound")) return "Compound time";
    return null;
  }

  // recognitionType==='inversion' deliberately produces nothing — a question
  // asking "what inversion is this chord in?" tests the same skill the
  // separate `inversionLabel` dimension already captures, so a second
  // concept value here would just double-count that one answer (see
  // extractConceptValues's own per-array-element counting at the call
  // site in store.js/account-server.js).
  function recognitionSkillTier(recognitionType) {
    return recognitionType === "roman" ? "Roman numeral analysis" : null;
  }

  // 'seventh'/'extended' deliberately excluded — they aren't even a
  // perfect match for the existing `quality`-based chordExtensionTier
  // (e.g. a major7 chord buckets to "Seventh chords" by quality but is
  // tagged category:'extended'), so the quality-based bucket stays the
  // sole source for that signal rather than risking a same-answer
  // double-count from two fields landing on the identical string.
  function chordFunctionTier(category) {
    var value = String(category || "");
    if (value === "primary") return "Primary chords";
    if (value === "secondary") return "Secondary chords";
    return null;
  }

  function chordKeyModeTier(mode) {
    var value = String(mode || "").toLowerCase();
    if (value === "major") return "Major keys";
    if (value === "minor") return "Minor keys";
    return null;
  }

  // Only the 5 meter-master question `mode`s with real sample size (5+
  // questions across the whole 83-question bank) — the other 7 modes have
  // just 1-2 underlying questions each, so FEEDBACK_MIN_QUESTIONS(8) could
  // only ever be cleared through repeated spaced-repetition replays of the
  // SAME 1-2 items, which measures recall of that item, not the named
  // skill — defeating the point of the reliability bar.
  var METER_MODE_WHITELIST = new Set([
    "Aural classification", "Skeleton-score completion", "Pulse analysis",
    "Context and style", "Beat-unit analysis"
  ]);
  function meterModeTier(mode) {
    return METER_MODE_WHITELIST.has(mode) ? mode : null;
  }

  // Individual ScoreDecoder ornament/articulation terms only have 2-3
  // questions each in the real bank (nowhere near enough to clear
  // FEEDBACK_MIN_QUESTIONS without heavy repeat draws), so these bucket
  // into a coarser, well-populated pair per topic instead of a per-term
  // whitelist — same "exclude the sparse long tail" discipline as
  // METER_MODE_WHITELIST above, just resolved by grouping rather than
  // exclusion since every term is real and worth keeping some signal for.
  function ornamentTypeTier(term) {
    var value = String(term || "").toLowerCase();
    if (value === "appoggiatura" || value === "acciaccatura") return "Grace-note ornaments";
    if (value === "trill" || value === "mordent" || value === "turn") return "Turning ornaments";
    return null;
  }

  function articulationTypeTier(term) {
    var value = String(term || "").toLowerCase();
    if (value === "legato" || value === "staccato" || value === "tenuto") return "Continuity marks";
    if (value === "accent" || value === "sforzando" || value === "marcato") return "Emphasis marks";
    return null;
  }

  // Dynamics/tempo don't need a hand-authored bucket at all — the CSV's own
  // `term_type` column already makes exactly this static/change split
  // (dynamic_mark/dynamic_change, tempo_word/tempo_change), and it's a
  // real, well-populated distinction (SOURCE_PHRASES already names it:
  // "not just static levels" for dynamics).
  function dynamicChangeTier(termType) {
    if (termType === "dynamic_mark") return "Static dynamic markings";
    if (termType === "dynamic_change") return "Dynamic changes";
    return null;
  }

  function tempoChangeTier(termType) {
    if (termType === "tempo_word") return "Tempo words";
    if (termType === "tempo_change") return "Tempo changes";
    return null;
  }

  // Individual ensembleLabel values are too thin to whitelist directly
  // (String Quartet/Orchestra aside, most have 1-3 questions each in the
  // real 49-question bank) — bucketed by real performing-forces size
  // instead. "Jazz Band" groups with the small ensembles (a combo, not a
  // large classical force) rather than with "world/non-Western", which it
  // isn't.
  var ENSEMBLE_SIZE_SMALL = new Set(["String Quartet", "Duet", "Trio", "Chamber Ensemble", "Jazz Band"]);
  var ENSEMBLE_SIZE_LARGE = new Set(["Orchestra", "Pit Orchestra", "SATB Choir"]);
  var ENSEMBLE_SIZE_WORLD = new Set(["Gamelan", "Arab Takht", "Hindustani classical ensemble (voice, tabla, tanpura/harmonium)"]);
  function ensembleSizeTier(ensembleLabel) {
    var value = String(ensembleLabel || "");
    if (ENSEMBLE_SIZE_SMALL.has(value)) return "Small ensembles";
    if (ENSEMBLE_SIZE_LARGE.has(value)) return "Large ensembles";
    if (ENSEMBLE_SIZE_WORLD.has(value)) return "World and non-Western ensembles";
    return null;
  }

  function requiresScoreTier(value) {
    if (value === true || value === "true") return "Score-reading questions";
    if (value === false || value === "false") return "Listening-only questions";
    return null;
  }

  function iiResponseTypeTier(value) {
    var v = String(value || "").trim().toLowerCase();
    if (v === "typed") return "Typed instrument answers";
    if (v === "mc-custom") return "Custom-choice instrument answers";
    if (v === "") return "Standard multiple-choice instrument answers";
    return null;
  }

  // Existing 14 author-supplied fine-grained values (from the older
  // `textureFocus` field) plus 10 new ones only `specificTextureTerm`'s
  // vocabulary produces — see textureConceptValue below for why these two
  // source fields are merged rather than run as independent extractors.
  var TEXTURE_CONCEPT_WHITELIST = new Set([
    "Monophonic", "Homophonic", "Polyphonic", "Heterophonic", "Fugal imitation",
    "Fugal polyphony", "Fugue", "Canon", "Alberti Bass", "Inverted Pedal",
    "Pedal / drone", "Advanced polyphonic", "Simple polyphonic", "Melody and accompaniment",
    "Antiphonal", "Drone", "Layered texture", "Solo and tutti", "Parallel motion",
    "Homorhythmic", "Chordal homophony", "Imitative texture", "Octaves", "Unison"
  ]);

  // `textureFocus` (older, author-supplied, only present on some questions)
  // and `specificTextureTerm` (newer, always computed by
  // texture-question-system.js's normaliseQuestion, guaranteed present) are
  // two different vocabularies that partially overlap. A plain
  // `textureFocus || specificTextureTerm` fallback is wrong: real data has
  // many non-empty but unwhitelistable textureFocus values (e.g.
  // "Homophonic texture", "Monophonic texture") that would win the `||`
  // and never fall through to the reliable field. So: prefer textureFocus
  // only when it's actually a recognized value (preserving the fine
  // polyphony-subtype phrases authors sometimes provide directly),
  // otherwise fall back to specificTextureTerm if THAT is recognized.
  // Multi-stage "texture change" values (e.g. "Monophonic → fugal
  // polyphony") are excluded outright — describing how a texture develops
  // over time is a different skill from naming a static one.
  function hasArrow(value) {
    return Boolean(value) && String(value).indexOf("→") !== -1;
  }

  function textureConceptValue(fields) {
    // `target` is the field that MOST reliably carries the arrow on a
    // multi-stage question — some of these questions omit `textureFocus`
    // entirely, and `specificTextureTerm`'s own inference (texture-
    // question-system.js's inferSpecificTerm) reads `target` as part of
    // its keyword-matching fallback text, so it can silently resolve to
    // ONE side of the transition (e.g. "Fugal imitation" for a
    // "Monophonic → fugal polyphony" question) even when textureFocus
    // itself is absent or already excluded. Checking `target` first closes
    // that leak — verified directly against modules/texture-trainer/
    // data/texture-questions.js's real TT013/TT014-style entries.
    if (hasArrow(fields.target) || hasArrow(fields.textureFocus)) return null;
    var raw = fields.textureFocus;
    if (raw && TEXTURE_CONCEPT_WHITELIST.has(raw)) return raw;
    var specific = fields.specificTextureTerm;
    if (specific && TEXTURE_CONCEPT_WHITELIST.has(specific)) return specific;
    return null;
  }

  var CONCEPT_EXTRACTORS_BY_MODULE = {
    "chord-identifier": [
      { field: "inversionLabel", whitelist: new Set(["root position", "first inversion", "second inversion", "third inversion"]) },
      { field: "quality", bucket: chordExtensionTier },
      { field: "recognitionType", bucket: recognitionSkillTier },
      { field: "category", bucket: chordFunctionTier },
      { field: "keyMode", bucket: chordKeyModeTier }
    ],
    "key-signature-sprint": [
      { field: "accidentalType", whitelist: new Set(["sharp", "flat", "natural"]) },
      { field: "accidentalCount", bucket: accidentalCountTier },
      { field: "type", whitelist: new Set(["major", "minor", "relative"]) },
      { field: "clef", whitelist: new Set(["treble", "bass"]) }
    ],
    "meter-master": [
      { field: "metreFamily", whitelist: new Set(["Simple duple", "Simple triple", "Simple quadruple", "Compound duple", "Compound triple", "Compound quadruple", "Irregular quintuple", "Variable/mixed"]) },
      { field: "metreFamily", bucket: simpleCompoundTier },
      { field: "mode", bucket: meterModeTier },
      { field: "requiresScore", bucket: requiresScoreTier },
      { field: "timeSignature", whitelist: new Set(["3/4", "6/8", "2/4", "4/4", "2/2"]) }
    ],
    "instrument-identifier": [
      { field: "family", whitelist: new Set(["strings", "woodwind", "brass", "percussion", "keyboard", "guitar", "voice", "world/ensemble"]), caseInsensitive: true },
      // "World/Ensemble" deliberately excluded here (kept only in `family`
      // above) — both fields can independently carry that exact string, and
      // since both dimensions feed the same flat per-module concept pool,
      // keeping it in both would silently merge two different meanings
      // (family vs performance context) into one bucket.
      { field: "type", whitelist: new Set(["Orchestral", "Solo", "Piano Accomp.", "Organ Accomp.", "Harpsichord"]) },
      // Hand-curated from the real 351-clip bank: every instrument with 3+
      // clips after merging casing variants (e.g. "VIOLIN"/"Violin"),
      // excluding non-instrument answer text the raw data also contains
      // (long composite/instructional exam-answer strings) and "Tenor"
      // (confirmed a voice-range answer, not an instrument, by checking
      // the actual question text on those clips). "harpsichord" is
      // deliberately excluded here too — verified all 6 harpsichord clips
      // also carry `type: "Harpsichord"`, already whitelisted above, so
      // including it here would double-count the same answer under the
      // identical concept-value string from two fields at once.
      {
        field: "instrument",
        caseInsensitive: true,
        whitelist: new Set([
          "cello", "oboe", "clarinet", "violin", "flute", "trumpet", "recorder",
          "double bass", "viola", "erhu", "acoustic guitar",
          "piano", "french horn", "bandoneon"
        ])
      },
      { field: "responseType", bucket: iiResponseTypeTier }
    ],
    "texture-trainer": [
      { fieldsBucket: textureConceptValue },
      { field: "responseType", whitelist: new Set(["multiple-choice", "short-text", "extended-text"]) }
    ],
    "ensemble-recognition": [
      { field: "category", whitelist: new Set(["Ensemble", "Ensemble Origin"]) },
      { field: "ensembleLabel", bucket: ensembleSizeTier }
    ],
    "melodic-intervals": [
      { field: "intervalLabel", whitelist: new Set(["Unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "Octave"]) },
      { field: "intervalQuality", whitelist: new Set(["Perfect", "Major", "Minor", "Augmented", "Diminished"]) },
      { field: "direction", whitelist: new Set(["ascending", "descending"]) },
      // Reuses the existing key-signature-sprint bucket function as-is —
      // busier key signatures make an interval harder to read off a score,
      // the same real difficulty accidentalCountTier already captures
      // there.
      { field: "keySignatureAccidentals", bucket: accidentalCountTier }
    ],
    // melody-master-devices and melody-master-dictation share this one
    // moduleId, so both skills' dimensions pool together — field names
    // (category vs difficulty) don't collide, same as elsewhere.
    "melody-master": [
      // Excludes "Melody" (1 question) and "Expression" (2 questions) —
      // too thin in the real 75-question bank, same discipline as
      // METER_MODE_WHITELIST.
      { field: "category", whitelist: new Set(["Melodic device", "Ornament", "Mode/Scale", "Word-setting"]) },
      { field: "difficulty", whitelist: new Set(["easy", "medium", "hard"]) }
    ],
    "cadence-coach": [
      // Whitelist, not exclusion by rarity: only Perfect/Imperfect currently
      // have real questions in the 7-question bank, but Plagal/Interrupted
      // are kept whitelisted (they simply won't surface a sentence until
      // real questions exist) rather than special-cased away — the same
      // "let the sample size gate itself" approach METER_MODE_WHITELIST
      // documents, just via natural absence instead of manual exclusion.
      { field: "cadenceType", whitelist: new Set(["Perfect", "Imperfect", "Plagal", "Interrupted"]) },
      { field: "keyMode", bucket: chordKeyModeTier }
    ],
    // All 4 musical-language-* PM sources share this one moduleId, so all
    // 4 topics' dimensions pool together here — each question only ever
    // carries one topic's own term/termType values, so there's no cross-
    // topic collision risk (verified: no term string or term_type value is
    // shared between Tempo/Dynamics/Articulation/Ornamentation).
    "musical-language": [
      { field: "term", bucket: ornamentTypeTier },
      { field: "term", bucket: articulationTypeTier },
      { field: "termType", bucket: dynamicChangeTier },
      { field: "termType", bucket: tempoChangeTier }
    ],
    // Both context-coach-composer and context-coach-period share this one
    // moduleId (era-explorer), so composer and period pool together here —
    // a composer question still contributes composer evidence, a period
    // question still contributes period evidence, same "flat pool, multiple
    // dimensions per answer" shape chord-identifier already uses.
    "era-explorer": [
      // Hand-curated against the real, live-audited clip pool (core.
      // auditEraExplorerClips) — "Renaissance" is a valid period constant
      // but currently has zero live clips, so it's excluded (would author
      // unreachable copy); "20th Century" is kept despite being the
      // thinnest (7 clips) since it's still a real, present period.
      { field: "period", whitelist: new Set(["Baroque", "Classical", "Romantic", "20th Century"]) },
      // Every composer with 3+ live clips. Below that (Handel, Mussorgsky,
      // Mouret, Albinoni, Rimsky-Korsakov — each 1-2 clips) excluded for
      // the same reason as period's Renaissance exclusion.
      {
        field: "composer",
        whitelist: new Set([
          "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Johann Sebastian Bach", "Joseph Haydn",
          "Johannes Brahms", "Frédéric Chopin", "Georg Philipp Telemann", "Felix Mendelssohn",
          "Claude Debussy", "Edvard Grieg", "Antonio Vivaldi", "Robert Schumann",
          "Pyotr Ilyich Tchaikovsky", "Alexander Borodin", "Antonín Dvořák"
        ])
      }
    ]
  };

  // Canonical display casing for whitelisted values matched case-insensitively
  // (instrument-identifier's `family`/`instrument` values are inconsistently
  // cased in the source data, e.g. "BRASS" vs "Brass", "VIOLIN" vs "Violin")
  // — the whitelist above is lowercase for matching; this maps back to how
  // it should actually be displayed/used as a CONCEPT_PHRASES key.
  var CONCEPT_DISPLAY_CASE = {
    strings: "Strings", woodwind: "Woodwind", brass: "Brass", percussion: "Percussion",
    keyboard: "Keyboard", guitar: "Guitar", voice: "Voice", "world/ensemble": "World/Ensemble",
    cello: "Cello", oboe: "Oboe", clarinet: "Clarinet", violin: "Violin", flute: "Flute",
    trumpet: "Trumpet", recorder: "Recorder", "double bass": "Double Bass", viola: "Viola",
    erhu: "Erhu", "acoustic guitar": "Acoustic Guitar",
    piano: "Piano", "french horn": "French Horn", bandoneon: "Bandoneon"
  };

  // Runs every configured extractor for moduleId against one answer's raw
  // fields, returning the array of derived concept values (0, 1, or 2 —
  // some modules have two dimensions, both landing in the same flat pool).
  // `fields` is whatever shape a single answer's data takes — LS's
  // attempt.answer_data server-side, or PM's answer-complete payload
  // client-side; both use the same field names by construction.
  function extractConceptValues(moduleId, fields) {
    var extractors = CONCEPT_EXTRACTORS_BY_MODULE[moduleId];
    if (!extractors || !fields) return [];
    var values = [];
    extractors.forEach(function (extractor) {
      var conceptValue = null;
      if (extractor.fieldsBucket) {
        conceptValue = extractor.fieldsBucket(fields);
      } else {
        var raw = fields[extractor.field];
        if (extractor.bucket) {
          conceptValue = extractor.bucket(raw);
        } else if (extractor.whitelist) {
          var key = extractor.caseInsensitive ? String(raw || "").toLowerCase() : raw;
          if (extractor.whitelist.has(key)) {
            conceptValue = extractor.caseInsensitive ? (CONCEPT_DISPLAY_CASE[key] || raw) : raw;
          }
        }
      }
      if (conceptValue) values.push(conceptValue);
    });
    return values;
  }

  return {
    CONCEPT_EXTRACTORS_BY_MODULE: CONCEPT_EXTRACTORS_BY_MODULE,
    CONCEPT_DISPLAY_CASE: CONCEPT_DISPLAY_CASE,
    chordExtensionTier: chordExtensionTier,
    accidentalCountTier: accidentalCountTier,
    simpleCompoundTier: simpleCompoundTier,
    recognitionSkillTier: recognitionSkillTier,
    chordFunctionTier: chordFunctionTier,
    chordKeyModeTier: chordKeyModeTier,
    meterModeTier: meterModeTier,
    requiresScoreTier: requiresScoreTier,
    iiResponseTypeTier: iiResponseTypeTier,
    textureConceptValue: textureConceptValue,
    extractConceptValues: extractConceptValues
  };
});
