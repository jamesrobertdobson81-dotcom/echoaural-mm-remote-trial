// Progress Mode — standalone localStorage store.
// Deliberately independent from shared/js/progression-store.js: this is a
// throwaway test build (see modules/progress-mode/README.md). store.js
// itself never touches any file outside modules/progress-mode/ — the one
// place this module reaches out at all is script.js's
// postProgressSummaryBestEffort (a small, best-effort, fire-and-forget POST
// so a teacher can see real data), which is deliberate and documented in
// the README, not something store.js does or needs to know about.
//
// Two-tier model: many "sources" (one per driver — a real sub-app, or one
// topic of ScoreDecoder) roll up into a handful of "areas" (Melody, Texture,
// Harmony, Instrumentation, Rhythm — see app-drivers.js's AREA_ORDER). A
// source only ever keeps lightweight cumulative stats, used for written
// feedback and adaptive next-round weighting; level-advancement is decided
// once per AREA, pooling every question from every source mapped to it, so
// "individual levels for each main app" means one level per area, not one
// per driver.
(function (global) {
  "use strict";

  var STORAGE_KEY = "echoaural.progressmode.v2";
  var LEVEL_IDS = ["foundation", "developing", "securing", "mastering"];
  var LEVEL_LABELS = ["Foundation", "Developing", "Securing", "Mastering"];
  // A single round only ever gives an area a few questions (10 slots split
  // across a dozen sources), so evaluating "did they pass" per-round let a
  // lucky pair of correct answers instantly advance a level. Advancement is
  // judged on a cumulative sample AT THE CURRENT LEVEL, pooled across every
  // source mapped to that area, built up across as many rounds as it takes:
  // a real minimum volume of questions, a high accuracy bar over that whole
  // sample (not one round), and a minimum spread of distinct questions
  // actually seen (approximating "shown all concepts in the level")
  // wherever at least one contributing source can recognise distinct
  // questions at all.
  var PASS_PERCENTAGE = 80;
  var MIN_QUESTIONS_PER_LEVEL = 10;
  var MIN_DISTINCT_CONCEPTS_PER_LEVEL = 6;
  // A pooled area average can hide one genuinely weak sub-skill behind
  // several strong ones (e.g. Melody pools 5 sources) — a source only vetoes
  // advancement once it has enough of its OWN sample to be meaningful
  // (FLOOR_MIN_QUESTIONS, all-time cumulative) and is still clearly below
  // par (FLOOR_THRESHOLD). Deliberately the same numbers feedback.js already
  // uses to decide "reliable enough to call a weakness in writing"
  // (FEEDBACK_MIN_QUESTIONS=8, WEAKNESS_THRESHOLD=60) — kept as separate
  // constants here rather than a cross-file import (store.js stays
  // dependency-free) — so advancement is gated on exactly the same signal
  // already shown to the student as feedback, not a second, different bar.
  var FLOOR_MIN_QUESTIONS = 8;
  var FLOOR_THRESHOLD = 60;

  function readAll() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function writeAll(data) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      /* storage unavailable — progress simply won't persist */
    }
  }

  function defaultProfile() {
    return { sources: {}, areas: {}, roundsCompleted: 0, createdAt: Date.now() };
  }

  function defaultSourceState() {
    return {
      attempts: 0,
      bestPercentage: 0,
      lastPercentage: null,
      history: [],
      cumulativeCorrect: 0,
      cumulativeQuestions: 0,
      // How many questions have been drawn from this source, ever — the
      // clock a missed question's cooldown counts down against (see
      // recordQuestionOutcome/isMissCoolingDown). Rounds, not real time:
      // "a reasonable spaced interval in the deck" is naturally a deck
      // position here, not a calendar one.
      drawCount: 0,
      // When this source last actually showed a question to the student
      // (Date.now(), stamped in recordQuestionOutcome) — null if never.
      // Used by getReviewCandidate to find the most-overdue-for-review
      // source once its area has reached Mastering; unrelated to drawCount/
      // the missed-question cooldown above.
      lastDrawnAt: null,
      // Questions answered wrong, not yet answered correctly again:
      // [{ signature, missCount, dueAtDraw }]. A signature reappearing
      // before drawCount reaches dueAtDraw is actively avoided (like an
      // already-seen question); once due, it's simply no longer avoided —
      // Progress Mode can't force the embedded app to show a specific
      // question, only accept/reject whichever one it produces, so this
      // raises the odds of a timely resurface rather than guaranteeing one.
      missedQueue: []
    };
  }

  // Draws-to-wait before a missed question is eligible again, indexed by
  // (missCount - 1) and held at the last value beyond that — missing the
  // same question repeatedly backs off further each time, same idea as a
  // Leitner box. Draw-count alone collapses to almost no real spacing if a
  // student grinds several rounds back-to-back in one sitting (that source
  // could easily be drawn 8 times within 20-30 minutes) — MISS_RETRY_MIN_MINUTES
  // (same indexing) adds a wall-clock floor alongside it, so a genuinely
  // short single-sitting practice session can't fully collapse the intended
  // spacing effect. A question is eligible again only once BOTH the draw
  // count and the wall-clock minimum have elapsed.
  var MISS_RETRY_INTERVALS = [2, 4, 8];
  var MISS_RETRY_MIN_MINUTES = [3, 10, 30];
  var MAX_MISSED_QUEUE_PER_SOURCE = 50;

  function findMissedEntry(missedQueue, signature) {
    for (var i = 0; i < missedQueue.length; i++) {
      if (missedQueue[i].signature === signature) return i;
    }
    return -1;
  }

  // True if any source in `sourcesInArea` has enough of its OWN cumulative
  // sample to judge and is still clearly below par — see FLOOR_MIN_QUESTIONS/
  // FLOOR_THRESHOLD above. `sourcesInArea` is optional (omitted call sites,
  // e.g. tests exercising recordSourceResult directly, simply skip floor
  // gating rather than erroring).
  function areaHasFloorViolation(profile, sourcesInArea) {
    if (!sourcesInArea) return false;
    for (var i = 0; i < sourcesInArea.length; i++) {
      var sourceState = profile.sources[sourcesInArea[i]];
      if (!sourceState) continue;
      var questions = sourceState.cumulativeQuestions || 0;
      if (questions < FLOOR_MIN_QUESTIONS) continue;
      var percentage = ((sourceState.cumulativeCorrect || 0) / questions) * 100;
      if (percentage < FLOOR_THRESHOLD) return true;
    }
    return false;
  }

  function defaultAreaState() {
    return {
      level: 0,
      // Per-level cumulative sample: { "0": {correct, total, concepts: {sig: true}}, "1": {...}, ... }.
      // Keyed by level index (as a string, for JSON-safety) so dropping back
      // to review a lower level never mixes with the level a student is
      // actively trying to clear.
      levelProgress: {}
    };
  }

  function getAreaLevelProgress(areaState, levelIndex) {
    var key = String(levelIndex);
    if (!areaState.levelProgress[key]) areaState.levelProgress[key] = { correct: 0, total: 0, concepts: {} };
    return areaState.levelProgress[key];
  }

  function getProfile(studentId) {
    var all = readAll();
    if (!all[studentId]) all[studentId] = defaultProfile();
    return all[studentId];
  }

  function getSourceState(profile, sourceKey) {
    if (!profile.sources[sourceKey]) profile.sources[sourceKey] = defaultSourceState();
    return profile.sources[sourceKey];
  }

  function getAreaState(profile, areaKey) {
    if (!profile.areas[areaKey]) profile.areas[areaKey] = defaultAreaState();
    return profile.areas[areaKey];
  }

  function saveProfile(studentId, profile) {
    var all = readAll();
    all[studentId] = profile;
    writeAll(all);
  }

  var Store = {
    LEVEL_IDS: LEVEL_IDS,
    LEVEL_LABELS: LEVEL_LABELS,
    PASS_PERCENTAGE: PASS_PERCENTAGE,

    getAreaLevel: function (studentId, areaKey) {
      var profile = getProfile(studentId);
      return getAreaState(profile, areaKey).level;
    },

    getSnapshot: function (studentId, areaKeys) {
      var profile = getProfile(studentId);
      var areas = {};
      var sum = 0;
      areaKeys.forEach(function (areaKey) {
        var state = getAreaState(profile, areaKey);
        areas[areaKey] = {
          level: state.level,
          levelLabel: LEVEL_LABELS[state.level],
          mastered: state.level >= LEVEL_IDS.length - 1
        };
        sum += state.level;
      });
      var overallLevelIndex = areaKeys.length ? sum / areaKeys.length : 0;
      return {
        areas: areas,
        overallLevelIndex: overallLevelIndex,
        overallLevelLabel: LEVEL_LABELS[Math.round(Math.min(overallLevelIndex, LEVEL_IDS.length - 1))],
        roundsCompleted: profile.roundsCompleted
      };
    },

    // Long-interval spaced review: given the set of source keys whose AREA
    // has reached Mastering (the caller works this out — script.js already
    // has both AREA_TO_SOURCES and getAreaLevel), returns whichever one was
    // drawn longest ago (or never drawn at all, which sorts first). Returns
    // null for an empty list, so callers can fall back to normal round-
    // building when nothing is Mastered yet. This is a bias applied once per
    // round, not a guarantee any specific source appears.
    getReviewCandidate: function (studentId, sourceKeys) {
      if (!sourceKeys || !sourceKeys.length) return null;
      var profile = getProfile(studentId);
      var best = null;
      var bestDrawnAt = Infinity;
      sourceKeys.forEach(function (sourceKey) {
        var sourceState = profile.sources[sourceKey];
        var drawnAt = sourceState && sourceState.lastDrawnAt ? sourceState.lastDrawnAt : 0;
        if (drawnAt < bestDrawnAt) {
          bestDrawnAt = drawnAt;
          best = sourceKey;
        }
      });
      return best;
    },

    // Cumulative (all-time, across every round ever played) correct/total per
    // SOURCE — the input to written feedback text and adaptive next-round
    // weighting. Never displayed as its own scored line; only referenced
    // inside an area's feedback paragraph.
    getCumulativeStats: function (studentId, sourceKeys) {
      var profile = getProfile(studentId);
      var sources = {};
      sourceKeys.forEach(function (sourceKey) {
        var state = getSourceState(profile, sourceKey);
        var questions = state.cumulativeQuestions || 0;
        var correct = state.cumulativeCorrect || 0;
        sources[sourceKey] = {
          correct: correct,
          questions: questions,
          percentage: questions > 0 ? Math.round((correct / questions) * 100) : null,
          attempts: state.attempts,
          lastPercentage: state.lastPercentage,
          bestPercentage: state.bestPercentage
        };
      });
      return sources;
    },

    // Records the outcome of a single answered question (called once per
    // question, immediately, separately from the once-per-round
    // recordSourceResult below — a wrong answer needs to update the missed
    // queue right away, not wait for the round to finish). A signature
    // answered correctly clears any pending miss for it, back into normal
    // rotation; a wrong answer schedules — or reschedules, with a longer
    // wait if this isn't its first miss — its next eligible draw.
    recordQuestionOutcome: function (studentId, sourceKey, signature, wasCorrect) {
      if (!signature) return;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      sourceState.drawCount = (sourceState.drawCount || 0) + 1;
      sourceState.lastDrawnAt = Date.now();
      if (!sourceState.missedQueue) sourceState.missedQueue = [];

      var index = findMissedEntry(sourceState.missedQueue, signature);
      if (wasCorrect) {
        if (index !== -1) sourceState.missedQueue.splice(index, 1);
      } else {
        var missCount = index !== -1 ? sourceState.missedQueue[index].missCount + 1 : 1;
        var intervalIndex = Math.min(missCount, MISS_RETRY_INTERVALS.length) - 1;
        var interval = MISS_RETRY_INTERVALS[intervalIndex];
        var minMinutes = MISS_RETRY_MIN_MINUTES[intervalIndex];
        var entry = {
          signature: signature,
          missCount: missCount,
          dueAtDraw: sourceState.drawCount + interval,
          missedAt: Date.now(),
          dueAtTime: Date.now() + minMinutes * 60000
        };
        if (index !== -1) {
          sourceState.missedQueue[index] = entry;
        } else {
          sourceState.missedQueue.push(entry);
          if (sourceState.missedQueue.length > MAX_MISSED_QUEUE_PER_SOURCE) sourceState.missedQueue.shift();
        }
      }

      saveProfile(studentId, profile);
    },

    // True only while a missed question is still within its cooldown —
    // i.e. it should currently be actively avoided, the same as an
    // already-seen one. Cools down only once BOTH the draw-count AND the
    // wall-clock minimum have been met (see MISS_RETRY_MIN_MINUTES above) —
    // whichever takes longer for this student's actual play pattern. Once
    // due, this returns false (not "yes, show it" — Progress Mode has no way
    // to force that, only to stop avoiding it). Entries recorded before this
    // wall-clock gate existed have no `dueAtTime`, so treat it as already
    // satisfied for them rather than tripping every miss into extra cooldown
    // retroactively.
    isMissCoolingDown: function (studentId, sourceKey, signature) {
      if (!signature) return false;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      var index = findMissedEntry(sourceState.missedQueue || [], signature);
      if (index === -1) return false;
      var entry = sourceState.missedQueue[index];
      var drawReady = (sourceState.drawCount || 0) >= entry.dueAtDraw;
      var timeReady = !entry.dueAtTime || Date.now() >= entry.dueAtTime;
      return !(drawReady && timeReady);
    },

    // Records one source's within-round tally (correctCount/totalCount) into
    // that source's lifetime stats, AND pools the same tally into its area's
    // cumulative sample at the level the questions were ACTUALLY asked at
    // (`levelIndex` — normally the area's current level, but a level-
    // escalated empty-pool retry, see script.js's retryAtHigherLevelOrSkip,
    // asks at a higher level than the area is currently sitting at) —
    // advancing the area only once the pool AT ITS OWN CURRENT LEVEL clears
    // every bar: enough questions, high enough accuracy over the WHOLE
    // sample, and (where at least one contributing source can recognise
    // distinct questions) enough variety seen. An escalated attempt still
    // banks its sample at the higher level it was actually asked at (a head
    // start for whenever the student naturally reaches it) but can never
    // itself trigger an advance, since only a result banked at the area's
    // own current level is eligible to. `signatures` is the array of
    // distinct question signatures observed this round for this source at
    // this level (may be empty); `tracksConcepts` says whether this source's
    // driver supports signature-based tracking at all (e.g. dictation
    // doesn't, since its content isn't readable as text) — such sources
    // still contribute correct/total without blocking the variety bar earned
    // by other sources sharing the same area. `sourcesInArea` (optional —
    // the full list of source keys mapped to this area, script.js already
    // has this via AREA_TO_SOURCES) additionally vetoes advancement if any
    // one of them is individually still below FLOOR_THRESHOLD despite having
    // enough of its own sample — stops a pooled area average from masking
    // one genuinely weak sub-skill behind several strong ones.
    recordSourceResult: function (studentId, sourceKey, areaKey, correctCount, totalCount, signatures, tracksConcepts, levelIndex, sourcesInArea) {
      if (totalCount <= 0) return null;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      var roundPercentage = Math.round((correctCount / totalCount) * 100);

      sourceState.attempts += 1;
      sourceState.lastPercentage = roundPercentage;
      sourceState.bestPercentage = Math.max(sourceState.bestPercentage, roundPercentage);
      sourceState.cumulativeCorrect = (sourceState.cumulativeCorrect || 0) + correctCount;
      sourceState.cumulativeQuestions = (sourceState.cumulativeQuestions || 0) + totalCount;
      sourceState.history.push({ percentage: roundPercentage, timestamp: Date.now() });
      if (sourceState.history.length > 20) sourceState.history = sourceState.history.slice(-20);

      var areaState = getAreaState(profile, areaKey);
      var targetLevelIndex = (typeof levelIndex === "number") ? levelIndex : areaState.level;
      var levelProgress = getAreaLevelProgress(areaState, targetLevelIndex);
      levelProgress.correct += correctCount;
      levelProgress.total += totalCount;
      (signatures || []).forEach(function (sig) {
        if (sig) levelProgress.concepts[sourceKey + ":" + sig] = true;
      });

      var distinctConcepts = Object.keys(levelProgress.concepts).length;
      var levelPercentage = levelProgress.total > 0 ? Math.round((levelProgress.correct / levelProgress.total) * 100) : 0;
      var hasEnoughVolume = levelProgress.total >= MIN_QUESTIONS_PER_LEVEL;
      var hasEnoughAccuracy = levelPercentage >= PASS_PERCENTAGE;
      var hasEnoughVariety = !tracksConcepts || distinctConcepts >= MIN_DISTINCT_CONCEPTS_PER_LEVEL;

      var isCurrentLevel = targetLevelIndex === areaState.level;
      var hasFloor = !areaHasFloorViolation(profile, sourcesInArea);
      var advanced = false;
      if (isCurrentLevel && hasEnoughVolume && hasEnoughAccuracy && hasEnoughVariety && hasFloor && areaState.level < LEVEL_IDS.length - 1) {
        areaState.level += 1;
        advanced = true;
      }

      saveProfile(studentId, profile);
      return {
        percentage: roundPercentage,
        areaLevel: areaState.level,
        advanced: advanced,
        levelProgress: {
          correct: levelProgress.correct,
          total: levelProgress.total,
          percentage: levelPercentage,
          distinctConcepts: distinctConcepts,
          questionsNeeded: Math.max(0, MIN_QUESTIONS_PER_LEVEL - levelProgress.total),
          conceptsNeeded: tracksConcepts ? Math.max(0, MIN_DISTINCT_CONCEPTS_PER_LEVEL - distinctConcepts) : 0,
          accuracyMet: hasEnoughAccuracy,
          floorMet: hasFloor,
          tracksConcepts: !!tracksConcepts
        }
      };
    },

    // A single 0-100 number representing overall progress toward *finishing*
    // Mastering in this area — not raw accuracy. Each of the 4 levels is
    // worth 25 points: fully cleared levels bank their 25 automatically,
    // and the current level contributes a fraction of its own 25 based on
    // how close its pooled sample is to clearing all 3 advancement bars
    // (volume/accuracy/variety — the same bars recordSourceResult checks).
    // At Mastering (the last level) that fraction instead measures how
    // close the student is to fully clearing Mastering itself, since there's
    // no further level to advance into.
    getAreaOverallProgressPercentage: function (studentId, areaKey, tracksConcepts) {
      var profile = getProfile(studentId);
      var areaState = getAreaState(profile, areaKey);
      var levelProgress = getAreaLevelProgress(areaState, areaState.level);
      var distinctConcepts = Object.keys(levelProgress.concepts).length;

      var volumeFraction = Math.min(1, levelProgress.total / MIN_QUESTIONS_PER_LEVEL);
      var accuracyFraction = levelProgress.total > 0
        ? Math.min(1, (levelProgress.correct / levelProgress.total) / (PASS_PERCENTAGE / 100))
        : 0;
      var varietyFraction = tracksConcepts ? Math.min(1, distinctConcepts / MIN_DISTINCT_CONCEPTS_PER_LEVEL) : 1;
      var withinLevelFraction = Math.min(volumeFraction, accuracyFraction, varietyFraction);

      var percentage = (areaState.level * 25) + (withinLevelFraction * 25);
      return Math.round(Math.min(100, percentage));
    },

    recordRoundComplete: function (studentId) {
      var profile = getProfile(studentId);
      profile.roundsCompleted = (profile.roundsCompleted || 0) + 1;
      saveProfile(studentId, profile);
    },

    reset: function (studentId) {
      var all = readAll();
      delete all[studentId];
      writeAll(all);
    }
  };

  global.EAProgressModeStore = Store;
})(window);
