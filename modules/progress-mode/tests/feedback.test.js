"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// feedback.js is a browser IIFE `(function (global) { ... })(window)`, not
// CommonJS — same sandbox-loading pattern as store.test.js.
function loadFeedback() {
  const fakeWindow = {};
  const wrappedSource = fs.readFileSync(path.join(__dirname, "..", "feedback.js"), "utf8");
  // eslint-disable-next-line no-new-func
  const runInSandbox = new Function("window", wrappedSource);
  runInSandbox(fakeWindow);
  return fakeWindow.EAProgressModeFeedback;
}

function stats(entries) {
  const result = {};
  Object.keys(entries).forEach((key) => {
    const [correct, questions] = entries[key];
    result[key] = { correct, questions, percentage: questions ? Math.round((correct / questions) * 100) : 0 };
  });
  return result;
}

test("buildAreaFeedback pairs a strength with a weakness when both exist", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [9, 10],   // 90% -> strength
    "cadence-coach": [3, 10]       // 30% -> weakness
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "cadence-coach"], "Harmony");
  assert.match(text, /You .*chords.*but you need to.*cadence/i);
});

test("buildAreaFeedback returns a constructive placeholder when no source has enough of a sample", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({ "chord-identifier": [1, 2] }); // below EARLY_SIGNAL_MIN_QUESTIONS
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier"], "Harmony");
  assert.match(text, /complete a few more harmony questions/i);
});

test("buildAreaFeedback tolerates a source missing from the stats object entirely", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({ "chord-identifier": [9, 10] });
  // "cadence-coach" has no entry at all in cumulative (e.g. genuinely never
  // attempted in either PM or Live Sessions) — must not throw.
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "cadence-coach"], "Harmony");
  assert.match(text, /chords/i);
});

test("buildSourceFeedback: strength band uses the source's strength phrase, plus a how-to-stay-sharp tip", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 9, 10);
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(text, "You " + phrase.strength + " — to stay sharp, " + phrase.focus + ".");
});

test("buildSourceFeedback: weakness band uses the source's gap, focus phrase and label", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 3, 10);
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(
    text,
    "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ")."
  );
});

test("buildSourceFeedback: developing band is a distinct, encouraging sentence with its own improvement tip", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 7, 10); // 70% — between the two thresholds
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(text, "You're making steady progress with " + phrase.label + " — to keep improving, " + phrase.focus + ".");
});

test("buildSourceFeedback: below the minimum sample returns the not-yet-reliable line", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 1, 2);
  assert.match(text, /complete a few more questions/i);
});

test("buildSourceFeedback: unknown sourceKey returns an empty string rather than throwing", () => {
  const Feedback = loadFeedback();
  assert.equal(Feedback.buildSourceFeedback("not-a-real-source", 9, 10), "");
});

