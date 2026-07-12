BEGIN;

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  teacher_code TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher'
    CHECK (role IN ('teacher', 'admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS teachers_email_unique
  ON teachers (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS teachers_code_unique
  ON teachers (UPPER(teacher_code));

CREATE TABLE IF NOT EXISTS licences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'founding_partner',
  seat_limit INTEGER NOT NULL DEFAULT 20
    CHECK (seat_limit >= 1 AND seat_limit <= 500),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'pending',
      'trial',
      'active',
      'expired',
      'cancelled',
      'refunded'
    )),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  payment_provider TEXT,
  payment_customer_id TEXT,
  payment_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS licences_teacher_id_index
  ON licences (teacher_id);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_licence_per_teacher
  ON licences (teacher_id)
  WHERE status IN ('trial', 'active');

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS students_teacher_username_unique
  ON students (teacher_id, LOWER(username));

CREATE INDEX IF NOT EXISTS students_teacher_id_index
  ON students (teacher_id);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS teacher_sessions_teacher_id_index
  ON teacher_sessions (teacher_id);

CREATE INDEX IF NOT EXISTS teacher_sessions_expiry_index
  ON teacher_sessions (expires_at);

CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS student_sessions_student_id_index
  ON student_sessions (student_id);

CREATE INDEX IF NOT EXISTS student_sessions_expiry_index
  ON student_sessions (expires_at);

CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  student_id UUID NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  question_id TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  maximum_score INTEGER NOT NULL DEFAULT 0,
  answer_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attempts_teacher_id_index
  ON attempts (teacher_id);

CREATE INDEX IF NOT EXISTS attempts_student_id_index
  ON attempts (student_id);

CREATE INDEX IF NOT EXISTS attempts_module_id_index
  ON attempts (module_id);

CREATE INDEX IF NOT EXISTS attempts_completed_at_index
  ON attempts (completed_at);

CREATE OR REPLACE FUNCTION echoaural_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teachers_set_updated_at ON teachers;

CREATE TRIGGER teachers_set_updated_at
BEFORE UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION echoaural_set_updated_at();

DROP TRIGGER IF EXISTS licences_set_updated_at ON licences;

CREATE TRIGGER licences_set_updated_at
BEFORE UPDATE ON licences
FOR EACH ROW
EXECUTE FUNCTION echoaural_set_updated_at();

DROP TRIGGER IF EXISTS students_set_updated_at ON students;

CREATE TRIGGER students_set_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION echoaural_set_updated_at();

COMMIT;
