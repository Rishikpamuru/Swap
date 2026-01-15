/**
 * Database Initialization Script
 * BPA Web Application - SkillSwap
 * 
 * This script creates all database tables and initial data
 */

const path = require('path');
const { initializeDatabase, executeSQLFile, runQuery, tablesExist, closeDatabase } = require('../config/database');

async function initDB() {
  let db;
  
  try {
    console.log('🚀 Starting database initialization...\n');
    
    // Initialize database connection
    db = await initializeDatabase();
    
    // Check if tables already exist
    const exists = await tablesExist(db);
    
    if (exists) {
      console.log('⚠️  Database tables already exist.');
      console.log('   To recreate, delete skillswap.db and run this script again.\n');
      await closeDatabase(db);
      return;
    }
    
    // Execute schema SQL file
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
    await executeSQLFile(db, schemaPath);
    console.log('✅ Schema created successfully\n');
    
    // Insert default roles
    console.log('👥 Creating default roles...');
    
    const adminPermissions = JSON.stringify([
      'user.create', 'user.read', 'user.update', 'user.delete',
      'session.manage', 'message.moderate', 'report.view',
      'audit.view', 'admin.access'
    ]);
    
    const studentPermissions = JSON.stringify([
      'profile.manage', 'skill.manage', 'session.create',
      'message.send', 'rating.create'
    ]);
    
    await runQuery(db, 
      'INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)',
      [1, 'admin', adminPermissions]
    );
    
    await runQuery(db,
      'INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)',
      [2, 'student', studentPermissions]
    );
    
    console.log('✅ Roles created: admin, student\n');
    
    console.log('🎉 Database initialization complete!');
    console.log('📝 Next steps:');
    console.log('   1. Run: node scripts/seedData.js (to add demo data)');
    console.log('   2. Run: npm start (to start the server)\n');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

// Run initialization if called directly
if (require.main === module) {
  initDB();
}

module.exports = { initDB };
