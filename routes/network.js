const express = require('express');
const router = express.Router();
const { getAll } = require('../config/database');

function requireAuth(req, res) {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const db = req.app.locals.db;
  try {
    const users = await getAll(db, `
      SELECT u.id, up.full_name as name
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      WHERE u.status = 'active'
    `);

    // Unique offered skill names with tutor counts
    const skills = await getAll(db, `
      SELECT skill_name as name,
        COUNT(DISTINCT user_id) as user_count
      FROM skills
      WHERE skill_type IN ('offered', 'offer')
      GROUP BY skill_name
      ORDER BY user_count DESC
    `);

    // Which user offers which skill
    const userSkills = await getAll(db, `
      SELECT DISTINCT user_id, skill_name, skill_type
      FROM skills
      WHERE skill_type IN ('offered', 'offer')
    `);

    const sessions = await getAll(db, `
      SELECT DISTINCT tutor_id, student_id
      FROM sessions
      WHERE status IN ('completed', 'scheduled')
      LIMIT 300
    `);

    res.json({ success: true, data: { users, skills, userSkills, sessions } });
  } catch (err) {
    console.error('Network route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
