"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// student-home.js runs real page-bootstrap logic (auth redirect, live API
// calls via window.EchoAuralAccounts.api(), window.location.replace(),
// document.body.addEventListener on the real DOM) unconditionally at the
// top level, so it can't be sandbox-loaded the way modules/progress-mode/
// store.js is (see store.test.js) — chasing every top-level dependency
// down a long, fragile stub chain has nothing to do with the two pure
// ranking functions this file actually needs covered. Instead, this
// extracts the LITERAL current source text of weakestArea/strongestAreas
// straight out of the real file (not a hand-copied mirror that could
// silently drift out of sync) and evaluates just that, so a future edit to
// either function's real logic is exactly what gets tested.
function extractFunction(source, name) {
  const signature = new RegExp("function " + name + "\\s*\\(");
  const match = source.match(signature);
  if (!match) {
    throw new Error("Could not find function " + name + "() in student-home.js — has it been renamed or removed?");
  }
  const braceStart = source.indexOf("{", match.index);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(match.index, i + 1);
}

function loadRankingFunctions() {
  const source = fs.readFileSync(path.join(__dirname, "..", "student-home.js"), "utf8");
  const weakestAreaSrc = extractFunction(source, "weakestArea");
  const strongestAreasSrc = extractFunction(source, "strongestAreas");
  // eslint-disable-next-line no-new-func
  const factory = new Function(weakestAreaSrc + "\n" + strongestAreasSrc + "\nreturn { weakestArea, strongestAreas };");
  return factory();
}

function area(areaKey, level, percentage, questions = 10) {
  return { areaKey, label: areaKey, level, percentage, questions };
}

test("weakestArea: sorts by level first, percentage only as a tiebreak, by default (PM-relevant scope)", () => {
  const { weakestArea } = loadRankingFunctions();
  const areas = [
    area("context", 0, 62),  // Foundation, decent accuracy
    area("rhythm", 2, 40)    // Securing, worse accuracy but a higher level
  ];
  // Level wins: context (Foundation) is weakest even though its accuracy
  // (62%) beats rhythm's (40%) — the exact real student04 shape this
  // session's fix targets.
  assert.equal(weakestArea(areas).areaKey, "context");
});

test("weakestArea: with useLevel=false (Quizzes/Homework scope), falls back to percentage-only ranking", () => {
  const { weakestArea } = loadRankingFunctions();
  const areas = [
    area("context", 0, 62),
    area("rhythm", 2, 40)
  ];
  // Level ignored: rhythm's lower accuracy now makes IT the weakest — the
  // opposite pick from the level-aware case above. This is exactly the bug
  // this test guards against: a scope where PM's level has no meaning
  // (Live Sessions/Homework) must never let it decide which area is named
  // "weakest".
  assert.equal(weakestArea(areas, false).areaKey, "rhythm");
});

test("weakestArea: ignores areas with zero questions, and returns null when nothing has been started", () => {
  const { weakestArea } = loadRankingFunctions();
  assert.equal(weakestArea([area("context", 0, 0, 0)]), null);
  const areas = [area("context", 0, 0, 0), area("rhythm", 1, 50, 5)];
  assert.equal(weakestArea(areas).areaKey, "rhythm");
});

test("strongestAreas: sorts by level first, percentage as tiebreak, and respects the requested count", () => {
  const { strongestAreas } = loadRankingFunctions();
  const areas = [
    area("melody", 2, 69),
    area("texture", 3, 69),  // Mastering — real student04 case (level beats a tied accuracy)
    area("harmony", 2, 69),
    area("rhythm", 2, 80)    // highest raw accuracy, but a lower level than texture
  ];
  const top2 = strongestAreas(areas, 2);
  assert.equal(top2[0].areaKey, "texture", "Mastering must outrank a Securing area even with lower raw accuracy");
  assert.equal(top2.length, 2);
});

test("strongestAreas: with useLevel=false, falls back to percentage-only ranking", () => {
  const { strongestAreas } = loadRankingFunctions();
  const areas = [
    area("texture", 3, 69),
    area("rhythm", 2, 80)
  ];
  assert.equal(strongestAreas(areas, 1, false)[0].areaKey, "rhythm", "off-PM scope must rank by accuracy alone");
});

test("strongestAreas/weakestArea never pick the same area as both when there's more than one started area", () => {
  const { weakestArea, strongestAreas } = loadRankingFunctions();
  const areas = [area("melody", 3, 95), area("context", 0, 40)];
  const strongest = strongestAreas(areas, 1)[0];
  const weak = weakestArea(areas);
  assert.notEqual(strongest.areaKey, weak.areaKey);
});