test("buildConceptFeedback: pairs the clearest strength and weakness across different dimensions of the same module", () => {
  const Feedback = loadFeedback();
  // "first inversion" (inversion dimension) vs "Extended chords" (extension
  // tier dimension) — proves the flat-pool design pairs across dimensions,
  // not just within one.
  const conceptStats = stats({
    "first inversion": [9, 10],
    "Extended chords": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.match(text, /first inversion chords.*but you need to.*extended chords/i);
});

test("buildConceptFeedback: falls back to a solo strength sentence when no weakness exists to pair against yet", () => {
  const Feedback = loadFeedback();
  // The real-world common case: several reliably-sampled concepts that are
  // ALL currently strengths (e.g. a student confident on both Orchestral
  // and Strings, with nothing yet weak enough to pair against) — this must
  // still surface the strongest one, not silently show nothing.
  const conceptStats = stats({
    "Orchestral": [13, 15],  // 87%
    "Strings": [8, 9]        // 89% — the highest, should be picked
  });
  const text = Feedback.buildConceptFeedback("instrument-identifier", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["instrument-identifier"]["Strings"];
  assert.equal(text, "You " + phrase.strength + " — to stay sharp, " + phrase.focus + ".");
});

test("buildConceptFeedback: falls back to a solo weakness sentence when no strength exists to pair against yet", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "second inversion": [2, 10] }); // 20%, reliable, no strength anywhere yet
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["second inversion"];
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

test("buildConceptFeedback: names the closest-to-strength concept when every reliable concept is 'developing'", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [7, 10],   // 70% — developing band, not a strength
    "second inversion": [7, 10]   // 70% — developing band, not a weakness
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  // Tied percentages here — either label is a legitimate pick — so just
  // confirm the sentence shape (including its improvement tip) and that a
  // real developing concept was named, not the null this used to return.
  assert.match(text, /^You're making steady progress with (first inversion chords — to keep improving, listen for the third of the chord sitting in the bass, not the root|second inversion chords — to keep improving, listen for the fifth in the bass and the unsettled, "suspended" quality a 6-4 chord has)\.$/);
});

test("buildConceptFeedback: developing-band pick prefers the concept closest to becoming a real strength", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [6, 10],    // 60% — developing, further from strength
    "second inversion": [7, 10]    // 70% — developing, closer to strength
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["second inversion"];
  assert.equal(text, "You're making steady progress with " + phrase.label + " — to keep improving, " + phrase.focus + ".");
});

test("buildConceptFeedback: returns null only when no concept has enough of a sample yet", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "first inversion": [1, 2] }); // 2 < EARLY_SIGNAL_MIN_QUESTIONS
  assert.equal(Feedback.buildConceptFeedback("chord-identifier", conceptStats), null);
});

test("buildConceptFeedback: returns null for a module with no concept phrase bank at all", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "some-value": [9, 10], "other-value": [1, 10] });
  assert.equal(Feedback.buildConceptFeedback("melody-master", conceptStats), null);
});

test("buildConceptFeedback: ignores concept values with no matching phrase entry", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [9, 10],
    "not-a-real-concept": [1, 10] // e.g. would happen if CONCEPT_PHRASES falls behind the server whitelist
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["first inversion"];
  assert.equal(
    text,
    "You " + phrase.strength + " — to stay sharp, " + phrase.focus + ".",
    "the unrecognised concept value must be ignored, falling back to the one real reliable concept as a solo strength"
  );
});

// Coverage for the expanded concept dimensions (recognitionType/category/
// keyMode, type/clef, mode/requiresScore/timeSignature, instrument/
// responseType, specificTextureTerm/responseType) — one real end-to-end
// sentence per newly-touched module, proving the new CONCEPT_PHRASES
// entries are wired correctly through buildConceptFeedback, not just
// present as bare data.
test("buildConceptFeedback: chord-identifier pairs a new dimension (Roman numeral analysis) against an existing one (inversionLabel)", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Roman numeral analysis": [9, 10],
    "second inversion": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.match(text, /Roman numeral chord analysis.*but you need to work on.*\(second inversion chords\)/i);
});

test("buildConceptFeedback: key-signature-sprint's new clef dimension produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "treble": [9, 10], "bass": [2, 10] });
  const text = Feedback.buildConceptFeedback("key-signature-sprint", conceptStats);
  assert.match(text, /treble clef.*but you need to work on.*bass clef/i);
});

test("buildConceptFeedback: meter-master's new mode/requiresScore/timeSignature dimensions produce real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Aural classification": [9, 10], "Score-reading questions": [2, 10] });
  const text = Feedback.buildConceptFeedback("meter-master", conceptStats);
  assert.match(text, /classify metre by ear.*but you need to work on.*\(score-reading metre questions\)/i);
});

test("buildConceptFeedback: instrument-identifier's new specific instrument dimension produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Oboe": [9, 10], "Clarinet": [2, 10] });
  const text = Feedback.buildConceptFeedback("instrument-identifier", conceptStats);
  assert.match(text, /oboe.*but you need to work on.*clarinet/i);
});

test("buildConceptFeedback: texture-trainer's new specificTextureTerm-only values produce real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Drone": [9, 10], "Antiphonal": [2, 10] });
  const text = Feedback.buildConceptFeedback("texture-trainer", conceptStats);
  assert.match(text, /drone.*but you need to work on.*antiphonal/i);
});

