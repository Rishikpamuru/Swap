/**
 * Database Configuration and Connection
 * BPA Web Application - SkillSwap
 * 
 * SQLite database with proper error handling and security features
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const VOLUME_DB_PATH = process.env.DB_PATH;
const LOCAL_DB_PATH = path.join(__dirname, '..', 'skillswap.db');

// Railway volume mount settings
const VOLUME_WAIT_MAX_MS = 30000;  // Wait up to 30s for volume
const VOLUME_WAIT_INTERVAL_MS = 500;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if the volume directory is mounted and writable
 */
function isVolumeMounted(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, '.mount-test-' + Date.now());
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for volume mount (Railway mounts volumes after container start)
 */
async function waitForVolumeMount(dirPath) {
  const start = Date.now();
  console.log(`⏳ Waiting for volume mount at ${dirPath}...`);
  
  while (Date.now() - start < VOLUME_WAIT_MAX_MS) {
    if (isVolumeMounted(dirPath)) {
      console.log(`✅ Volume mounted and writable: ${dirPath}`);
      return true;
    }
    await sleep(VOLUME_WAIT_INTERVAL_MS);
  }
  
  console.log(`⚠️ Volume not mounted after ${VOLUME_WAIT_MAX_MS / 1000}s`);
  return false;
}

/**
 * Get the database path, waiting for volume if configured
 */
async function getDatabasePath() {
  if (VOLUME_DB_PATH) {
    const dbDir = path.dirname(VOLUME_DB_PATH);
    const mounted = await waitForVolumeMount(dbDir);
    if (mounted) {
      console.log(`📁 Using volume database: ${VOLUME_DB_PATH}`);
      return VOLUME_DB_PATH;
    }
    // Fall back to local only if volume never mounts
    console.log(`⚠️ Volume unavailable, using local database: ${LOCAL_DB_PATH}`);
    return LOCAL_DB_PATH;
  }
  console.log(`📁 Using local database: ${LOCAL_DB_PATH}`);
  return LOCAL_DB_PATH;
}

/**
 * Open SQLite database with retry on SQLITE_CANTOPEN
 */
function openDatabase(dbPath, retries = 5, delayMs = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          if (err.code === 'SQLITE_CANTOPEN' && remaining > 0) {
            console.log(`⏳ DB open failed, retrying in ${delayMs}ms... (${remaining} left)`);
            setTimeout(() => attempt(remaining - 1), delayMs);
          } else {
            console.error('Error connecting SQLITE_CANTOPEN:', err.message);
            reject(err);
          }
        } else {
          resolve(db);
        }
      });
    };
    attempt(retries);
  });
}

/**
 * Initialize database connection with proper configuration
 */
async function initializeDatabase() {
  const DB_PATH = await getDatabasePath();
  
  const db = await openDatabase(DB_PATH);
  console.log('✅ SQLite connected');
  console.log('📁 Database file:', DB_PATH);

  return new Promise((resolve, reject) => {
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
  });
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
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      CHECK (status IN ('open', 'closed')),
      CHECK (location_type IN ('online', 'in-person'))
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
        if (!hasMeetingLink) {
          db.run("ALTER TABLE sessions ADD COLUMN meeting_link TEXT", [], (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Failed to add meeting_link column:', err);
            }
            resolve();
          });
        } else {
          resolve();
        }
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
  ensureExtendedSchema,
  runQuery,
  getOne,
  getAll,
  closeDatabase,
  tablesExist,
  getDatabasePath
};
