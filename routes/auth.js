/**
 * Authentication Routes
 * BPA Web Application - SkillSwap
 * 
 * Handles user registration, login, logout, and authentication
 */

const express = require('express');
const router = express.Router();
const { 
  hashPassword, 
  comparePassword, 
  validatePassword, 
  validateEmail, 
  validateUsername,
  sanitizeInput 
} = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { runQuery, getOne } = require('../config/database');
const { getAll } = require('../config/database');
const { createAuditLogger } = require('../middleware/audit');

async function buildUserPayload(db, userId) {
  const userRow = await getOne(db, `
    SELECT u.id, u.username, u.email, u.created_at, r.name as role_name,
           p.full_name, p.bio, p.profile_image
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `, [userId]);

  const skills = await getAll(db, `
    SELECT skill_name, skill_type
    FROM skills
    WHERE user_id = ?
    ORDER BY created_at ASC
  `, [userId]);

  const skillsOffer = skills.filter(s => s.skill_type === 'offered').map(s => s.skill_name);
  const skillsSeek = skills.filter(s => s.skill_type === 'sought').map(s => s.skill_name);

  const sessionCountRow = await getOne(db, `
    SELECT COUNT(*) as cnt
    FROM sessions
    WHERE tutor_id = ? OR student_id = ?
  `, [userId, userId]);

  const ratingAvgRow = await getOne(db, `
    SELECT AVG(rating) as avg_rating
    FROM ratings
    WHERE rated_id = ?
  `, [userId]);

  const totalSessions = Number(sessionCountRow?.cnt || 0);
  const avg = ratingAvgRow?.avg_rating;
  const averageRating = avg ? Math.round(Number(avg) * 10) / 10 : 0;

  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    role: userRow.role_name,
    fullName: userRow.full_name || '',
    bio: userRow.bio || '',
    profileImage: userRow.profile_image || null,
    skillsOffer,
    skillsSeek,
    totalSessions,
    averageRating,
    dateJoined: userRow.created_at
  };
}

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Validate input
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    const { username, email, password } = req.body;
    const fullName = (req.body.fullName || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim()).trim();
    const bio = (req.body.bio || '').trim();
    const skillsOffer = Array.isArray(req.body.skillsOffer)
      ? req.body.skillsOffer
      : typeof req.body.skillsOffer === 'string'
        ? req.body.skillsOffer.split(',')
        : [];
    const skillsSeek = Array.isArray(req.body.skillsSeek)
      ? req.body.skillsSeek
      : typeof req.body.skillsSeek === 'string'
        ? req.body.skillsSeek.split(',')
        : [];
    
    // Sanitize inputs
    const cleanUsername = sanitizeInput(username.trim());
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    
    // Check if username already exists
    const existingUser = await getOne(db, 
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [cleanUsername, cleanEmail]
    );
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Insert new user (role_id defaults to 2 = student)
    const result = await runQuery(db, `
      INSERT INTO users (username, email, password_hash, role_id, status)
      VALUES (?, ?, ?, 2, 'active')
    `, [cleanUsername, cleanEmail, passwordHash]);
    
    const userId = result.id;
    
    // Create profile for user
    await runQuery(db, `
      INSERT INTO user_profiles (user_id, full_name, bio, privacy_level)
      VALUES (?, ?, ?, 'public')
    `, [userId, fullName, bio]);

    // Insert skills
    const offerClean = skillsOffer.map(s => String(s).trim()).filter(Boolean);
    const seekClean = skillsSeek.map(s => String(s).trim()).filter(Boolean);

    for (const skill of offerClean) {
      await runQuery(db, `
        INSERT INTO skills (user_id, skill_name, skill_type)
        VALUES (?, ?, 'offered')
      `, [userId, skill]);
    }
    for (const skill of seekClean) {
      await runQuery(db, `
        INSERT INTO skills (user_id, skill_name, skill_type)
        VALUES (?, ?, 'sought')
      `, [userId, skill]);
    }
    
    // Log audit event
    const auditLog = createAuditLogger(db);
    await auditLog(userId, 'REGISTER', 'users', userId, null, 
      { username: cleanUsername, email: cleanEmail }, req);
    
    // Create session
    req.session.userId = userId;
    req.session.username = cleanUsername;
    req.session.userRole = 'student';
    
    const userPayload = await buildUserPayload(db, userId);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userPayload
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Validate input
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    const { username, password } = req.body;
    
    // Find user with role information
    const user = await getOne(db, `
      SELECT u.*, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = ?
    `, [username.trim()]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or inactive'
      });
    }
    
    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.userRole = user.role_name;
    
    // Log audit event
    const auditLog = createAuditLogger(db);
    await auditLog(user.id, 'LOGIN', 'users', user.id, null, 
      { username: user.username }, req);
    
    const userPayload = await buildUserPayload(db, user.id);
    res.json({
      success: true,
      message: 'Login successful',
      user: userPayload
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  const username = req.session.username;
  
  // Log audit event before destroying session
  if (userId && req.app.locals.db) {
    const db = req.app.locals.db;
    const auditLog = createAuditLogger(db);
    auditLog(userId, 'LOGOUT', 'users', userId, null, 
      { username }, req).catch(err => {
      console.error('Audit log error:', err);
    });
  }
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

/**
 * GET /api/auth/session
 * Check current session status
 */
router.get('/session', (req, res) => {
  (async () => {
    if (req.session && req.session.userId) {
      const db = req.app.locals.db;
      const userPayload = await buildUserPayload(db, req.session.userId);
      res.json({
        success: true,
        authenticated: true,
        user: userPayload
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  })().catch((error) => {
    console.error('Session check error:', error);
    res.status(500).json({
      success: false,
      message: 'Session check failed'
    });
  });
});

/**
 * POST /api/auth/change-password
 * Change user password (must be logged in)
 */
router.post('/change-password', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const db = req.app.locals.db;
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  try {
    // Validate new password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password',
        errors: passwordValidation.errors
      });
    }
    
    // Get current user
    const user = await getOne(db, 
      'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const passwordValid = await comparePassword(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    await runQuery(db,
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, user.id]
    );
    
    // Log audit event
    const auditLog = createAuditLogger(db);
    await auditLog(user.id, 'CHANGE_PASSWORD', 'users', user.id, null, 
      { message: 'Password changed' }, req);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

module.exports = router;