// --- Early-signal tier (below FEEDBACK_MIN_QUESTIONS=8, at/above
// EARLY_SIGNAL_MIN_QUESTIONS=3) --------------------------------------------

test("buildSourceFeedback: below EARLY_SIGNAL_MIN_QUESTIONS still returns the not-yet-reliable placeholder", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 1, 2); // 2 < 3
  assert.match(text, /complete a few more questions/i);
});

test("buildSourceFeedback: early-sampled strength band uses hedged wording", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 3, 3); // 100%, 3 questions — early
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(text, "Early signs are good — so far you " + phrase.strength + ". To stay sharp, " + phrase.focus + ".");
});

test("buildSourceFeedback: early-sampled weakness band uses hedged wording, same gap/focus/label", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 1, 3); // 33%, 3 questions — early
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(
    text,
    "It's early, but you may want to start on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ")."
  );
});

test("buildSourceFeedback: early-sampled developing band uses hedged wording", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 2, 3); // 67%, 3 questions — early, developing
  assert.match(text, /too early to say for sure, but you're showing steady signs with metre and rhythm so far/i);
});

test("buildSourceFeedback: 8+ questions is unaffected by the early tier (confident wording)", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 8, 8); // 100%, 8 questions — reliable
  const phrase = Feedback.SOURCE_PHRASES["meter-master"];
  assert.equal(text, "You " + phrase.strength + " — to stay sharp, " + phrase.focus + ".");
});

test("buildConceptFeedback: returns null below EARLY_SIGNAL_MIN_QUESTIONS, not just below FEEDBACK_MIN_QUESTIONS", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "first inversion": [1, 2] }); // 2 < 3
  assert.equal(Feedback.buildConceptFeedback("chord-identifier", conceptStats), null);
});

test("buildConceptFeedback: early-sampled pair uses hedged wording with the same gap/focus/label content", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [3, 3],   // 100%, early
    "Extended chords": [1, 3]    // 33%, early
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.match(text, /^Early signs suggest you .*first inversion chords.*but you may want to start on.*extended chords.*\.$/i);
});

test("buildConceptFeedback: early-sampled solo strength uses hedged wording", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Strings": [3, 3] }); // 100%, early, nothing to pair against
  const text = Feedback.buildConceptFeedback("instrument-identifier", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["instrument-identifier"]["Strings"];
  assert.equal(text, "Early signs are good — so far you " + phrase.strength + ". To stay sharp, " + phrase.focus + ".");
});

test("buildConceptFeedback: early-sampled solo weakness uses hedged wording", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "second inversion": [1, 3] }); // 33%, early, nothing to pair against
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["second inversion"];
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.equal(text, "It's early, but you may want to start on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

test("buildConceptFeedback: early-sampled developing-only pool uses hedged wording", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "first inversion": [2, 3] }); // 67%, early, developing band
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["first inversion"];
  assert.equal(text, "Too early to say for sure, but you're showing steady signs with " + phrase.label + " so far. To keep improving, " + phrase.focus + ".");
});

test("buildConceptFeedback: a reliable concept always wins over an early-sampled one, never mixing tiers", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [9, 10],  // reliable strength
    "Extended chords": [1, 3]    // early-only, well below FEEDBACK_MIN_QUESTIONS
  });
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  // Reliable pool is non-empty, so the early-sampled "Extended chords" must
  // never surface, and the sentence must use confident (not hedged) wording.
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["first inversion"];
  assert.equal(text, "You " + phrase.strength + " — to stay sharp, " + phrase.focus + ".");
  assert.doesNotMatch(text, /early/i);
});

test("buildAreaFeedback: below EARLY_SIGNAL_MIN_QUESTIONS still returns the placeholder", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({ "chord-identifier": [1, 2] }); // 2 < 3
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier"], "Harmony");
  assert.match(text, /complete a few more harmony questions/i);
});

test("buildAreaFeedback: early-sampled pair (3-6 questions) uses hedged wording", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [3, 3],  // 100%, early
    "cadence-coach": [1, 3]      // 33%, early
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "cadence-coach"], "Harmony");
  assert.match(text, /^Early signs suggest you .*chords.*but you may want to start on.*cadence.*\.$/i);
});

