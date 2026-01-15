-- SkillSwap Database Schema
-- BPA Web Application Team Competition
-- SQLite Database Initialization Script

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- TABLE: roles
-- Purpose: Define user roles for RBAC
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL, -- JSON array of permissions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: users
-- Purpose: Core authentication and user data
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL DEFAULT 2, -- Default to student role
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, deleted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CHECK (status IN ('active', 'suspended', 'deleted')),
  CHECK (length(username) >= 3 AND length(username) <= 20),
  CHECK (email LIKE '%@%.%')
);

-- ============================================
-- TABLE: user_profiles
-- Purpose: Extended user profile information
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  full_name TEXT,
  school TEXT,
  grade_level TEXT,
  bio TEXT CHECK (length(bio) <= 500),
  profile_image TEXT,
  privacy_level TEXT DEFAULT 'public', -- public, friends, private
  is_under_16 INTEGER DEFAULT 0, -- 0 = no, 1 = yes (enables extra privacy)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (privacy_level IN ('public', 'friends', 'private'))
);

-- ============================================
-- TABLE: skills
-- Purpose: Skills offered or sought by users
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL, -- offered or sought
  proficiency TEXT, -- beginner, intermediate, expert
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (skill_type IN ('offered', 'sought')),
  CHECK (proficiency IN ('beginner', 'intermediate', 'expert', NULL))
);

-- ============================================
-- TABLE: skill_requests
-- Purpose: Requests for skill exchange
-- ============================================
CREATE TABLE IF NOT EXISTS skill_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  provider_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'accepted', 'declined')),
  CHECK (requester_id != provider_id)
);

-- ============================================
-- TABLE: sessions
-- Purpose: Scheduled skill exchange sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER,
  offer_id INTEGER, -- Link to a public session offer (if created from an offer)
  slot_id INTEGER, -- Link to the selected offer slot (if created from an offer)
  is_group INTEGER NOT NULL DEFAULT 0, -- 1 if this session is part of a group offer
  tutor_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  scheduled_date DATETIME NOT NULL,
  duration INTEGER, -- Duration in minutes
  location TEXT,
  meeting_link TEXT, -- Video/meeting link for online sessions
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (request_id) REFERENCES skill_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (offer_id) REFERENCES session_offers(id) ON DELETE SET NULL,
  FOREIGN KEY (slot_id) REFERENCES session_offer_slots(id) ON DELETE SET NULL,
  FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  CHECK (tutor_id != student_id),
  CHECK (duration > 0 OR duration IS NULL)
);

-- ============================================
-- TABLE: session_offers
-- Purpose: Public session offers with multiple date/time options
-- ============================================
CREATE TABLE IF NOT EXISTS session_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  location_type TEXT NOT NULL DEFAULT 'online', -- online, in-person
  location TEXT,
  is_group INTEGER NOT NULL DEFAULT 0, -- 0 = individual, 1 = group session
  max_participants INTEGER DEFAULT 1, -- max students for group sessions
  status TEXT NOT NULL DEFAULT 'open', -- open, closed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CHECK (status IN ('open', 'closed')),
  CHECK (location_type IN ('online', 'in-person')),
  CHECK (max_participants >= 1)
);

-- ============================================
-- TABLE: session_offer_slots
-- Purpose: Up to 5 date/time slots per offer
-- ============================================
CREATE TABLE IF NOT EXISTS session_offer_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL,
  scheduled_date DATETIME NOT NULL,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offer_id) REFERENCES session_offers(id) ON DELETE CASCADE,
  CHECK (duration > 0 OR duration IS NULL)
);

-- ============================================
-- TABLE: session_requests
-- Purpose: Students request a specific offer + chosen slot
-- ============================================
CREATE TABLE IF NOT EXISTS session_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  tutor_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offer_id) REFERENCES session_offers(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES session_offer_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  CHECK (tutor_id != student_id)
);

-- ============================================
-- TABLE: ratings
-- Purpose: Post-session ratings and feedback
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE, -- One rating per session
  rater_id INTEGER NOT NULL,
  rated_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (rating >= 1 AND rating <= 5),
  CHECK (rater_id != rated_id)
);

-- ============================================
-- TABLE: messages
-- Purpose: Internal messaging system
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  read_status INTEGER DEFAULT 0, -- 0 = unread, 1 = read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (read_status IN (0, 1)),
  CHECK (sender_id != receiver_id)
);

-- ============================================
-- TABLE: achievements
-- Purpose: Gamification badges
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_name TEXT NOT NULL,
  badge_type TEXT,
  description TEXT,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: audit_logs
-- Purpose: Admin action audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id, status);

-- Skills queries
CREATE INDEX IF NOT EXISTS idx_skills_user_type ON skills(user_id, skill_type);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name);

-- Session management
CREATE INDEX IF NOT EXISTS idx_sessions_tutor ON sessions(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(scheduled_date);

-- Session offers
CREATE INDEX IF NOT EXISTS idx_offers_tutor_status ON session_offers(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_offer_slots_offer ON session_offer_slots(offer_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_status ON session_requests(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_student_status ON session_requests(student_id, status);

-- Messaging
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Skill requests
CREATE INDEX IF NOT EXISTS idx_requests_provider ON skill_requests(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON skill_requests(requester_id, status);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- TRIGGERS for Auto-update timestamps
-- ============================================

-- Update users.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update user_profiles.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_profiles_timestamp 
AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update skill_requests.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_requests_timestamp 
AFTER UPDATE ON skill_requests
BEGIN
  UPDATE skill_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update session_offers.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_session_offers_timestamp
AFTER UPDATE ON session_offers
BEGIN
  UPDATE session_offers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update session_requests.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_session_requests_timestamp
AFTER UPDATE ON session_requests
BEGIN
  UPDATE session_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- View: User details with role information
CREATE VIEW IF NOT EXISTS v_user_details AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.status,
  r.name as role_name,
  p.full_name,
  p.school,
  p.grade_level,
  u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN user_profiles p ON u.id = p.user_id;

-- View: Session summary with participant details
CREATE VIEW IF NOT EXISTS v_session_summary AS
SELECT 
  s.id,
  s.scheduled_date,
  s.duration,
  s.status,
  sk.skill_name,
  tutor.username as tutor_username,
  student.username as student_username,
  s.created_at
FROM sessions s
JOIN skills sk ON s.skill_id = sk.id
JOIN users tutor ON s.tutor_id = tutor.id
JOIN users student ON s.student_id = student.id;

-- View: User rating statistics
CREATE VIEW IF NOT EXISTS v_user_ratings AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(r.id) as total_ratings,
  AVG(r.rating) as average_rating,
  MAX(r.rating) as highest_rating,
  MIN(r.rating) as lowest_rating
FROM users u
LEFT JOIN ratings r ON u.id = r.rated_id
GROUP BY u.id, u.username;

-- ============================================
-- END OF SCHEMA
-- ============================================
