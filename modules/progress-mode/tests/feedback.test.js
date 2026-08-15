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
  const cumulative = stats({ "chord-identifier": [2, 3] }); // below FEEDBACK_MIN_QUESTIONS
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

test("buildSourceFeedback: strength band uses the source's strength phrase", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 9, 10);
  assert.equal(text, "You " + Feedback.SOURCE_PHRASES["meter-master"].strength + ".");
});

test("buildSourceFeedback: weakness band uses the source's focus phrase and label", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 3, 10);
  assert.equal(
    text,
    "You need to " + Feedback.SOURCE_PHRASES["meter-master"].focus + " (" + Feedback.SOURCE_PHRASES["meter-master"].label + ")."
  );
});

test("buildSourceFeedback: developing band is a distinct, encouraging sentence", () => {
  const Feedback = loadFeedback();
  const text = Feedback.buildSourceFeedback("meter-master", 7, 10); // 70% — between the two thresholds
  assert.match(text, /steady progress with metre and rhythm/i);
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
  assert.equal(text, "You " + Feedback.CONCEPT_PHRASES["instrument-identifier"]["Strings"].strength + ".");
});

test("buildConceptFeedback: falls back to a solo weakness sentence when no strength exists to pair against yet", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({ "second inversion": [2, 10] }); // 20%, reliable, no strength anywhere yet
  const phrase = Feedback.CONCEPT_PHRASES["chord-identifier"]["second inversion"];
  const text = Feedback.buildConceptFeedback("chord-identifier", conceptStats);
  assert.equal(text, "You need to " + phrase.focus + " (" + phrase.label + ").");
});

test("buildConceptFeedback: returns null when every concept is 'developing' (no clear strength or weakness)", () => {
  const Feedback = loadFeedback();
  const conceptStats = stats({
    "first inversion": [7, 10],   // 70% — developing band, not a strength
    "second inversion": [7, 10]   // 70% — developing band, not a weakness
  });
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
  assert.equal(
    text,
    "You " + Feedback.CONCEPT_PHRASES["chord-identifier"]["first inversion"].strength + ".",
    "the unrecognised concept value must be ignored, falling back to the one real reliable concept as a solo strength"
  );
});