test("buildAreaFeedback: a reliable source always wins over an early-sampled one, never mixing tiers", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [9, 10], // reliable strength
    "cadence-coach": [1, 3]      // early-only, well below FEEDBACK_MIN_QUESTIONS
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "cadence-coach"], "Harmony");
  assert.doesNotMatch(text, /early/i);
});

// --- "How to improve" tips on every band (strength/developing, plus the
// weakness band's multi-item list — solo weakness already had one) --------

test("buildSourceFeedback: developing band's tip matches Cadence Coach's real content (the case that surfaced this)", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("cadence-coach", 7, 10); // 70% — developing band
  const phrase = Feedback.SOURCE_PHRASES["cadence-coach"];
  assert.equal(text, "You're making steady progress with " + phrase.label + " — to keep improving, " + phrase.focus + ".");
});

test("buildAreaFeedback: multi-item strength list appends one tip anchored on the strongest extra", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [9, 10],        // 90%
    "harmony-key-signatures": [8, 10],  // 80%
    "cadence-coach": [9, 10]            // 90% — tied-highest with chord-identifier, sorted first
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "harmony-key-signatures", "cadence-coach"], "Harmony");
  assert.match(text, /^You do well with .*\. To stay sharp, .+\.$/);
  // Exactly one tip, not one per listed strength.
  assert.equal((text.match(/To stay sharp,/g) || []).length, 1);
});

