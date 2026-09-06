"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const moduleRoot = path.resolve(__dirname, "..");
const core = require(path.join(moduleRoot, "ensemble-core.js"));
const pack = JSON.parse(
  fs.readFileSync(path.join(moduleRoot, "data", "ensemble-questions.json"), "utf8")
);

describe("Ensemble Recognition question bank", () => {
  it("loads resource-backed questions with audio on disk", () => {
    assert.equal(pack.questions.length, 66);
    assert.ok(Array.isArray(pack.vocabulary));
    assert.ok(pack.vocabulary.includes("String Quartet"));
    assert.ok(pack.vocabulary.includes("Orchestra"));

    for (const question of pack.questions) {
      assert.ok(core.validateQuestion(question), `invalid question ${question.id}`);
      const audioPath = path.join(moduleRoot, question.audio);
      assert.ok(fs.existsSync(audioPath), `missing audio ${question.audio}`);
    }
  });

  it("never exceeds 4 choices, and gates close-match distractors by level (multiple-choice questions)", () => {
    for (const question of pack.questions) {
      if (question.responseType === "typed") continue; // marked via markPoints, not a choice grid
      assert.ok(question.choices.length <= core.MAX_CHOICES);
      assert.ok(question.choices.includes(question.correctAnswer));
      if (question.responseType === "mc-custom") {
        // Custom-choice questions (e.g. country-of-origin) draw from their
        // own closed set, not the ensemble-type VOCABULARY — already fully
        // checked by validateQuestion() above.
        continue;
      }
      // Distractor difficulty is levelled — see validateQuestion/buildChoices:
      // Foundation must NOT have a close match (obviously different options),
      // Developing has no requirement either way, Securing/Mastering must
      // have one (the original rule, for genuinely hard questions).
      const closeMatchPresent = core.hasCloseMatchDistractor(question.correctAnswer, question.choices);
      if (question.level === "Foundation") {
        assert.equal(closeMatchPresent, false, `Foundation question ${question.id} should not have a close-match distractor`);
      } else if (question.level !== "Developing") {
        assert.ok(closeMatchPresent, `no close match for ${question.id} (${question.correctAnswer})`);
      }
      for (const choice of question.choices) {
        assert.ok(core.isVocabularyTerm(choice), `non-vocab choice ${choice}`);
      }
    }
  });

  it("typed questions have real markPoints to mark against", () => {
    for (const question of pack.questions) {
      if (question.responseType !== "typed") continue;
      assert.ok(Array.isArray(question.markPoints) && question.markPoints.length > 0, `no markPoints for ${question.id}`);
    }
  });

  it("maps teaching tags to Cambridge-facing ensemble labels", () => {
    assert.equal(core.labelFromTeachingTag("string_quartet"), "String Quartet");
    assert.equal(core.labelFromTeachingTag("duo"), "Duet");
    assert.equal(core.labelFromTeachingTag("gamelan_ensemble"), "Gamelan");
    assert.equal(core.labelFromTeachingTag("maqam_ensemble"), "Arab Takht");
    assert.equal(core.labelFromTeachingTag("ragtime_jazz"), "Jazz Band");
  });

  it("builds choices with a guaranteed close neighbour", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return (calls % 10) / 10;
    };
    const choices = core.buildChoices("String Quartet", { random });
    assert.equal(choices.length, 4);
    assert.ok(choices.includes("String Quartet"));
    assert.ok(core.hasCloseMatchDistractor("String Quartet", choices));
  });

  it("excludes close-match distractors entirely at Foundation level", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      let calls = seed;
      const random = () => { calls += 1; return (calls % 10) / 10; };
      const choices = core.buildChoices("String Quartet", { level: "Foundation", random });
      assert.equal(choices.length, 4);
      assert.ok(choices.includes("String Quartet"));
      assert.equal(core.hasCloseMatchDistractor("String Quartet", choices), false);
    }
  });

  it("has no close-match requirement either way at Developing level", () => {
    const choices = core.buildChoices("String Quartet", { level: "Developing", random: () => 0.5 });
    assert.equal(choices.length, 4);
    assert.ok(choices.includes("String Quartet"));
    // Not asserting hasCloseMatchDistractor either way — Developing has no
    // requirement, so this is just a shape/membership check.
  });

  it("marks correct and incorrect answers", () => {
    const question = pack.questions[0];
    const correct = core.markAnswer(question.correctAnswer, question);
    const wrong = core.markAnswer(
      question.choices.find((choice) => choice !== question.correctAnswer),
      question
    );
    assert.equal(correct.awardedMarks, 1);
    assert.equal(correct.isCorrect, true);
    assert.equal(wrong.awardedMarks, 0);
    assert.equal(wrong.isCorrect, false);
  });

  it("filters by level and picks a round size", () => {
    const foundation = core.filterByLevel(pack.questions, "Foundation");
    assert.ok(foundation.every((question) => question.level === "Foundation"));
    const roundSize = Math.min(3, foundation.length);
    const round = core.pickRound(foundation, roundSize, () => 0.2);
    assert.equal(round.length, roundSize);
  });

  it("avoids repeating already-seen questions until the pool cycles", () => {
    // Uses whichever level currently has the deepest pool rather than a
    // hardcoded level name — content is being actively added across levels,
    // so the exact per-level counts (and which level is deepest) shift over
    // time. The mechanism under test doesn't care which level it's given.
    const byLevel = ["Foundation", "Developing", "Securing", "Mastering"]
      .map((level) => core.filterByLevel(pack.questions, level))
      .sort((a, b) => b.length - a.length);
    const pool = byLevel[0];
    const roundSize = Math.min(3, pool.length);
    const allIds = pool.map((question) => question.id);
    const seenIds = new Set(allIds.slice(0, -roundSize));
    const round = core.pickRound(pool, roundSize, Math.random, { seenIds });
    const stillUnseen = allIds.slice(-roundSize);
    assert.ok(round.every((question) => stillUnseen.includes(question.id)));
  });

  it("falls back to seen questions once the whole pool has been shown", () => {
    const byLevel = ["Foundation", "Developing", "Securing", "Mastering"]
      .map((level) => core.filterByLevel(pack.questions, level))
      .sort((a, b) => b.length - a.length);
    const pool = byLevel[0];
    const roundSize = Math.min(3, pool.length);
    const seenIds = new Set(pool.map((question) => question.id));
    const round = core.pickRound(pool, roundSize, Math.random, { seenIds });
    assert.equal(round.length, roundSize);
  });
});
