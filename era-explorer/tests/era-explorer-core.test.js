"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../..");
const core = require(path.join(root, "era-explorer", "era-explorer-core.js"));
const catalogue = require(path.join(root, "shared", "data", "clip-catalogue.json"));

describe("Era Explorer core", () => {
  const audit = core.auditEraExplorerClips(catalogue);
  const pool = audit.valid;

  it("filters to Cambridge-period clips with person composers and local audio", () => {
    assert.ok(pool.length >= 40, `expected a usable pool, found ${pool.length}`);
    assert.ok(core.uniqueValues(pool.map((clip) => clip.period)).length >= 3);
    assert.ok(core.uniqueValues(pool.map((clip) => clip.composer)).length >= 4);
    for (const clip of pool) {
      assert.ok(clip.composer);
      assert.ok(core.isCambridgePeriod(clip.period), `unexpected period ${clip.period}`);
      assert.ok(clip.audioPath.startsWith("/"));
      assert.ok(fs.existsSync(path.join(root, clip.audioPath.replace(/^\//, ""))));
    }
  });

  it("keeps only half of monophonic solo clips in the Era Explorer pool", () => {
    const records = Array.isArray(catalogue.clips) ? catalogue.clips : [];
    const eligibleMonophonic = records.filter((record) => {
      if (!core.isMonophonicClip(record)) return false;
      const composer = core.normaliseComposer(record.composer);
      const period = core.normalisePeriod(record.period);
      const audioPath = core.normaliseAudioPath(record.audio_path || record.file);
      return Boolean(record.clip_id && audioPath && composer && period);
    });
    const kept = pool.filter((clip) => clip.monophonic);
    const omitted = audit.invalid.filter((item) =>
      /monophonic solo clip omitted/i.test(item.reason)
    );
    assert.equal(kept.length + omitted.length, eligibleMonophonic.length);
    assert.equal(kept.length, Math.ceil(eligibleMonophonic.length / 2));
    assert.equal(omitted.length, Math.floor(eligibleMonophonic.length / 2));
  });

  it("normalises periods to the Cambridge set only", () => {
    assert.equal(core.normalisePeriod("20th Century"), "20th Century");
    assert.equal(core.normalisePeriod("Twentieth Century"), "20th Century");
    assert.equal(core.normalisePeriod("Modern"), "20th Century");
    assert.equal(core.normalisePeriod("classical/romantic transition"), "Classical");
    assert.equal(core.normalisePeriod("Contemporary"), "");
    assert.equal(core.normalisePeriod("Jazz"), "");
    assert.equal(core.normaliseComposer("Mozart"), "Wolfgang Amadeus Mozart");
    assert.equal(core.normaliseComposer("J. S. Bach"), "Johann Sebastian Bach");
  });

  it("uses full composer names in multiple-choice options", () => {
    const clip = pool.find((item) => item.composer.includes("Mozart") || item.composer.includes("Bach")) || pool[0];
    const composerQuestion = core.buildComposerQuestion(clip, pool, () => 0.37);
    assert.ok(core.validateEraQuestion(composerQuestion));
    for (const option of composerQuestion.options) {
      assert.ok(option.includes(" "), `expected full name, got "${option}"`);
      assert.equal(option, core.normaliseComposer(option));
    }
    assert.equal(composerQuestion.correctAnswer, clip.composer);
  });

  it("builds four unique shuffled period and composer questions", () => {
    const clip = pool.find((item) => item.composer.includes("Bach") || item.period === "Baroque") || pool[0];
    const periodQuestion = core.buildPeriodQuestion(clip, pool, () => 0.42);
    const composerQuestion = core.buildComposerQuestion(clip, pool, () => 0.37);
    assert.ok(core.validateEraQuestion(periodQuestion));
    assert.ok(core.validateEraQuestion(composerQuestion));
    assert.equal(periodQuestion.prompt, "Which musical period is this extract from?");
    assert.equal(composerQuestion.prompt, "Who composed this extract?");
    assert.equal(new Set(periodQuestion.options).size, 4);
    assert.equal(new Set(composerQuestion.options).size, 4);
    assert.ok(periodQuestion.options.every((option) => core.isCambridgePeriod(option)));
    assert.ok(periodQuestion.options.includes(periodQuestion.correctAnswer));
    assert.ok(composerQuestion.options.includes(composerQuestion.correctAnswer));
  });

  it("prefers different-period composer distractors for clearer choices", () => {
    const romantic = pool.find((clip) => clip.period === "Romantic");
    assert.ok(romantic, "need a Romantic clip for distractor ranking");
    const distractors = core.getComposerDistractors(romantic, pool, () => 0.2);
    assert.equal(distractors.length, 3);
    assert.ok(!distractors.includes(romantic.composer));

    const romanticComposers = new Set(
      pool.filter((clip) => clip.period === "Romantic").map((clip) => clip.composer)
    );
    const samePeriodCount = distractors.filter((composer) => romanticComposers.has(composer)).length;
    assert.ok(
      samePeriodCount <= 1,
      `expected mostly cross-period distractors, got ${samePeriodCount} same-period`
    );
    assert.ok(
      distractors.some((composer) => !romanticComposers.has(composer)),
      "expected at least one different-period distractor"
    );
  });

  it("maps verified composer icons and prefers them on composer questions", () => {
    assert.equal(core.composerHasIcon("Johann Sebastian Bach"), true);
    assert.equal(core.composerHasIcon("Frédéric Chopin"), true);
    assert.equal(core.composerHasIcon("Muzio Clementi"), true);
    assert.equal(core.composerHasIcon("Tomaso Albinoni"), true);
    assert.equal(core.composerHasIcon("Carl Philipp Emanuel Bach"), true);
    assert.equal(core.composerHasIcon("Unknown Composer XYZ"), false);
    const questions = core.buildRoundQuestions(pool, 10, () => 0.44)
      .filter((question) => question.type === "composer");
    assert.ok(questions.length >= 1);
    for (const question of questions) {
      assert.ok(core.composerHasIcon(question.correctAnswer));
      assert.ok(question.options.every((option) => core.composerHasIcon(option)));
    }
  });

  it("builds mixed 3/5/10-question rounds without repeating clips", () => {
    for (const count of [3, 5, 10]) {
      const questions = core.buildRoundQuestions(pool, count, () => 0.31);
      assert.equal(questions.length, count);
      assert.ok(questions.every((question) => core.validateEraQuestion(question)));
      const types = new Set(questions.map((question) => question.type));
      assert.equal(types.size, 2, `round of ${count} must mix period and composer questions`);
      const clipIds = questions.map((question) => question.clip.id);
      assert.equal(new Set(clipIds).size, count);
      for (const question of questions.filter((item) => item.type === "period")) {
        assert.ok(question.options.every((option) => core.CAMBRIDGE_PERIODS.includes(option)));
      }
    }
  });

  it("rejects invalid question shapes", () => {
    assert.equal(core.validateEraQuestion(null), false);
    assert.equal(core.validateEraQuestion({
      type: "period",
      prompt: "Which musical period is this extract from?",
      correctAnswer: "Baroque",
      options: ["Baroque", "Classical", "Romantic"],
      clip: pool[0]
    }), false);
  });
});
