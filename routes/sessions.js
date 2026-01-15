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
        s.offer_id AS offerId,
        s.slot_id AS slotId,
        COALESCE(s.is_group, 0) AS isGroup,
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

    const rows = await getAll(db, sql, params);

    // Group tutor-side group sessions so they behave like a single card in the UI.
    // Student-side stays per-student.
    const grouped = [];
    const groupMap = new Map();

    for (const s of rows || []) {
      const isTutorSide = Number(s.tutorId) === Number(userId);
      const isGroup = Number(s.isGroup) === 1 && s.offerId != null && s.slotId != null;

      if (!isTutorSide || !isGroup) {
        grouped.push(s);
        continue;
      }

      const key = `${s.offerId}:${s.slotId}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          base: s,
          participants: []
        });
      }

      const entry = groupMap.get(key);
      entry.participants.push({
        id: s.studentId,
        name: (s.studentFullName || s.studentUsername || '').trim(),
        username: (s.studentUsername || '').trim()
      });
    }

    for (const [_, entry] of groupMap.entries()) {
      const base = entry.base;
      const participants = entry.participants || [];

      // Derive a single status/meetingLink for the group card
      const allRows = rows.filter(r => Number(r.isGroup) === 1 && Number(r.offerId) === Number(base.offerId) && Number(r.slotId) === Number(base.slotId) && Number(r.tutorId) === Number(userId));
      const meetingLink = allRows.find(r => r.meetingLink)?.meetingLink || base.meetingLink || null;
      const statusSet = new Set(allRows.map(r => String(r.status || '')));
      const status = statusSet.has('scheduled') ? 'scheduled' : (statusSet.has('completed') ? 'completed' : 'cancelled');

      grouped.push({
        ...base,
        meetingLink,
        status,
        studentId: null,
        studentUsername: '',
        studentFullName: `${participants.length} students`,
        studentProfileImage: '',
        groupParticipantCount: participants.length,
        groupParticipantNames: participants.map(p => p.name || p.username).filter(Boolean)
      });
    }

    // Keep ordering stable
    grouped.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    res.json({ success: true, sessions: grouped });
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
    // Verify skill exists and belongs to current user
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
    // Verify skill exists and belongs to tutor
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
    const session = await getOne(db, 'SELECT id, tutor_id, student_id, offer_id, slot_id, COALESCE(is_group, 0) AS is_group FROM sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Verify user is part of this session
    if (Number(session.tutor_id) !== Number(userId) && Number(session.student_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const isTutorSide = Number(session.tutor_id) === Number(userId);
    const isGroupSession = Number(session.is_group) === 1 && session.offer_id != null && session.slot_id != null;

    // Handle meeting link update
    if (meetingLink !== undefined) {
      if (!isTutorSide) {
        return res.status(403).json({ success: false, message: 'Only the tutor can set the meeting link' });
      }
      if (isGroupSession) {
        await runQuery(db, 'UPDATE sessions SET meeting_link = ? WHERE tutor_id = ? AND offer_id = ? AND slot_id = ?', [meetingLink || null, userId, session.offer_id, session.slot_id]);
      } else {
        await runQuery(db, 'UPDATE sessions SET meeting_link = ? WHERE id = ?', [meetingLink || null, sessionId]);
      }
    }

    // Handle status update
    if (status) {
      const applyToGroup = isGroupSession && isTutorSide;
      if (status === 'completed') {
        if (applyToGroup) {
          await runQuery(db, 'UPDATE sessions SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE tutor_id = ? AND offer_id = ? AND slot_id = ?', [status, userId, session.offer_id, session.slot_id]);
        } else {
          await runQuery(db, 'UPDATE sessions SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, sessionId]);
        }
      } else {
        if (applyToGroup) {
          await runQuery(db, 'UPDATE sessions SET status = ? WHERE tutor_id = ? AND offer_id = ? AND slot_id = ?', [status, userId, session.offer_id, session.slot_id]);
        } else {
          await runQuery(db, 'UPDATE sessions SET status = ? WHERE id = ?', [status, sessionId]);
        }
      }

      // Send system message on cancellation
      if (status === 'cancelled') {
        const sessionDetails = await getOne(db, `
          SELECT s.*, sk.skill_name AS skillName
          FROM sessions s
          JOIN skills sk ON sk.id = s.skill_id
          WHERE s.id = ?
        `, [sessionId]);

        const isCancelledByTutor = isTutorSide;
        const scheduledDate = sessionDetails?.scheduled_date 
          ? new Date(sessionDetails.scheduled_date).toLocaleString()
          : 'the scheduled time';
        const skillName = sessionDetails?.skillName || 'the session';

        const cancelMessage = `A session for "${skillName}" scheduled on ${scheduledDate} has been cancelled by the ${isCancelledByTutor ? 'tutor' : 'student'}.`;

        if (isGroupSession && isCancelledByTutor) {
          const students = await getAll(db, `
            SELECT DISTINCT student_id AS studentId
            FROM sessions
            WHERE tutor_id = ? AND offer_id = ? AND slot_id = ?
          `, [userId, session.offer_id, session.slot_id]);

          for (const row of students || []) {
            if (!row?.studentId) continue;
            await runQuery(db, `
              INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
              VALUES (?, ?, ?, ?, 0)
            `, [userId, row.studentId, 'Session Cancelled', cancelMessage]);
          }
        } else {
          const otherUserId = isCancelledByTutor ? session.student_id : session.tutor_id;
          await runQuery(db, `
            INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
            VALUES (?, ?, ?, ?, 0)
          `, [userId, otherUserId, 'Session Cancelled', cancelMessage]);
        }
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
