"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "shared", "data");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (quoted) throw new Error(`${filePath}: unterminated quoted field`);
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) throw new Error(`${filePath}: CSV is empty`);

  rows[0][0] = rows[0][0].replace(/^﻿/, "");
  const headers = rows[0];
  const records = rows
    .slice(1)
    .filter((values) => values.some(Boolean))
    .map((values, index) => {
      if (values.length !== headers.length) {
        throw new Error(`${filePath}:${index + 2}: expected ${headers.length} columns, found ${values.length}`);
      }
      return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    });
  return { headers, records };
}

// Loads a browser-global data file (const x = [...]; window.y = ...; root.z = ...)
// by running its source as a function body and returning whichever named
// top-level bindings and window/module assignments it produced.
function loadBrowserGlobalModule(filePath, topLevelNames = []) {
  const code = fs.readFileSync(filePath, "utf8");
  const sandboxWindow = {};
  const moduleShim = { exports: {} };
  const returnExpr = topLevelNames
    .map((name) => `${JSON.stringify(name)}: typeof ${name} !== "undefined" ? ${name} : undefined`)
    .join(", ");
  const fn = new Function(
    "window",
    "globalThis",
    "module",
    "exports",
    `${code}\n;return { ${returnExpr} };`
  );
  const result = fn(sandboxWindow, sandboxWindow, moduleShim, moduleShim.exports);
  const definedResult = Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
  return Object.assign({}, sandboxWindow, definedResult, moduleShim.exports);
}

// Each in-scope module: how to load its live question ids.
const IN_SCOPE_MODULES = [
  {
    name: "instrument-identifier",
    loadIds: () => {
      const mod = loadBrowserGlobalModule(
        path.join(ROOT, "modules/instrument-identifier/clips.js"),
        ["clips"]
      );
      return mod.clips.map((c) => c.id);
    },
  },
  {
    name: "ensemble-recognition",
    loadIds: () => {
      const data = readJson(path.join(ROOT, "modules/ensemble-recognition/data/ensemble-questions.json"));
      const list = Array.isArray(data) ? data : data.questions || [];
      return list.map((q) => q.id);
    },
  },
  {
    name: "melody-master-devices",
    loadIds: () => {
      const data = readJson(path.join(ROOT, "modules/melody-master/data/melody-master-melodic-devices-50.json"));
      return data.questions.map((q) => q.id);
    },
  },
  {
    name: "melody-master-dictation",
    loadIds: () => {
      const mod = loadBrowserGlobalModule(
        path.join(ROOT, "modules/melody-master/clips.js"),
        ["melodyMasterLevelledClips"]
      );
      return mod.melodyMasterLevelledClips.map((c) => c.id);
    },
  },
  {
    name: "meter-master",
    loadIds: () => {
      const data = readJson(path.join(ROOT, "modules/meter-master/data/meter-master-exam-style-60.json"));
      return data.questions.map((q) => q.id);
    },
  },
  {
    name: "texture-trainer",
    loadIds: () => {
      const mod = loadBrowserGlobalModule(
        path.join(ROOT, "modules/texture-trainer/data/texture-questions.js"),
        ["TT_REVIEW_READY_QUESTIONS", "textureQuestions"]
      );
      const list = mod.textureQuestions || mod.TT_REVIEW_READY_QUESTIONS || [];
      return list.map((q) => q.id);
    },
  },
  {
    name: "exam-lab",
    loadIds: () => {
      const { loadRegistry } = require(path.join(ROOT, "modules/exam-lab/server-data.js"));
      const extracts = loadRegistry({ reload: true });
      return extracts.flatMap((extract) => extract.questions.map((q) => q.id));
    },
  },
  {
    name: "transposition-dictation",
    loadIds: () => {
      const mod = loadBrowserGlobalModule(
        path.join(ROOT, "modules/transposition-dictation/data/questions.js"),
        ["EATranspositionQuestions", "QUESTIONS"]
      );
      const list = mod.EATranspositionQuestions || mod.QUESTIONS || [];
      return list.map((q) => q.id);
    },
  },
];

