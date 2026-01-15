/**
 * Authentication Middleware
 * BPA Web Application - SkillSwap
 * 
 * Handles user authentication, session validation, and role-based access control
 */

const bcrypt = require('bcryptjs');
const { getOne } = require('../config/database');

// Bcrypt configuration - 12 rounds for strong security
const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} - True if password matches
 */
async function comparePassword(password, hash) {
  try {
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    throw new Error('Password comparison failed');
  }
}

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, lowercase, number, special character
 * @param {string} password - Password to validate
 * @returns {object} - {valid: boolean, errors: string[]}
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * Requirements: 3-20 chars, alphanumeric and underscore only
 * @param {string} username - Username to validate
 * @returns {object} - {valid: boolean, errors: string[]}
 */
function validateUsername(username) {
  const errors = [];
  
  if (!username || username.length < 3 || username.length > 20) {
    errors.push('Username must be 3-20 characters long');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Middleware: Validate session and attach user to request
 */
function validateSession(req, res, next) {
  // Check if user is logged in
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }
  
  // Attach user ID to request for downstream use
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  
  next();
}

/**
 * Middleware: Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Attach user data for downstream handlers (mirrors validateSession)
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required. Insufficient permissions.'
    });
  }
  
  next();
}

/**
 * Middleware: Require specific permission
 * @param {string} permission - Permission to check
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    try {
      // Get user's role and permissions from database
      const db = req.app.locals.db;
      const user = await getOne(db, `
        SELECT u.*, r.permissions 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [req.session.userId]);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Parse permissions JSON
      const permissions = JSON.parse(user.permissions);
      
      // Check if user has required permission
      if (!permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Required: ${permission}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission validation failed'
      });
    }
  };
}

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if user owns resource or is admin
 * @param {number} resourceUserId - User ID who owns the resource
 * @param {object} req - Express request object
 * @returns {boolean} - True if authorized
 */
function isOwnerOrAdmin(resourceUserId, req) {
  return req.session.userId === resourceUserId || req.session.userRole === 'admin';
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  validateEmail,
  validateUsername,
  validateSession,
  requireAdmin,
  requirePermission,
  sanitizeInput,
  isOwnerOrAdmin
};
