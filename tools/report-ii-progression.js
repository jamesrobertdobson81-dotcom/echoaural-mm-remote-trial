#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const clipsPath = path.join(
  root,
  "modules/instrument-identifier/clips.js"
);

if (!fs.existsSync(clipsPath)) {
  console.error(`Missing: ${clipsPath}`);
  process.exit(1);
}

const source = fs.readFileSync(clipsPath, "utf8");
const clips = vm.runInNewContext(`${source}\n;clips;`, {}, {
  filename: clipsPath,
  timeout: 1000
});

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function isSolo(clip) {
  const type = clean(clip.type);
  return (
    type === "solo" ||
    type === "unaccompanied" ||
    type === "solo instrument" ||
    type.includes("solo only")
  );
}

function levelFor(clip) {
  const override = clean(
    clip.progressionLevel ||
    clip["progression level"] ||
    clip.LEVEL_OVERRIDE ||
    clip["Level Override"]
  );

  if (["foundation", "developing", "secure", "exam"].includes(override)) {
    return override;
  }

  const difficulty = clean(clip.difficulty);
  const solo = isSolo(clip);
  const recognisedDifficulty = [
    "easy",
    "medium",
    "hard",
    "very hard"
  ].includes(difficulty);

  if (solo && (difficulty === "easy" || !recognisedDifficulty)) {
    return "foundation";
  }

  if (
    (difficulty === "easy" && !solo) ||
    (difficulty === "medium" && solo)
  ) {
    return "developing";
  }

  if (
    (difficulty === "medium" && !solo) ||
    (difficulty === "hard" && solo)
  ) {
    return "secure";
  }

  if (
    difficulty === "very hard" ||
    (difficulty === "hard" && !solo)
  ) {
    return "exam";
  }

  return "ungraded";
}

const order = [
  "foundation",
  "developing",
  "secure",
  "exam",
  "ungraded"
];

const groups = Object.fromEntries(order.map(level => [level, []]));

for (const clip of clips) {
  groups[levelFor(clip)].push(clip);
}

console.log("");
console.log("EchoAural Instrument Identifier progression report");
console.log("--------------------------------------------------");

for (const level of order) {
  console.log(
    `${level[0].toUpperCase()}${level.slice(1)}: ${groups[level].length}`
  );
}

if (groups.ungraded.length) {
  console.log("");
  console.log("Ungraded clips (still available in Mixed Free Practice):");

  for (const clip of groups.ungraded) {
    console.log(
      `- ${clip.id || "(missing id)"}: ` +
      `${clip.instrument || "(missing instrument)"} | ` +
      `${clip.difficulty || "(missing difficulty)"} | ` +
      `${clip.type || "(missing type)"}`
    );
  }
}

console.log("");
