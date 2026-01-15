/**
 * SkillSwap - Main Server Entry Point
 * BPA Web Application Team Competition
 * 
 * Secure, database-driven student talent exchange platform
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database initialization
const { initializeDatabase, ensureExtendedSchema } = require('./config/database');

// Middleware
const { logAudit } = require('./middleware/audit');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const sessionRoutes = require('./routes/sessions');
const offersRoutes = require('./routes/offers');
const messageRoutes = require('./routes/messages');
const ratingRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
    }
  }
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Messaging uses polling/search; allow a higher threshold there.
const messagesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Apply default limiter to all API routes except messaging
app.use('/api/', (req, res, next) => {
  if (req.path && req.path.startsWith('/messages')) {
    return next();
  }
  return limiter(req, res, next);
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management with cookies
app.use(session({
  secret: process.env.SESSION_SECRET || 'bpa-skillswap-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'skillswap.sid'
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization and server start
let database;

// Auto-seed database if empty (for Railway deployments)
async function autoSeedIfEmpty(db) {
  const { getOne, runQuery } = require('./config/database');
  const { hashPassword } = require('./middleware/auth');
  
  try {
    const existingUser = await getOne(db, 'SELECT id FROM users LIMIT 1');
    if (existingUser) {
      console.log('📊 Database already has data, skipping auto-seed');
      return;
    }
    
    console.log('🌱 Auto-seeding database with demo data...');
    
    // Create admin user
    const adminPassword = await hashPassword('Admin123!');
    const adminResult = await runQuery(db, `
      INSERT INTO users (username, email, password_hash, role_id, status)
      VALUES (?, ?, ?, 1, 'active')
    `, ['admin', 'admin@skillswap.edu', adminPassword]);
    
    await runQuery(db, `
      INSERT INTO user_profiles (user_id, full_name, bio, privacy_level, is_under_16)
      VALUES (?, ?, ?, ?, ?)
    `, [adminResult.id, 'System Administrator', 'SkillSwap platform administrator', 'public', 0]);
    
    // Create demo students
    const studentPassword = await hashPassword('Student123!');
    const students = [
      { username: 'alice_math', email: 'alice@skillswap.edu', name: 'Alice Johnson', bio: 'Math enthusiast' },
      { username: 'bob_coder', email: 'bob@skillswap.edu', name: 'Bob Martinez', bio: 'Python programmer' },
      { username: 'carol_artist', email: 'carol@skillswap.edu', name: 'Carol Smith', bio: 'Digital artist' },
      { username: 'david_music', email: 'david@skillswap.edu', name: 'David Chen', bio: 'Guitarist and tutor' },
      { username: 'emma_science', email: 'emma@skillswap.edu', name: 'Emma Williams', bio: 'Science tutor' }
    ];
    
    for (const s of students) {
      const result = await runQuery(db, `
        INSERT INTO users (username, email, password_hash, role_id, status)
        VALUES (?, ?, ?, 2, 'active')
      `, [s.username, s.email, studentPassword]);
      
      await runQuery(db, `
        INSERT INTO user_profiles (user_id, full_name, bio, privacy_level, is_under_16)
        VALUES (?, ?, ?, 'public', 0)
      `, [result.id, s.name, s.bio]);
    }
    
    console.log('✅ Auto-seed complete! Demo accounts ready.');
    console.log('   Admin: admin@skillswap.edu / Admin123!');
    console.log('   Students: alice@skillswap.edu / Student123! (and others)');
    
  } catch (err) {
    console.error('⚠️ Auto-seed error:', err.message);
  }
}

async function startServer() {
  try {
    // Initialize database
    database = await initializeDatabase();
    app.locals.db = database;

    // Lightweight migrations / optional tables
    await ensureExtendedSchema(database);
    
    // Auto-seed if database is empty (for Railway deployments)
    await autoSeedIfEmpty(database);
    
    // Audit logging middleware
    app.use(logAudit);
    
    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/skills', skillRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/offers', offersRoutes);
    app.use('/api/messages', messagesLimiter, messageRoutes);
    app.use('/api/ratings', ratingRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/ai', aiRoutes);
    
    // Serve SPA - all routes go to index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Error handling
    app.use((err, req, res, next) => {
      console.error('❌ Error:', err.message);
      res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
      });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🚀 SkillSwap Server Running');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('📝 To initialize database: node scripts/initDatabase.js');
      console.log('🌱 To add demo data: node scripts/seedData.js\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (database) {
    const { closeDatabase } = require('./config/database');
    closeDatabase(database).then(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

startServer();

module.exports = app;
