(function attachEchoAuralSpacedRepetition(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EchoAuralSpacedRepetition = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSpacedRepetition() {
  "use strict";

  const STORAGE_PREFIX = "ea.spacedRepetition.v1.";

  function defaultStorage() {
    return typeof localStorage !== "undefined" ? localStorage : null;
  }

  function safeGetSeen(key, storage) {
    try {
      const target = storage || defaultStorage();
      const raw = target ? target.getItem(STORAGE_PREFIX + key) : null;
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  }

  function safeSetSeen(key, seenSet, storage) {
    try {
      const target = storage || defaultStorage();
      if (!target) return;
      target.setItem(STORAGE_PREFIX + key, JSON.stringify(Array.from(seenSet)));
    } catch (error) {
      // Storage unavailable (private mode, quota, etc.) — degrades to plain shuffling.
    }
  }

  function shuffle(items, random) {
    const output = items.slice();
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  /**
   * Reorders `pool` so items not yet shown in the current cycle for `key`
   * come first (shuffled), followed by already-shown items (shuffled).
   * When every item in `pool` has already been shown, the cycle resets
   * automatically and the whole pool is treated as unseen again.
   *
   * Read-only: does not persist anything by itself. Call markShown() with
   * whichever items actually get used for the round once that set is known,
   * so partially-drawn pools don't get marked seen prematurely.
   */
  function orderByLeastRecentlyShown(pool, options = {}) {
    const items = Array.isArray(pool) ? pool : [];
    const key = String(options.key || "");
    const idOf = typeof options.idOf === "function" ? options.idOf : (item) => item && item.id;
    const random = typeof options.random === "function" ? options.random : Math.random;
    if (!key || items.length === 0) return items.slice();

    const seen = safeGetSeen(key, options.storage);
    let unseen = items.filter((item) => !seen.has(idOf(item)));
    let alreadyShown = items.filter((item) => seen.has(idOf(item)));

    if (unseen.length === 0) {
      // Every item in this pool has been shown — start a fresh cycle.
      unseen = items;
      alreadyShown = [];
    }

    return [...shuffle(unseen, random), ...shuffle(alreadyShown, random)];
  }

  /**
   * Records that `items` have now been shown for `key`'s cycle, so future
   * orderByLeastRecentlyShown() calls push them toward the back until the
   * whole pool has cycled through.
   */
  function markShown(items, options = {}) {
    const key = String(options.key || "");
    if (!key) return;
    const idOf = typeof options.idOf === "function" ? options.idOf : (item) => item && item.id;
    const seen = safeGetSeen(key, options.storage);
    (Array.isArray(items) ? items : []).forEach((item) => {
      const id = idOf(item);
      if (id !== undefined && id !== null) seen.add(id);
    });
    safeSetSeen(key, seen, options.storage);
  }

  function resetCycle(key, storage) {
    safeSetSeen(String(key || ""), new Set(), storage);
  }

  /**
   * Raw set of ids already shown in `key`'s current cycle, as an array.
   * Useful when a module's own selection logic (e.g. penalty-scored
   * candidates) needs to weight "already shown" itself rather than
   * consuming a pre-ordered pool.
   */
  function getSeenIds(key, storage) {
    return Array.from(safeGetSeen(String(key || ""), storage));
  }

  /**
   * Reorders `items` (already ordered, e.g. by orderByLeastRecentlyShown)
   * so that as many of the first `roundLength` entries as possible have a
   * distinct signature from getSignature(item) — i.e. the same answer
   * doesn't appear twice within one round, even if it comes from a
   * different question. Items whose signature repeats an earlier pick (or
   * that would exceed roundLength distinct picks) are pushed to the back,
   * preserving relative order, so they remain available for a later round
   * or for unlimited/continued play rather than being dropped.
   *
   * getSignature may return "" / null / undefined for a question whose
   * answer can't be read up front (e.g. dictation) — such items are never
   * treated as duplicates of one another or of anything else.
   */
  function dedupeByAnswer(items, roundLength, getSignature) {
    const list = Array.isArray(items) ? items : [];
    if (typeof getSignature !== "function") return list.slice();
    const limit = Number.isFinite(roundLength) && roundLength > 0 ? roundLength : list.length;

    const picked = [];
    const deferred = [];
    const used = new Set();

    list.forEach((item, index) => {
      const raw = getSignature(item);
      const signature = (raw === undefined || raw === null || raw === "") ? Symbol(index) : String(raw);
      if (picked.length < limit && !used.has(signature)) {
        used.add(signature);
        picked.push(item);
      } else {
        deferred.push(item);
      }
    });

    return [...picked, ...deferred];
  }

  return Object.freeze({ orderByLeastRecentlyShown, markShown, resetCycle, getSeenIds, dedupeByAnswer });
});