test("buildAreaFeedback: multi-item weakness list appends one tip anchored on the weakest extra", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [1, 10],        // 10% — weakest, sorted first
    "harmony-key-signatures": [2, 10],  // 20%
    "cadence-coach": [3, 10]            // 30%
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "harmony-key-signatures", "cadence-coach"], "Harmony");
  const phrase = Feedback.SOURCE_PHRASES["chord-identifier"];
  assert.match(text, /^Focus next on .*\. To keep improving, .+\.$/);
  assert.match(text, new RegExp(phrase.focus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("buildAreaFeedback: developing list is sorted so its tip anchors on the concept closest to a real strength", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({
    "chord-identifier": [6, 10],        // 60% — further from strength
    "harmony-key-signatures": [7, 10],  // 70% — closest to strength, should anchor the tip
    "cadence-coach": [6, 10]            // 60%
  });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "harmony-key-signatures", "cadence-coach"], "Harmony");
  const phrase = Feedback.SOURCE_PHRASES["harmony-key-signatures"];
  assert.match(text, new RegExp("to keep improving, " + phrase.focus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("buildAreaFeedback: pairSentence's strong side is unchanged (no second tip) — the weak side's tip already carries the sentence", () => {
  const Feedback = loadFeedback();
  const cumulative = stats({ "chord-identifier": [9, 10], "cadence-coach": [3, 10] });
  const text = Feedback.buildAreaFeedback(cumulative, ["chord-identifier", "cadence-coach"], "Harmony");
  // Exactly one "how to improve" clause (the weak side's), not two.
  const tipCount = (text.match(/To stay sharp,|To keep improving,/g) || []).length;
  assert.equal(tipCount, 0, "pairSentence reuses its existing gap/focus clause, not the new tip wrapper");
  assert.match(text, /but you need to work on/i);
});

// --- era-explorer (composer + period share one moduleId/pool) ------------

test("buildConceptFeedback: era-explorer pairs a period against a composer across the shared composer/period pool", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Baroque": [9, 10],
    "Claude Debussy": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("era-explorer", conceptStats);
  assert.match(text, /baroque.*but you need to work on.*debussy/i);
});

test("buildConceptFeedback: era-explorer pairs two composers", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Antonio Vivaldi": [9, 10],
    "Ludwig van Beethoven": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("era-explorer", conceptStats);
  assert.match(text, /vivaldi.*but you need to work on.*beethoven/i);
});

test("buildConceptFeedback: era-explorer's 20th-century period entry produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "20th Century": [2, 10] });
  const text = Feedback.buildConceptFeedback("era-explorer", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["era-explorer"]["20th Century"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

// --- musical-language (all 4 ScoreDecoder topics share one moduleId/pool) -

test("buildConceptFeedback: musical-language pairs across two different topics (ornamentation vs dynamics)", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Turning ornaments": [9, 10],
    "Dynamic changes": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("musical-language", conceptStats);
  assert.match(text, /turning ornaments.*but you need to work on.*dynamic changes/i);
});

test("buildConceptFeedback: musical-language's tempo-word/tempo-change split produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Tempo changes": [2, 10] });
  const text = Feedback.buildConceptFeedback("musical-language", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["musical-language"]["Tempo changes"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

// --- cadence-coach ---------------------------------------------------------

test("buildConceptFeedback: cadence-coach pairs cadence type against key mode", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Perfect": [9, 10],
    "Interrupted": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("cadence-coach", conceptStats);
  assert.match(text, /perfect cadences.*but you need to work on.*interrupted cadences/i);
});

test("buildConceptFeedback: cadence-coach's key-mode dimension produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Major keys": [2, 10] });
  const text = Feedback.buildConceptFeedback("cadence-coach", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["cadence-coach"]["Major keys"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

test("buildConceptFeedback: cadence-coach's Plagal/Interrupted entries exist even though the live bank has no real questions for them yet", () => {
  const Feedback = loadFeedback();
  assert.ok(Feedback.CONCEPT_PHRASES["cadence-coach"]["Plagal"]);
  assert.ok(Feedback.CONCEPT_PHRASES["cadence-coach"]["Interrupted"]);
});

// --- melody-master (devices + dictation share one moduleId/pool) ---------

test("buildConceptFeedback: melody-master pairs a devices category against a dictation difficulty tier", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Ornament": [9, 10],
    "hard": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("melody-master", conceptStats);
  assert.match(text, /melodic ornaments.*but you need to work on.*harder dictations/i);
});

test("buildConceptFeedback: melody-master's Mode/Scale category produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Mode/Scale": [2, 10] });
  const text = Feedback.buildConceptFeedback("melody-master", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["melody-master"]["Mode/Scale"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

// --- melodic-intervals (label + quality + direction + accidental tier) ---

test("buildConceptFeedback: melodic-intervals pairs an interval label against a quality", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "5th": [9, 10],
    "Augmented": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("melodic-intervals", conceptStats);
  assert.match(text, /5ths.*but you need to work on.*augmented intervals/i);
});

test("buildConceptFeedback: melodic-intervals direction dimension produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "descending": [2, 10] });
  const text = Feedback.buildConceptFeedback("melodic-intervals", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["melodic-intervals"]["descending"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});

test("buildConceptFeedback: melodic-intervals reuses key-signature-sprint's accidentalCountTier bucket, with its own content", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "Many accidentals (5-7)": [2, 10] });
  const text = Feedback.buildConceptFeedback("melodic-intervals", conceptStats);
  // Same bucket label as key-signature-sprint, but genuinely different
  // (module-specific) coaching content — not literally the same entry.
  assert.notEqual(
    Feedback.CONCEPT_PHRASES["melodic-intervals"]["Many accidentals (5-7)"].focus,
    Feedback.CONCEPT_PHRASES["key-signature-sprint"]["Many accidentals (5-7)"].focus
  );
  assert.match(text, /complex key signatures/i);
});

// --- ensemble-recognition (category + a hand-authored size bucket) -------

test("buildConceptFeedback: ensemble-recognition pairs a category against a size tier", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "Large ensembles": [9, 10],
    "Ensemble Origin": [2, 10]
  });
  const text = Feedback.buildConceptFeedback("ensemble-recognition", conceptStats);
  assert.match(text, /large ensembles.*but you need to work on.*ensemble origin recognition/i);
});

test("buildConceptFeedback: ensemble-recognition's world/non-Western tier produces real feedback", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "World and non-Western ensembles": [2, 10] });
  const text = Feedback.buildConceptFeedback("ensemble-recognition", conceptStats);
  const phrase = Feedback.CONCEPT_PHRASES["ensemble-recognition"]["World and non-Western ensembles"];
  assert.equal(text, "You need to work on " + phrase.gap + " — " + phrase.focus + " (" + phrase.label + ").");
});
