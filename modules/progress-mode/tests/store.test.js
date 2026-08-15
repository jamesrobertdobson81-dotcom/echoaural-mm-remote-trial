"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// store.js is a browser UMD-ish file (`(function (global) { ... })(window)`),
// not CommonJS — same pattern as every other modules/progress-mode/ file.
// Shimming `window`/`localStorage` here (rather than changing store.js's own
// export style) keeps this test isolated and store.js unchanged; node --test
// runs each test file in its own process, so this shim never leaks into
// other test files.
function loadStore() {
  const data = new Map();
  const fakeWindow = {
    localStorage: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, String(value))
    }
  };
  const moduleExports = { exports: {} };
  const wrappedSource = require("node:fs").readFileSync(
    path.join(__dirname, "..", "store.js"),
    "utf8"
  );
  // eslint-disable-next-line no-new-func
  const runInSandbox = new Function("window", "module", "exports", wrappedSource);
  runInSandbox(fakeWindow, moduleExports, moduleExports.exports);
  return fakeWindow.EAProgressModeStore;
}

function freshStore() {
  return loadStore();
}

test("recordSourceResult advances a level once volume/accuracy/variety all clear", () => {
  const Store = freshStore();
  const sid = "student-1";

  // 5 signatures x 2 questions each = 10 total, 9 correct = 90% >= 80%,
  // 5 distinct concepts... need 6 for MIN_DISTINCT_CONCEPTS_PER_LEVEL, so
  // this first call should NOT advance (variety bar not yet cleared).
  let result = Store.recordSourceResult(
    sid, "src-a", "melody", 9, 10, ["s1", "s2", "s3", "s4", "s5"], true, 0
  );
  assert.equal(result.advanced, false, "should not advance without enough distinct concepts");
  assert.equal(result.levelProgress.distinctConcepts, 5);

  result = Store.recordSourceResult(sid, "src-a", "melody", 1, 1, ["s6"], true, 0);
  assert.equal(result.levelProgress.distinctConcepts, 6);
  assert.equal(result.advanced, true, "should advance once volume/accuracy/variety all clear");
  assert.equal(result.areaLevel, 1);
});

test("recordSourceResult does not advance below the accuracy bar", () => {
  const Store = freshStore();
  const sid = "student-1";
  const result = Store.recordSourceResult(
    sid, "src-a", "melody", 5, 10, ["s1", "s2", "s3", "s4", "s5", "s6"], true, 0
  );
  assert.equal(result.levelProgress.percentage, 50);
  assert.equal(result.advanced, false);
});

test("an escalated (higher-level) result banks at its own level and never advances the current one", () => {
  const Store = freshStore();
  const sid = "student-1";

  // Area is at level 0. A slot escalated to level 1 (e.g. an empty pool at
  // level 0) scores a perfect, well-sampled result — but explicitly at
  // levelIndex=1, not the area's current level (0).
  const escalated = Store.recordSourceResult(
    sid, "src-a", "melody", 10, 10, ["s1", "s2", "s3", "s4", "s5", "s6"], true, 1
  );
  assert.equal(escalated.advanced, false, "an escalated attempt must never itself trigger an advance");
  assert.equal(escalated.areaLevel, 0, "area must still be at its real current level");

  // The area's OWN level-0 pool is untouched by the escalated call above —
  // clearing it now on its own merits should advance normally.
  const atCurrentLevel = Store.recordSourceResult(
    sid, "src-a", "melody", 10, 10, ["t1", "t2", "t3", "t4", "t5", "t6"], true, 0
  );
  assert.equal(atCurrentLevel.advanced, true);
  assert.equal(atCurrentLevel.areaLevel, 1);
});

