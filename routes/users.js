/**
 * User Routes - Basic implementation
 * More routes can be added as needed
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getOne, getAll, runQuery } = require('../config/database');
const { validateProfile, sanitize } = require('../middleware/validation');
const { isOwnerOrAdmin, validateSession } = require('../middleware/auth');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * POST /api/users/profile/picture
 * Upload profile picture
 */
router.post('/profile/picture', validateSession, upload.single('profileImage'), async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const oldProfile = await getOne(db, 'SELECT profile_image FROM user_profiles WHERE user_id = ?', [req.userId]);
    
    const imageUrl = '/uploads/profiles/' + req.file.filename;
    
    await runQuery(db, 
      'UPDATE user_profiles SET profile_image = ? WHERE user_id = ?',
      [imageUrl, req.userId]
    );
    
    if (oldProfile && oldProfile.profile_image) {
      const oldImagePath = path.join(__dirname, '..', 'public', oldProfile.profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    res.json({ success: true, imageUrl, message: 'Profile picture updated successfully' });
  } catch (error) {
    console.error('Profile picture upload error:', error);

    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ success: false, message: error.message || 'Failed to upload profile picture' });
  }
});

/**
 * GET /api/users/search
 * Search users by skills or by name/username
 * Query params: q (search term), type ('skills' or 'users')
 */
