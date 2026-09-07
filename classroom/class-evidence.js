'use strict';

const { computeConceptMastery } = require('./mastery');

// Class-level question-selection evidence (per-skill percentages, recent
// question ids, recommended level) used by the "targeted"/class-priorities
// question-set strategy (classroom/question-set-builder.js). Extracted out
// of classroom-server.js so accounts/account-server.js's homework routes
// can build the identical "targeted" evidence Live Session rounds already
// use, without account-server.js depending on classroom-server.js (which
// itself already depends on account-server.js for buildCanonicalSkillEvidence
// — see that file's own require of this one).
//
// adaptersById/projectRoot are optional — only needed by
// loadConceptMasteryForStudents below (real per-student targeting), which
// only account-server.js's homework routes call today. classroom-server.js
// passes neither and never calls that function, so Live Session rounds are
// unaffected.
function createClassEvidenceLoader({ getPool, buildCanonicalSkillEvidence, adaptersById, projectRoot }) {
  async function resolveOwnedClass(teacher, classId) {
    const requestedClassId = String(classId || '').trim();
    if (!requestedClassId) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedClassId)) {
      const error = new Error('Choose a valid class.');
      error.statusCode = 400;
      throw error;
    }
    const result = await getPool().query(`
      SELECT id, class_name
      FROM classes
      WHERE id = $1
        AND teacher_id = $2
        AND active = TRUE
      LIMIT 1
    `, [requestedClassId, teacher.id]);
    if (!result.rows[0]) {
      const error = new Error('That class is not available to this teacher account.');
      error.statusCode = 403;
      throw error;
    }
    return result.rows[0];
  }

  async function loadClassQuestionEvidence(teacher, classId = '') {
    if (!teacher) return { skills: [], recentQuestionIds: [], studentCount: 0 };
    const selectedClass = classId ? await resolveOwnedClass(teacher, classId) : null;
    const values = [teacher.id];
    const classClause = selectedClass ? 'AND s.class_id = $2' : '';
    if (selectedClass) values.push(selectedClass.id);
    const progressModeEvidenceQuery = getPool().query(`
        SELECT pms.areas
        FROM progress_mode_summaries pms
        JOIN students s ON s.id = pms.student_id
        WHERE s.teacher_id = $1 AND s.active = TRUE ${classClause}
      `, values).catch((error) => {
        // Older classroom databases may not have received the additive
        // Progress Mode mirror migration yet. Class-priority rounds can still
        // use attempts and class membership without that optional evidence.
        if (error?.code === '42P01') return { rows: [] };
        throw error;
      });
    const [attemptResult, studentResult, progressModeResult] = await Promise.all([
      getPool().query(`
        SELECT a.student_id, a.question_id, a.module_id, a.score, a.maximum_score, a.answer_data, a.completed_at
        FROM attempts a
        JOIN students s ON s.id = a.student_id
        WHERE a.teacher_id = $1
          AND s.active = TRUE
          ${classClause}
        ORDER BY a.completed_at DESC
        LIMIT 2000
      `, values),
      getPool().query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.teacher_id = $1 AND s.active = TRUE ${classClause}
      `, values),
      progressModeEvidenceQuery
    ]);
    const attempts = attemptResult.rows;
    const aggregateSkills = buildCanonicalSkillEvidence(attempts);
    const attemptsByStudent = new Map();
    attempts.forEach((attempt) => {
      const studentId = String(attempt.student_id || '');
      if (!attemptsByStudent.has(studentId)) attemptsByStudent.set(studentId, []);
      attemptsByStudent.get(studentId).push(attempt);
    });
    const studentSkillPercentages = new Map();
    attemptsByStudent.forEach((studentAttempts) => {
      buildCanonicalSkillEvidence(studentAttempts).forEach((skill) => {
        if (!studentSkillPercentages.has(skill.skillCode)) studentSkillPercentages.set(skill.skillCode, []);
        studentSkillPercentages.get(skill.skillCode).push(skill.percentage);
      });
    });
    const skills = aggregateSkills.map((skill) => {
      const values = (studentSkillPercentages.get(skill.skillCode) || []).slice().sort((left, right) => left - right);
      if (!values.length) return skill;
      const median = values[Math.floor((values.length - 1) / 2)];
      const lowerQuartile = values[Math.floor((values.length - 1) * 0.25)];
      return {
        ...skill,
        aggregatePercentage: skill.percentage,
        medianPercentage: median,
        lowerQuartilePercentage: lowerQuartile,
        percentage: Math.round((median * 0.6) + (lowerQuartile * 0.4)),
        participatingStudents: values.length
      };
    });
    const progressModeAreas = progressModeResult.rows.flatMap((row) => Array.isArray(row.areas) ? row.areas : []);
    const areaLevels = progressModeAreas.map((area) => Number(area.level)).filter((level) => Number.isInteger(level) && level >= 0 && level <= 3).sort((left, right) => left - right);
    const recommendedLevel = areaLevels.length
      ? ['foundation', 'developing', 'securing', 'mastering'][areaLevels[Math.floor((areaLevels.length - 1) / 2)]]
      : '';
    return {
      skills,
      recentQuestionIds: Array.from(new Set(attempts.slice(0, 120).map((attempt) => String(attempt.question_id || '')).filter(Boolean))),
      studentCount: Number(studentResult.rows[0]?.count || 0),
      progressModeAreas,
      recommendedLevel
    };
  }

  // Real per-student targeting signal: each student's own progress_mode_reviews
  // history (already-computed SM-2 state, modules/progress-mode/store.js),
  // rolled up to concept mastery/due scores via classroom/mastery.js. This
  // is the piece loadClassQuestionEvidence deliberately does NOT have —
  // that function blends every student in a class into one shared
  // median/lower-quartile evidence object (correct for a shared Live
  // Session queue); this one keeps each student's signal separate, for
  // homework's per-student "Targeted" mode and Suggested Intervention.
  // Returns a Map<studentId, conceptMastery> — students with no review
  // history simply get an empty {} entry, not an error.
  async function loadConceptMasteryForStudents(teacherId, studentIds = []) {
    const ids = Array.from(new Set(studentIds.map((id) => String(id || '')).filter(Boolean)));
    const byStudent = new Map(ids.map((id) => [id, {}]));
    if (!ids.length) return byStudent;
    if (!adaptersById || !projectRoot) {
      throw new Error('loadConceptMasteryForStudents requires adaptersById/projectRoot to be configured on this loader.');
    }

    const result = await getPool().query(`
      SELECT student_id, source_key, question_signature, correct, ease_factor, interval_draws, repetitions, completed_at
      FROM progress_mode_reviews
      WHERE teacher_id = $1 AND student_id = ANY($2::uuid[])
      ORDER BY completed_at ASC
    `, [teacherId, ids]).catch((error) => {
      // Older classroom databases may not have received the additive
      // Progress Mode reviews migration yet — degrade to "no signal" rather
      // than fail the whole homework-assignment request.
      if (error?.code === '42P01') return { rows: [] };
      throw error;
    });

    const rowsByStudent = new Map();
    result.rows.forEach((row) => {
      const studentId = String(row.student_id || '');
      if (!rowsByStudent.has(studentId)) rowsByStudent.set(studentId, []);
      rowsByStudent.get(studentId).push(row);
    });
    rowsByStudent.forEach((rows, studentId) => {
      byStudent.set(studentId, computeConceptMastery(rows, adaptersById, projectRoot));
    });
    return byStudent;
  }

  return { resolveOwnedClass, loadClassQuestionEvidence, loadConceptMasteryForStudents };
}

module.exports = { createClassEvidenceLoader };
