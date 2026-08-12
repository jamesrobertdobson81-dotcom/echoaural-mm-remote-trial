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
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl019.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl019.js" });
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

const exl019 = loadQuestionSet();
const question = (number) => exl019.questions[number - 1];
const score = (answers) => exl019.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL019 uses the prepared audio and is explicitly score-free", () => {
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL019.mp3")), true);
  assert.equal(exl019.audio, "assets/EXL019.mp3");
  assert.equal(exl019.scoreRequired, false);
  assert.equal(exl019.score, "");
  assert.equal(exl019.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL019-skeleton-score.png")), false);
});

test("EXL019 has eleven questions, eleven marks and four plays", () => {
  assert.equal(exl019.questions.length, 11);
  assert.equal(exl019.questions.reduce((total, item) => total + item.marks, 0), 11);
  assert.equal(exl019.totalMarks, 11);
  assert.equal(exl019.maxPlays, 4);
  assert.deepEqual(Array.from(exl019.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("all-correct and all-incorrect EXL019 submissions total 11/11 and 0/11", () => {
  const correct = [
"Japan",
"shamisen",
"Strings",
"plucked",
"monophonic",
"Pentatonic",
"ornamented",
"free",
"Folk traditions",
"pentatonic scale",
"Japanese folk music"
  ];
  const incorrect = Array.from({ length: 11 }, () => "not a creditworthy answer");
  assert.equal(score(correct), 11);
  assert.equal(score(incorrect), 0);
});

test("EXL019 is available in the selector", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /<option value="EXL019">EXL019<\/option>/);
});

test("EXL019 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL019_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 12);
  exl019.questions.forEach((item, index) => {
    const cells = parseCsvRow(rows[index + 1]);
    assert.equal(cells.length, 13);
    assert.equal(cells[1], item.id);
    assert.equal(Number(cells[2]), item.number);
    assert.equal(cells[3], item.prompt);
    assert.equal(Number(cells[4]), item.marks);
  });
});
