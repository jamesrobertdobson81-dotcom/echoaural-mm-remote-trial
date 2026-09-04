"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ""; }
    else if (char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

const csvPath = path.join(__dirname, "../data/EA_Structure_Spotter_v1.csv");
const questions = parseCsv(fs.readFileSync(csvPath, "utf8"));

test("question bank has 4 rows per concept across the 4 levels", () => {
  assert.equal(questions.length, 144);
  assert.deepEqual([...new Set(questions.map((question) => question.level))].sort(), ["Developing", "Foundation", "Mastering", "Securing"]);
  for (const level of ["Foundation", "Developing", "Securing", "Mastering"]) {
    assert.equal(questions.filter((question) => question.level === level).length, 36);
  }
});

test("question_id is unique and every row has the fields gameplay needs", () => {
  assert.equal(new Set(questions.map((question) => question.question_id)).size, questions.length);
  questions.forEach((question) => {
    assert.ok(question.prompt, `${question.question_id} needs a prompt`);
    assert.ok(question.correct_answer, `${question.question_id} needs a correct answer`);
    assert.ok(Number(question.marks) > 0, `${question.question_id} needs marks`);
    assert.ok(["active", "dropped"].includes(question.status), `${question.question_id} has an unrecognised status`);
    if (question.question_type.startsWith("multiple_choice")) {
      assert.equal(question.options.split(" | ").length, 4, `${question.question_id} needs four options`);
    }
  });
});

// Reflects the first content review (FRIDAY JIMMY-style pass, 2026-08-21):
// every Mastering row was dropped app-wide (same trap ScoreDecoder's own
// Mastering tier fell into), plus 7 whole Type B concepts the reviewer
// judged not to earn their place (introduction, transition, call and
// response, intro, verse, bridge, outro) — 36 + 21 = 57 dropped, 87 active.
test("dropped rows match the reviewed set: every Mastering row, plus 7 full Type B concepts", () => {
  const dropped = questions.filter((question) => question.status === "dropped");
  const active = questions.filter((question) => question.status === "active");
  assert.equal(dropped.length, 57);
  assert.equal(active.length, 87);

  const droppedMastering = dropped.filter((question) => question.level === "Mastering");
  assert.equal(droppedMastering.length, 36, "every concept's Mastering row should be dropped");
  assert.equal(active.filter((question) => question.level === "Mastering").length, 0);

  const fullyDroppedConcepts = new Set([
    "STR-INTRO", "STR-TRANS", "STR-CALLRESPONSE", "STR-POPINTRO", "STR-VERSE", "STR-BRIDGE", "STR-OUTRO"
  ]);
  fullyDroppedConcepts.forEach((code) => {
    const rows = questions.filter((question) => question.concept_code === code);
    assert.equal(rows.length, 4, code);
    assert.ok(rows.every((question) => question.status === "dropped"), `${code} should be fully dropped`);
  });
  assert.equal(
    dropped.filter((question) => question.level !== "Mastering").length,
    fullyDroppedConcepts.size * 3
  );
});

test("question type follows level progression, matching the ScoreDecoder convention", () => {
  const expected = {
    Foundation: "multiple_choice",
    Developing: "multiple_choice_reverse",
    Securing: "short_answer",
    Mastering: "exam_style_short_answer"
  };
  questions.forEach((question) => assert.equal(question.question_type, expected[question.level], question.question_id));
});

test("Mastering rows are worth 2 marks and need no score/notation asset", () => {
  const mastering = questions.filter((question) => question.level === "Mastering");
  assert.equal(mastering.length, 36);
  mastering.forEach((question) => {
    assert.equal(question.marks, "2", `${question.question_id} should be 2 marks`);
    assert.equal(question.requires_score_context, "No", `${question.question_id} should not require a score/notation asset`);
    assert.equal(question.visual_asset, "", `${question.question_id} should have no visual_asset`);
  });
});

test("every concept has exactly 4 rows (one per level) sharing one concept_code", () => {
  const byConcept = new Map();
  questions.forEach((question) => {
    if (!byConcept.has(question.concept_code)) byConcept.set(question.concept_code, []);
    byConcept.get(question.concept_code).push(question);
  });
  assert.equal(byConcept.size, 36);
  for (const [concept, rows] of byConcept) {
    assert.equal(rows.length, 4, `${concept} should have exactly 4 level rows`);
    assert.deepEqual(rows.map((row) => row.level).sort(), ["Developing", "Foundation", "Mastering", "Securing"], `${concept} should cover all 4 levels`);
  }
});

test("Type A 'whole-piece shape' rows carry their pattern in symbol_display on Developing and Securing tiers", () => {
  const wholeForm = questions.filter((question) => question.term_type === "whole_form");
  assert.equal(wholeForm.length, 48); // 12 concepts * 4 levels
  wholeForm.forEach((question) => {
    if (question.level === "Developing" || question.level === "Securing") {
      assert.ok(question.symbol_display, `${question.question_id} (${question.level}) should show its pattern`);
    }
  });
});

// Following the first content review, every surviving (active) question
// got a representative audio clip — not just the 12 Type A "whole-piece
// shape" concepts from the original build. Dropped rows are untouched
// (still audio_required: No) since nothing plays them.
test("every active question has a real audio clip; dropped rows are untouched", () => {
  const active = questions.filter((question) => question.status === "active");
  const audioRows = active.filter((question) => question.audio_required === "Yes");
  assert.equal(audioRows.length, active.length, "every active question should require audio");

  audioRows.forEach((question) => {
    assert.ok(question.audio_file, `${question.question_id} is missing audio_file`);
    const audioPath = path.join(__dirname, "../audio", path.basename(question.audio_file));
    assert.ok(fs.existsSync(audioPath), `${question.audio_file} does not exist on disk`);
  });

  const byConceptCode = new Map();
  audioRows.forEach((question) => {
    const existing = byConceptCode.get(question.concept_code);
    if (existing) assert.equal(question.audio_file, existing, `${question.concept_code} should reuse one clip across all its surviving levels`);
    else byConceptCode.set(question.concept_code, question.audio_file);
  });

  questions.filter((question) => question.status === "dropped").forEach((question) => {
    assert.equal(question.audio_required, "No", `${question.question_id} is dropped and shouldn't have been touched`);
  });
});

test("every element value is one of the 3 known Structure Spotter groups", () => {
  const known = new Set(["Classical Forms", "Popular & EDM", "World Structures"]);
  questions.forEach((question) => assert.ok(known.has(question.element), `${question.question_id} has an unknown element: ${question.element}`));
});
