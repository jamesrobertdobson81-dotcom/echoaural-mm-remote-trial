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

test("a new signature's first correct answer starts at a 2-draw interval", () => {
  const Store = loadStore();
  const result = Store.recordQuestionOutcome("student-1", "src", "sig-1", true);
  assert.equal(result.repetitions, 1);
  assert.equal(result.intervalDraws, 2);
  assert.equal(result.easeFactor, 2.6, "ease factor should nudge up from the 2.5 default");
});

test("consecutive correct answers grow the interval: 2, then 6, then interval x ease factor", () => {
  const Store = loadStore();
  const sid = "student-1";

  const rep1 = Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  assert.equal(rep1.intervalDraws, 2);

  const rep2 = Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  assert.equal(rep2.intervalDraws, 6);

  const rep3 = Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  const expectedRep3Interval = Math.round(6 * rep2.easeFactor);
  assert.equal(rep3.intervalDraws, expectedRep3Interval, "third+ correct rep should multiply the previous interval by ease factor");
});

test("ease factor caps at 2.8 no matter how many consecutive correct answers", () => {
  const Store = loadStore();
  const sid = "student-1";
  let last;
  for (let i = 0; i < 20; i += 1) {
    last = Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  }
  assert.ok(last.easeFactor <= 2.8, "ease factor must never exceed the cap");
  assert.equal(last.easeFactor, 2.8);
});

test("an incorrect answer resets repetitions and interval, and floors ease factor at 1.3", () => {
  const Store = loadStore();
  const sid = "student-1";

  Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  Store.recordQuestionOutcome(sid, "src", "sig-1", true);
  const missed = Store.recordQuestionOutcome(sid, "src", "sig-1", false);

  assert.equal(missed.repetitions, 0, "a miss resets the repetition streak");
  assert.equal(missed.intervalDraws, 1, "a miss drops back to a short relearn interval");
  assert.ok(missed.easeFactor < 2.6, "ease factor should drop below where two correct answers had taken it");

  let last;
  for (let i = 0; i < 20; i += 1) {
    last = Store.recordQuestionOutcome(sid, "src", "sig-1", false);
  }
  assert.equal(last.easeFactor, 1.3, "ease factor must never drop below the floor");
});

test("recordQuestionOutcome captures responseTimeMs but does not let it affect the schedule", () => {
  const Store = loadStore();
  const sid = "student-1";

  const fast = Store.recordQuestionOutcome(sid, "src-a", "sig-1", true, 800);
  assert.equal(fast.responseTimeMs, 800);

  const slow = Store.recordQuestionOutcome(sid, "src-b", "sig-1", true, 15000);
  assert.equal(slow.responseTimeMs, 15000);

  // Same source, same signature-independent formula: two independently
  // fresh signatures answered correctly should schedule identically
  // regardless of how long each took to answer.
  assert.equal(fast.intervalDraws, slow.intervalDraws);
  assert.equal(fast.easeFactor, slow.easeFactor);
});

test("recordQuestionOutcome returns null for a falsy signature (nothing to schedule)", () => {
  const Store = loadStore();
  assert.equal(Store.recordQuestionOutcome("student-1", "src", null, true), null);
  assert.equal(Store.recordQuestionOutcome("student-1", "src", "", true), null);
});
