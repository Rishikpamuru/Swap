const { initializeDatabase, ensureBaseSchema, runQuery, getOne, closeDatabase } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

async function addAdmin() {
  let db;

  try {
    console.log('🔐 Adding admin account...\n');

    db = await initializeDatabase();
    await ensureBaseSchema(db);

    // Check if admin already exists
    const existingAdmin = await getOne(db, 
      'SELECT u.id, u.username FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ?', 
      ['admin']
    );

    if (existingAdmin) {
      console.log('✅ Admin account already exists!');
      console.log(`   Username: ${existingAdmin.username}`);
      await closeDatabase(db);
      return;
    }

    // Create admin user
    const adminPassword = await hashPassword('Admin123!');
    const adminResult = await runQuery(db, `
      INSERT INTO users (username, email, password_hash, role_id, status)
      VALUES (?, ?, ?, 1, 'active')
    `, ['admin', 'admin@skillswap.edu', adminPassword]);

    await runQuery(db, `
      INSERT INTO user_profiles (user_id, full_name, bio, privacy_level)
      VALUES (?, ?, ?, ?)
    `, [
      adminResult.id,
      'System Administrator',
      'SkillSwap platform administrator',
      'public'
    ]);

    console.log('✅ Admin account created successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 Admin Credentials:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('  Email: admin@skillswap.edu');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Failed to add admin:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

if (require.main === module) {
  addAdmin();
}

module.exports = { addAdmin };
