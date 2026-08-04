"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(moduleRoot, "../..");
const desktopRoot = path.resolve(projectRoot, "..");
const sourceCsvPath = path.join(desktopRoot, "ExamLab_EXL007_Questions_and_Rights_Log(2).csv");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl007.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl007.js" });
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

function loadSourceCsv() {
  const rows = fs.readFileSync(sourceCsvPath, "utf8").replace(/^\uFEFF/, "").trim().split("\n").map(parseCsvRow);
  const header = rows[0];
  return {
    header,
    records: rows.slice(1).map((row) => Object.fromEntries(header.map((column, index) => [column, row[index]])))
  };
}

const exl007 = loadQuestionSet();
const sourceCsv = loadSourceCsv();
const question = (number) => exl007.questions[number - 1];
const score = (answers) => exl007.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL007 packages the supplied Desktop audio unchanged", () => {
  const packaged = fs.readFileSync(path.join(moduleRoot, "assets", "EXL007.mp3"));
  const supplied = fs.readFileSync(path.join(desktopRoot, "EXL007.mp3"));
  assert.deepEqual(packaged, supplied);
  assert.equal(crypto.createHash("sha256").update(packaged).digest("hex"), "a85636753c3785d981ad2e16af564949a252f48781a11c86bb3a2fa45df6b6e8");
  assert.equal(exl007.audio, "assets/EXL007.mp3");
  assert.equal(exl007.scoreRequired, false);
  assert.equal(exl007.score, "");
  assert.equal(exl007.lyricsRequired, true);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL007-skeleton-score.png")), false);
});

test("the supplied rights CSV maps to seven questions and ten marks", () => {
  assert.equal(sourceCsv.records.length, 7);
  assert.equal(exl007.questions.length, 7);
  assert.equal(exl007.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl007.totalMarks, 10);
  assert.equal(exl007.maxPlays, 4);
  sourceCsv.records.forEach((record, index) => {
    const item = exl007.questions[index];
    assert.equal(item.id, record["Question ID"]);
    assert.equal(item.prompt, record["Question Text"]);
    assert.equal(item.marks, Number(record.Marks));
    if (record.Options) assert.deepEqual(Array.from(item.options), record.Options.split(" | "));
  });
});

test("pre-submission presentation remains neutral while retaining the supplied passage guide", () => {
  const visibleMetadata = `${exl007.title} ${exl007.subtitle} ${exl007.extractDescription} ${exl007.listeningGuide.map((item) => item.text).join(" ")}`;
  ["Josh Woodward", "Words Fall Apart", "piano", "6/8", "strophic", "D minor", "42 bpm"].forEach((term) => {
    assert.doesNotMatch(visibleMetadata, new RegExp(term, "i"));
  });
  assert.deepEqual(JSON.parse(JSON.stringify(exl007.listeningGuide)), [
    { label: "Passage A", text: "First verse, from the opening" },
    { label: "Passage B", text: "First refrain, beginning with the repeated word “Sleep”" }
  ]);
});

test("Q1 uses the supplied time-signature options and marks 6/8", () => {
  assert.deepEqual(Array.from(question(1).options), ["3/4", "6/8", "9/8", "12/8"]);
  question(1).options.forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, answer === "6/8" ? 1 : 0));
  assert.equal(marking.markQuestion(question(1), "compound duple").marks, 1);
});

test("Q2 accepts only the approved piano responses", () => {
  ["piano", "acoustic piano"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 1));
  ["keyboard", "harpsichord", "guitar", "voice", "not piano"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 0));
});

test("Q3 uses the supplied texture options and accepts homophonic", () => {
  assert.deepEqual(Array.from(question(3).options), ["Monophonic", "Melody and accompaniment", "Contrapuntal", "Heterophonic"]);
  question(3).options.forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, answer === "Melody and accompaniment" ? 1 : 0));
  assert.equal(marking.markQuestion(question(3), "homophonic").marks, 1);
});

