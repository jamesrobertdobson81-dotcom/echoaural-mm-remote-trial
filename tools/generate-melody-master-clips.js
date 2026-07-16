#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const projectRoot = path.resolve(__dirname, "..");
const moduleRoot = path.join(projectRoot, "modules", "melody-master");
const clipsPath = path.join(moduleRoot, "clips.js");
const resourceCsvPath = path.join(projectRoot, "resources", "Melody_Master_Resources.csv");

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const bytesPerPixel = 4;

const levelDefinitions = [
  {
    suffix: "F",
    label: "Foundation",
    missingLengths: [3, 2],
    maxDiatonicStepDistance: 1
  },
  {
    suffix: "D",
    label: "Developing",
    missingLengths: [5, 4],
    maxDiatonicStepDistance: 2
  },
  {
    suffix: "S",
    label: "Securing",
    missingLengths: [5, 4],
    maxDiatonicStepDistance: 3
  },
  {
    suffix: "M",
    label: "Mastering",
    mastering: true
  }
];

const pitchLetterNumbers = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6
};

function buildCrcTable() {
  const table = [];

  for (let tableIndex = 0; tableIndex < 256; tableIndex += 1) {
    let crcValue = tableIndex;

    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      crcValue = (crcValue & 1) ? (0xedb88320 ^ (crcValue >>> 1)) : (crcValue >>> 1);
    }

    table[tableIndex] = crcValue >>> 0;
  }

  return table;
}

const crcTable = buildCrcTable();