router.get('/search', validateSession, async (req, res) => {
  const db = req.app.locals.db;
  const query = req.query.q || '';
  const searchType = req.query.type || 'skills'; // 'skills' or 'users'
  
  try {
    let users;
    
    if (searchType === 'users') {
      // Search by name or username
      users = await getAll(db, `
        SELECT DISTINCT
          u.id,
          u.username,
          COALESCE(p.full_name, '') AS fullName,
          COALESCE(p.bio, '') AS bio,
          COALESCE(p.school, '') AS school,
          GROUP_CONCAT(CASE WHEN s.skill_type = 'offered' THEN s.skill_name END) AS offeredSkills
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN skills s ON s.user_id = u.id
        WHERE u.status = 'active'
          AND u.id != ?
          AND (
            p.full_name LIKE ?
            OR u.username LIKE ?
          )
        GROUP BY u.id, u.username, p.full_name, p.bio, p.school
        LIMIT 50
      `, [req.userId, `%${query}%`, `%${query}%`]);
    } else {
      // Search by skills
      users = await getAll(db, `
        SELECT DISTINCT
          u.id,
          u.username,
          COALESCE(p.full_name, '') AS fullName,
          COALESCE(p.bio, '') AS bio,
          COALESCE(p.school, '') AS school,
          GROUP_CONCAT(CASE WHEN s.skill_type = 'offered' THEN s.skill_name END) AS offeredSkills
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN skills s ON s.user_id = u.id
        WHERE u.status = 'active'
          AND u.id != ?
          AND s.skill_name LIKE ?
          AND s.skill_type = 'offered'
        GROUP BY u.id, u.username, p.full_name, p.bio, p.school
        LIMIT 50
      `, [req.userId, `%${query}%`]);
    }
    
    // Split offeredSkills from comma-separated string to array
    const usersWithSkills = users.map(user => ({
      ...user,
      offeredSkills: user.offeredSkills ? user.offeredSkills.split(',') : []
    }));
    
    res.json({ success: true, users: usersWithSkills });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

/**
 * GET /api/users/offers
 * List users who offer at least one skill
 */
router.get('/offers', validateSession, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const users = await getAll(db, `
      SELECT
        u.id,
        u.username,
        COALESCE(p.full_name, '') AS fullName,
        COALESCE(p.bio, '') AS bio,
        COALESCE(p.school, '') AS school,
        COALESCE(p.profile_image, '') AS profileImage,
        GROUP_CONCAT(s.skill_name) AS skills
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      JOIN skills s ON s.user_id = u.id AND s.skill_type = 'offered'
      WHERE u.status = 'active'
        AND u.id != ?
      GROUP BY u.id, u.username, p.full_name, p.bio, p.school, p.profile_image
      ORDER BY COALESCE(p.full_name, u.username) ASC
      LIMIT 200
    `, [req.userId]);

    const usersWithSkills = users.map(user => ({
      ...user,
      skills: user.skills ? user.skills.split(',').filter(Boolean) : []
    }));

    res.json({ success: true, users: usersWithSkills });
  } catch (error) {
    console.error('List offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

/**
 * GET /api/users/requests
 * List users who are seeking (sought) at least one skill
 */
router.get('/requests', validateSession, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const users = await getAll(db, `
      SELECT
        u.id,
        u.username,
        COALESCE(p.full_name, '') AS fullName,
        COALESCE(p.bio, '') AS bio,
        COALESCE(p.school, '') AS school,
        COALESCE(p.profile_image, '') AS profileImage,
        GROUP_CONCAT(s.skill_name) AS skills
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      JOIN skills s ON s.user_id = u.id AND s.skill_type = 'sought'
      WHERE u.status = 'active'
        AND u.id != ?
      GROUP BY u.id, u.username, p.full_name, p.bio, p.school, p.profile_image
      ORDER BY COALESCE(p.full_name, u.username) ASC
      LIMIT 200
    `, [req.userId]);

    const usersWithSkills = users.map(user => ({
      ...user,
      skills: user.skills ? user.skills.split(',').filter(Boolean) : []
    }));

    res.json({ success: true, users: usersWithSkills });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

/**
 * GET /api/users/profile/:id
 * Get user profile
 */
router.get('/profile/:id', validateSession, async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const requestedId = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(requestedId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await getOne(db, `
      SELECT u.id, u.username, u.email, u.status, u.created_at,
             p.full_name, p.bio, p.profile_image, p.privacy_level,
             COALESCE(p.is_under_16, 0) as is_under_16, r.name as role
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [requestedId]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check privacy
    if (user.privacy_level === 'private' && !isOwnerOrAdmin(user.id, req)) {
      return res.status(403).json({ success: false, message: 'Profile is private' });
    }
    
    // Remove sensitive data if not owner/admin
    if (!isOwnerOrAdmin(user.id, req)) {
      delete user.email;
    }

    // Add skills + stats (same shape as auth login payload)
    const skills = await getAll(db, `
      SELECT skill_name, skill_type
      FROM skills
      WHERE user_id = ?
      ORDER BY created_at ASC
    `, [user.id]);
    const skillsOffer = skills.filter(s => s.skill_type === 'offered').map(s => s.skill_name);
    const skillsSeek = skills.filter(s => s.skill_type === 'sought').map(s => s.skill_name);

    const sessionCountRow = await getOne(db, `
      SELECT COUNT(DISTINCT
        CASE
          WHEN COALESCE(is_group, 0) = 1 AND offer_id IS NOT NULL AND slot_id IS NOT NULL
            THEN printf('g:%d:%d', offer_id, slot_id)
          ELSE printf('i:%d', id)
        END
      ) as cnt
      FROM sessions
      WHERE tutor_id = ? OR student_id = ?
    `, [user.id, user.id]);

    const ratingAvgRow = await getOne(db, `
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
      FROM ratings
      WHERE rated_id = ?
    `, [user.id]);

    const totalSessions = Number(sessionCountRow?.cnt || 0);
    const avg = ratingAvgRow?.avg_rating;
    const averageRating = avg ? Math.round(Number(avg) * 10) / 10 : 0;
    const totalRatings = Number(ratingAvgRow?.total_ratings || 0);

    // Get session offers for this user
    const sessionOffers = await getAll(db, `
      SELECT 
        so.id,
        so.title,
        so.notes,
        so.location_type AS locationType,
        so.location,
        so.status,
        sk.skill_name AS skillName,
        (SELECT MIN(sos.scheduled_date) FROM session_offer_slots sos WHERE sos.offer_id = so.id) AS nextSlot
      FROM session_offers so
      JOIN skills sk ON sk.id = so.skill_id
      WHERE so.tutor_id = ? AND so.status = 'open'
      ORDER BY so.created_at DESC
      LIMIT 10
    `, [user.id]);

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name || '',
      bio: user.bio || '',
      profileImage: user.profile_image || '',
      privacyLevel: user.privacy_level || 'public',
      isUnder16: user.is_under_16 === 1,
      status: user.status,
      dateJoined: user.created_at,
      skillsOffer,
      skillsSeek,
      totalSessions,
      averageRating,
      totalRatings,
      sessionOffers
    };
    
    res.json({ success: true, user: payload });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

/**
 * PUT /api/users/profile
 * Update own profile
 * Requires authentication
 */
router.put('/profile', validateSession, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  
  try {
    const validation = validateProfile(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const { full_name, bio, privacy_level, is_under_16 } = req.body;
    const isUnder16 = is_under_16 ? 1 : 0;
    
    await runQuery(db, `
      UPDATE user_profiles 
      SET full_name = ?, bio = ?, privacy_level = ?, is_under_16 = ?
      WHERE user_id = ?
    `, [full_name, bio, privacy_level, isUnder16, userId]);
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
