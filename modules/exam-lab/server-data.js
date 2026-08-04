'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const core = require('./core/exam-lab-core.js');

const DATA_FILES = ['exl001.js', 'exl002.js', 'exl003.js'];
let cachedRegistry = null;

function loadRegistry(options = {}) {
  if (cachedRegistry && !options.reload) return cachedRegistry;
  const moduleDir = options.moduleDir || __dirname;
  const sandbox = { window: {} };
  vm.createContext(sandbox);

  DATA_FILES.forEach((fileName) => {
    const filePath = path.join(moduleDir, 'data', fileName);
    const source = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(source, sandbox, { filename: filePath, timeout: 1000 });
  });

  const registry = sandbox.window.EXAM_LAB_QUESTION_SETS || {};
  const extracts = DATA_FILES
    .map((fileName) => fileName.replace(/\.js$/i, '').toUpperCase())
    .map((id) => registry[id])
    .filter((extract) => extract && extract.enabled !== false && extract.productionAvailable !== false);

  if (extracts.length !== DATA_FILES.length) throw new Error('Not all Exam Lab extracts were registered.');
  extracts.forEach((extract) => {
    core.validateExtract(extract);
    const audioPath = path.join(moduleDir, String(extract.audio || ''));
    if (!extract.audio || !fs.existsSync(audioPath)) throw new Error(`Exam Lab audio is unavailable for ${extract.id}.`);
    if (extract.score && !fs.existsSync(path.join(moduleDir, extract.score))) throw new Error(`Exam Lab score is unavailable for ${extract.id}.`);
  });

  cachedRegistry = Object.freeze(extracts.slice());
  return cachedRegistry;
}

module.exports = {
  DATA_FILES,
  loadRegistry
};
