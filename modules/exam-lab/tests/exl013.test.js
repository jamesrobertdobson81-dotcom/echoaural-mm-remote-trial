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
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl013.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl013.js" });
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

const exl013 = loadQuestionSet();
const question = (number) => exl013.questions[number - 1];
const score = (answers) => exl013.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL013 uses the prepared audio and is explicitly score-free", () => {
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL013.mp3")), true);
  assert.equal(exl013.audio, "assets/EXL013.mp3");
  assert.equal(exl013.scoreRequired, false);
  assert.equal(exl013.score, "");
  assert.equal(exl013.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL013-skeleton-score.png")), false);
});

test("EXL013 has eleven questions, eleven marks and four plays", () => {
  assert.equal(exl013.questions.length, 11);
  assert.equal(exl013.questions.reduce((total, item) => total + item.marks, 0), 11);
  assert.equal(exl013.totalMarks, 11);
  assert.equal(exl013.maxPlays, 4);
  assert.deepEqual(Array.from(exl013.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("Q1 marks only Bali", () => {
  question(1).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(1), answer).marks, answer === "Bali" ? 1 : 0);
  });
});

test("Q2 accepts gamelan ensemble wording", () => {
  ["gamelan", "Balinese gamelan", "gamelan ensemble"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 1);
  });
  ["orchestra", "string quartet", "choir"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(2), answer).marks, 0);
  });
});

test("Q3 marks only Percussion", () => {
  question(3).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(3), answer).marks, answer === "Percussion" ? 1 : 0);
  });
});

test("Q4–Q5 accept timbre and texture wording", () => {
  ["metallic", "bell-like", "shimmering"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(4), answer).marks, 1);
  });
  ["layered", "interlocking", "polyphonic"].forEach((answer) => {
    assert.equal(marking.markQuestion(question(5), answer).marks, 1);
  });
});

test("Q6 marks only Interlocking", () => {
  question(6).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(6), answer).marks, answer === "Interlocking" ? 1 : 0);
  });
});

test("Q7–Q9 credit rhythm, gong and gong-role answers", () => {
  assert.equal(marking.markQuestion(question(7), "ostinatos").marks, 1);
  assert.equal(marking.markQuestion(question(8), "gong").marks, 1);
  assert.equal(marking.markQuestion(question(8), "drum kit").marks, 0);
  assert.equal(marking.markQuestion(question(9), "marks structural points").marks, 1);
});

test("Q10–Q11 mark Pentatonic and Ceremonies", () => {
  question(10).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(10), answer).marks, answer === "Pentatonic" ? 1 : 0);
  });
  question(11).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(11), answer).marks, answer === "Ceremonies" ? 1 : 0);
  });
});

test("all-correct and all-incorrect EXL013 submissions total 11/11 and 0/11", () => {
  const correct = [
    "Bali",
    "gamelan",
    "Percussion",
    "metallic",
    "layered",
    "Interlocking",
    "repeated rhythmic patterns",
    "gong",
    "punctuates the music",
    "Pentatonic",
    "Ceremonies"
  ];
  const incorrect = Array.from({ length: 11 }, () => "not a creditworthy answer");
  assert.equal(score(correct), 11);
  assert.equal(score(incorrect), 0);
});

test("EXL013 is available in the selector", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /<option value="EXL013">EXL013<\/option>/);
  assert.match(html, /data\/exl013\.js/);
});

test("EXL013 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL013_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split(/\r?\n/);
  assert.equal(rows.length, 12);
  exl013.questions.forEach((item, index) => {
    const cells = parseCsvRow(rows[index + 1]);
    assert.equal(cells.length, 13);
    assert.equal(cells[1], item.id);
    assert.equal(Number(cells[2]), item.number);
    assert.equal(cells[3], item.prompt);
    assert.equal(Number(cells[4]), item.marks);
  });
});
