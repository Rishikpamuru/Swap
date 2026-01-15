/**
 * Reports Routes - Analytics and Statistics
 * BPA Web Application - SkillSwap
 * 
 * Provides comprehensive reports for admin dashboard
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { getAll, getOne } = require('../config/database');

// All reports require admin access
router.use(requireAdmin);

/**
 * GET /api/reports/dashboard
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // User Statistics
    const userStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspendedUsers,
        SUM(CASE WHEN role_id = 1 THEN 1 ELSE 0 END) as adminCount,
        SUM(CASE WHEN role_id = 2 THEN 1 ELSE 0 END) as studentCount,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as newToday,
        SUM(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 ELSE 0 END) as newThisWeek,
        SUM(CASE WHEN date(created_at) >= date('now', '-30 days') THEN 1 ELSE 0 END) as newThisMonth
      FROM users
    `);

    // Session Statistics
    const sessionStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalSessions,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduledSessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedSessions,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledSessions,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as sessionsToday,
        SUM(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 ELSE 0 END) as sessionsThisWeek,
        SUM(CASE WHEN date(created_at) >= date('now', '-30 days') THEN 1 ELSE 0 END) as sessionsThisMonth,
        ROUND(AVG(duration), 0) as avgDuration
      FROM sessions
    `);

    // Rating Statistics
    const ratingStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalRatings,
        ROUND(AVG(rating), 2) as averageRating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStarCount,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStarCount,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStarCount,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStarCount,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStarCount
      FROM ratings
    `);

    // Skill Statistics
    const skillStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalSkills,
        SUM(CASE WHEN skill_type = 'offered' THEN 1 ELSE 0 END) as offeredSkills,
        SUM(CASE WHEN skill_type = 'sought' THEN 1 ELSE 0 END) as soughtSkills,
        COUNT(DISTINCT skill_name) as uniqueSkills
      FROM skills
    `);

    // Message Statistics
    const messageStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalMessages,
        SUM(CASE WHEN read_status = 0 THEN 1 ELSE 0 END) as unreadMessages,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as messagesToday,
        SUM(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 ELSE 0 END) as messagesThisWeek
      FROM messages
    `);

    // Session Offer Statistics
    const offerStats = await getOne(db, `
      SELECT 
        COUNT(*) as totalOffers,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openOffers,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedOffers
      FROM session_offers
    `);

    res.json({
      success: true,
      stats: {
        users: userStats,
        sessions: sessionStats,
        ratings: ratingStats,
        skills: skillStats,
        messages: messageStats,
        offers: offerStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard statistics' });
  }
});

/**
 * GET /api/reports/users/growth
 * Get user registration over time (last 30 days)
 */
router.get('/users/growth', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const growth = await getAll(db, `
      SELECT 
        date(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: growth });
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({ success: false, message: 'Failed to load user growth data' });
  }
});

/**
 * GET /api/reports/sessions/activity
 * Get session activity over time (last 30 days)
 */
router.get('/sessions/activity', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const activity = await getAll(db, `
      SELECT 
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM sessions
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Session activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to load session activity data' });
  }
});

/**
 * GET /api/reports/skills/popular
 * Get most popular skills (offered and sought)
 */
router.get('/skills/popular', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const offeredSkills = await getAll(db, `
      SELECT 
        skill_name as name,
        COUNT(*) as count
      FROM skills
      WHERE skill_type = 'offered'
      GROUP BY skill_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const soughtSkills = await getAll(db, `
      SELECT 
        skill_name as name,
        COUNT(*) as count
      FROM skills
      WHERE skill_type = 'sought'
      GROUP BY skill_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Skills that are sought but not offered (opportunity gaps)
    const skillGaps = await getAll(db, `
      SELECT DISTINCT s1.skill_name as name, COUNT(*) as demandCount
      FROM skills s1
      WHERE s1.skill_type = 'sought'
        AND s1.skill_name NOT IN (
          SELECT DISTINCT skill_name FROM skills WHERE skill_type = 'offered'
        )
      GROUP BY s1.skill_name
      ORDER BY demandCount DESC
      LIMIT 5
    `);
    
    res.json({ 
      success: true, 
      data: { 
        offered: offeredSkills, 
        sought: soughtSkills,
        gaps: skillGaps
      } 
    });
  } catch (error) {
    console.error('Popular skills error:', error);
    res.status(500).json({ success: false, message: 'Failed to load skill data' });
  }
});

