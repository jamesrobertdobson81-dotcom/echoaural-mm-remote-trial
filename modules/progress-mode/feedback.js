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
    },
    "structure-spotter": {
      strength: "recognise musical structures and forms well",
      gap: "telling similarly-shaped structures apart",
      focus: "listen for exactly when a section repeats, contrasts or returns before naming the form",
      label: "structure and form"
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
  function pairSentence(strongKey, weakKey) {
    return "You " + SOURCE_PHRASES[strongKey].strength + ", but you need to " +
      SOURCE_PHRASES[weakKey].focus + " (" + SOURCE_PHRASES[weakKey].label + ").";
  }

  function strengthSentence(keys, hasPrior) {
    if (keys.length === 1) {
      return hasPrior
        ? "You also " + SOURCE_PHRASES[keys[0]].strength + "."
        : "You " + SOURCE_PHRASES[keys[0]].strength + ".";
    }
    var labels = keys.map(function (k) { return SOURCE_PHRASES[k].label; });
    return (hasPrior ? "You also do well with " : "You do well with ") + joinList(labels) + ".";
  }

  function weaknessSentence(keys, hasPrior) {
    if (keys.length === 1) {
      return hasPrior
        ? "You should also work on " + SOURCE_PHRASES[keys[0]].label + ": " + SOURCE_PHRASES[keys[0]].focus + "."
        : "You need to " + SOURCE_PHRASES[keys[0]].focus + " (" + SOURCE_PHRASES[keys[0]].label + ").";
    }
    var labels = keys.map(function (k) { return SOURCE_PHRASES[k].label; });
    return (hasPrior ? "You should also spend more time on " : "Focus next on ") + joinList(labels) + ".";
  }

  function developingSentence(keys, hasPrior) {
    var labels = keys.map(function (k) { return SOURCE_PHRASES[k].label; });
    return (hasPrior ? "You're steadily improving with " : "You're making steady progress with ") +
      joinList(labels) + " — keep it up.";
  }

  // Builds a short, always-constructive written-feedback paragraph for one
  // area. `sourcesInArea` and `areaLabel` are passed in rather than looked
  // up here, so this stays reusable from both script.js's own driver table
  // and the dashboard's.
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
  function buildAreaFeedback(Store, studentId, areaKey, sourcesInArea, areaLabel) {
    var cumulative = Store.getCumulativeStats(studentId, sourcesInArea);
    var reliable = sourcesInArea.filter(function (sourceKey) { return cumulative[sourceKey].questions >= FEEDBACK_MIN_QUESTIONS; });

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
      parts.push(pairSentence(strengths[i], weaknesses[i]));
    }

    var extraStrengths = strengths.slice(pairCount);
    if (extraStrengths.length) parts.push(strengthSentence(extraStrengths, parts.length > 0));

    var extraWeaknesses = weaknesses.slice(pairCount);
    if (extraWeaknesses.length) parts.push(weaknessSentence(extraWeaknesses, parts.length > 0));

    if (developing.length && parts.length < MAX_FEEDBACK_SENTENCES) {
      parts.push(developingSentence(developing, parts.length > 0));
    }

    return parts.join(" ");
  }

  global.EAProgressModeFeedback = {
    SOURCE_PHRASES: SOURCE_PHRASES,
    FEEDBACK_MIN_QUESTIONS: FEEDBACK_MIN_QUESTIONS,
    buildAreaFeedback: buildAreaFeedback
  };
})(window);