function crc32(buffer) {
  let crcValue = 0xffffffff;

  for (let byteIndex = 0; byteIndex < buffer.length; byteIndex += 1) {
    crcValue = crcTable[(crcValue ^ buffer[byteIndex]) & 0xff] ^ (crcValue >>> 8);
  }

  return (crcValue ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(8 + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function paethPredictor(leftValue, upValue, upperLeftValue) {
  const estimate = leftValue + upValue - upperLeftValue;
  const leftDistance = Math.abs(estimate - leftValue);
  const upDistance = Math.abs(estimate - upValue);
  const upperLeftDistance = Math.abs(estimate - upperLeftValue);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return leftValue;
  if (upDistance <= upperLeftDistance) return upValue;
  return upperLeftValue;
}

function readPng(filePath) {
  const fileBuffer = fs.readFileSync(filePath);

  if (!fileBuffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${filePath} is not a PNG file.`);
  }

  let readOffset = pngSignature.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let interlaceMethod = 0;
  const idatChunks = [];

  while (readOffset < fileBuffer.length) {
    const chunkLength = fileBuffer.readUInt32BE(readOffset);
    const chunkType = fileBuffer.toString("ascii", readOffset + 4, readOffset + 8);
    const chunkStart = readOffset + 8;
    const chunkEnd = chunkStart + chunkLength;
    const chunkData = fileBuffer.subarray(chunkStart, chunkEnd);

    if (chunkType === "IHDR") {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colourType = chunkData[9];
      interlaceMethod = chunkData[12];
    } else if (chunkType === "IDAT") {
      idatChunks.push(chunkData);
    } else if (chunkType === "IEND") {
      break;
    }

    readOffset = chunkEnd + 4;
  }

  if (bitDepth !== 8 || colourType !== 6 || interlaceMethod !== 0) {
    throw new Error(`${filePath} must be an 8-bit non-interlaced RGBA PNG.`);
  }

  const compressedData = Buffer.concat(idatChunks);
  const inflatedData = zlib.inflateSync(compressedData);
  const rowStride = width * bytesPerPixel;
  const imageData = Buffer.alloc(rowStride * height);
  let inputOffset = 0;

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = inflatedData[inputOffset];
    inputOffset += 1;
    const rowStart = rowIndex * rowStride;

    for (let rowByteIndex = 0; rowByteIndex < rowStride; rowByteIndex += 1) {
      const rawValue = inflatedData[inputOffset + rowByteIndex];
      const leftValue = rowByteIndex >= bytesPerPixel ? imageData[rowStart + rowByteIndex - bytesPerPixel] : 0;
      const upValue = rowIndex > 0 ? imageData[rowStart - rowStride + rowByteIndex] : 0;
      const upperLeftValue = rowIndex > 0 && rowByteIndex >= bytesPerPixel
        ? imageData[rowStart - rowStride + rowByteIndex - bytesPerPixel]
        : 0;

      let decodedValue = rawValue;
      if (filterType === 1) decodedValue = rawValue + leftValue;
      else if (filterType === 2) decodedValue = rawValue + upValue;
      else if (filterType === 3) decodedValue = rawValue + Math.floor((leftValue + upValue) / 2);
      else if (filterType === 4) decodedValue = rawValue + paethPredictor(leftValue, upValue, upperLeftValue);
      else if (filterType !== 0) throw new Error(`${filePath} uses unsupported PNG filter ${filterType}.`);

      imageData[rowStart + rowByteIndex] = decodedValue & 0xff;
    }

    inputOffset += rowStride;
  }

  return { width, height, data: imageData };
}

function writePng(filePath, image) {
  const rowStride = image.width * bytesPerPixel;
  const rawData = Buffer.alloc((rowStride + 1) * image.height);

  for (let rowIndex = 0; rowIndex < image.height; rowIndex += 1) {
    const rawRowStart = rowIndex * (rowStride + 1);
    const imageRowStart = rowIndex * rowStride;
    rawData[rawRowStart] = 0;
    image.data.copy(rawData, rawRowStart + 1, imageRowStart, imageRowStart + rowStride);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(image.width, 0);
  ihdrData.writeUInt32BE(image.height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const output = Buffer.concat([
    pngSignature,
    makePngChunk("IHDR", ihdrData),
    makePngChunk("IDAT", zlib.deflateSync(rawData, { level: 9 })),
    makePngChunk("IEND", Buffer.alloc(0))
  ]);

  fs.writeFileSync(filePath, output);
}

function pixelIsDifferent(firstData, secondData, pixelOffset) {
  return firstData[pixelOffset] !== secondData[pixelOffset]
    || firstData[pixelOffset + 1] !== secondData[pixelOffset + 1]
    || firstData[pixelOffset + 2] !== secondData[pixelOffset + 2]
    || firstData[pixelOffset + 3] !== secondData[pixelOffset + 3];
}

function getSlotBounds(slotIndex, slotCentres, imageWidth) {
  const centre = slotCentres[slotIndex];
  const previousCentre = slotCentres[slotIndex - 1];
  const nextCentre = slotCentres[slotIndex + 1];
  const defaultHalfWidth = 60;
  const leftHalfWidth = Number.isFinite(previousCentre) ? (centre - previousCentre) / 2 : Number.isFinite(nextCentre) ? (nextCentre - centre) / 2 : defaultHalfWidth;
  const rightHalfWidth = Number.isFinite(nextCentre) ? (nextCentre - centre) / 2 : Number.isFinite(previousCentre) ? (centre - previousCentre) / 2 : defaultHalfWidth;
  const left = Math.max(0, Math.floor(centre - Math.max(leftHalfWidth, 1)) - 2);
  const right = Math.min(imageWidth, Math.ceil(centre + Math.max(rightHalfWidth, 1)) + 2);

  return { left, right };
}

function copyVisibleAnswerSlots(baseImage, answerImage, sourceSlots, visibleSlotIndexes) {
  if (baseImage.width !== answerImage.width || baseImage.height !== answerImage.height) {
    throw new Error("Question and answer images must have identical dimensions.");
  }

  const visibleSet = new Set(visibleSlotIndexes);
  const outputData = Buffer.from(baseImage.data);
  const slotCentres = sourceSlots.map((slot) => (Number(slot.x) / 100) * baseImage.width);

  sourceSlots.forEach((slot, slotIndex) => {
    if (!visibleSet.has(slotIndex)) return;

    const bounds = getSlotBounds(slotIndex, slotCentres, baseImage.width);

    for (let rowIndex = 0; rowIndex < baseImage.height; rowIndex += 1) {
      for (let pixelX = bounds.left; pixelX < bounds.right; pixelX += 1) {
        const pixelOffset = ((rowIndex * baseImage.width) + pixelX) * bytesPerPixel;

        if (!pixelIsDifferent(baseImage.data, answerImage.data, pixelOffset)) continue;

        outputData[pixelOffset] = answerImage.data[pixelOffset];
        outputData[pixelOffset + 1] = answerImage.data[pixelOffset + 1];
        outputData[pixelOffset + 2] = answerImage.data[pixelOffset + 2];
        outputData[pixelOffset + 3] = answerImage.data[pixelOffset + 3];
      }
    }
  });

  return { width: baseImage.width, height: baseImage.height, data: outputData };
}

function pitchToDiatonicNumber(pitch) {
  const match = String(pitch || "").trim().match(/^([A-Ga-g])(?:#|b)?(-?\d+)$/);
  if (!match) return null;
  return (Number(match[2]) * 7) + pitchLetterNumbers[match[1].toUpperCase()];
}

function getDiatonicDistance(firstPitch, secondPitch) {
  const firstNumber = pitchToDiatonicNumber(firstPitch);
  const secondNumber = pitchToDiatonicNumber(secondPitch);
  if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) return Infinity;
  return Math.abs(secondNumber - firstNumber);
}

function getMaxMissingInterval(pitches) {
  let maxDistance = 0;

  for (let pitchIndex = 1; pitchIndex < pitches.length; pitchIndex += 1) {
    maxDistance = Math.max(maxDistance, getDiatonicDistance(pitches[pitchIndex - 1], pitches[pitchIndex]));
  }

  return maxDistance;
}

function findLargeLeaps(pitches) {
  const largeLeaps = [];

  for (let pitchIndex = 1; pitchIndex < pitches.length; pitchIndex += 1) {
    const distance = getDiatonicDistance(pitches[pitchIndex - 1], pitches[pitchIndex]);
    if (distance >= 5) {
      largeLeaps.push({
        fromIndex: pitchIndex - 1,
        toIndex: pitchIndex,
        distance
      });
    }
  }

  return largeLeaps;
}

function intervalLabelFromDistance(distance) {
  const intervalNumber = Math.abs(Number(distance) || 0) + 1;
  if (intervalNumber === 1) return "repeated note";
  if (intervalNumber === 2) return "step";
  if (intervalNumber === 3) return "third";
  if (intervalNumber === 4) return "fourth";
  if (intervalNumber === 5) return "fifth";
  if (intervalNumber === 6) return "sixth";
  return `${intervalNumber}th`;
}

function selectContiguousMissingIndexes(pitches, level) {
  const candidates = [];

  for (const missingLength of level.missingLengths) {
    for (let startIndex = 1; startIndex <= pitches.length - missingLength; startIndex += 1) {
      const endIndex = startIndex + missingLength;
      const missingPitches = pitches.slice(startIndex, endIndex);
      const assessedPitches = pitches.slice(startIndex - 1, endIndex);
      const maxDistance = getMaxMissingInterval(assessedPitches);
      if (maxDistance > level.maxDiatonicStepDistance) continue;

      const hasReferenceAfter = endIndex < pitches.length;
      const contextScore = 1 + (hasReferenceAfter ? 1 : 0);
      const centreDistance = Math.abs((startIndex + ((missingLength - 1) / 2)) - ((pitches.length - 1) / 2));

      candidates.push({
        missingIndexes: Array.from({ length: missingLength }, (_, offset) => startIndex + offset),
        missingPitches,
        contextScore,
        centreDistance,
        maxDistance,
        generationNote: `Lead-in interval from slot ${startIndex} to slot ${startIndex + 1} is included in the ${level.label} interval rule.`
      });
    }

    if (candidates.length) break;
  }

  candidates.sort((first, second) => {
    if (second.contextScore !== first.contextScore) return second.contextScore - first.contextScore;
    if (first.centreDistance !== second.centreDistance) return first.centreDistance - second.centreDistance;
    return first.missingIndexes[0] - second.missingIndexes[0];
  });

  return candidates[0] || null;
}

function selectMasteringMissingIndexes(pitches) {
  const largeLeaps = findLargeLeaps(pitches).sort((first, second) => second.distance - first.distance);
  const allIndexes = Array.from({ length: pitches.length }, (_, slotIndex) => slotIndex);

  if (!largeLeaps.length) {
    return {
      missingIndexes: allIndexes,
      visibleReferenceIndexes: [],
      maxDistance: getMaxMissingInterval(pitches),
      generationNote: "Existing full-question Mastering artwork reused."
    };
  }

  const referenceIndex = largeLeaps[0].fromIndex;
  const missingIndexes = allIndexes.filter((slotIndex) => slotIndex !== referenceIndex);
  const missingPitches = missingIndexes.map((slotIndex) => pitches[slotIndex]);

  return {
    missingIndexes,
    visibleReferenceIndexes: [referenceIndex],
    maxDistance: getMaxMissingInterval(missingPitches),
    generationNote: `Large ${intervalLabelFromDistance(largeLeaps[0].distance)} retained with slot ${referenceIndex + 1} visible as tonal/visual context.`
  };
}

function getLevelVariantExclusionReason(sourceClip, level) {
  if (level.mastering) return "";

  const sourceId = String(sourceClip.id || "").trim().toUpperCase();
  const work = String(sourceClip.work || "").trim().toLowerCase();
  const levelLabel = String(level.label || "").trim();

  if (sourceId === "MM009" && levelLabel === "Foundation") {
    return "Haydn Cello Concerto is not used at Foundation because of score formatting.";
  }

  if (sourceId === "MM001" || work.includes("facile") || work.includes("k. 545")) {
    return "Mozart Facile is only used at Mastering because of score formatting.";
  }

  if (sourceId === "MM014" || sourceId === "MM015" || work.includes("pastoral")) {
    return "Pastoral questions are only used at Mastering because of score formatting.";
  }

  if (
    (work.includes("piano sonata no. 11") || work.includes("k. 331")) &&
    (levelLabel === "Foundation" || levelLabel === "Developing")
  ) {
    return "Mozart Piano Sonata no. 11 is only used at Securing and Mastering.";
  }

  return "";
}

function loadSourceClips() {
  const sourceText = fs.readFileSync(clipsPath, "utf8");
  const sandbox = {};
  const clips = vm.runInNewContext(`${sourceText}\n;melodyClips;`, sandbox, {
    filename: clipsPath,
    timeout: 1000
  });

  if (!Array.isArray(clips) || !clips.length) {
    throw new Error("No melodyClips array found in clips.js.");
  }

  return {
    sourceText,
    clips: clips.filter((clip) => /^MM\d{3}$/i.test(String(clip.id || "")))
  };
}

function getRelativeVariantImagePath(sourceQuestionImage, variantId) {
  return path.posix.join(path.posix.dirname(sourceQuestionImage), `${variantId}-question.png`);
}

function writeVariantQuestionImage(sourceClip, variantId, visibleReferenceIndexes) {
  const questionImagePath = path.join(moduleRoot, sourceClip.questionImage);
  const answerImagePath = path.join(moduleRoot, sourceClip.answerImage);
  const variantRelativePath = getRelativeVariantImagePath(sourceClip.questionImage, variantId);
  const variantImagePath = path.join(moduleRoot, variantRelativePath);
  const sourceSlots = sourceClip.dictationLayout.slots || [];
  const baseImage = readPng(questionImagePath);
  const answerImage = readPng(answerImagePath);
  const variantImage = copyVisibleAnswerSlots(baseImage, answerImage, sourceSlots, visibleReferenceIndexes);

  writePng(variantImagePath, variantImage);

  return variantRelativePath;
}

function cloneSlotForVariant(slot, sourceSlotIndex) {
  return {
    ...slot,
    sourceSlot: sourceSlotIndex + 1
  };
}

function getQuestionText(missingCount) {
  return `Complete the ${missingCount} missing ${missingCount === 1 ? "note" : "notes"}.`;
}

function getNoteCountLabel(missingCount, sourceSlots) {
  const rhythms = sourceSlots.map((slot) => String(slot.rhythm || "").toLowerCase()).filter(Boolean);
  const firstRhythm = rhythms[0] || "note";
  const uniformRhythm = rhythms.length === sourceSlots.length && rhythms.every((rhythm) => rhythm === firstRhythm);
  const baseLabel = uniformRhythm && firstRhythm === "semiquaver" ? "semiquaver" : "note";
  return `${missingCount} ${baseLabel}${missingCount === 1 ? "" : "s"}`;
}

function buildVariantClip(sourceClip, level, selection, questionImage) {
  const sourceSlots = sourceClip.dictationLayout.slots || [];
  const missingSlotSet = new Set(selection.missingIndexes);
  const visibleReferenceIndexes = selection.visibleReferenceIndexes || sourceSlots
    .map((slot, slotIndex) => slotIndex)
    .filter((slotIndex) => !missingSlotSet.has(slotIndex));
  const missingSlots = selection.missingIndexes.map((slotIndex) => cloneSlotForVariant(sourceSlots[slotIndex], slotIndex));
  const missingPitches = missingSlots.map((slot) => slot.pitch);
  const variantId = `${sourceClip.id}-${level.suffix}`;
  const reusesOriginalFullMasteringQuestion = Boolean(level.mastering && missingSlots.length === sourceSlots.length);

  return {
    id: variantId,
    sourceQuestionId: sourceClip.id,
    level: level.label,
    file: sourceClip.file,
    questionImage,
    answerImage: sourceClip.answerImage,
    mode: sourceClip.mode || "dictation",
    difficulty: sourceClip.difficulty,
    sourceDifficulty: sourceClip.difficulty,
    skill: sourceClip.skill || "Melodic Dictation",
    question: getQuestionText(missingSlots.length),
    answerPitches: missingPitches,
    noteImage: sourceClip.noteImage,
    noteImageFallback: sourceClip.noteImageFallback,
    dictationLayout: {
      ...sourceClip.dictationLayout,
      noteCountLabel: getNoteCountLabel(missingSlots.length, missingSlots),
      sourceSlotCount: sourceSlots.length,
      visibleReferenceSlots: visibleReferenceIndexes.map((slotIndex) => ({
        sourceSlot: slotIndex + 1,
        x: sourceSlots[slotIndex].x,
        pitch: sourceSlots[slotIndex].pitch
      })),
      slots: missingSlots
    },
    markScheme: reusesOriginalFullMasteringQuestion ? undefined : {
      name: "Levelled melodic dictation with contour",
      pitchMarks: missingSlots.length,
      shapeMarks: missingSlots.length > 1 ? 1 : 0,
      description: "1 mark per correct missing pitch, plus a contour mark where the melodic shape is secure."
    },
    notes: sourceClip.notes,
    composer: sourceClip.composer,
    work: sourceClip.work,
    movement: sourceClip.movement,
    source: sourceClip.source,
    rights: sourceClip.rights || sourceClip.licence || sourceClip.license,
    hiddenMetadata: {
      sourceQuestionId: sourceClip.id,
      level: level.label,
      sourceDifficulty: sourceClip.difficulty,
      missingSlotNumbers: selection.missingIndexes.map((slotIndex) => slotIndex + 1),
      visibleReferenceSlotNumbers: visibleReferenceIndexes.map((slotIndex) => slotIndex + 1),
      fullAnswerPitches: sourceClip.answerPitches,
      fullAnswerXPositions: sourceSlots.map((slot) => slot.x),
      maxMissingInterval: intervalLabelFromDistance(selection.maxDistance),
      generationNote: selection.generationNote || ""
    }
  };
}

function updateLevelledBlock(sourceText, variantClips) {
  const marker = "\n\n// Levelled Melody Master variants generated by tools/generate-melody-master-clips.js.";
  const block = `${marker}\nconst melodyMasterLevelledClips = ${JSON.stringify(variantClips, null, 2)};\n\nif (typeof window !== "undefined") {\n  window.melodyMasterLevelledClips = melodyMasterLevelledClips;\n}\n`;
  const markerIndex = sourceText.indexOf(marker);
  const baseText = markerIndex >= 0 ? sourceText.slice(0, markerIndex) : sourceText.trimEnd();
  return `${baseText}${block}`;
}

function csvValue(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getAttribution(sourceClip) {
  return sourceClip.attribution
    || sourceClip.performer
    || sourceClip.hiddenMetadata?.rights?.performer
    || sourceClip.hiddenMetadata?.sourceTracker?.performer
    || "";
}

function getAudioSource(sourceClip) {
  return sourceClip.source
    || sourceClip.hiddenMetadata?.source?.provider
    || sourceClip.hiddenMetadata?.sourceTracker?.musopenTitleShown
    || "";
}

function getTimingMetadata(sourceClip) {
  const metadata = {};
  if (sourceClip.audioDurationSeconds) metadata.audioDurationSeconds = sourceClip.audioDurationSeconds;
  if (sourceClip.guidedPlayback) metadata.guidedPlayback = sourceClip.guidedPlayback;
  return Object.keys(metadata).length ? metadata : "";
}

function writeResourceCsv(sourceClips, variantClips) {
  const sourceById = new Map(sourceClips.map((sourceClip) => [sourceClip.id, sourceClip]));
  const columns = [
    "New question ID",
    "Original/source question ID",
    "Level",
    "Composer",
    "Work",
    "Movement",
    "Audio source",
    "Licence",
    "Attribution",
    "Audio filename/path",
    "Question artwork filename/path",
    "Answer artwork filename/path",
    "Existing difficulty",
    "Mode",
    "Missing note count",
    "Missing note positions",
    "Missing pitches",
    "Full answer sequence",
    "Timing/playback metadata",
    "Generation notes"
  ];

  const rows = variantClips.map((variantClip) => {
    const sourceClip = sourceById.get(variantClip.sourceQuestionId) || {};

    return [
      variantClip.id,
      variantClip.sourceQuestionId,
      variantClip.level,
      variantClip.composer,
      variantClip.work,
      variantClip.movement,
      getAudioSource(sourceClip),
      variantClip.rights,
      getAttribution(sourceClip),
      variantClip.file,
      variantClip.questionImage,
      variantClip.answerImage,
      variantClip.sourceDifficulty,
      variantClip.mode,
      variantClip.dictationLayout.slots.length,
      variantClip.hiddenMetadata.missingSlotNumbers.join(", "),
      variantClip.answerPitches.join(" "),
      (sourceClip.answerPitches || variantClip.hiddenMetadata.fullAnswerPitches || []).join(" "),
      getTimingMetadata(sourceClip),
      variantClip.hiddenMetadata.generationNote
    ];
  });

  const csvLines = [
    columns.map(csvValue).join(","),
    ...rows.map((row) => row.map(csvValue).join(","))
  ];

  fs.mkdirSync(path.dirname(resourceCsvPath), { recursive: true });
  fs.writeFileSync(resourceCsvPath, `${csvLines.join("\n")}\n`);
}

function generateLevelledVariants() {
  const { sourceText, clips } = loadSourceClips();
  const variantClips = [];
  const skipped = [];
  const generatedArtwork = [];

  clips.forEach((sourceClip) => {
    const pitches = sourceClip.answerPitches || [];

    levelDefinitions.forEach((level) => {
      const exclusionReason = getLevelVariantExclusionReason(sourceClip, level);
      if (exclusionReason) {
        skipped.push({
          id: `${sourceClip.id}-${level.suffix}`,
          sourceQuestionId: sourceClip.id,
          level: level.label,
          reason: exclusionReason
        });
        return;
      }

      let selection = null;

      if (level.mastering) {
        selection = selectMasteringMissingIndexes(pitches);
      } else {
        selection = selectContiguousMissingIndexes(pitches, level);
      }

      if (!selection) {
        skipped.push({
          id: `${sourceClip.id}-${level.suffix}`,
          sourceQuestionId: sourceClip.id,
          level: level.label,
          reason: `No contiguous ${level.missingLengths.join(" or ")} note group stays within a ${intervalLabelFromDistance(level.maxDiatonicStepDistance)}.`
        });
        return;
      }

      const variantId = `${sourceClip.id}-${level.suffix}`;
      const visibleReferenceIndexes = sourceClip.dictationLayout.slots
        .map((slot, slotIndex) => slotIndex)
        .filter((slotIndex) => !selection.missingIndexes.includes(slotIndex));
      const needsVariantArtwork = visibleReferenceIndexes.length > 0;
      const questionImage = needsVariantArtwork
        ? writeVariantQuestionImage(sourceClip, variantId, visibleReferenceIndexes)
        : sourceClip.questionImage;

      if (needsVariantArtwork) generatedArtwork.push(questionImage);

      variantClips.push(buildVariantClip(sourceClip, level, {
        ...selection,
        visibleReferenceIndexes
      }, questionImage));
    });
  });

  fs.writeFileSync(clipsPath, updateLevelledBlock(sourceText, variantClips));
  writeResourceCsv(clips, variantClips);

  const counts = levelDefinitions.reduce((summary, level) => {
    summary[level.label] = variantClips.filter((clip) => clip.level === level.label).length;
    return summary;
  }, {});

  console.log("Generated Melody Master levelled variants:");
  Object.entries(counts).forEach(([level, count]) => console.log(`- ${level}: ${count}`));
  console.log(`Generated question artwork files: ${generatedArtwork.length}`);
  console.log(`Updated ${path.relative(projectRoot, clipsPath)}`);
  console.log(`Updated ${path.relative(projectRoot, resourceCsvPath)}`);

  if (skipped.length) {
    console.log("Skipped unsafe question/level combinations:");
    skipped.forEach((skip) => console.log(`- ${skip.id}: ${skip.reason}`));
  }
}

generateLevelledVariants();
