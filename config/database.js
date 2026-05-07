/**
 * Database Configuration and Connection
 * BPA Web Application - SkillSwap
 *
 * SQLite database using better-sqlite3 (synchronous, no native glibc issues)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'skillswap.db');

console.log('📁 Database path:', DB_PATH);

function getDatabasePath() {
  return DB_PATH;
}

/**
 * Initialize database connection.
 * Returns a better-sqlite3 Database instance wrapped in a resolved Promise
 * so all callers that do `await initializeDatabase()` continue to work.
 */
async function initializeDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('✅ SQLite connected (better-sqlite3)');
  console.log('📁 Database file:', DB_PATH);
  console.log('🔑 Foreign key constraints enabled');
  return db;
}

/**
 * Ensure the core schema exists (users/roles/etc).
 */
async function ensureBaseSchema(db) {
  const exists = tablesExistSync(db);
  if (exists) return;

  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log('🧱 Core tables missing; initializing schema from:', schemaPath);
  executeSQLFileSync(db, schemaPath);

  const adminPermissions = JSON.stringify([
    'user.create', 'user.read', 'user.update', 'user.delete',
    'session.manage', 'message.moderate', 'report.view',
    'audit.view', 'admin.access'
  ]);
  const studentPermissions = JSON.stringify([
    'profile.manage', 'skill.manage', 'session.create',
    'message.send', 'rating.create'
  ]);

  db.prepare('INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)').run(1, 'admin', adminPermissions);
  db.prepare('INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)').run(2, 'student', studentPermissions);
}

/**
 * Execute a SQL file (synchronous helper).
 */
function executeSQLFileSync(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  db.exec(sql);
}

// Keep async variant for any callers that await it
async function executeSQLFile(db, filePath) {
  executeSQLFileSync(db, filePath);
}

/**
 * Ensure optional/extended tables exist (lightweight migrations).
 */
async function ensureExtendedSchema(db) {
  const sql = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS session_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tutor_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      location_type TEXT NOT NULL DEFAULT 'online',
      location TEXT,
      is_group INTEGER NOT NULL DEFAULT 0,
      max_participants INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      CHECK (status IN ('open', 'closed')),
      CHECK (location_type IN ('online', 'in-person')),
      CHECK (max_participants >= 1)
    );

    CREATE TABLE IF NOT EXISTS session_offer_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      scheduled_date DATETIME NOT NULL,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES session_offers(id) ON DELETE CASCADE,
      CHECK (duration > 0 OR duration IS NULL)
    );

    CREATE TABLE IF NOT EXISTS session_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL,
      tutor_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES session_offers(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES session_offer_slots(id) ON DELETE CASCADE,
      FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
      CHECK (tutor_id != student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_offers_tutor_status ON session_offers(tutor_id, status);
    CREATE INDEX IF NOT EXISTS idx_offer_slots_offer ON session_offer_slots(offer_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_status ON session_requests(tutor_id, status);
    CREATE INDEX IF NOT EXISTS idx_session_requests_student_status ON session_requests(student_id, status);

    CREATE TRIGGER IF NOT EXISTS update_session_offers_timestamp
    AFTER UPDATE ON session_offers
    BEGIN
      UPDATE session_offers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_session_requests_timestamp
    AFTER UPDATE ON session_requests
    BEGIN
      UPDATE session_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `;

  db.exec(sql);

  // Lightweight column migrations
  const addColIfMissing = (table, col, def) => {
    try {
      const cols = db.pragma(`table_info(${table})`);
      if (!cols.some(c => c.name === col)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
      }
    } catch (e) {
      if (!String(e.message).includes('duplicate column')) console.error(`Migration ${table}.${col}:`, e.message);
    }
  };

  addColIfMissing('sessions', 'meeting_link', 'TEXT');
  addColIfMissing('sessions', 'offer_id', 'INTEGER');
  addColIfMissing('sessions', 'slot_id', 'INTEGER');
  addColIfMissing('sessions', 'is_group', 'INTEGER NOT NULL DEFAULT 0');
  addColIfMissing('session_offers', 'is_group', 'INTEGER NOT NULL DEFAULT 0');
  addColIfMissing('session_offers', 'max_participants', 'INTEGER DEFAULT 1');
  addColIfMissing('user_profiles', 'school', 'TEXT');
  addColIfMissing('user_profiles', 'grade_level', 'TEXT');
}

/**
 * Run a single SQL query with parameters.
 * Returns { id, changes } to match the old sqlite3 behaviour.
 */
async function runQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return { id: result.lastInsertRowid, changes: result.changes };
}

/**
 * Get a single row from database.
 */
async function getOne(db, sql, params = []) {
  return db.prepare(sql).get(...params) ?? null;
}

/**
 * Get multiple rows from database.
 */
async function getAll(db, sql, params = []) {
  return db.prepare(sql).all(...params);
}

/**
 * Close database connection.
 */
async function closeDatabase(db) {
  db.close();
  console.log('📪 Database connection closed');
}

/**
 * Check if database tables exist (synchronous helper used internally).
 */
function tablesExistSync(db) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    return !!row;
  } catch {
    return false;
  }
}

async function tablesExist(db) {
  return tablesExistSync(db);
}

module.exports = {
  initializeDatabase,
  executeSQLFile,
  ensureBaseSchema,
  ensureExtendedSchema,
  runQuery,
  getOne,
  getAll,
  closeDatabase,
  tablesExist,
  getDatabasePath
};
