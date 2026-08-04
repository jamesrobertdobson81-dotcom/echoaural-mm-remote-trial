"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(moduleRoot, "../..");
const desktopRoot = path.resolve(projectRoot, "..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl004.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl004.js" });
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

const exl004 = loadQuestionSet();
const question = (number) => exl004.questions[number - 1];
const score = (answers) => exl004.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL004 uses the supplied audio and is explicitly score-free", () => {
  const packagedAudio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL004.mp3"));
  const suppliedAudio = fs.readFileSync(path.join(desktopRoot, "EXL004.mp3"));
  assert.deepEqual(packagedAudio, suppliedAudio);
  assert.equal(exl004.audio, "assets/EXL004.mp3");
  assert.equal(exl004.scoreRequired, false);
  assert.equal(exl004.score, "");
  assert.equal(exl004.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL004-skeleton-score.png")), false);
});

test("EXL004 has seven questions, ten marks and four plays", () => {
  assert.equal(exl004.questions.length, 7);
  assert.equal(exl004.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl004.totalMarks, 10);
  assert.equal(exl004.maxPlays, 4);
  assert.deepEqual(Array.from(exl004.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7]);
});

test("Q1 uses the approved instrument options and marks Sitār", () => {
  assert.deepEqual(Array.from(question(1).options), ["Sarod", "Sārangi", "Sitār", "Santoor"]);
  question(1).options.forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, answer === "Sitār" ? 1 : 0));
  assert.equal(marking.markQuestion(question(1), "sitar").marks, 1);
});

test("Q2 accepts tablā responses but rejects other instruments and generic drums", () => {
  ["tabla", "tablā", "tabla drums", "pair of tabla drums"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 1));
  ["tambura", "sitar", "mridangam", "drums", "generic drums", "not tabla"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 0));
});

test("Q3 accepts rāga spellings but not generic Western terms", () => {
  ["raga", "rāga", "rag", "raag"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 1));
  ["tala", "tāla", "scale", "mode", "melody", "not raga"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 0));
});

test("Q4 uses neutral Cambridge-style wording and marks only the approved relationship", () => {
  assert.equal(question(4).prompt, "Which statement best describes the roles of the two instruments in this extract?");
  assert.deepEqual(Array.from(question(4).options), [
    "Both instruments play the same melody in unison.",
    "One instrument develops the melody, while the other provides rhythmic accompaniment.",
    "One instrument plays the melody, while the other provides block chords.",
    "Both instruments play independent contrapuntal melodies."
  ]);
  assert.doesNotMatch(`${question(4).prompt} ${Array.from(question(4).options).join(" ")} ${question(4).modelAnswer}`, /sitār|sitar|tablā|tabla/i);
  question(4).options.forEach((answer) => {
    assert.equal(marking.markQuestion(question(4), answer).marks, answer === question(4).correctChoice ? 1 : 0);
  });
});

test("Q5 awards two distinct melodic features without duplicate synonyms", () => {
  assert.equal(question(5).prompt, "Describe two features of the melody.");
  assert.doesNotMatch(`${question(5).prompt} ${question(5).placeholder}`, /sitār|sitar|tablā|tabla/i);
  assert.equal(marking.markQuestion(question(5), "The melody is highly ornamented with frequent pitch-bending.").marks, 2);
  assert.equal(marking.markQuestion(question(5), "It sounds improvised and the short phrases are varied.").marks, 2);
  assert.equal(marking.markQuestion(question(5), "It is decorated.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "It uses ornamentation, decorative runs and embellishment.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "There is pitch-bending, glissando and meend.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "It is played by a sitar and sounds Indian.").marks, 0);
  assert.equal(marking.markQuestion(question(5), "It is fast and sounds unusual.").marks, 0);
});

test("Q6 credits pulse and tāla as separate aspects of the tablā role", () => {
  assert.equal(question(6).prompt, "Explain the role of the percussion instrument in this extract.");
  assert.doesNotMatch(`${question(6).prompt} ${question(6).placeholder}`, /sitār|sitar|tablā|tabla/i);
  assert.equal(marking.markQuestion(question(6), "It keeps the pulse and maintains the repeating tāla cycle.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "It supplies the rhythm and responds to the melodic performer.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "It keeps the beat and provides the beat.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It responds to the sitar.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It plays the tune and provides harmony.").marks, 0);
});

test("Q7 awards distinct Hindustani features and excludes instruments or duplicated ideas", () => {
  assert.equal(marking.markQuestion(question(7), "The melody is improvised over a repeating tāla cycle.").marks, 2);
  assert.equal(marking.markQuestion(question(7), "It is highly ornamented and uses pitch-bending.").marks, 2);
  assert.equal(marking.markQuestion(question(7), "It uses a rāga and a scale.").marks, 1);
  assert.equal(marking.markQuestion(question(7), "It has pitch-bending and sliding notes.").marks, 1);
  assert.equal(marking.markQuestion(question(7), "A melody is performed over a rhythmic accompaniment.").marks, 1);
  assert.equal(marking.markQuestion(question(7), "It uses sitar and tabla.").marks, 0);
  assert.equal(marking.markQuestion(question(7), "It is Hindustani music and is expressive.").marks, 0);
});

test("all-correct and all-incorrect EXL004 submissions total 10/10 and 0/10", () => {
  const correctAnswers = [
    "Sitār",
    "tablā",
    "rāga",
    "One instrument develops the melody, while the other provides rhythmic accompaniment.",
    "The melody is highly ornamented and uses pitch-bending.",
    "It keeps the pulse and maintains the repeating tāla cycle.",
    "The melody is improvised and phrases are varied."
  ];
  const incorrectAnswers = [
    "Sarod",
    "drums",
    "mode",
    "Both instruments play the same melody in unison.",
    "It is played by a sitar and is fast.",
    "It plays the tune and provides harmony.",
    "It uses sitar and tabla."
  ];
  assert.equal(score(correctAnswers), 10);
  assert.equal(score(incorrectAnswers), 0);
});

test("the aural-only EA layout replaces the score viewer for EXL004", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  const css = fs.readFileSync(path.join(moduleRoot, "style.css"), "utf8");
  assert.match(html, /id="auralOnlyStage"/);
  assert.match(html, /Listen without a score/);
  assert.match(html, /data\/exl004\.js/);
  assert.match(script, /set\.scoreRequired !== false && set\.score/);
  assert.match(script, /els\.scoreStage\.hidden = !hasScore/);
  assert.match(script, /els\.auralOnlyStage\.hidden = hasScore/);
  assert.match(css, /\.aural-only-stage/);
  assert.match(css, /\.aural-stage-wave/);
  assert.match(css, /body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*height:\s*100svh/);
  assert.doesNotMatch(`${exl004.title} ${exl004.subtitle} ${exl004.extractDescription}`, /sitār|tablā|rāga|tāla/i);
});

test("EXL004 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL004_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 8);
  rows.forEach((row) => assert.equal(row.length, 13));
  exl004.questions.forEach((item, index) => {
    assert.equal(rows[index + 1][1], item.id);
    assert.equal(Number(rows[index + 1][2]), item.number);
    assert.equal(rows[index + 1][3], item.prompt);
    assert.equal(Number(rows[index + 1][4]), item.marks);
  });
});
