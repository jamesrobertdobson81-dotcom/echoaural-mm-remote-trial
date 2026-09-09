BEGIN;

-- One row per real, fixed-bank question id — its estimated difficulty on
-- the same 1200-centred Elo scale chess ratings use. Deliberately GLOBAL
-- (no teacher_id/student_id scoping): a question's intrinsic difficulty is
-- a property of its content, not of who's answering it, so every teacher's
-- students contribute to (and benefit from) the same calibration. Only
-- meaningful for fixed-bank PM sources (shared/js/pm-registry.js's
-- questionSelectionMode: "id") — procedurally-generated sources
-- (chord-identifier, key-signature-sprint, both ContextCoach sources) mint
-- an effectively unique id per seed draw, so a rating would never
-- accumulate more than one observation; those simply never get a row here.
CREATE TABLE IF NOT EXISTS question_elo_ratings (
  module_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  difficulty_rating NUMERIC(7,2) NOT NULL DEFAULT 1200,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, question_id)
);

-- One row per (student, skill) — the student's own estimated ability on
-- that skill, same Elo scale, updated after every scored attempt whose
-- question carries that skillCode (shared/js/skill-metadata.js). Scoped to
-- a specific teacher_id (duplicated here rather than joined through
-- students, matching attempts' own teacher_id column) so a student who
-- ever changes teacher/account starts a fresh rating rather than carrying
-- a stale one across an ownership boundary.
CREATE TABLE IF NOT EXISTS student_skill_ratings (
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  student_id UUID NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  skill_code TEXT NOT NULL,
  ability_rating NUMERIC(7,2) NOT NULL DEFAULT 1200,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, skill_code)
);

CREATE INDEX IF NOT EXISTS student_skill_ratings_teacher_index
  ON student_skill_ratings (teacher_id);

COMMIT;
