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
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl011.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl011.js" });
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

const exl011 = loadQuestionSet();
const question = (number) => exl011.questions[number - 1];
const score = (answers) => exl011.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL011 uses the prepared audio and is explicitly score-free", () => {
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL011.mp3")), true);
  assert.equal(exl011.audio, "assets/EXL011.mp3");
  assert.equal(exl011.scoreRequired, false);
  assert.equal(exl011.score, "");
  assert.equal(exl011.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL011-skeleton-score.png")), false);
});

test("EXL011 has eleven questions, eleven marks and four plays", () => {
  assert.equal(exl011.questions.length, 11);
  assert.equal(exl011.questions.reduce((total, item) => total + item.marks, 0), 11);
  assert.equal(exl011.totalMarks, 11);
  assert.equal(exl011.maxPlays, 4);
  assert.deepEqual(Array.from(exl011.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("Q1 marks only Saxophone", () => {
  question(1).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(1), answer).marks, answer === "Saxophone" ? 1 : 0);
  });
});

test("Q2 accepts saxophone-type responses", () => {
  ["tenor saxophone", "tenor sax", "baritone saxophone", "bari sax"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 1);
  });
  ["alto saxophone", "clarinet", "trumpet"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 0);
  });
});

test("Q3 accepts bass guitar variants and rejects double bass", () => {
  ["bass guitar", "electric bass", "bass"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(3), answer).marks, 1);
  });
  ["double bass", "electric guitar", "cello"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(3), answer).marks, 0);
  });
});

test("Q4 accepts distorted guitar timbre descriptions", () => {
  ["distorted", "overdriven", "gritty"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(4), answer).marks, 1);
  });
  ["clean", "muted", "pizzicato"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(4), answer).marks, 0);
  });
});

test("Q5 marks only beats 2 and 4", () => {
  question(5).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(5), answer).marks, answer === "2 and 4" ? 1 : 0);
  });
});

test("Q6 accepts riff and related wording", () => {
  ["riff", "melodic riff", "repeated pattern"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(6), answer).marks, 1);
  });
  ["ostinato only wrong", "sequence", "drone"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(6), answer).marks, 0);
  });
});

test("Q7 accepts saxophone relationship descriptions", () => {
  assert.equal(marking.markQuestion(question(7), "The saxophones play the melody").marks, 1);
  assert.equal(marking.markQuestion(question(7), "call and response").marks, 1);
  assert.equal(marking.markQuestion(question(7), "they play quietly").marks, 0);
});

test("Q8 marks only Drum fills", () => {
  question(8).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(8), answer).marks, answer === "Drum fills" ? 1 : 0);
  });
});

test("Q9–Q11 credit valid texture, rock-feature and style answers", () => {
  assert.equal(marking.markQuestion(question(9), "more instruments enter").marks, 1);
  assert.equal(marking.markQuestion(question(10), "backbeat").marks, 1);
  question(11).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(11), answer).marks, answer === "Rock" ? 1 : 0);
  });
});

test("all-correct and all-incorrect EXL011 submissions total 11/11 and 0/11", () => {
  const correct = [
    "Saxophone",
    "tenor saxophone",
    "bass guitar",
    "distorted",
    "2 and 4",
    "riff",
    "the saxophones play the melody",
    "Drum fills",
    "parts are layered",
    "electric guitar",
    "Rock"
  ];
  const incorrect = Array.from({ length: 11 }, () => "not a creditworthy answer");
  assert.equal(score(correct), 11);
  assert.equal(score(incorrect), 0);
});

test("EXL011 is available in the selector and aural-only UI remains wired", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(html, /<option value="EXL011">EXL011<\/option>/);
  assert.match(html, /data\/exl011\.js/);
  assert.match(script, /auralOnlyStage/);
  assert.match(script, /score-free-extract/);
});

test("EXL011 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL011_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 12);
  exl011.questions.forEach((item, index) => {
    const cells = parseCsvRow(rows[index + 1]);
    assert.equal(cells.length, 13);
    assert.equal(cells[1], item.id);
    assert.equal(Number(cells[2]), item.number);
    assert.equal(cells[3], item.prompt);
    assert.equal(Number(cells[4]), item.marks);
  });
});
