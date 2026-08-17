"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// teacher-dashboard.js runs real page-bootstrap logic unconditionally at
// the top level (same shape as account/student-home/student-home.js — see
// that file's own tests/dashboard-ranking.test.js for the full reasoning),
// so it can't be sandbox-loaded whole. This extracts the LITERAL current
// source of compareProgressModeRosterRows, progressModePercentage and the
// PROGRESSION_LEVEL_LABELS constant it depends on, straight out of the
// real file, and evaluates just those — a future edit to the real
// comparator is exactly what gets tested.
function extractFunction(source, name) {
  const signature = new RegExp("function " + name + "\\s*\\(");
  const match = source.match(signature);
  if (!match) {
    throw new Error("Could not find function " + name + "() in teacher-dashboard.js — has it been renamed or removed?");
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

function extractConst(source, name) {
  const signature = new RegExp("const " + name + "\\s*=[^;]*;");
  const match = source.match(signature);
  if (!match) {
    throw new Error("Could not find const " + name + " in teacher-dashboard.js — has it been renamed or removed?");
  }
  return match[0];
}

function loadRosterComparator() {
  const source = fs.readFileSync(path.join(__dirname, "..", "teacher-dashboard.js"), "utf8");
  const levelsConst = extractConst(source, "PROGRESSION_LEVEL_LABELS");
  const percentageFn = extractFunction(source, "progressModePercentage");
  const compareFn = extractFunction(source, "compareProgressModeRosterRows");
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    levelsConst + "\n" + percentageFn + "\n" + compareFn + "\nreturn { compareProgressModeRosterRows };"
  );
  return factory();
}

function row(overallLevelLabel, totalCorrect, totalQuestions) {
  return { overallLevelLabel, totalCorrect, totalQuestions };
}

test("compareProgressModeRosterRows: ranks a higher-level student above one with better raw accuracy but a lower level", () => {
  const { compareProgressModeRosterRows } = loadRosterComparator();
  const mastering = row("Mastering", 69, 100);   // 69% accuracy, but Mastering
  const securing = row("Securing", 80, 100);      // 80% accuracy, only Securing
  const ranked = [securing, mastering].sort(compareProgressModeRosterRows);
  // Real student04 shape this session's fix targets: level must win over a
  // higher raw percentage, matching the level badge shown next to the name.
  assert.equal(ranked[0].overallLevelLabel, "Mastering");
});

test("compareProgressModeRosterRows: falls back to percentage when levels are tied", () => {
  const { compareProgressModeRosterRows } = loadRosterComparator();
  const rows = [row("Securing", 60, 100), row("Securing", 90, 100)];
  const ranked = rows.sort(compareProgressModeRosterRows);
  assert.equal(ranked[0].totalCorrect, 90);
});

test("compareProgressModeRosterRows: sorts a full mixed roster level-first end to end", () => {
  const { compareProgressModeRosterRows } = loadRosterComparator();
  const rows = [
    row("Foundation", 62, 100),
    row("Mastering", 69, 100),
    row("Securing", 80, 100),
    row("Developing", 55, 100)
  ];
  const ranked = rows.sort(compareProgressModeRosterRows).map((r) => r.overallLevelLabel);
  assert.deepEqual(ranked, ["Mastering", "Securing", "Developing", "Foundation"]);
});
