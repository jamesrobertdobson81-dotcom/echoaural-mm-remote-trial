"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Same sandbox-loading pattern as store.test.js — see that file's own
// comment for why (store.js is a browser UMD-ish file, not CommonJS).
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

test("applyIncomingReviews adopts an incoming review when it is newer than the local one", () => {
  const Store = loadStore();
  const sid = "student-1";

  const local = Store.recordQuestionOutcome(sid, "src-a", "sig-1", false); // local: intervalDraws=1, easeFactor=2.3

  Store.applyIncomingReviews(sid, [{
    sourceKey: "src-a",
    questionSignature: "sig-1",
    correct: true,
    easeFactor: 2.6,
    intervalDraws: 6,
    repetitions: 2,
    completedAt: local.completedAt + 10_000
  }]);

  const merged = Store.getSignatureSchedule(sid, "src-a", "sig-1");
  assert.equal(merged.easeFactor, 2.6, "newer incoming review should win");
  assert.equal(merged.intervalDraws, 6);
  assert.equal(merged.repetitions, 2);
});

test("applyIncomingReviews ignores an incoming review older than the local one", () => {
  const Store = loadStore();
  const sid = "student-1";

  const local = Store.recordQuestionOutcome(sid, "src-a", "sig-1", true); // local, newer

  Store.applyIncomingReviews(sid, [{
    sourceKey: "src-a",
    questionSignature: "sig-1",
    correct: false,
    easeFactor: 1.3,
    intervalDraws: 1,
    repetitions: 0,
    completedAt: local.completedAt - 60_000 // older
  }]);

  const after = Store.getSignatureSchedule(sid, "src-a", "sig-1");
  assert.equal(after.easeFactor, local.easeFactor, "older incoming review must not overwrite newer local progress");
  assert.equal(after.intervalDraws, local.intervalDraws);
});

test("applyIncomingReviews merges independently per signature, not per source", () => {
  const Store = loadStore();
  const sid = "student-1";

  const localSig1 = Store.recordQuestionOutcome(sid, "src-a", "sig-1", true); // newer, should survive
  // sig-2 has never been answered locally — the incoming review is the only copy.

  Store.applyIncomingReviews(sid, [
    { sourceKey: "src-a", questionSignature: "sig-1", correct: false, easeFactor: 1.3, intervalDraws: 1, repetitions: 0, completedAt: localSig1.completedAt - 60_000 },
    { sourceKey: "src-a", questionSignature: "sig-2", correct: true, easeFactor: 2.6, intervalDraws: 6, repetitions: 2, completedAt: Date.now() }
  ]);

  assert.equal(Store.getSignatureSchedule(sid, "src-a", "sig-1").easeFactor, localSig1.easeFactor, "a stale incoming review for sig-1 must not clobber sig-1's fresher local progress");
  assert.equal(Store.getSignatureSchedule(sid, "src-a", "sig-2").intervalDraws, 6, "sig-2 (never seen locally) should adopt the incoming review wholesale");
});

test("mergeIncomingAreaState never regresses the local level", () => {
  const Store = loadStore();
  const sid = "student-1";

  // Advance melody to level 1 locally (10 Qs, 90% correct, 6 distinct concepts).
  Store.recordSourceResult(sid, "src-a", "melody", 9, 10, ["s1", "s2", "s3", "s4", "s5", "s6"], true, 0);
  assert.equal(Store.getAreaLevel(sid, "melody"), 1);

  Store.mergeIncomingAreaState(sid, "melody", { level: 0, levelProgress: {} });
  assert.equal(Store.getAreaLevel(sid, "melody"), 1, "incoming lower level must not regress local progress");
});

test("mergeIncomingAreaState advances the local level when the server is ahead", () => {
  const Store = loadStore();
  const sid = "student-1";

  assert.equal(Store.getAreaLevel(sid, "melody"), 0);
  Store.mergeIncomingAreaState(sid, "melody", { level: 2, levelProgress: {} });
  assert.equal(Store.getAreaLevel(sid, "melody"), 2);
});

test("mergeIncomingAreaState unions concept maps and takes the max of correct/total at the shared level", () => {
  const Store = loadStore();
  const sid = "student-1";

  // 5 distinct concepts locally at level 0 — not yet enough to advance (needs 6).
  Store.recordSourceResult(sid, "src-a", "melody", 4, 5, ["s1", "s2", "s3", "s4", "s5"], true, 0);
  assert.equal(Store.getAreaLevel(sid, "melody"), 0);

  Store.mergeIncomingAreaState(sid, "melody", {
    level: 0,
    levelProgress: { "0": { correct: 3, total: 8, concepts: { "src-a:s5": true, "src-a:s6": true } } }
  });

  const merged = Store.getAreaSyncState(sid, "melody");
  const entry = merged.levelProgress["0"];
  assert.equal(entry.correct, 4, "correct should be the max of the two sides, not summed");
  assert.equal(entry.total, 8, "total should be the max of the two sides, not summed");
  assert.deepEqual(
    Object.keys(entry.concepts).sort(),
    ["src-a:s1", "src-a:s2", "src-a:s3", "src-a:s4", "src-a:s5", "src-a:s6"],
    "concept sets from both sides should be unioned"
  );
});
