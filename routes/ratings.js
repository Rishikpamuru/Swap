const express = require('express');
const router = express.Router();
const { validateSession } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../config/database');

router.use(validateSession);

/**
 * POST /api/ratings
 * Submit a rating for a completed session
 * Body: { sessionId, rating (1-5), feedback }
 */
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const { sessionId, rating, feedback } = req.body;

  // Validate inputs
  const sessionIdInt = Number.parseInt(String(sessionId), 10);
  const ratingInt = Number.parseInt(String(rating), 10);

  if (!Number.isFinite(sessionIdInt) || sessionIdInt < 1) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }
  if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  try {
    // Get the session
    const session = await getOne(db, 'SELECT id, tutor_id, student_id, status FROM sessions WHERE id = ?', [sessionIdInt]);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Session must be completed
    if (session.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed sessions' });
    }

    // User must be the student in this session (students rate tutors)
    if (Number(session.student_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Only the student can rate this session' });
    }

    // Check if already rated
    const existing = await getOne(db, 'SELECT id FROM ratings WHERE session_id = ?', [sessionIdInt]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'This session has already been rated' });
    }

    // Insert rating
    const result = await runQuery(db, `
      INSERT INTO ratings (session_id, rater_id, rated_id, rating, feedback)
      VALUES (?, ?, ?, ?, ?)
    `, [sessionIdInt, userId, session.tutor_id, ratingInt, feedback || null]);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      ratingId: result.id
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

/**
 * GET /api/ratings/session/:sessionId
 * Check if a session has been rated
 */
router.get('/session/:sessionId', async (req, res) => {
  const db = req.app.locals.db;
  const sessionId = Number.parseInt(req.params.sessionId, 10);

  if (!Number.isFinite(sessionId)) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }

  try {
    const rating = await getOne(db, 'SELECT * FROM ratings WHERE session_id = ?', [sessionId]);
    res.json({ success: true, rated: !!rating, rating: rating || null });
  } catch (error) {
    console.error('Rating check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check rating' });
  }
});

/**
 * GET /api/ratings/received
 * Fetch ratings/feedback received by the current user (tutor or student).
 * Query: limit (default 20, max 100)
 */
router.get('/received', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;

  const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20;

  try {
    const summary = await getOne(
      db,
      'SELECT ROUND(AVG(rating), 2) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE rated_id = ?',
      [userId]
    );

    const ratings = await getAll(
      db,
      `
        SELECT
          r.id,
          r.session_id AS sessionId,
          r.rating,
          r.feedback,
          r.created_at AS createdAt,
          u.id AS raterId,
          COALESCE(up.full_name, u.username) AS raterName
        FROM ratings r
        JOIN users u ON u.id = r.rater_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE r.rated_id = ?
        ORDER BY datetime(r.created_at) DESC, r.id DESC
        LIMIT ?
      `,
      [userId, limit]
    );

    res.json({
      success: true,
      avgRating: Number(summary?.avgRating || 0),
      totalRatings: Number(summary?.totalRatings || 0),
      ratings: Array.isArray(ratings) ? ratings : []
    });
  } catch (error) {
    console.error('Get received ratings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load feedback' });
  }
});

module.exports = router;
