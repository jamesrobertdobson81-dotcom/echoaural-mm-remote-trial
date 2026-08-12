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

test("missed-question retry requires both the draw-count AND wall-clock gate", () => {
  const Store = freshStore();
  const sid = "student-1";

  Store.recordQuestionOutcome(sid, "src", "sig-1", false); // miss #1: dueAtDraw = 3, dueAtTime = +3min
  assert.equal(Store.isMissCoolingDown(sid, "src", "sig-1"), true);

  Store.recordQuestionOutcome(sid, "src", "sig-2", true);
  Store.recordQuestionOutcome(sid, "src", "sig-3", true);
  // drawCount is now 3 (draw gate satisfied) but no time has passed.
  assert.equal(Store.isMissCoolingDown(sid, "src", "sig-1"), true, "should still cool down on the time gate alone");
});

test("a correct answer clears a signature from the missed queue immediately", () => {
  const Store = freshStore();
  const sid = "student-1";
  Store.recordQuestionOutcome(sid, "src", "sig-1", false);
  assert.equal(Store.isMissCoolingDown(sid, "src", "sig-1"), true);
  Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  assert.equal(Store.isMissCoolingDown(sid, "src", "sig-1"), false);
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
