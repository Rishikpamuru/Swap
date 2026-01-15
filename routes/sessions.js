const express = require('express');
const router = express.Router();

const { validateSession } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');

router.use(validateSession);

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/sessions
 * List sessions for logged-in user (as tutor or student)
 * Query params: ?role=tutor|student&status=scheduled|completed|cancelled
 */
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const role = req.query.role || 'all'; // tutor, student, all
  const status = req.query.status || 'all'; // scheduled, completed, cancelled, all

  try {
    let sql = `
      SELECT
        s.id,
        s.tutor_id AS tutorId,
        s.student_id AS studentId,
        s.skill_id AS skillId,
        s.scheduled_date AS scheduledDate,
        s.duration,
        s.location,
        s.meeting_link AS meetingLink,
        s.status,
        s.notes,
        s.created_at AS createdAt,
        s.completed_at AS completedAt,
        sk.skill_name AS skillName,
        tutor.username AS tutorUsername,
        COALESCE(tp.full_name, '') AS tutorFullName,
        tp.profile_image AS tutorProfileImage,
        student.username AS studentUsername,
        COALESCE(sp.full_name, '') AS studentFullName,
        sp.profile_image AS studentProfileImage,
        CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS hasRated
      FROM sessions s
      JOIN users tutor ON tutor.id = s.tutor_id
      JOIN users student ON student.id = s.student_id
      JOIN skills sk ON sk.id = s.skill_id
      LEFT JOIN user_profiles tp ON tp.user_id = s.tutor_id
      LEFT JOIN user_profiles sp ON sp.user_id = s.student_id
      LEFT JOIN ratings r ON r.session_id = s.id
      WHERE (s.tutor_id = ? OR s.student_id = ?)
    `;
    const params = [userId, userId];

    if (role === 'tutor') {
      sql += ' AND s.tutor_id = ?';
      params.push(userId);
    } else if (role === 'student') {
      sql += ' AND s.student_id = ?';
      params.push(userId);
    }

    if (status !== 'all') {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY datetime(s.scheduled_date) ASC';

    const sessions = await getAll(db, sql, params);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load sessions' });
  }
});

