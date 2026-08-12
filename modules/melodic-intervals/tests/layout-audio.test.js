"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const moduleRoot = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(moduleRoot, "style.css"), "utf8");

test("interval stave uses the reduced fixed widths", () => {
  assert.match(styles, /\.mi-stave-card \{[\s\S]*?width: min\(100%, 420px\);/);
  assert.match(styles, /\.is-dense-answer-set \.mi-stave-card \{[\s\S]*?width: min\(100%, 380px\);/);
});

test("interval question typography matches MM Devices", () => {
  assert.match(styles, /font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\s*font-size: clamp\(1\.02rem, 1\.35vw, 1\.28rem\);\s*font-weight: 500;\s*line-height: 1\.2;/);
});

test("the second interval note starts one second after the first", () => {
  assert.match(script, /const playPromises = \[\];/);
  assert.match(script, /playPromises\.push\(playAudioFile\(sequence\[i\], token\)\);/);
  assert.match(script, /await delay\(1000\);/);
  assert.doesNotMatch(script, /sequenceGapMs \|\| 280/);
});

test("interval gameplay actions have a visible branded neutral state", () => {
  assert.match(styles, /border: 1px solid rgba\(255, 93, 186, \.34\);/);
  assert.match(styles, /rgba\(255, 93, 186, \.11\)/);
  assert.match(styles, /0 12px 30px rgba\(255, 93, 186, \.075\)/);
});
