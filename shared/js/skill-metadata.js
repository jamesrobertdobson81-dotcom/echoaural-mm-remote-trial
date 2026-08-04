"use strict";

const catalogue = require("../data/question-skill-map.json");

function cleanQuestionId(value) {
  return String(value || "").trim();
}

function getQuestionSkillMetadata(questionId) {
  const id = cleanQuestionId(questionId);
  return id && catalogue.questions[id] ? { ...catalogue.questions[id] } : {};
}

function enrichAnswerData(questionId, answerData = {}) {
  const fallback = answerData && typeof answerData === "object" ? answerData : {};
  const metadata = getQuestionSkillMetadata(questionId);
  const secondaryCodes = String(metadata.secondary_skill_codes || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const mappedCodes = [metadata.primary_skill_code, ...secondaryCodes].filter(Boolean);

  return {
    ...fallback,
    skillCode: metadata.primary_skill_code || fallback.skillCode || "",
    skillName: metadata.primary_skill_name || fallback.skillName || "",
    skillCodes: mappedCodes.length ? mappedCodes : (fallback.skillCodes ?? []),
    musicalElement: metadata.musical_element || fallback.musicalElement || "",
    learningStage: metadata.learning_stage || fallback.learningStage || "",
    difficultyBand: metadata.difficulty_band || fallback.difficultyBand || "",
    clipId: metadata.clip_id || fallback.clipId || "",
    metadataConfidence: metadata.metadata_confidence || fallback.metadataConfidence || "",
    metadataReviewStatus: metadata.metadata_review_status || fallback.metadataReviewStatus || ""
  };
}

module.exports = { getQuestionSkillMetadata, enrichAnswerData };
