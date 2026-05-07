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
  const db = req.db;
  try {
    const users = await getAll(db, `
      SELECT u.id, up.full_name as name, up.avatar_url as avatar
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      WHERE u.status = 'active'
    `);

    const skills = await getAll(db, `
      SELECT s.id, s.name, s.category,
        COUNT(DISTINCT us.user_id) as user_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id AND us.skill_type = 'offer'
      GROUP BY s.id
      HAVING user_count > 0
      ORDER BY user_count DESC
    `);

    const userSkills = await getAll(db, `
      SELECT us.user_id, us.skill_id, us.skill_type
      FROM user_skills us
      JOIN users u ON us.user_id = u.id
      WHERE u.status = 'active'
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
