"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../..");
const core = require(path.join(root, "era-explorer", "era-explorer-core.js"));
const catalogue = require(path.join(root, "shared", "data", "clip-catalogue.json"));
const curation = require(path.join(root, "era-explorer", "data", "context-coach-curation.json"));

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
    assert.equal(core.composerHasIcon("Alexander Borodin"), true);
    assert.equal(core.composerHasIcon("Franz Schubert"), true);
    assert.equal(core.composerHasIcon("Josef Suk"), true);
    assert.equal(core.composerHasIcon("Jean-Joseph Mouret"), true);
    assert.equal(core.composerHasIcon("Nikolai Rimsky-Korsakov"), true);
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

  it("prefers clips not in seenClipIds so repeats are avoided until the pool cycles", () => {
    const allIds = pool.map((clip) => clip.id);
    // Mark every clip except the last 5 as already seen this cycle.
    const seenClipIds = new Set(allIds.slice(0, -5));
    const questions = core.buildRoundQuestions(pool, 5, () => 0.31, { seenClipIds });
    const usedIds = questions.map((question) => question.clip.id);
    const stillUnseen = allIds.slice(-5);
    assert.ok(
      usedIds.every((id) => stillUnseen.includes(id)),
      "every drawn clip should come from the still-unseen tail when enough unseen clips exist"
    );
  });

  it("falls back to seen clips once the unseen pool runs out (never throws)", () => {
    const seenClipIds = new Set(pool.map((clip) => clip.id));
    const questions = core.buildRoundQuestions(pool, 5, () => 0.31, { seenClipIds });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => core.validateEraQuestion(question)));
  });

  it("builds composer-only rounds for the Composers skill", () => {
    const questions = core.buildRoundQuestions(pool, 5, () => 0.31, { questionType: "composer" });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.type === "composer"));
    assert.ok(questions.every((question) => core.validateEraQuestion(question)));
    const clipIds = questions.map((question) => question.clip.id);
    assert.equal(new Set(clipIds).size, 5);
  });

  it("builds period-only rounds for the Eras & Periods skill", () => {
    const questions = core.buildRoundQuestions(pool, 5, () => 0.31, { questionType: "period" });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.type === "period"));
    assert.ok(questions.every((question) => core.validateEraQuestion(question)));
    const clipIds = questions.map((question) => question.clip.id);
    assert.equal(new Set(clipIds).size, 5);
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

// Content-review curation overlay (era-explorer/data/context-coach-curation.json)
// — separate describe block, deliberately not touching the uncurated `pool`
// above, so the core algorithm tests keep validating the pure, un-opinionated
// behaviour on their own.
describe("Era Explorer content-review curation", () => {
  const curatedAudit = core.auditEraExplorerClips(catalogue, curation);
  const curatedPool = curatedAudit.valid;
  const uncuratedCount = core.auditEraExplorerClips(catalogue).valid.length;

  it("excludes every fully-dropped clip from the curated pool", () => {
    // Not an exact subtraction: excluding clips shifts which clips the
    // existing 50%-monophonic-reduction rule keeps, since that rule's
    // alternating keep/omit pattern runs over the post-exclusion candidate
    // list (see auditEraExplorerClips) — so the curated pool can end up
    // larger than a naive `uncuratedCount - excludedClipIds.length`. What
    // must hold is that every explicitly-excluded clip is actually gone.
    assert.ok(curatedPool.length < uncuratedCount);
    const curatedIds = new Set(curatedPool.map((clip) => clip.id));
    for (const excludedId of curation.excludedClipIds) {
      assert.ok(!curatedIds.has(excludedId), `${excludedId} should have been excluded`);
    }
    const reviewExclusions = curatedAudit.invalid.filter(
      (item) => item.reason === "Excluded by Context Coach content review."
    );
    assert.equal(reviewExclusions.length, curation.excludedClipIds.length);
  });

  it("still supports mixed rounds after curation exclusions", () => {
    assert.ok(curatedPool.length >= 40);
    assert.ok(core.uniqueValues(curatedPool.map((clip) => clip.period)).length >= 3);
    assert.ok(core.uniqueValues(curatedPool.map((clip) => clip.composer)).length >= 4);
  });

  it("skips only the dropped type for a partially-excluded clip", () => {
    const [clipId, excludedTypes] = Object.entries(curation.typeExclusions)[0];
    const clip = curatedPool.find((item) => item.id === clipId);
    assert.ok(clip, `expected ${clipId} to remain in the curated pool (only one type dropped)`);
    for (const type of excludedTypes) {
      const question = type === "period"
        ? core.buildPeriodQuestion(clip, curatedPool, () => 0.4, curation)
        : core.buildComposerQuestion(clip, curatedPool, () => 0.4, curation);
      assert.equal(question, null, `${type} question should be suppressed for ${clipId}`);
    }
    const keptType = excludedTypes.includes("composer") ? "period" : "composer";
    const kept = keptType === "period"
      ? core.buildPeriodQuestion(clip, curatedPool, () => 0.4, curation)
      : core.buildComposerQuestion(clip, curatedPool, () => 0.4, curation);
    assert.ok(core.validateEraQuestion(kept), `${keptType} question should still build for ${clipId}`);
  });

  it("attaches the reviewed level to generated questions", () => {
    const [clipId, levels] = Object.entries(curation.levels).find(([, l]) => l.composer) || [];
    const clip = curatedPool.find((item) => item.id === clipId);
    assert.ok(clip, `expected ${clipId} in the curated pool`);
    const question = core.buildComposerQuestion(clip, curatedPool, () => 0.4, curation);
    assert.equal(question.level, levels.composer);
  });

  it("uses the curated option override instead of generated distractors", () => {
    const [clipId, overrides] = Object.entries(curation.optionOverrides)[0];
    const clip = curatedPool.find((item) => item.id === clipId);
    assert.ok(clip, `expected ${clipId} in the curated pool`);
    const question = core.buildComposerQuestion(clip, curatedPool, () => 0.4, curation);
    assert.deepEqual(
      [...question.options].sort(),
      [...overrides.composer].sort()
    );
  });

  it("filters buildRoundQuestions to a single curated level for the requested skill", () => {
    const questions = core.buildRoundQuestions(curatedPool, 5, () => 0.31, {
      questionType: "composer",
      curation,
      level: "Securing"
    });
    assert.equal(questions.length, 5);
    for (const question of questions) {
      assert.equal(curation.levels[question.clip.id]?.composer, "Securing");
    }
  });

  it("builds an unrestricted curated round when no level is requested", () => {
    const questions = core.buildRoundQuestions(curatedPool, 10, () => 0.31, { curation });
    assert.equal(questions.length, 10);
    assert.ok(questions.every((question) => core.validateEraQuestion(question)));
  });
});