test("floor gating blocks advancement while a reliably-sampled source is below the floor, even once the pooled average clears", () => {
  const Store = freshStore();
  const sid = "student-1";
  const sourcesInArea = ["strong-a", "weak-b"];

  // Establish weak-b's own floor-violating sample FIRST (8 questions, 12.5%
  // — below FLOOR_THRESHOLD once its own sample is large enough to judge).
  // Pooled volume alone (8) is still short of MIN_QUESTIONS_PER_LEVEL, so no
  // advance is possible yet regardless — this just seeds weak-b's state
  // before strong-a's own total could otherwise trigger a premature advance
  // on its own (weak-b would be invisible to the floor check with 0 samples).
  let result = Store.recordSourceResult(sid, "weak-b", "melody", 1, 8, [], false, 0, sourcesInArea);
  assert.equal(result.advanced, false);

  // One big strong-a batch (100%) pushes the pool to exactly 28/35 = 80%,
  // clearing volume/accuracy/variety — but weak-b (1/8 = 12.5%) should
  // still veto advancement.
  result = Store.recordSourceResult(sid, "strong-a", "melody", 27, 27, [], false, 0, sourcesInArea);
  assert.equal(result.levelProgress.percentage, 80);
  assert.equal(result.levelProgress.floorMet, false, "weak-b's 12.5% should still veto advancement");
  assert.equal(result.advanced, false);

  // Bring weak-b's own cumulative accuracy up toward the floor in two
  // steps — first still short of it (10/18 = 55.6%), then clearing it
  // (20/28 = 71.4%), all while pool accuracy stays comfortably above 80%.
  result = Store.recordSourceResult(sid, "weak-b", "melody", 9, 10, [], false, 0, sourcesInArea);
  assert.equal(result.levelProgress.floorMet, false, "weak-b at 55.6% should still veto advancement");
  assert.equal(result.advanced, false);

  const finalResult = Store.recordSourceResult(sid, "weak-b", "melody", 10, 10, [], false, 0, sourcesInArea);
  assert.equal(finalResult.levelProgress.floorMet, true);
  assert.equal(finalResult.advanced, true);
});

test("floor gating ignores a source with too small a sample to judge", () => {
  const Store = freshStore();
  const sid = "student-1";
  const sourcesInArea = ["strong-a", "untested-b"];

  // A single well-sampled, accurate result clears volume/accuracy/variety
  // on its own; untested-b has 0 questions recorded at all and must not
  // block advancement just because it hasn't been sampled yet.
  const result = Store.recordSourceResult(sid, "strong-a", "melody", 10, 10, [], false, 0, sourcesInArea);
  assert.equal(result.levelProgress.floorMet, true);
  assert.equal(result.advanced, true);
});

test("a missed signature's retry requires both the draw-count AND wall-clock gate", () => {
  const Store = freshStore();
  const sid = "student-1";

  Store.recordQuestionOutcome(sid, "src", "sig-1", false); // miss: intervalDraws=1, dueAtDraw = 1+1 = 2, dueAtTime = +3min
  assert.equal(Store.isSignatureCoolingDown(sid, "src", "sig-1"), true);

  Store.recordQuestionOutcome(sid, "src", "sig-2", true);
  // drawCount is now 2 (draw gate satisfied, dueAtDraw=2) but no time has passed.
  assert.equal(Store.isSignatureCoolingDown(sid, "src", "sig-1"), true, "should still cool down on the time gate alone");
});

test("a correct answer schedules a signature further out than a miss would", () => {
  const Store = freshStore();
  const sid = "student-1";

  var missResult = Store.recordQuestionOutcome(sid, "src", "sig-1", false);
  assert.equal(missResult.intervalDraws, 1, "a miss resets to a short 1-draw relearn interval");
  assert.equal(missResult.repetitions, 0);

  var correctResult = Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  assert.equal(correctResult.repetitions, 1, "repetitions restart at 1 on the next correct answer");
  assert.ok(correctResult.intervalDraws > missResult.intervalDraws, "a correct answer's interval should be longer than a miss's relearn interval");
  assert.ok(correctResult.easeFactor > missResult.easeFactor, "ease factor should recover after a correct answer");
});

