"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProgressSummary } = require("../account-server.js");

// buildProgressSummary takes plain rounds/attempts arrays (as fetched from
// Postgres) and needs no DB connection itself — getPool() is only touched
// by the HTTP routes, not by this function.
function attempt(moduleId, roundId, score, maximumScore, answerData) {
  return {
    module_id: moduleId,
    round_id: roundId,
    score,
    maximum_score: maximumScore,
    answer_data: answerData || {}
  };
}

function round(id, moduleId, score, maximumScore, questionCount) {
  return { id, module_id: moduleId, module_title: moduleId, score, maximum_score: maximumScore, question_count: questionCount, completed_at: new Date().toISOString() };
}

test("byConcept: chord-identifier splits by inversion AND extension tier in one flat pool", () => {
  const rounds = [round("r1", "chord-identifier", 8, 10, 10)];
  const attempts = [
    attempt("chord-identifier", "r1", 1, 1, { inversionLabel: "first inversion", quality: "major" }),
    attempt("chord-identifier", "r1", 1, 1, { inversionLabel: "first inversion", quality: "minor" }),
    attempt("chord-identifier", "r1", 0, 1, { inversionLabel: "second inversion", quality: "major" }),
    attempt("chord-identifier", "r1", 1, 1, { inversionLabel: "root position", quality: "dominant9" }),
    attempt("chord-identifier", "r1", 0, 1, { inversionLabel: "root position", quality: "sus2" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["chord-identifier"];

  assert.equal(concepts["first inversion"].correct, 2);
  assert.equal(concepts["first inversion"].questions, 2);
  assert.equal(concepts["Triads"].correct, 2, "major + minor triads bucket together");
  assert.equal(concepts["Triads"].questions, 3, "major (1st inv) + minor (1st inv) + major (2nd inv) all bucket as Triads");
  assert.equal(concepts["Extended chords"].questions, 2, "dominant9 + sus2 both bucket as Extended chords");
});

test("byConcept: instrument-identifier whitelist excludes genre/context noise, matches family case-insensitively", () => {
  const rounds = [round("r1", "instrument-identifier", 3, 5, 5)];
  const attempts = [
    attempt("instrument-identifier", "r1", 1, 1, { family: "Strings" }),
    attempt("instrument-identifier", "r1", 1, 1, { family: "BRASS" }), // inconsistent casing in real data
    attempt("instrument-identifier", "r1", 0, 1, { family: "Deep House" }), // genre tag, not a family
    attempt("instrument-identifier", "r1", 1, 1, { type: "Solo" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["instrument-identifier"];

  assert.equal(concepts["Strings"].questions, 1);
  assert.equal(concepts["Brass"].questions, 1, "BRASS should normalise to the canonical display casing Brass");
  assert.equal(concepts["Deep House"], undefined, "genre/context tags must never leak into the concept pool");
  assert.equal(concepts["Solo"].questions, 1);
});

test("byConcept: instrument-identifier family and type never collide on the shared World/Ensemble value", () => {
  const rounds = [round("r1", "instrument-identifier", 2, 2, 2)];
  const attempts = [
    attempt("instrument-identifier", "r1", 1, 1, { family: "World/Ensemble" }),
    attempt("instrument-identifier", "r1", 1, 1, { type: "World/Ensemble" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["instrument-identifier"];
  // Only `family`'s copy should ever land in the pool (see the extractor
  // config's own comment on why `type` deliberately excludes this value).
  assert.equal(concepts["World/Ensemble"].questions, 1);
});

test("byConcept: meter-master metreFamily whitelist drops junk values, and derives a simple/compound tier from the same field", () => {
  const rounds = [round("r1", "meter-master", 2, 4, 4)];
  const attempts = [
    attempt("meter-master", "r1", 1, 1, { metreFamily: "Simple triple" }),
    attempt("meter-master", "r1", 1, 1, { metreFamily: "Compound duple" }),
    attempt("meter-master", "r1", 0, 1, { metreFamily: "Not confirmed" }),
    attempt("meter-master", "r1", 0, 1, { metreFamily: "" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["meter-master"];

  assert.equal(concepts["Simple triple"].questions, 1);
  assert.equal(concepts["Compound duple"].questions, 1);
  assert.equal(concepts["Simple time"].questions, 1, "derived from Simple triple");
  assert.equal(concepts["Compound time"].questions, 1, "derived from Compound duple");
  assert.equal(concepts["Not confirmed"], undefined, "junk metre_family values must be excluded");
});

test("byConcept: texture-trainer excludes transition/compound textureFocus values", () => {
  const rounds = [round("r1", "texture-trainer", 1, 2, 2)];
  const attempts = [
    attempt("texture-trainer", "r1", 1, 1, { textureFocus: "Monophonic" }),
    attempt("texture-trainer", "r1", 0, 1, { textureFocus: "Monophonic → fugal polyphony" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["texture-trainer"];

  assert.equal(concepts["Monophonic"].questions, 1);
  assert.equal(concepts["Monophonic → fugal polyphony"], undefined, "transition descriptions are not one concept");
});

test("byConcept: key-signature-sprint buckets accidentalCount into tiers alongside accidentalType", () => {
  const rounds = [round("r1", "key-signature-sprint", 3, 3, 3)];
  const attempts = [
    attempt("key-signature-sprint", "r1", 1, 1, { accidentalType: "sharp", accidentalCount: 1 }),
    attempt("key-signature-sprint", "r1", 1, 1, { accidentalType: "flat", accidentalCount: 6 }),
    attempt("key-signature-sprint", "r1", 1, 1, { accidentalType: "natural", accidentalCount: 0 })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["key-signature-sprint"];

  assert.equal(concepts["sharp"].questions, 1);
  assert.equal(concepts["Few accidentals (0-2)"].questions, 2, "count 1 and count 0 both bucket as Few");
  assert.equal(concepts["Many accidentals (5-7)"].questions, 1, "count 6 buckets as Many");
});

test("byConcept: modules with no extractor configured produce no entry at all", () => {
  const rounds = [round("r1", "melody-master", 1, 1, 1)];
  const attempts = [attempt("melody-master", "r1", 1, 1, { sourceKey: "melody-master-dictation" })];
  const summary = buildProgressSummary(rounds, attempts);
  assert.equal(summary.byConcept["melody-master"], undefined);
});

// Regression coverage for a real bug: a multi-mark attempt (e.g. a 6-mark
// melody-master dictation question) must never count for more than a single
// attempt in bySourceKey/byConcept/moduleSummaries — these blend directly
// with Progress Mode's own flat "1 per attempt" pool downstream
// (student-home.js's getCombinedSourceStats/getCombinedConceptStats), so a
// marks-weighted count here would silently let one multi-mark question
// outweigh several single-mark ones, and cross reliability thresholds
// (modules/progress-mode/feedback.js's FEEDBACK_MIN_QUESTIONS) on far fewer
// real attempts than intended. Every fixture above happens to use
// maximum_score:1, which is exactly why this bug shipped undetected.
test("bySourceKey: a partially-correct multi-mark attempt counts as ONE question, not correct", () => {
  const rounds = [round("r1", "melody-master", 4, 6, 1)];
  const attempts = [attempt("melody-master", "r1", 4, 6, { sourceKey: "melody-master-dictation" })];
  const summary = buildProgressSummary(rounds, attempts);
  const source = summary.bySourceKey["melody-master-dictation"];

  assert.equal(source.questions, 1, "one attempt, regardless of how many marks it was worth");
  assert.equal(source.correct, 0, "4 of 6 marks is not a fully-correct attempt");
});

test("bySourceKey: a fully-correct multi-mark attempt still only counts as ONE correct question", () => {
  const rounds = [round("r1", "melody-master", 6, 6, 1)];
  const attempts = [attempt("melody-master", "r1", 6, 6, { sourceKey: "melody-master-dictation" })];
  const summary = buildProgressSummary(rounds, attempts);
  const source = summary.bySourceKey["melody-master-dictation"];

  assert.equal(source.questions, 1);
  assert.equal(source.correct, 1, "not 6 — a fully-correct attempt is worth exactly one correct question");
});

test("byConcept: a multi-mark attempt pools the same flat per-attempt way as bySourceKey", () => {
  const rounds = [round("r1", "chord-identifier", 2, 2, 1)];
  const attempts = [
    attempt("chord-identifier", "r1", 1, 2, { inversionLabel: "first inversion", quality: "dominant9" })
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const concepts = summary.byConcept["chord-identifier"];

  assert.equal(concepts["first inversion"].questions, 1);
  assert.equal(concepts["first inversion"].correct, 0, "1 of 2 marks is not fully correct");
  assert.equal(concepts["Extended chords"].questions, 1);
});

test("moduleSummaries: correctQuestionCount is a flat attempt-count, not a marks sum", () => {
  const rounds = [round("r1", "melody-master", 10, 12, 2)];
  const attempts = [
    attempt("melody-master", "r1", 6, 6, {}),  // fully correct, 6 marks
    attempt("melody-master", "r1", 4, 6, {})   // partially correct, 6 marks
  ];
  const summary = buildProgressSummary(rounds, attempts);
  const melodyMaster = summary.modules.find((entry) => entry.moduleId === "melody-master");

  assert.equal(melodyMaster.questions, 2, "two attempts");
  assert.equal(melodyMaster.correctQuestionCount, 1, "only one of the two was fully correct, despite 10 of 12 marks overall");
  assert.equal(melodyMaster.score, 10, "score/maximumScore stay marks-based, unaffected by this fix");
  assert.equal(melodyMaster.maximumScore, 12);
});
