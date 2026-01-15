const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const { getAll, getOne, runQuery, getDatabasePath } = require('../config/database');

// Configure multer for DB file uploads
const upload = multer({ 
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const users = await getAll(db, `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.status,
        u.created_at AS createdAt,
        COALESCE(p.full_name, '') AS fullName,
        COALESCE(p.privacy_level, 'public') AS privacyLevel,
        r.name AS role
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at DESC
    `);
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and all their sessions
 */
router.delete('/users/:id', async (req, res) => {
  const db = req.app.locals.db;
  const userId = parseInt(req.params.id);
  
  if (!userId || userId === req.userId) {
    return res.status(400).json({ success: false, message: 'Cannot delete yourself or invalid user ID' });
  }
  
  try {
    await runQuery(db, 'DELETE FROM sessions WHERE tutor_id = ? OR student_id = ?', [userId, userId]);
    
    await runQuery(db, 'DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ success: true, message: 'User and their sessions deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/sessions
 * Get all sessions - public (session_offers) and private (booked sessions)
 * Query params: ?type=public|private
 */
router.get('/sessions', async (req, res) => {
  const db = req.app.locals.db;
  const type = req.query.type || 'public';
  
  try {
    let sessions;
    
    if (type === 'public') {
      sessions = await getAll(db, `
        SELECT
          so.id,
          so.tutor_id AS tutorId,
          so.skill_id AS skillId,
          so.title,
          so.notes,
          so.location_type AS locationType,
          so.location,
          so.status,
          so.created_at AS createdAt,
          sk.skill_name AS skillName,
          tutor.username AS tutorUsername,
          COALESCE(tp.full_name, tutor.username) AS tutorFullName,
          (SELECT MIN(sos.scheduled_date) FROM session_offer_slots sos WHERE sos.offer_id = so.id) AS scheduledDate,
          (SELECT sos.duration FROM session_offer_slots sos WHERE sos.offer_id = so.id LIMIT 1) AS duration
        FROM session_offers so
        JOIN users tutor ON tutor.id = so.tutor_id
        JOIN skills sk ON sk.id = so.skill_id
        LEFT JOIN user_profiles tp ON tp.user_id = so.tutor_id
        WHERE so.status = 'open'
        ORDER BY so.created_at DESC
      `);
    } else {
      // Private sessions
      sessions = await getAll(db, `
        SELECT
          s.id,
          s.tutor_id AS tutorId,
          s.student_id AS studentId,
          s.skill_id AS skillId,
          s.scheduled_date AS scheduledDate,
          s.duration,
          s.location,
          s.status,
          s.notes,
          s.created_at AS createdAt,
          sk.skill_name AS skillName,
          tutor.username AS tutorUsername,
          COALESCE(tp.full_name, tutor.username) AS tutorFullName,
          student.username AS studentUsername,
          COALESCE(sp.full_name, student.username) AS studentFullName
        FROM sessions s
        JOIN users tutor ON tutor.id = s.tutor_id
        JOIN users student ON student.id = s.student_id
        JOIN skills sk ON sk.id = s.skill_id
        LEFT JOIN user_profiles tp ON tp.user_id = s.tutor_id
        LEFT JOIN user_profiles sp ON sp.user_id = s.student_id
        WHERE s.status != 'completed'
        ORDER BY datetime(s.scheduled_date) DESC
      `);
    }
    
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to load sessions' });
  }
});

/**
 * DELETE /api/admin/sessions/:id
 * Delete a session with reason
 * Body: { reason: string, type: 'public' | 'private' }
 */
router.delete('/sessions/:id', async (req, res) => {
  const db = req.app.locals.db;
  const sessionId = parseInt(req.params.id);
  const { reason, type } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }
  
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Reason is required' });
  }
  
  try {
    const adminId = req.userId;
    
    if (type === 'public') {
      const offer = await getOne(db, `
        SELECT 
          so.id,
          so.tutor_id AS tutorId,
          so.title,
          sk.skill_name AS skillName
        FROM session_offers so
        JOIN skills sk ON sk.id = so.skill_id
        WHERE so.id = ?
      `, [sessionId]);
      
      if (!offer) {
        return res.status(404).json({ success: false, message: 'Session offer not found' });
      }
      
      // Send message to tutor
      const tutorMessage = `Your session offer "${offer.title}" for "${offer.skillName}" has been removed by an administrator. Reason: ${reason}`;
      await runQuery(db, `
        INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
        VALUES (?, ?, ?, ?, 0)
      `, [adminId, offer.tutorId, 'Session Offer Removed', tutorMessage]);

      // Notify any students who requested/accepted this offer
      const requestStudents = await getAll(db, `
        SELECT DISTINCT student_id AS studentId
        FROM session_requests
        WHERE offer_id = ? AND status IN ('pending', 'accepted')
      `, [sessionId]);

      // Notify any students who already have a scheduled session created from this offer
      const sessionStudents = await getAll(db, `
        SELECT DISTINCT student_id AS studentId
        FROM sessions
        WHERE offer_id = ?
      `, [sessionId]);

      const studentIds = new Set();
      for (const r of requestStudents || []) if (r?.studentId) studentIds.add(Number(r.studentId));
      for (const r of sessionStudents || []) if (r?.studentId) studentIds.add(Number(r.studentId));

      if (studentIds.size > 0) {
        const studentMessage = `A session offer for "${offer.skillName}" ("${offer.title}") has been removed by an administrator. Any related requests have been cancelled.`;
        for (const sid of studentIds) {
          if (!sid) continue;
          await runQuery(db, `
            INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
            VALUES (?, ?, ?, ?, 0)
          `, [adminId, sid, 'Session Offer Removed', studentMessage]);
        }
      }

      // Cancel any scheduled sessions that were created from this offer
      await runQuery(db, `
        UPDATE sessions
        SET status = 'cancelled', offer_id = NULL, slot_id = NULL, is_group = 0
        WHERE offer_id = ? AND status = 'scheduled'
      `, [sessionId]);
      
      // Delete the session offer
      await runQuery(db, 'DELETE FROM session_offers WHERE id = ?', [sessionId]);
      
      res.json({ success: true, message: 'Session offer deleted and notification sent' });
      
    } else {
      // Delete private/booked session
      const session = await getOne(db, `
        SELECT 
          s.id,
          s.tutor_id AS tutorId,
          s.student_id AS studentId,
          s.scheduled_date AS scheduledDate,
          sk.skill_name AS skillName
        FROM sessions s
        JOIN skills sk ON sk.id = s.skill_id
        WHERE s.id = ?
      `, [sessionId]);
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      // Send message to tutor with reason
      const tutorMessage = `Your session for "${session.skillName}" scheduled on ${new Date(session.scheduledDate).toLocaleString()} has been deleted by an administrator.\n\nReason: ${reason}`;
      await runQuery(db, `
        INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
        VALUES (?, ?, ?, ?, 0)
      `, [adminId, session.tutorId, 'Session Deleted by Admin', tutorMessage]);
      
      // Send message to student without reason
      if (session.studentId) {
        const studentMessage = `A session for "${session.skillName}" scheduled on ${new Date(session.scheduledDate).toLocaleString()} has been deleted by an administrator.`;
        await runQuery(db, `
          INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
          VALUES (?, ?, ?, ?, 0)
        `, [adminId, session.studentId, 'Session Deleted by Admin', studentMessage]);
      }
      
      // Delete the session
      await runQuery(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
      
      res.json({ success: true, message: 'Session deleted and notifications sent' });
    }
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit trail with filters
 * Query params: ?limit=50&userId=123&action=LOGIN
 */
router.get('/audit-logs', async (req, res) => {
  const db = req.app.locals.db;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const userId = req.query.userId ? parseInt(req.query.userId) : null;
  const action = req.query.action || null;
  
  try {
    let sql = `
      SELECT 
        a.id,
        a.user_id AS userId,
        a.action,
        a.entity_type AS entityType,
        a.entity_id AS entityId,
        a.old_value AS oldValue,
        a.new_value AS newValue,
        a.ip_address AS ipAddress,
        a.user_agent AS userAgent,
        a.created_at AS createdAt,
        u.username,
        COALESCE(p.full_name, '') AS fullName
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN user_profiles p ON p.user_id = a.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      sql += ' AND a.user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      sql += ' AND a.action LIKE ?';
      params.push(`%${action}%`);
    }
    
    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(limit);
    
    const logs = await getAll(db, sql, params);
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to load audit logs' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Suspend or activate a user
 * Body: { status: 'active' | 'suspended' }
 */
router.put('/users/:id/status', async (req, res) => {
  const db = req.app.locals.db;
  const userId = parseInt(req.params.id);
  const { status } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  
  if (userId === req.userId) {
    return res.status(400).json({ success: false, message: 'Cannot change your own status' });
  }
  
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be "active" or "suspended"' });
  }
  
  try {
    const user = await getOne(db, 'SELECT id, username, status FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldStatus = user.status;
    
    await runQuery(db, 'UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    
    await runQuery(db, `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, ?, 'users', ?, ?, ?, ?, ?)
    `, [
      req.userId,
      status === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      userId,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status }),
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    ]);
    
    const action = status === 'suspended' ? 'suspended' : 'reactivated';
    const message = status === 'suspended' 
      ? 'Your account has been suspended by an administrator. Please contact support for more information.'
      : 'Your account has been reactivated. You can now log in and use the platform.';
    
    await runQuery(db, `
      INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
      VALUES (?, ?, ?, ?, 0)
    `, [req.userId, userId, `Account ${action.charAt(0).toUpperCase() + action.slice(1)}`, message]);
    
    res.json({ success: true, message: `User ${action} successfully` });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Change a user's role
 * Body: { roleId: number }
 */
router.put('/users/:id/role', async (req, res) => {
  const db = req.app.locals.db;
  const userId = parseInt(req.params.id);
  const { roleId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  
  if (userId === req.userId) {
    return res.status(400).json({ success: false, message: 'Cannot change your own role' });
  }
  
  if (!roleId || !Number.isInteger(roleId)) {
    return res.status(400).json({ success: false, message: 'Valid role ID required' });
  }
  
  try {
    // Verify role exists
    const role = await getOne(db, 'SELECT id, name FROM roles WHERE id = ?', [roleId]);
    
    if (!role) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    // Get current user info for audit
    const user = await getOne(db, `
      SELECT u.id, u.username, u.role_id, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON r.id = u.role_id 
      WHERE u.id = ?
    `, [userId]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldRoleId = user.role_id;
    const oldRoleName = user.role_name;
    
    // Update user role
    await runQuery(db, 'UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
    
    // Log the action
    await runQuery(db, `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, 'CHANGE_ROLE', 'users', ?, ?, ?, ?, ?)
    `, [
      req.userId,
      userId,
      JSON.stringify({ role_id: oldRoleId, role_name: oldRoleName }),
      JSON.stringify({ role_id: roleId, role_name: role.name }),
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    ]);
    
    await runQuery(db, `
      INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
      VALUES (?, ?, 'Role Updated', ?, 0)
    `, [req.userId, userId, `Your account role has been changed from "${oldRoleName}" to "${role.name}" by an administrator.`]);
    
    res.json({ success: true, message: `User role changed to ${role.name}` });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user information (full modify capability)
 * Body: { username?, email?, full_name?, bio?, school?, grade_level? }
 */
router.put('/users/:id', async (req, res) => {
  const db = req.app.locals.db;
  const userId = parseInt(req.params.id);
  const { username, email, full_name, bio, school, grade_level } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  
  try {
    // Get current user info for audit
    const user = await getOne(db, `
      SELECT u.id, u.username, u.email, p.full_name, p.bio, p.school, p.grade_level
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `, [userId]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldValues = { ...user };
    const updates = [];
    const userUpdates = [];
    const userParams = [];
    const profileUpdates = [];
    const profileParams = [];
    
    // User table updates
    if (username && username !== user.username) {
      // Check if username is taken
      const existing = await getOne(db, 'SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
      userUpdates.push('username = ?');
      userParams.push(username);
      updates.push('username');
    }
    
    if (email && email !== user.email) {
      // Check if email is taken
      const existing = await getOne(db, 'SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already taken' });
      }
      userUpdates.push('email = ?');
      userParams.push(email);
      updates.push('email');
    }
    
    // Profile table updates
    if (full_name !== undefined) {
      profileUpdates.push('full_name = ?');
      profileParams.push(full_name);
      updates.push('full_name');
    }
    
    if (bio !== undefined) {
      profileUpdates.push('bio = ?');
      profileParams.push(bio);
      updates.push('bio');
    }
    
    if (school !== undefined) {
      profileUpdates.push('school = ?');
      profileParams.push(school);
      updates.push('school');
    }
    
    if (grade_level !== undefined) {
      profileUpdates.push('grade_level = ?');
      profileParams.push(grade_level);
      updates.push('grade_level');
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }
    
    // Apply user updates
    if (userUpdates.length > 0) {
      userParams.push(userId);
      await runQuery(db, `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }
    
    // Apply profile updates
    if (profileUpdates.length > 0) {
      profileParams.push(userId);
      await runQuery(db, `UPDATE user_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`, profileParams);
    }
    
    // Log the action
    const newValues = { username, email, full_name, bio, school, grade_level };
    await runQuery(db, `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, 'MODIFY_USER', 'users', ?, ?, ?, ?, ?)
    `, [
      req.userId,
      userId,
      JSON.stringify(oldValues),
      JSON.stringify(newValues),
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    ]);
    
    res.json({ success: true, message: 'User updated successfully', updatedFields: updates });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

/**
 * GET /api/admin/roles
 * Get all available roles
 */
router.get('/roles', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const roles = await getAll(db, 'SELECT id, name, permissions FROM roles ORDER BY id');
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to load roles' });
  }
});

/**
 * GET /api/admin/skills
 * Get all skills with user information (who offers/seeks each skill)
 */
router.get('/skills', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Get all unique skill names with counts and user lists
    const skills = await getAll(db, `
      SELECT 
        s.skill_name AS skillName,
        s.skill_type AS skillType,
        u.id AS userId,
        u.username,
        COALESCE(p.full_name, u.username) AS fullName
      FROM skills s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      ORDER BY s.skill_name ASC, s.skill_type ASC
    `);
    
    // Group by skill name
    const skillMap = {};
    for (const row of skills) {
      const key = row.skillName.toLowerCase();
      if (!skillMap[key]) {
        skillMap[key] = {
          skillName: row.skillName,
          teaching: [],
          learning: []
        };
      }
      const userInfo = { userId: row.userId, username: row.username, fullName: row.fullName };
      if (row.skillType === 'offered') {
        skillMap[key].teaching.push(userInfo);
      } else {
        skillMap[key].learning.push(userInfo);
      }
    }
    
    // Convert to array and sort by total users
    const skillList = Object.values(skillMap).sort((a, b) => 
      (b.teaching.length + b.learning.length) - (a.teaching.length + a.learning.length)
    );
    
    res.json({ success: true, skills: skillList });
  } catch (error) {
    console.error('Get admin skills error:', error);
    res.status(500).json({ success: false, message: 'Failed to load skills' });
  }
});

/**
 * DELETE /api/admin/skills/:skillName
 * Delete all instances of a skill (for all users)
 */
router.delete('/skills/:skillName', async (req, res) => {
  const db = req.app.locals.db;
  const skillName = decodeURIComponent(req.params.skillName);
  
  if (!skillName || skillName.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Skill name is required' });
  }
  
  try {
    // Delete all skills with this name
    const result = await runQuery(db, `
      DELETE FROM skills WHERE LOWER(skill_name) = LOWER(?)
    `, [skillName]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Skill "${skillName}" deleted successfully (${result.changes} entries removed)` 
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete skill' });
  }
});

/**
 * GET /api/admin/database
 * View database tables and row counts (admin only)
 */
router.get('/database', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Get all tables
    const tables = await getAll(db, `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    const tableInfo = [];
    for (const t of tables) {
      const countResult = await getOne(db, `SELECT COUNT(*) as count FROM "${t.name}"`);
      tableInfo.push({
        name: t.name,
        rowCount: countResult?.count || 0
      });
    }
    
    res.json({ success: true, tables: tableInfo });
  } catch (error) {
    console.error('Database info error:', error);
    res.status(500).json({ success: false, message: 'Failed to get database info' });
  }
});

/**
 * GET /api/admin/database/:table
 * View rows from a specific table (admin only, limit 100)
 */
router.get('/database/:table', async (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.table;
  
  // Whitelist allowed tables to prevent SQL injection
  const allowedTables = ['users', 'user_profiles', 'roles', 'skills', 'skill_requests', 
                         'sessions', 'session_offers', 'session_offer_slots', 
                         'ratings', 'messages', 'achievements', 'audit_logs'];
  
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ success: false, message: 'Invalid table name' });
  }
  
  try {
    // Don't expose password hashes
    let query = `SELECT * FROM "${tableName}" LIMIT 100`;
    if (tableName === 'users') {
      query = `SELECT id, username, email, role_id, status, created_at, updated_at FROM users LIMIT 100`;
    }
    
    const rows = await getAll(db, query);
    res.json({ success: true, table: tableName, rows });
  } catch (error) {
    console.error('Table query error:', error);
    res.status(500).json({ success: false, message: 'Failed to query table' });
  }
});

/**
 * GET /api/admin/database/export
 * Download the entire database file
 */
router.get('/database-export', async (req, res) => {
  try {
    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found' });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `skillswap-backup-${timestamp}.db`;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Database export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export database' });
  }
});

/**
 * POST /api/admin/database-import
 * Upload and replace the database file
 */
router.post('/database-import', upload.single('database'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const uploadedPath = req.file.path;
    const dbPath = getDatabasePath();
    
    // Validate it's a SQLite file
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(uploadedPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    const sqliteHeader = 'SQLite format 3';
    if (!buffer.toString('utf8', 0, 15).startsWith(sqliteHeader.slice(0, 15))) {
      fs.unlinkSync(uploadedPath);
      return res.status(400).json({ success: false, message: 'Invalid SQLite database file' });
    }
    
    // Close current DB connection before replacing
    const db = req.app.locals.db;
    
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Backup current DB
    const backupPath = dbPath + '.backup-' + Date.now();
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }
    
    // Replace with uploaded file
    fs.copyFileSync(uploadedPath, dbPath);
    fs.unlinkSync(uploadedPath);
    
    res.json({ 
      success: true, 
      message: 'Database imported successfully. Server restart required.',
      backupCreated: backupPath
    });
    
    // Auto-restart after response
    setTimeout(() => {
      console.log(' Restarting server after database import...');
      process.exit(0);
    }, 1000);
    
  } catch (error) {
    console.error('Database import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import database: ' + error.message });
  }
});

module.exports = router;