function main() {
  const errors = [];
  const warnings = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const taxonomy = readJson(path.join(DATA_DIR, "aos-taxonomy.json"));
  const validCodes = new Set(taxonomy.areas.map((a) => a.aos_code));
  check(validCodes.size === 7, `aos-taxonomy.json: expected 7 areas, found ${validCodes.size}`);

  // --- question-aos-map ---
  const questionMap = readJson(path.join(DATA_DIR, "question-aos-map.json"));
  const questionCsv = parseCsv(path.join(DATA_DIR, "question-aos-map.csv"));
  const REQUIRED_FIELDS = ["clip_id", "aos_code", "aos_label", "source_basis", "metadata_confidence", "notes"];
  for (const field of ["question_id", ...REQUIRED_FIELDS]) {
    check(questionCsv.headers.includes(field), `question-aos-map.csv: missing column ${field}`);
  }

  const csvQuestionById = new Map();
  for (const row of questionCsv.records) {
    const id = String(row.question_id || "").trim();
    check(Boolean(id), "question-aos-map.csv: row with empty question_id");
    check(!csvQuestionById.has(id), `question-aos-map.csv: duplicate question_id ${id}`);
    if (id) csvQuestionById.set(id, row);
  }

  const questions = questionMap.questions || {};
  const confidenceCounts = { high: 0, medium: 0 };
  const codeCounts = {};
  for (const [id, metadata] of Object.entries(questions)) {
    check(Boolean(id.trim()), "question-aos-map.json: empty question id key");
    check(validCodes.has(metadata.aos_code), `${id}: invalid aos_code ${metadata.aos_code}`);
    check(
      ["high", "medium"].includes(metadata.metadata_confidence),
      `${id}: invalid metadata_confidence ${metadata.metadata_confidence}`
    );
    codeCounts[metadata.aos_code] = (codeCounts[metadata.aos_code] || 0) + 1;
    if (metadata.metadata_confidence in confidenceCounts) confidenceCounts[metadata.metadata_confidence] += 1;

    const csvRow = csvQuestionById.get(id);
    check(Boolean(csvRow), `${id}: present in JSON but missing from question-aos-map.csv`);
    if (csvRow) {
      for (const field of REQUIRED_FIELDS) {
        check(
          String(csvRow[field] ?? "") === String(metadata[field] ?? ""),
          `${id}: CSV/JSON mismatch for ${field} ("${csvRow[field]}" vs "${metadata[field]}")`
        );
      }
    }
  }
  check(
    csvQuestionById.size === Object.keys(questions).length,
    `question-aos-map.csv (${csvQuestionById.size} rows) and .json (${Object.keys(questions).length} entries) contain different counts`
  );

  // --- clip-catalogue aos fields ---
  const clipCatalogue = readJson(path.join(DATA_DIR, "clip-catalogue.json"));
  const clipCsv = parseCsv(path.join(DATA_DIR, "clip-catalogue.csv"));
  const clipCsvById = new Map(clipCsv.records.map((r) => [r.clip_id, r]));
  let clipsTagged = 0;
  for (const clip of clipCatalogue.clips || []) {
    if (!clip.aos_code) continue;
    clipsTagged += 1;
    check(validCodes.has(clip.aos_code), `clip ${clip.clip_id}: invalid aos_code ${clip.aos_code}`);
    const csvRow = clipCsvById.get(clip.clip_id);
    check(Boolean(csvRow), `clip ${clip.clip_id}: aos_code set in JSON but clip missing from clip-catalogue.csv`);
    if (csvRow) {
      check(
        String(csvRow.aos_code || "") === String(clip.aos_code || ""),
        `clip ${clip.clip_id}: CSV/JSON mismatch for aos_code`
      );
      check(
        String(csvRow.aos_label || "") === String(clip.aos_label || ""),
        `clip ${clip.clip_id}: CSV/JSON mismatch for aos_label`
      );
    }
  }

  // --- completeness: every live question id in an in-scope module has a mapping ---
  const coverage = [];
  for (const mod of IN_SCOPE_MODULES) {
    let ids;
    try {
      ids = mod.loadIds();
    } catch (error) {
      warnings.push(`${mod.name}: could not load live ids (${error.message})`);
      continue;
    }
    const missing = ids.filter((id) => !questions[id]);
    coverage.push({ name: mod.name, total: ids.length, mapped: ids.length - missing.length, missing });
  }

  if (errors.length) {
    console.error(`AoS metadata validation failed with ${errors.length} error(s):`);
    for (const error of errors.slice(0, 20)) console.error(`- ${error}`);
    if (errors.length > 20) console.error(`- ...and ${errors.length - 20} more`);
    process.exitCode = 1;
  } else {
    console.log(
      `AoS metadata validation passed: ${Object.keys(questions).length} mapped questions, ${clipsTagged} tagged clips.`
    );
  }

  console.log(`\nBy AoS code: ${JSON.stringify(codeCounts)}`);
  console.log(`Confidence: high=${confidenceCounts.high}, medium=${confidenceCounts.medium}`);
  console.log(`\nCoverage by module:`);
  for (const c of coverage) {
    const pct = c.total ? Math.round((c.mapped / c.total) * 100) : 100;
    console.log(`- ${c.name}: ${c.mapped}/${c.total} (${pct}%)`);
  }
  for (const w of warnings) console.warn(`warning: ${w}`);
}

try {
  main();
} catch (error) {
  console.error(`AoS metadata validation failed: ${error.message}`);
  process.exitCode = 1;
}
