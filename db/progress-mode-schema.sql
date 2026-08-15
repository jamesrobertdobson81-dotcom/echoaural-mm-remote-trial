BEGIN;

-- One row per student, upserted whenever modules/progress-mode/ finishes a
-- round (best-effort, fire-and-forget — see script.js's finishRound and
-- the /api/student/progress-mode-summary route). Deliberately a separate
-- table from `rounds`/`attempts`: Progress Mode's real source of truth
-- stays localStorage, this is just a lightweight mirror so a teacher can
-- see it, not a full history (no per-round or per-question detail here).
CREATE TABLE IF NOT EXISTS progress_mode_summaries (
  student_id UUID PRIMARY KEY
    REFERENCES students(id)
    ON DELETE CASCADE,
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  overall_level_label TEXT NOT NULL,
  rounds_completed INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  -- [{ areaKey, label, level, levelLabel, correct, questions }, ...]
  areas JSONB NOT NULL DEFAULT '[]'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT progress_mode_summaries_rounds_nonnegative CHECK (rounds_completed >= 0),
  CONSTRAINT progress_mode_summaries_correct_nonnegative CHECK (total_correct >= 0),
  CONSTRAINT progress_mode_summaries_questions_nonnegative CHECK (total_questions >= 0)
);

-- Added after the original lightweight mirror: per-source totals let teacher
-- dashboards combine PM evidence with Live Session/Homework app totals.
ALTER TABLE progress_mode_summaries
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS progress_mode_summaries_teacher_index
  ON progress_mode_summaries (teacher_id);

COMMIT;
