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
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl012.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl012.js" });
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

const exl012 = loadQuestionSet();
const question = (number) => exl012.questions[number - 1];
const score = (answers) => exl012.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL012 uses the prepared audio and is explicitly score-free", () => {
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL012.mp3")), true);
  assert.equal(exl012.audio, "assets/EXL012.mp3");
  assert.equal(exl012.scoreRequired, false);
  assert.equal(exl012.score, "");
  assert.equal(exl012.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL012-skeleton-score.png")), false);
});

test("EXL012 has eleven questions, eleven marks and four plays", () => {
  assert.equal(exl012.questions.length, 11);
  assert.equal(exl012.questions.reduce((total, item) => total + item.marks, 0), 11);
  assert.equal(exl012.totalMarks, 11);
  assert.equal(exl012.maxPlays, 4);
  assert.deepEqual(Array.from(exl012.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("Q1 marks only Electric guitar", () => {
  question(1).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(1), answer).marks, answer === "Electric guitar" ? 1 : 0);
  });
});

test("Q2 accepts wah-wah variants", () => {
  ["wah-wah", "wah wah", "wah", "filter effect"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 1);
  });
  ["reverb", "delay", "distortion"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 0);
  });
});

test("Q3 accepts staccato articulation wording", () => {
  ["staccato", "short and detached", "clipped"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(3), answer).marks, 1);
  });
  ["legato", "slurred"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(3), answer).marks, 0);
  });
});

test("Q4 marks only every crotchet beat", () => {
  question(4).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(4), answer).marks, answer === "On every crotchet beat" ? 1 : 0);
  });
});

test("Q5 accepts four-on-the-floor wording", () => {
  ["four on the floor", "four-to-the-floor", "kick drum on every beat"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(5), answer).marks, 1);
  });
  ["backbeat", "offbeat"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(5), answer).marks, 0);
  });
});

test("Q6–Q9 credit bass-line, change, layering and texture answers", () => {
  assert.equal(marking.markQuestion(question(6), "syncopated").marks, 1);
  assert.equal(marking.markQuestion(question(7), "strings enter").marks, 1);
  assert.equal(marking.markQuestion(question(7), "the music changes").marks, 0);
  question(8).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(8), answer).marks, answer === "Layering" ? 1 : 0);
  });
  assert.equal(marking.markQuestion(question(9), "homophonic").marks, 1);
});

test("Q10–Q11 credit technology and dance-feature answers", () => {
  assert.equal(marking.markQuestion(question(10), "drum machine").marks, 1);
  assert.equal(marking.markQuestion(question(11), "steady beat").marks, 1);
  assert.equal(marking.markQuestion(question(11), "it is nice").marks, 0);
});

test("all-correct and all-incorrect EXL012 submissions total 11/11 and 0/11", () => {
  const correct = [
    "Electric guitar",
    "wah-wah",
    "staccato",
    "On every crotchet beat",
    "four on the floor",
    "repeated",
    "texture becomes thicker",
    "Layering",
    "layered",
    "electronic sounds",
    "regular pulse"
  ];
  const incorrect = Array.from({ length: 11 }, () => "not a creditworthy answer");
  assert.equal(score(correct), 11);
  assert.equal(score(incorrect), 0);
});

test("EXL012 is available in the selector", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /<option value="EXL012">EXL012<\/option>/);
  assert.match(html, /data\/exl012\.js/);
});

test("EXL012 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL012_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 12);
  exl012.questions.forEach((item, index) => {
    const cells = parseCsvRow(rows[index + 1]);
    assert.equal(cells.length, 13);
    assert.equal(cells[1], item.id);
    assert.equal(Number(cells[2]), item.number);
    assert.equal(cells[3], item.prompt);
    assert.equal(Number(cells[4]), item.marks);
  });
});
