BEGIN;

-- Server-side mirror of Progress Mode's per-area level/level-progress (see
-- modules/progress-mode/store.js), so a student's level survives a device
-- switch. Deliberately separate from progress_mode_summaries (which stays
-- teacher-facing and untouched) — this table is never read by the teacher
-- dashboard, only by the student's own client on load.
CREATE TABLE IF NOT EXISTS progress_mode_sync_state (
  student_id UUID PRIMARY KEY
    REFERENCES students(id)
    ON DELETE CASCADE,
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  -- { [areaKey]: { level, levelProgress } }
  areas JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS progress_mode_sync_state_teacher_index
  ON progress_mode_sync_state (teacher_id);

-- Per-question scheduling state (attempts/cumulative*/drawCount/
-- missedQueue/seenIds) originally lived here as a `sources` JSONB column,
-- but was superseded by the append-only progress_mode_reviews log (see
-- db/progress-mode-reviews-schema.sql) — a review event already carries
-- its own resulting ease/interval/repetitions, so merging across devices
-- is just "keep the most recent row per signature," no field-by-field
-- reconciliation needed. Dropped rather than left unused since no real
-- student data existed in this column at the time of the change.
ALTER TABLE progress_mode_sync_state
  DROP COLUMN IF EXISTS sources;

COMMIT;
