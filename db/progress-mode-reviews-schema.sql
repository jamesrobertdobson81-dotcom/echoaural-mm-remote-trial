BEGIN;

-- Append-only log of every Progress Mode question a student has answered —
-- the server-side source of truth for spaced repetition, replacing an
-- earlier mutable-state sync (progress_mode_sync_state.sources, now
-- retired). Each row stores the RESULTING scheduling state after that
-- review (ease_factor/interval_draws/repetitions), not just correct/
-- incorrect, so "current state for a signature" is simply its most recent
-- row here — no replay needed (the same idiom Anki's `cards` table uses as
-- a cache of its `revlog`). Never updated after insert; a correction is a
-- new row, not an edit.
CREATE TABLE IF NOT EXISTS progress_mode_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  question_signature TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  ease_factor NUMERIC(4,2) NOT NULL,
  interval_draws INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  level_index SMALLINT NOT NULL DEFAULT 0,
  client_review_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT progress_mode_reviews_student_client_unique UNIQUE (student_id, client_review_id),
  CONSTRAINT progress_mode_reviews_ease_factor_range CHECK (ease_factor >= 1.0 AND ease_factor <= 5.0),
  CONSTRAINT progress_mode_reviews_interval_nonnegative CHECK (interval_draws >= 0),
  CONSTRAINT progress_mode_reviews_repetitions_nonnegative CHECK (repetitions >= 0)
);

CREATE INDEX IF NOT EXISTS progress_mode_reviews_student_source_index
  ON progress_mode_reviews (student_id, source_key, completed_at DESC);

CREATE INDEX IF NOT EXISTS progress_mode_reviews_teacher_index
  ON progress_mode_reviews (teacher_id);

COMMIT;
