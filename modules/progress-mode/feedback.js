// Progress Mode — per-area written feedback.
//
// Pulled out of script.js so it can also be loaded and called directly by
// the student dashboard (account/student-home/), which reads this folder's
// own store.js/app-drivers.js data to render Progress Mode's "Detailed
// feedback" dialog — Progress Mode itself stays self-contained (see
// store.js's own header comment) and never calls INTO the dashboard; this
// is the dashboard reaching in the other direction, read-only.
(function (global) {
  "use strict";

  // Short strength/focus fragments per source — sub-app names only ever
  // appear inside this written feedback, never as their own scored row.
  // `label` is what the focus sentence names as "focus on next".
  var SOURCE_PHRASES = {
    "instrument-identifier": {
      strength: "recognise instruments and instrumental families confidently",
      focus: "listen more closely for register, attack and tone colour between similar instruments",
      label: "instrument identification"
    },
    "ensemble-recognition": {
      strength: "identify ensembles and performing forces well",
      focus: "compare the size and blend of similar ensembles more carefully",
      label: "ensemble recognition"
    },
    "melody-master-devices": {
      strength: "recognise melodic devices well",
      focus: "name the specific device rather than just spotting that something changes",
      label: "melodic devices"
    },
    "melody-master-dictation": {
      strength: "notate melodic dictations accurately",
      focus: "check whether a passage is ascending, descending or repeated before placing exact pitches",
      label: "melodic dictations"
    },
    "melodic-intervals": {
      strength: "recognise melodic intervals confidently",
      focus: "connect each interval's stave distance to how it actually sounds",
      label: "melodic intervals"
    },
    "musical-language-ornamentation": {
      strength: "recognise ornaments well",
      focus: "learn the less common ornament symbols and their names",
      label: "ornament recognition"
    },
    "musical-language-articulation": {
      strength: "recognise articulation markings well",
      focus: "compare similar articulation marks such as staccato and staccatissimo",
      label: "articulation markings"
    },
    "texture-trainer": {
      strength: "describe musical texture clearly",
      focus: "name the texture first, then explain the number and relationship of the lines",
      label: "texture description"
    },
    "musical-language-dynamics": {
      strength: "recognise dynamic markings well",
      focus: "spot dynamic changes such as crescendo and diminuendo, not just static levels",
      label: "dynamic markings"
    },
    "chord-identifier": {
      strength: "identify chords and harmony confidently",
      focus: "listen for the bass note to judge inversions rather than just the chord itself",
      label: "chord identification"
    },
    "harmony-key-signatures": {
      strength: "identify key signatures confidently",
      focus: "count the sharps or flats systematically rather than guessing from the overall shape",
      label: "key signature identification"
    },
    "cadence-coach": {
      strength: "recognise cadence types well",
      focus: "listen closely to the final two chords rather than the passage as a whole",
      label: "cadence recognition"
    },
    "meter-master": {
      strength: "recognise metre and rhythmic devices well",
      focus: "count the beat grouping carefully before naming the metre",
      label: "metre and rhythm"
    },
    "musical-language-tempo": {
      strength: "recognise tempo markings well",
      focus: "compare similar tempo markings such as andante and moderato",
      label: "tempo markings"
    },
    "context-coach-composer": {
      strength: "identify composers confidently",
      focus: "listen for the stylistic fingerprints that separate similar composers",
      label: "composer identification"
    },
    "context-coach-period": {
      strength: "recognise musical periods well",
      focus: "compare the stylistic features that mark the boundary between neighbouring periods",
      label: "period identification"
    }
  };

  // Concept-level phrases — one level more specific than SOURCE_PHRASES
  // above: not "you recognise chords well" but "you recognise first
  // inversion chords well." Keyed by server moduleId (not PM sourceKey,
  // since this data only exists Live-Session-side for now — see
  // accounts/account-server.js's byConcept/CONCEPT_EXTRACTORS_BY_MODULE,
  // which is what decides which concept values a module can produce here).
  // Only the 5 modules with genuinely clean, single-concept data get a
  // bank; every value below was checked against real question data before
  // writing its phrase, not assumed.
  var CONCEPT_PHRASES = {
    "chord-identifier": {
      "root position": {
        strength: "recognise root position chords confidently",
        focus: "check that the lowest note really is the chord's root before settling on root position",
        label: "root position chords"
      },
      "first inversion": {
        strength: "recognise first inversion chords well",
        focus: "listen for the third of the chord sitting in the bass, not the root",
        label: "first inversion chords"
      },
      "second inversion": {
        strength: "recognise second inversion chords confidently",
        focus: "listen for the fifth in the bass and the unsettled, \"suspended\" quality a 6-4 chord has",
        label: "second inversion chords"
      },
      "third inversion": {
        strength: "recognise third inversion seventh chords well",
        focus: "listen for the dissonant note in the bass — the seventh itself — that marks a third inversion",
        label: "third inversion chords"
      },
      "Triads": {
        strength: "identify plain triads confidently",
        focus: "settle the triad's quality — major, minor or diminished — before considering anything more complex",
        label: "triads"
      },
      "Seventh chords": {
        strength: "recognise seventh chords well",
        focus: "listen for the extra dissonant note a 7th above the root that marks a seventh chord, not just a triad",
        label: "seventh chords"
      },
      "Extended chords": {
        strength: "recognise extended and decorated chords confidently",
        focus: "listen past the basic triad for an added colour tone or a suspended note before naming a plain chord",
        label: "extended chords"
      }
    },
    "key-signature-sprint": {
      "sharp": {
        strength: "identify sharp key signatures confidently",
        focus: "count the sharps in order (F♯-C♯-G♯-D♯...) rather than judging the overall look",
        label: "sharp key signatures"
      },
      "flat": {
        strength: "identify flat key signatures confidently",
        focus: "count the flats in order (B♭-E♭-A♭-D♭...) rather than judging the overall look",
        label: "flat key signatures"
      },
      "natural": {
        strength: "recognise a natural key signature (no sharps or flats) reliably",
        focus: "check for a genuinely empty key signature before assuming sharps or flats",
        label: "natural key signatures"
      },
      "Few accidentals (0-2)": {
        strength: "read key signatures with 0-2 sharps or flats confidently",
        focus: "drill the simplest key signatures (C, G, F, D, B♭) until they're instant",
        label: "simple key signatures"
      },
      "Moderate accidentals (3-4)": {
        strength: "handle key signatures with 3-4 sharps or flats well",
        focus: "use the last-sharp-plus-a-semitone or second-last-flat shortcut once you reach 3-4 accidentals",
        label: "moderate key signatures"
      },
      "Many accidentals (5-7)": {
        strength: "confidently read key signatures with 5-7 sharps or flats",
        focus: "count every accidental in order rather than estimating once a key signature gets busy",
        label: "key signatures with 5-7 accidentals"
      }
    },
    "meter-master": {
      "Simple duple": {
        strength: "recognise simple duple metre well",
        focus: "check for exactly two main beats per bar, each splitting into two",
        label: "simple duple metre"
      },
      "Simple triple": {
        strength: "recognise simple triple metre confidently",
        focus: "count three main beats per bar, each splitting into two, and listen for that \"waltz\" lilt",
        label: "simple triple metre"
      },
      "Simple quadruple": {
        strength: "recognise simple quadruple metre well",
        focus: "count four main beats per bar, each splitting into two",
        label: "simple quadruple metre"
      },
      "Compound duple": {
        strength: "recognise compound duple metre confidently",
        focus: "count two main beats per bar, each splitting into three, not two",
        label: "compound duple metre"
      },
      "Compound quadruple": {
        strength: "recognise compound quadruple metre well",
        focus: "count four main beats per bar, each splitting into three",
        label: "compound quadruple metre"
      },
      "Irregular quintuple": {
        strength: "recognise irregular 5-beat metres confidently",
        focus: "listen for an uneven 2+3 or 3+2 grouping rather than a steady beat",
        label: "irregular metre"
      },
      "Variable/mixed": {
        strength: "track metre that changes within a piece well",
        focus: "listen for the point where the beat GROUPING itself changes, not just a change in tempo",
        label: "changing or mixed metre"
      },
      "Simple time": {
        strength: "recognise simple time confidently",
        focus: "check whether each main beat splits into two, not three, before naming the metre",
        label: "simple time"
      },
      "Compound time": {
        strength: "recognise compound time well",
        focus: "check whether each main beat splits into three, not two, before naming the metre",
        label: "compound time"
      }
    },
    "instrument-identifier": {
      "Strings": {
        strength: "identify string instruments confidently",
        focus: "listen for bow noise or vibrato to separate strings from other sustained sounds",
        label: "string instruments"
      },
      "Woodwind": {
        strength: "identify woodwind instruments well",
        focus: "listen for the breathy attack and reed or embouchure colour that marks a woodwind instrument",
        label: "woodwind instruments"
      },
      "Brass": {
        strength: "identify brass instruments confidently",
        focus: "listen for the buzzing-lip attack and metallic ring that separates brass from woodwind",
        label: "brass instruments"
      },
      "Percussion": {
        strength: "identify percussion instruments well",
        focus: "decide whether the sound has a clear pitch or is unpitched before naming the instrument",
        label: "percussion instruments"
      },
      "Keyboard": {
        strength: "identify keyboard instruments confidently",
        focus: "listen for how the note decays (piano) versus sustains evenly (organ) to tell keyboards apart",
        label: "keyboard instruments"
      },
      "Guitar": {
        strength: "identify guitar and plucked strings well",
        focus: "listen for the plucked attack and quick decay that separates guitar from bowed strings",
        label: "guitar and plucked strings"
      },
      "Voice": {
        strength: "identify the voice confidently",
        focus: "listen for text and vowel shaping, which no instrument reproduces",
        label: "the voice"
      },
      "World/Ensemble": {
        strength: "identify world and mixed ensembles well",
        focus: "listen for instruments and tunings outside the standard orchestra before defaulting to a familiar family",
        label: "world instruments and ensembles"
      },
      "Orchestral": {
        strength: "identify instruments inside a full orchestral texture confidently",
        focus: "pick out one instrument's line from the full ensemble rather than listening to the overall blend",
        label: "orchestral textures"
      },
      "Solo": {
        strength: "identify solo instruments well",
        focus: "use the exposed tone colour to full advantage — there's no ensemble blend to hide behind",
        label: "solo instruments"
      },
      "Piano Accomp.": {
        strength: "identify instruments over piano accompaniment confidently",
        focus: "listen past the piano part to the instrument actually carrying the melody",
        label: "instruments with piano accompaniment"
      },
      "Organ Accomp.": {
        strength: "identify instruments over organ accompaniment well",
        focus: "separate the organ's sustained texture from the solo instrument's own tone",
        label: "instruments with organ accompaniment"
      },
      "Harpsichord": {
        strength: "identify the harpsichord confidently",
        focus: "listen for its plucked (not struck) attack and its lack of dynamic shading",
        label: "harpsichord"
      }
    },
    "texture-trainer": {
      "Monophonic": {
        strength: "recognise monophonic texture confidently",
        focus: "check there is truly only one melodic line with no accompaniment at all, however sparse",
        label: "monophonic texture"
      },
      "Homophonic": {
        strength: "recognise homophonic texture well",
        focus: "separate the main tune from the supporting chords moving underneath it",
        label: "homophonic texture"
      },
      "Polyphonic": {
        strength: "recognise polyphonic texture confidently",
        focus: "listen for two or more genuinely independent melodic lines at once, not just melody plus accompaniment",
        label: "polyphonic texture"
      },
      "Heterophonic": {
        strength: "recognise heterophonic texture well",
        focus: "listen for performers decorating the SAME tune at once, rather than playing entirely separate lines",
        label: "heterophonic texture"
      },
      "Fugal imitation": {
        strength: "recognise fugal imitation confidently",
        focus: "listen for a melodic idea entering in one voice, then being echoed by another voice shortly after",
        label: "fugal imitation"
      },
      "Fugal polyphony": {
        strength: "recognise fugal polyphony well",
        focus: "track how many voices have entered with the same subject before calling the texture \"full\"",
        label: "fugal polyphony"
      },
      "Fugue": {
        strength: "recognise a fugue's texture confidently",
        focus: "listen for the subject's first full statement, then track each new voice entering with it",
        label: "fugue texture"
      },
      "Canon": {
        strength: "recognise canon (strict imitation) well",
        focus: "check the imitating voice repeats the leading voice exactly, not just loosely",
        label: "canon"
      },
      "Alberti Bass": {
        strength: "recognise Alberti bass accompaniment confidently",
        focus: "listen for the broken-chord, low-high-middle-high pattern under the melody",
        label: "Alberti bass"
      },
      "Inverted Pedal": {
        strength: "recognise an inverted pedal well",
        focus: "listen for the sustained note sitting ABOVE the moving harmony, not below it",
        label: "inverted pedal"
      },
      "Pedal / drone": {
        strength: "recognise a pedal note or drone confidently",
        focus: "listen for one sustained note underneath the harmony while the harmony above it keeps changing",
        label: "pedal notes and drones"
      },
      "Advanced polyphonic": {
        strength: "recognise dense, multi-voice polyphony well",
        focus: "don't let several simultaneous independent lines overwhelm you — pick one voice and follow it through",
        label: "dense polyphony"
      },
      "Simple polyphonic": {
        strength: "recognise simple two-part polyphony confidently",
        focus: "check the two lines are genuinely independent, not just a melody with a bass line underneath",
        label: "two-part polyphony"
      },
      "Melody and accompaniment": {
        strength: "recognise melody-and-accompaniment texture well",
        focus: "confirm the accompaniment stays clearly subordinate to one main tune",
        label: "melody and accompaniment"
      }
    }
  };

  var FEEDBACK_MIN_QUESTIONS = 8;
  // Above this cumulative accuracy a source counts as a strength; below this
  // it counts as a weakness; in between it's "developing" — worth a brief
  // mention but not worth calling out as either. Deliberately mirrors
  // Store.PASS_PERCENTAGE (80) for the strength bar, since that's already
  // the bar a student has to clear to be considered secure in something.
  var STRENGTH_THRESHOLD = 80;
  var WEAKNESS_THRESHOLD = 60;
  // Soft cap on how many sentences one area's feedback grows to — every
  // reliable source gets represented somewhere, but a student with 5
  // well-sampled sources in one area (e.g. Melody) shouldn't get a wall of
  // text. Only trims the lowest-priority ("developing") sentence.
  var MAX_FEEDBACK_SENTENCES = 3;

  function joinList(labels) {
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels[0] + " and " + labels[1];
    return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
  }

  // Label text is only ever used as the OBJECT of a verb/preposition below
  // (e.g. "work on melodic dictations", "well with melodic devices"), never
  // as a sentence's grammatical subject — several labels are plural-sounding
  // ("melodic devices") and others singular ("ensemble recognition"), so
  // giving one its own verb ("melodic devices is/are...") would need
  // per-label agreement it isn't worth tracking.
  //
  // All four sentence-builders below take `phrases` (a SOURCE_PHRASES- or
  // CONCEPT_PHRASES[moduleId]-shaped bank) as their first argument, rather
  // than closing over SOURCE_PHRASES directly, so the exact same pairing/
  // sentence logic serves both buildAreaFeedback (across sub-apps) and
  // buildConceptFeedback (across concepts within one sub-app) below.
  function pairSentence(phrases, strongKey, weakKey) {
    return "You " + phrases[strongKey].strength + ", but you need to " +
      phrases[weakKey].focus + " (" + phrases[weakKey].label + ").";
  }

  function strengthSentence(phrases, keys, hasPrior) {
    if (keys.length === 1) {
      return hasPrior
        ? "You also " + phrases[keys[0]].strength + "."
        : "You " + phrases[keys[0]].strength + ".";
    }
    var labels = keys.map(function (k) { return phrases[k].label; });
    return (hasPrior ? "You also do well with " : "You do well with ") + joinList(labels) + ".";
  }

  function weaknessSentence(phrases, keys, hasPrior) {
    if (keys.length === 1) {
      return hasPrior
        ? "You should also work on " + phrases[keys[0]].label + ": " + phrases[keys[0]].focus + "."
        : "You need to " + phrases[keys[0]].focus + " (" + phrases[keys[0]].label + ").";
    }
    var labels = keys.map(function (k) { return phrases[k].label; });
    return (hasPrior ? "You should also spend more time on " : "Focus next on ") + joinList(labels) + ".";
  }

  function developingSentence(phrases, keys, hasPrior) {
    var labels = keys.map(function (k) { return phrases[k].label; });
    return (hasPrior ? "You're steadily improving with " : "You're making steady progress with ") +
      joinList(labels) + " — keep it up.";
  }

  // Builds a short, always-constructive written-feedback paragraph for one
  // area. `cumulativeStats` is a plain `{ [sourceKey]: {correct, questions,
  // percentage} }` object (exactly what Store.getCumulativeStats already
  // returns) rather than a Store+studentId pair, so this works equally well
  // fed PM-only stats or stats already combined with Live Session evidence
  // (see account/student-home/student-home.js's getCombinedSourceStats) —
  // the caller decides what "cumulative" means, this just writes the
  // sentences. `sourcesInArea` and `areaLabel` are passed in rather than
  // looked up here, so this stays reusable from both script.js's own driver
  // table and the dashboard's.
  //
  // Every source with enough of a sample (FEEDBACK_MIN_QUESTIONS) to be
  // meaningful is represented, not just a single strongest/weakest pick —
  // strengths and weaknesses are paired off into "you do X well, but need
  // work on Y" sentences (one pair per sentence), with any left over after
  // pairing (more strengths than weaknesses, or vice versa) folded into a
  // trailing summary sentence, and any merely "developing" sources getting
  // a brief mention of their own. A brand-new area with no reliable source
  // yet still gets a constructive line rather than nothing. Naturally reads
  // more specifically as more sources cross the reliability bar — which in
  // practice means by the time an area reaches Developing level, since
  // clearing Foundation already requires a real volume of answered
  // questions (see store.js's MIN_QUESTIONS_PER_LEVEL).
  function buildAreaFeedback(cumulativeStats, sourcesInArea, areaLabel) {
    var cumulative = cumulativeStats || {};
    var reliable = sourcesInArea.filter(function (sourceKey) {
      return cumulative[sourceKey] && cumulative[sourceKey].questions >= FEEDBACK_MIN_QUESTIONS;
    });

    if (!reliable.length) {
      return "Complete a few more " + areaLabel.toLowerCase() + " questions to start building personalised feedback here.";
    }

    var strengths = reliable
      .filter(function (k) { return cumulative[k].percentage >= STRENGTH_THRESHOLD; })
      .sort(function (a, b) { return cumulative[b].percentage - cumulative[a].percentage; });
    var weaknesses = reliable
      .filter(function (k) { return cumulative[k].percentage < WEAKNESS_THRESHOLD; })
      .sort(function (a, b) { return cumulative[a].percentage - cumulative[b].percentage; });
    var developing = reliable.filter(function (k) {
      return cumulative[k].percentage >= WEAKNESS_THRESHOLD && cumulative[k].percentage < STRENGTH_THRESHOLD;
    });

    var parts = [];
    var pairCount = Math.min(strengths.length, weaknesses.length);
    for (var i = 0; i < pairCount; i++) {
      parts.push(pairSentence(SOURCE_PHRASES, strengths[i], weaknesses[i]));
    }

    var extraStrengths = strengths.slice(pairCount);
    if (extraStrengths.length) parts.push(strengthSentence(SOURCE_PHRASES, extraStrengths, parts.length > 0));

    var extraWeaknesses = weaknesses.slice(pairCount);
    if (extraWeaknesses.length) parts.push(weaknessSentence(SOURCE_PHRASES, extraWeaknesses, parts.length > 0));

    if (developing.length && parts.length < MAX_FEEDBACK_SENTENCES) {
      parts.push(developingSentence(SOURCE_PHRASES, developing, parts.length > 0));
    }

    return parts.join(" ");
  }

  // Single-source counterpart to buildAreaFeedback above, for the "one
  // element's real apps" popup (account/student-home/student-home.js's
  // elementDetailMarkup) — one sub-app at a time rather than pairing
  // several, but the same SOURCE_PHRASES bank and the same
  // strength/weakness/developing thresholds, so a sub-app's popup row and
  // its area-level paragraph never disagree about whether it's currently a
  // strength or a focus area.
  function buildSourceFeedback(sourceKey, correct, questions) {
    var phrases = SOURCE_PHRASES[sourceKey];
    if (!phrases) return "";
    if (!questions || questions < FEEDBACK_MIN_QUESTIONS) {
      return "Complete a few more questions to start building personalised feedback here.";
    }

    var percentage = Math.round((correct / questions) * 100);
    if (percentage >= STRENGTH_THRESHOLD) {
      return "You " + phrases.strength + ".";
    }
    if (percentage < WEAKNESS_THRESHOLD) {
      return "You need to " + phrases.focus + " (" + phrases.label + ").";
    }
    return "You're making steady progress with " + phrases.label + " — keep it up.";
  }

  // Concept-level counterpart to buildSourceFeedback above, for the same
  // popup row — used in preference to it when a sub-app's server module has
  // concept-level data (accounts/account-server.js's byConcept). Unlike
  // buildAreaFeedback's multi-pair paragraph, this always picks exactly ONE
  // strength and ONE weakness — the single clearest signal across every
  // concept dimension the module has (e.g. chord-identifier's inversion AND
  // extension tier land in the same `conceptStats` pool, so a "second
  // inversion" weakness and a "Triads" strength can be paired directly) —
  // matching the target feedback shape: one topic named per sentence.
  // Returns null (caller falls back to buildSourceFeedback) when fewer than
  // two concepts have enough of a sample to compare, or when CONCEPT_PHRASES
  // doesn't cover this module at all.
  function buildConceptFeedback(moduleId, conceptStats) {
    var phrases = CONCEPT_PHRASES[moduleId];
    var stats = conceptStats || {};
    if (!phrases) return null;

    var reliable = Object.keys(stats).filter(function (key) {
      return phrases[key] && stats[key].questions >= FEEDBACK_MIN_QUESTIONS;
    });

    var strengths = reliable
      .filter(function (k) { return stats[k].percentage >= STRENGTH_THRESHOLD; })
      .sort(function (a, b) { return stats[b].percentage - stats[a].percentage; });
    var weaknesses = reliable
      .filter(function (k) { return stats[k].percentage < WEAKNESS_THRESHOLD; })
      .sort(function (a, b) { return stats[a].percentage - stats[b].percentage; });

    if (strengths.length && weaknesses.length) {
      return pairSentence(phrases, strengths[0], weaknesses[0]);
    }
    // A real, common case: a student can easily have several reliably-
    // sampled concepts that are ALL currently strengths (e.g. confident on
    // both Orchestral and Strings, nothing yet weak enough to pair against)
    // — or, just as often early on, a weakness with no strength yet to set
    // it against. Rather than showing nothing more specific than the
    // sub-app-level sentence (buildSourceFeedback) whenever a pair doesn't
    // exist, still surface the single clearest signal on its own — same
    // wording buildSourceFeedback already uses for its own single-value
    // strength/focus lines, so the two never read as a different voice.
    if (strengths.length) return "You " + phrases[strengths[0]].strength + ".";
    if (weaknesses.length) return "You need to " + phrases[weaknesses[0]].focus + " (" + phrases[weaknesses[0]].label + ").";
    return null;
  }

  global.EAProgressModeFeedback = {
    SOURCE_PHRASES: SOURCE_PHRASES,
    CONCEPT_PHRASES: CONCEPT_PHRASES,
    FEEDBACK_MIN_QUESTIONS: FEEDBACK_MIN_QUESTIONS,
    buildAreaFeedback: buildAreaFeedback,
    buildSourceFeedback: buildSourceFeedback,
    buildConceptFeedback: buildConceptFeedback
  };
})(window);