/**
 * GET /api/reports/tutors/top
 * Get top rated tutors
 */
router.get('/tutors/top', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const topTutors = await getAll(db, `
      SELECT 
        u.id,
        u.username,
        COALESCE(p.full_name, u.username) as fullName,
        ROUND(AVG(r.rating), 2) as avgRating,
        COUNT(r.id) as totalRatings,
        COUNT(DISTINCT s.id) as totalSessions
      FROM users u
      JOIN ratings r ON r.rated_id = u.id
      JOIN sessions s ON s.tutor_id = u.id AND s.status = 'completed'
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.status = 'active'
      GROUP BY u.id
      HAVING totalRatings >= 1
      ORDER BY avgRating DESC, totalRatings DESC
      LIMIT 10
    `);
    
    res.json({ success: true, data: topTutors });
  } catch (error) {
    console.error('Top tutors error:', error);
    res.status(500).json({ success: false, message: 'Failed to load top tutors' });
  }
});

/**
 * GET /api/reports/activity/recent
 * Get recent platform activity (audit log summary)
 */
router.get('/activity/recent', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const recentActivity = await getAll(db, `
      SELECT 
        a.id,
        a.action,
        a.entity_type as entityType,
        a.created_at as createdAt,
        u.username,
        COALESCE(p.full_name, u.username) as fullName
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN user_profiles p ON p.user_id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 20
    `);
    
    res.json({ success: true, data: recentActivity });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to load recent activity' });
  }
});

/**
 * GET /api/reports/ratings/distribution
 * Get rating distribution data
 */
router.get('/ratings/distribution', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const distribution = await getAll(db, `
      SELECT 
        rating,
        COUNT(*) as count
      FROM ratings
      GROUP BY rating
      ORDER BY rating DESC
    `);
    
    // Also get ratings over time
    const trend = await getAll(db, `
      SELECT 
        date(created_at) as date,
        ROUND(AVG(rating), 2) as avgRating,
        COUNT(*) as count
      FROM ratings
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: { distribution, trend } });
  } catch (error) {
    console.error('Rating distribution error:', error);
    res.status(500).json({ success: false, message: 'Failed to load rating data' });
  }
});

/**
 * GET /api/reports/engagement
 * Get user engagement metrics
 */
router.get('/engagement', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Users with profiles completed
    const profileCompletion = await getOne(db, `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.full_name IS NOT NULL AND p.full_name != '' AND p.bio IS NOT NULL AND p.bio != '' THEN 1 ELSE 0 END) as completed
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.status = 'active'
    `);
    
    // Users who have created sessions
    const sessionEngagement = await getOne(db, `
      SELECT 
        (SELECT COUNT(DISTINCT tutor_id) FROM sessions) as tutorsWithSessions,
        (SELECT COUNT(DISTINCT student_id) FROM sessions) as studentsWithSessions,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as totalActiveUsers
    `);
    
    // Users who have sent messages
    const messageEngagement = await getOne(db, `
      SELECT 
        COUNT(DISTINCT sender_id) as usersWhoMessaged
      FROM messages
    `);
    
    // Users with skills
    const skillEngagement = await getOne(db, `
      SELECT 
        COUNT(DISTINCT user_id) as usersWithSkills
      FROM skills
    `);
    
    res.json({ 
      success: true, 
      data: {
        profileCompletion: {
          total: profileCompletion.total || 0,
          completed: profileCompletion.completed || 0,
          percentage: profileCompletion.total > 0 
            ? Math.round((profileCompletion.completed / profileCompletion.total) * 100) 
            : 0
        },
        sessionEngagement: {
          tutors: sessionEngagement.tutorsWithSessions || 0,
          students: sessionEngagement.studentsWithSessions || 0,
          totalActive: sessionEngagement.totalActiveUsers || 0
        },
        messageEngagement: {
          usersWhoMessaged: messageEngagement.usersWhoMessaged || 0
        },
        skillEngagement: {
          usersWithSkills: skillEngagement.usersWithSkills || 0
        }
      }
    });
  } catch (error) {
    console.error('Engagement metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to load engagement data' });
  }
});

module.exports = router;
