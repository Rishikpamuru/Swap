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

async function startServer() {
  try {
    // Initialize database
    database = await initializeDatabase();
    app.locals.db = database;

    // Lightweight migrations / optional tables
    await ensureExtendedSchema(database);
    
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
