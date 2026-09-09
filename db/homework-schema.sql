BEGIN;

-- A teacher-created assignment: a specific question set, for a specific
-- class, due whenever (or never). Deliberately separate from `rounds` —
-- this represents the ASSIGNMENT itself (persists whether or not anyone has
-- completed it yet), not a completed attempt. Completion is derived, not
-- stored here: does a `rounds` row exist with
-- metadata->>'homeworkAssignmentId' = this id, for a given student.
CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL
    REFERENCES teachers(id)
    ON DELETE CASCADE,
  class_id UUID NOT NULL
    REFERENCES classes(id)
    ON DELETE CASCADE,
  title TEXT NOT NULL,
  selection_mode TEXT NOT NULL,
  -- The resolved question plan — shape depends on selection_mode.
  -- mixed/app/selected: one shared array, same shape buildQuestionSet()
  -- already produces for Live Sessions (classroom/question-set-builder.js):
  -- [{ moduleId, sourceKey, questionId, questionIndex, seed }, ...] — every
  -- student answers the exact same set. targeted: a per-student map,
  -- { [studentId]: [questionPlan entry, ...] } — real per-student targeting
  -- (accounts/account-server.js's buildHomeworkQuestionSet, classroom/
  -- mastery.js + classroom/elo.js), only meaningful because homework is
  -- self-paced/async (no shared live queue to keep in sync). Either way,
  -- resolved once at assignment time, not re-derived later.
  question_set JSONB NOT NULL DEFAULT '[]'::JSONB,
  question_count INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT homework_assignments_selection_mode_check
    CHECK (selection_mode IN ('mixed', 'targeted', 'app', 'selected')),
  CONSTRAINT homework_assignments_question_count_nonnegative
    CHECK (question_count >= 0)
);

CREATE INDEX IF NOT EXISTS homework_assignments_teacher_index
  ON homework_assignments (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS homework_assignments_class_index
  ON homework_assignments (class_id);

-- Snapshots which students an assignment targeted AT ASSIGNMENT TIME —
-- deliberately not just "join on students.class_id" live, so a student
-- added to the class later doesn't retroactively appear to have overdue
-- homework assigned before they existed.
CREATE TABLE IF NOT EXISTS homework_assignment_students (
  assignment_id UUID NOT NULL
    REFERENCES homework_assignments(id)
    ON DELETE CASCADE,
  student_id UUID NOT NULL
    REFERENCES students(id)
    ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS homework_assignment_students_student_index
  ON homework_assignment_students (student_id);

COMMIT;