test("Q4 awards distinct accompaniment features and groups repeated-pattern equivalents", () => {
  assert.equal(marking.markQuestion(question(4), "It uses a rocking compound-duple pattern and broken chords.").marks, 2);
  assert.equal(marking.markQuestion(question(4), "The dynamics are soft and it supports the voice harmonically.").marks, 2);
  assert.equal(marking.markQuestion(question(4), "The pattern rocks and uses repeated figuration.").marks, 1);
  assert.equal(marking.markQuestion(question(4), "It uses arpeggios and broken chords.").marks, 1);
  assert.equal(marking.markQuestion(question(4), "It is a piano.").marks, 0);
});

test("Q5 requires both passages and awards distinct paired comparisons", () => {
  assert.equal(marking.markQuestion(question(5), question(5).modelAnswer).marks, 2);
  assert.equal(marking.markQuestion(question(5), "The verse has longer lines, whereas the refrain has shorter lines.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "The verse is more varied, whereas the refrain repeats words and musical material.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "The verse has longer and more varied lines, whereas the refrain has shorter lines and repeated words.").marks, 2);
  assert.equal(marking.markQuestion(question(5), "The verse has longer and more varied lines.").marks, 0);
});

test("Q6 requires a musical feature before crediting its linked effect", () => {
  assert.equal(marking.markQuestion(question(6), "The slow tempo creates a soothing effect.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "The rocking 6/8 creates a cradle-like movement.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "Repeated words make the refrain hypnotic.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "It has a slow tempo and rocking 6/8.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It is soothing and reassuring.").marks, 0);
});

test("Q7 uses the supplied structure options and marks strophic", () => {
  assert.deepEqual(Array.from(question(7).options), ["Strophic", "Through-composed", "Ternary form", "12-bar blues"]);
  ["Strophic", "strophic form"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 1));
  ["Through-composed", "Ternary form", "12-bar blues"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 0));
});

test("all-correct and all-incorrect EXL007 submissions total 10/10 and 0/10", () => {
  const correctAnswers = [
    "6/8",
    "piano",
    "Melody and accompaniment",
    "It uses a rocking pattern and broken chords.",
    "The verse has longer and more varied lines, whereas the refrain has shorter lines and repeated words.",
    "The slow tempo creates a soothing effect.",
    "Strophic"
  ];
  const incorrectAnswers = ["3/4", "guitar", "Monophonic", "It is a piano.", "The verse is varied.", "It is soothing.", "Ternary form"];
  assert.equal(score(correctAnswers), 10);
  assert.equal(score(incorrectAnswers), 0);
});

test("EXL007 remains selectable with the music-and-words passage guide", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  const css = fs.readFileSync(path.join(moduleRoot, "style.css"), "utf8");
  assert.match(html, /<option value="EXL007">EXL007<\/option>/);
  assert.match(html, /data\/exl007\.js/);
  assert.equal(exl007.audio, "assets/EXL007.mp3");
  assert.match(html, /id="auralPassageGuide"/);
  assert.match(script, /set\.listeningGuide/);
  assert.match(script, /MUSIC AND WORDS/);
  assert.match(css, /\.aural-passage-guide/);
});

test("EXL007 retains the supplied CC BY 4.0 rights and attribution metadata", () => {
  assert.match(exl007.source.recordingLicence, /CC BY 4\.0/);
  assert.match(exl007.source.requiredAttribution, /Words Fall Apart/);
  assert.equal(exl007.source.sourcePageUrl, "https://www.joshwoodward.com/song/WordsFallApart");
  assert.equal(exl007.rights.commercialUseAllowed, true);
  assert.equal(exl007.rights.adaptationAllowed, true);
  assert.equal(exl007.rights.attributionRequired, true);
});

test("EXL007 skill-map CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL007_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 8);
  rows.forEach((row) => assert.equal(row.length, 13));
  exl007.questions.forEach((item, index) => {
    assert.equal(rows[index + 1][1], item.id);
    assert.equal(Number(rows[index + 1][2]), item.number);
    assert.equal(rows[index + 1][3], item.prompt);
    assert.equal(Number(rows[index + 1][4]), item.marks);
  });
});
