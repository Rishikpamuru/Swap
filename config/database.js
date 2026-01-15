/**
 * Database Configuration and Connection
 * BPA Web Application - SkillSwap
 * 
 * SQLite database with proper error handling and security features
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Simple database path - uses local file
const DB_PATH = path.join(__dirname, '..', 'skillswap.db');

console.log('📁 Database path:', DB_PATH);

/**
 * Get the database file path
 */
function getDatabasePath() {
  return DB_PATH;
}

/**
 * Initialize database connection with proper configuration
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
      } else {
        console.log('✅ SQLite connected');
        console.log('📁 Database file:', DB_PATH);
        
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('❌ Error enabling foreign keys:', err.message);
            reject(err);
          } else {
            console.log('🔑 Foreign key constraints enabled');
            resolve(db);
          }
        });
      }
    });
  });
}

/**
 * Ensure the core schema exists (users/roles/etc).
 * If the database file was deleted or created empty, the app should self-heal.
 */
async function ensureBaseSchema(db) {
  const exists = await tablesExist(db);
  if (exists) return;

  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log('🧱 Core tables missing; initializing schema from:', schemaPath);
  await executeSQLFile(db, schemaPath);

  const adminPermissions = JSON.stringify([
    'user.create', 'user.read', 'user.update', 'user.delete',
    'session.manage', 'message.moderate', 'report.view',
    'audit.view', 'admin.access'
  ]);

  const studentPermissions = JSON.stringify([
    'profile.manage', 'skill.manage', 'session.create',
    'message.send', 'rating.create'
  ]);

  await runQuery(
    db,
    'INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)',
    [1, 'admin', adminPermissions]
  );

  await runQuery(
    db,
    'INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)',
    [2, 'student', studentPermissions]
  );
}

/**
 * Execute SQL file for database setup
 */
function executeSQLFile(db, filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, sql) => {
      if (err) {
        reject(err);
        return;
      }

      db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Ensure optional/extended tables exist (lightweight migrations).
 * Safe to run on every startup.
 */
function ensureExtendedSchema(db) {
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

  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      
      // Add meeting_link column to sessions table if it doesn't exist
      db.all("PRAGMA table_info(sessions)", [], (err, columns) => {
        if (err) return reject(err);
        
        const hasMeetingLink = columns.some(col => col.name === 'meeting_link');
        const addMeetingLink = () => {
          if (hasMeetingLink) return Promise.resolve();
          return new Promise((res) => {
            db.run("ALTER TABLE sessions ADD COLUMN meeting_link TEXT", [], (err) => {
              if (err && !String(err.message || '').includes('duplicate column')) {
                console.error('Failed to add meeting_link column:', err);
              }
              res();
            });
          });
        };

        const ensureSessionsColumns = () => {
          return new Promise((res, rej) => {
            db.all('PRAGMA table_info(sessions)', [], (err, cols) => {
              if (err) return rej(err);
              const names = new Set((cols || []).map(c => c.name));

              const pending = [];
              if (!names.has('offer_id')) pending.push('ALTER TABLE sessions ADD COLUMN offer_id INTEGER');
              if (!names.has('slot_id')) pending.push('ALTER TABLE sessions ADD COLUMN slot_id INTEGER');
              if (!names.has('is_group')) pending.push('ALTER TABLE sessions ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0');

              if (pending.length === 0) return res();

              const runNext = () => {
                const stmt = pending.shift();
                if (!stmt) return res();
                db.run(stmt, [], (err) => {
                  if (err && !String(err.message || '').includes('duplicate column')) {
                    console.error('Failed sessions migration:', err);
                  }
                  runNext();
                });
              };
              runNext();
            });
          });
        };

        const ensureSessionOfferColumns = () => {
          return new Promise((res, rej) => {
            db.all('PRAGMA table_info(session_offers)', [], (err, cols) => {
              if (err) return rej(err);
              const names = new Set((cols || []).map(c => c.name));

              const pending = [];
              if (!names.has('is_group')) pending.push('ALTER TABLE session_offers ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0');
              if (!names.has('max_participants')) pending.push('ALTER TABLE session_offers ADD COLUMN max_participants INTEGER DEFAULT 1');

              if (pending.length === 0) return res();

              const runNext = () => {
                const stmt = pending.shift();
                if (!stmt) return res();
                db.run(stmt, [], (err) => {
                  if (err && !String(err.message || '').includes('duplicate column')) {
                    console.error('Failed session_offers migration:', err);
                  }
                  runNext();
                });
              };
              runNext();
            });
          });
        };

        const ensureUserProfileColumns = () => {
          return new Promise((res, rej) => {
            db.all('PRAGMA table_info(user_profiles)', [], (err, cols) => {
              if (err) return rej(err);
              const names = new Set((cols || []).map(c => c.name));

              const pending = [];
              if (!names.has('school')) pending.push("ALTER TABLE user_profiles ADD COLUMN school TEXT");
              if (!names.has('grade_level')) pending.push("ALTER TABLE user_profiles ADD COLUMN grade_level TEXT");

              if (pending.length === 0) return res();

              // Run sequentially
              const runNext = () => {
                const stmt = pending.shift();
                if (!stmt) return res();
                db.run(stmt, [], (err) => {
                  if (err && !String(err.message || '').includes('duplicate column')) {
                    console.error('Failed user_profiles migration:', err);
                  }
                  runNext();
                });
              };
              runNext();
            });
          });
        };

        Promise.resolve()
          .then(addMeetingLink)
          .then(ensureSessionOfferColumns)
          .then(ensureSessionsColumns)
          .then(ensureUserProfileColumns)
          .then(() => resolve())
          .catch(reject);
      });
    });
  });
}

/**
 * Run a single SQL query with parameters
 */
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Get a single row from database
 */
function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Get multiple rows from database
 */
function getAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Close database connection
 */
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('📪 Database connection closed');
        resolve();
      }
    });
  });
}

/**
 * Check if database tables exist
 */
async function tablesExist(db) {
  try {
    const result = await getOne(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    return !!result;
  } catch (error) {
    return false;
  }
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