/**
 * POST /api/sessions
 * Create a new session (user is the tutor offering the skill)
 */
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const { studentId, skillId, scheduledDate, duration, location, notes } = req.body;

  const studentIdInt = toInt(studentId);
  const skillIdInt = toInt(skillId);
  const durationInt = toInt(duration);

  if (!studentIdInt) {
    return res.status(400).json({ success: false, message: 'Student ID is required' });
  }
  if (!skillIdInt) {
    return res.status(400).json({ success: false, message: 'Skill ID is required' });
  }
  if (!scheduledDate) {
    return res.status(400).json({ success: false, message: 'Scheduled date is required' });
  }

  try {
    // Verify skill exists and belongs to current user (offered)
    const skill = await getOne(db, 'SELECT id, user_id, skill_type FROM skills WHERE id = ?', [skillIdInt]);
    if (!skill || Number(skill.user_id) !== Number(userId) || skill.skill_type !== 'offered') {
      return res.status(400).json({ success: false, message: 'Invalid skill or you do not offer this skill' });
    }

    // Verify student exists
    const student = await getOne(db, 'SELECT id FROM users WHERE id = ? AND status = \'active\'', [studentIdInt]);
    if (!student || Number(student.id) === Number(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid student' });
    }

    const result = await runQuery(db, `
      INSERT INTO sessions (tutor_id, student_id, skill_id, scheduled_date, duration, location, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `, [userId, studentIdInt, skillIdInt, scheduledDate, durationInt, location || null, notes || null]);

    const session = await getOne(db, 'SELECT * FROM sessions WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, message: 'Session created', session });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
});

/**
 * POST /api/sessions/request
 * Request a session with another user (other user is tutor, you are student)
 */
router.post('/request', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const { tutorId, skillId, scheduledDate, duration, location, notes } = req.body;

  const tutorIdInt = toInt(tutorId);
  const skillIdInt = toInt(skillId);
  const durationInt = toInt(duration);

  if (!tutorIdInt) {
    return res.status(400).json({ success: false, message: 'Tutor ID is required' });
  }
  if (!skillIdInt) {
    return res.status(400).json({ success: false, message: 'Skill ID is required' });
  }
  if (!scheduledDate) {
    return res.status(400).json({ success: false, message: 'Scheduled date is required' });
  }

  try {
    // Verify skill exists and belongs to tutor (offered)
    const skill = await getOne(db, 'SELECT id, user_id, skill_type FROM skills WHERE id = ?', [skillIdInt]);
    if (!skill || Number(skill.user_id) !== Number(tutorIdInt) || skill.skill_type !== 'offered') {
      return res.status(400).json({ success: false, message: 'Invalid skill or tutor does not offer this skill' });
    }

    // Verify tutor exists
    const tutor = await getOne(db, 'SELECT id FROM users WHERE id = ? AND status = \'active\'', [tutorIdInt]);
    if (!tutor || Number(tutor.id) === Number(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid tutor' });
    }

    const result = await runQuery(db, `
      INSERT INTO sessions (tutor_id, student_id, skill_id, scheduled_date, duration, location, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `, [tutorIdInt, userId, skillIdInt, scheduledDate, durationInt, location || null, notes || null]);

    const session = await getOne(db, 'SELECT * FROM sessions WHERE id = ?', [result.id]);
    res.status(201).json({ success: true, message: 'Session requested', session });
  } catch (error) {
    console.error('Session request error:', error);
    res.status(500).json({ success: false, message: 'Failed to request session' });
  }
});

/**
 * GET /api/sessions/:id
 * Get details of a specific session
 */
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const sessionId = toInt(req.params.id);

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }

  try {
    const session = await getOne(db, `
      SELECT
        s.id,
        s.tutor_id AS tutorId,
        s.student_id AS studentId,
        s.skill_id AS skillId,
        s.scheduled_date AS scheduledDate,
        s.duration,
        s.location,
        s.meeting_link AS meetingLink,
        s.status,
        s.notes,
        s.created_at AS createdAt,
        s.completed_at AS completedAt,
        sk.skill_name AS skillName,
        tutor.username AS tutorUsername,
        COALESCE(tp.full_name, '') AS tutorFullName,
        tp.profile_image AS tutorProfileImage,
        student.username AS studentUsername,
        COALESCE(sp.full_name, '') AS studentFullName,
        sp.profile_image AS studentProfileImage
      FROM sessions s
      JOIN users tutor ON tutor.id = s.tutor_id
      JOIN users student ON student.id = s.student_id
      JOIN skills sk ON sk.id = s.skill_id
      LEFT JOIN user_profiles tp ON tp.user_id = s.tutor_id
      LEFT JOIN user_profiles sp ON sp.user_id = s.student_id
      WHERE s.id = ?
    `, [sessionId]);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Verify user is part of this session
    if (Number(session.tutorId) !== Number(userId) && Number(session.studentId) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Session details error:', error);
    res.status(500).json({ success: false, message: 'Failed to load session' });
  }
});

/**
 * PATCH /api/sessions/:id
 * Update session status (complete, cancel) or meeting link
 */
router.patch('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const sessionId = toInt(req.params.id);
  const { status, meetingLink } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }

  // If status is provided, validate it
  if (status && !['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const session = await getOne(db, 'SELECT id, tutor_id, student_id FROM sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Verify user is part of this session
    if (Number(session.tutor_id) !== Number(userId) && Number(session.student_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Handle meeting link update (only tutor can set meeting link)
    if (meetingLink !== undefined) {
      if (Number(session.tutor_id) !== Number(userId)) {
        return res.status(403).json({ success: false, message: 'Only the tutor can set the meeting link' });
      }
      await runQuery(db, 'UPDATE sessions SET meeting_link = ? WHERE id = ?', [meetingLink || null, sessionId]);
    }

    // Handle status update
    if (status) {
      if (status === 'completed') {
        await runQuery(db, 'UPDATE sessions SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, sessionId]);
      } else {
        await runQuery(db, 'UPDATE sessions SET status = ? WHERE id = ?', [status, sessionId]);
      }
    }

    const updated = await getOne(db, 'SELECT * FROM sessions WHERE id = ?', [sessionId]);
    res.json({ success: true, message: 'Session updated', session: updated });
  } catch (error) {
    console.error('Session update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update session' });
  }
});

module.exports = router;
