BEGIN;

CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  score NUMERIC(8,2) NOT NULL DEFAULT 0,
  maximum_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  round_feedback TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  client_round_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rounds_score_nonnegative CHECK (score >= 0),
  CONSTRAINT rounds_maximum_nonnegative CHECK (maximum_score >= 0),
  CONSTRAINT rounds_question_count_nonnegative CHECK (question_count >= 0),
  CONSTRAINT rounds_student_client_unique UNIQUE (student_id, client_round_id)
);

CREATE INDEX IF NOT EXISTS rounds_student_completed_index
  ON rounds (student_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS rounds_teacher_completed_index
  ON rounds (teacher_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS rounds_module_index
  ON rounds (module_id);

ALTER TABLE attempts
  ALTER COLUMN score TYPE NUMERIC(8,2) USING score::NUMERIC,
  ALTER COLUMN maximum_score TYPE NUMERIC(8,2) USING maximum_score::NUMERIC;

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE INDEX IF NOT EXISTS attempts_round_id_index
  ON attempts (round_id);

COMMIT;