test("question outcomes expose a read-only individual history for the dashboard", () => {
  const Store = freshStore();
  const sid = "history-student";

  Store.recordQuestionOutcome(sid, "meter-master", "MTR001", true);
  Store.recordQuestionOutcome(sid, "meter-master", "MTR002", false);

  const history = Store.getQuestionHistory(sid);
  assert.equal(history.length, 2);
  assert.equal(history.some((entry) => entry.questionId === "MTR001" && entry.correct === true), true);
  assert.equal(history.some((entry) => entry.questionId === "MTR002" && entry.correct === false), true);

  history.pop();
  assert.equal(Store.getQuestionHistory(sid).length, 2, "returned history must not mutate stored progress");
});

test("getReviewCandidate returns null for an empty source list, and the least-recently-drawn source otherwise", () => {
  const Store = freshStore();
  const sid = "student-1";

  assert.equal(Store.getReviewCandidate(sid, []), null);
  assert.equal(Store.getReviewCandidate(sid, ["never-drawn"]), "never-drawn", "a never-drawn source is most overdue");

  Store.recordQuestionOutcome(sid, "drawn-a", "sig-1", true);
  // drawn-b has never been drawn — still more overdue than drawn-a.
  assert.equal(Store.getReviewCandidate(sid, ["drawn-a", "drawn-b"]), "drawn-b");
});

test("getAreaOverallProgressPercentage banks 25 points per fully-cleared level plus a fraction of the current one", () => {
  const Store = freshStore();
  const sid = "student-1";

  // Nothing played yet.
  assert.equal(Store.getAreaOverallProgressPercentage(sid, "melody", true), 0);

  // Half the volume bar cleared at level 0 (5 of 10 questions), full accuracy,
  // no concepts tracked yet.
  Store.recordSourceResult(sid, "src-a", "melody", 5, 5, [], false, 0);
  const percentage = Store.getAreaOverallProgressPercentage(sid, "melody", false);
  assert.ok(percentage > 0 && percentage < 25, `expected a partial level-0 fraction, got ${percentage}`);
});

test("recordStreakOutcome increments on correct, resets on wrong, and tracks a personal best", () => {
  const Store = freshStore();
  const sid = "student-1";

  assert.deepEqual(Store.recordStreakOutcome(sid, true), { correctCurrent: 1, correctBest: 1 });
  assert.deepEqual(Store.recordStreakOutcome(sid, true), { correctCurrent: 2, correctBest: 2 });
  assert.deepEqual(Store.recordStreakOutcome(sid, true), { correctCurrent: 3, correctBest: 3 });

  // A miss resets the current streak but must never erase the best.
  assert.deepEqual(Store.recordStreakOutcome(sid, false), { correctCurrent: 0, correctBest: 3 });

  // Best only ever tracks the highest current streak has ever reached — a
  // shorter run after a break shouldn't overwrite it.
  assert.deepEqual(Store.recordStreakOutcome(sid, true), { correctCurrent: 1, correctBest: 3 });

  const snapshot = Store.getStreakSnapshot(sid);
  assert.equal(snapshot.correctCurrent, 1);
  assert.equal(snapshot.correctBest, 3);
});

test("getStreakSnapshot never mutates state (read-only, matches getSnapshot's own pattern)", () => {
  const Store = freshStore();
  const sid = "student-1";
  Store.recordStreakOutcome(sid, true);
  Store.getStreakSnapshot(sid);
  Store.getStreakSnapshot(sid);
  assert.equal(Store.getStreakSnapshot(sid).correctCurrent, 1, "reading the snapshot repeatedly must not change it");
});

test("recordRoundComplete starts a daily streak at 1 on the first-ever round", () => {
  const Store = freshStore();
  const sid = "student-1";
  const result = Store.recordRoundComplete(sid);
  assert.deepEqual(result, { dailyCurrent: 1, dailyBest: 1 });
});

