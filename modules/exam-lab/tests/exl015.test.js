"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const moduleRoot = path.resolve(__dirname, "..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl015.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl015.js" });
  return context.window.EXAM_LAB_QUESTION_SET;
}

function parseCsvRow(row) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"' && quoted && row[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

const exl015 = loadQuestionSet();
const question = (number) => exl015.questions[number - 1];
const score = (answers) => exl015.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL015 uses the prepared audio and is explicitly score-free", () => {
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL015.mp3")), true);
  assert.equal(exl015.audio, "assets/EXL015.mp3");
  assert.equal(exl015.scoreRequired, false);
  assert.equal(exl015.score, "");
  assert.equal(exl015.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL015-skeleton-score.png")), false);
});

test("EXL015 has eleven questions, eleven marks and four plays", () => {
  assert.equal(exl015.questions.length, 11);
  assert.equal(exl015.questions.reduce((total, item) => total + item.marks, 0), 11);
  assert.equal(exl015.totalMarks, 11);
  assert.equal(exl015.maxPlays, 4);
  assert.deepEqual(Array.from(exl015.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("all-correct and all-incorrect EXL015 submissions total 11/11 and 0/11", () => {
  const correct = [
"Middle East",
"plucked",
"repetitive",
"Modal / non-Western scale",
"melody and accompaniment",
"drum",
"pedal",
"Simple time",
"ornamentation",
"ornamented",
"Middle Eastern music"
  ];
  const incorrect = Array.from({ length: 11 }, () => "not a creditworthy answer");
  assert.equal(score(correct), 11);
  assert.equal(score(incorrect), 0);
});

test("EXL015 is available in the selector", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /<option value="EXL015">EXL015<\/option>/);
});

test("EXL015 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL015_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 12);
  exl015.questions.forEach((item, index) => {
    const cells = parseCsvRow(rows[index + 1]);
    assert.equal(cells.length, 13);
    assert.equal(cells[1], item.id);
    assert.equal(Number(cells[2]), item.number);
    assert.equal(cells[3], item.prompt);
    assert.equal(Number(cells[4]), item.marks);
  });
});
