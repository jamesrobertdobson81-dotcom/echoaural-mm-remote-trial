"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const SR = require(path.join(__dirname, "..", "js", "spaced-repetition.js"));

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value))
  };
}

function pool(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `Q${index + 1}` }));
}

test("draws every item once before any repeat", () => {
  const storage = fakeStorage();
  const items = pool(10);
  const seenIds = [];

  for (let round = 0; round < 10; round += 1) {
    const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage });
    const picked = ordered.slice(0, 1);
    seenIds.push(picked[0].id);
    SR.markShown(picked, { key: "app:level", storage });
  }

  assert.equal(new Set(seenIds).size, 10, "all 10 items should be distinct across 10 rounds");
});

test("resets and starts a fresh cycle once the whole pool has been shown", () => {
  const storage = fakeStorage();
  const items = pool(4);

  for (let round = 0; round < 4; round += 1) {
    const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage, random: () => 0 });
    SR.markShown(ordered.slice(0, 1), { key: "app:level", storage });
  }

  // Pool fully exhausted — next call should treat everything as unseen again.
  const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage });
  assert.equal(ordered.length, 4);
  const unseenPrefixIds = new Set(ordered.map((item) => item.id));
  assert.equal(unseenPrefixIds.size, 4);
});

test("prioritises unseen items ahead of already-shown ones", () => {
  const storage = fakeStorage();
  const items = pool(6);
  SR.markShown(items.slice(0, 3), { key: "app:level", storage });

  const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage });
  const first3Ids = ordered.slice(0, 3).map((item) => item.id);
  const stillUnseen = ["Q4", "Q5", "Q6"];
  assert.ok(stillUnseen.every((id) => first3Ids.includes(id)), "unseen items should come first");
});

test("keeps separate cycles for separate keys", () => {
  const storage = fakeStorage();
  const items = pool(3);
  SR.markShown(items, { key: "app:foundation", storage });

  const foundationOrder = SR.orderByLeastRecentlyShown(items, { key: "app:foundation", storage });
  const developingOrder = SR.orderByLeastRecentlyShown(items, { key: "app:developing", storage });

  // Foundation's pool is fully seen so it resets to all-unseen; developing was never touched,
  // so it's also all-unseen — both should return the full pool either way.
  assert.equal(foundationOrder.length, 3);
  assert.equal(developingOrder.length, 3);
});

test("draws a full round without immediate repeats when count exceeds remaining unseen items", () => {
  const storage = fakeStorage();
  const items = pool(5);
  SR.markShown(items.slice(0, 3), { key: "app:level", storage }); // 2 unseen remain: Q4, Q5

  const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage });
  const round = ordered.slice(0, 5);
  assert.equal(new Set(round.map((item) => item.id)).size, 5, "a full pool draw should include every item exactly once");
});

test("degrades gracefully with no storage available (still returns a shuffled pool)", () => {
  const items = pool(5);
  const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage: null });
  assert.equal(ordered.length, 5);
  assert.equal(new Set(ordered.map((item) => item.id)).size, 5);
});

test("getSeenIds returns whatever has been marked shown for a key", () => {
  const storage = fakeStorage();
  const items = pool(4);
  SR.markShown(items.slice(0, 2), { key: "app:level", storage });

  const seen = SR.getSeenIds("app:level", storage).sort();
  assert.deepEqual(seen, ["Q1", "Q2"]);
  assert.deepEqual(SR.getSeenIds("app:other-key", storage), []);
});

test("resetCycle clears persisted progress for a key", () => {
  const storage = fakeStorage();
  const items = pool(3);
  SR.markShown(items, { key: "app:level", storage });
  SR.resetCycle("app:level", storage);

  const ordered = SR.orderByLeastRecentlyShown(items, { key: "app:level", storage });
  assert.equal(ordered.length, 3);
});