test("recordRoundComplete does not extend the daily streak for a second round the same day", () => {
  const Store = freshStore();
  const sid = "student-1";
  Store.recordRoundComplete(sid);
  const second = Store.recordRoundComplete(sid);
  assert.deepEqual(second, { dailyCurrent: 1, dailyBest: 1 }, "same-day repeat must not double-count a day");
});

test("recordRoundComplete extends the daily streak on a genuine next calendar day, and tracks best", () => {
  const Store = freshStore();
  const sid = "student-1";
  const realNow = Date.now;
  try {
    Date.now = () => new Date(2026, 0, 1, 9, 0, 0).getTime();
    assert.deepEqual(Store.recordRoundComplete(sid), { dailyCurrent: 1, dailyBest: 1 });

    Date.now = () => new Date(2026, 0, 2, 8, 0, 0).getTime();
    assert.deepEqual(Store.recordRoundComplete(sid), { dailyCurrent: 2, dailyBest: 2 });

    Date.now = () => new Date(2026, 0, 3, 22, 0, 0).getTime();
    assert.deepEqual(Store.recordRoundComplete(sid), { dailyCurrent: 3, dailyBest: 3 });
  } finally {
    Date.now = realNow;
  }
});

test("recordRoundComplete resets the daily streak to 1 after a gap day, without losing the best", () => {
  const Store = freshStore();
  const sid = "student-1";
  const realNow = Date.now;
  try {
    Date.now = () => new Date(2026, 0, 1).getTime();
    Store.recordRoundComplete(sid);
    Date.now = () => new Date(2026, 0, 2).getTime();
    Store.recordRoundComplete(sid);
    Date.now = () => new Date(2026, 0, 3).getTime();
    assert.deepEqual(Store.recordRoundComplete(sid), { dailyCurrent: 3, dailyBest: 3 });

    // Skip a day (no round on Jan 4) — Jan 5 is a gap, not a continuation.
    Date.now = () => new Date(2026, 0, 5).getTime();
    assert.deepEqual(Store.recordRoundComplete(sid), { dailyCurrent: 1, dailyBest: 3 }, "best must survive a broken streak");
  } finally {
    Date.now = realNow;
  }
});

test("getRoundsThisWeek counts only rounds within the trailing 7 days", () => {
  const Store = freshStore();
  const sid = "student-1";
  const realNow = Date.now;
  try {
    Date.now = () => new Date(2026, 0, 1).getTime();
    Store.recordRoundComplete(sid); // 10 days before the "now" below — outside the window
    Date.now = () => new Date(2026, 0, 8).getTime();
    Store.recordRoundComplete(sid); // 3 days before "now" — inside the window
    Date.now = () => new Date(2026, 0, 10).getTime();
    Store.recordRoundComplete(sid); // 1 day before "now" — inside the window
    Date.now = () => new Date(2026, 0, 11).getTime();
    assert.equal(Store.getRoundsThisWeek(sid), 2);
  } finally {
    Date.now = realNow;
  }
});

test("getRoundsThisWeek returns 0 for a student who has never played", () => {
  const Store = freshStore();
  assert.equal(Store.getRoundsThisWeek("never-played"), 0);
});

test("getSnapshot averages level across areas and reports rounds completed", () => {
  const Store = freshStore();
  const sid = "student-1";
  const areaKeys = ["melody", "texture"];

  Store.recordSourceResult(sid, "src-a", "melody", 10, 10, ["s1", "s2", "s3", "s4", "s5", "s6"], true, 0);
  Store.recordRoundComplete(sid);

  const snapshot = Store.getSnapshot(sid, areaKeys);
  assert.equal(snapshot.roundsCompleted, 1);
  assert.equal(snapshot.areas.melody.level, 1);
  assert.equal(snapshot.areas.texture.level, 0);
  assert.equal(snapshot.overallLevelIndex, 0.5);
});
