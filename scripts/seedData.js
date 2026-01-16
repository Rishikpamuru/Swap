const { initializeDatabase, ensureBaseSchema, runQuery, getOne, closeDatabase } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

async function seedData() {
  let db;

  try {
    console.log(' Starting data seeding...\n');

    // Initialize database connection
    db = await initializeDatabase();

    // Ensure schema + default roles exist (safe no-op if already created)
    await ensureBaseSchema(db);

    // Check if data already exists
    const existingUser = await getOne(db, 'SELECT id FROM users LIMIT 1');
    if (existingUser) {
      console.log('  Database already contains data.');
      console.log('   Delete skillswap.db and reinitialize to reseed.\n');
      await closeDatabase(db);
      return;
    }

    console.log(' Creating users...');

    // Create demo admin user
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

    console.log('    Admin user created (username: admin, password: Admin123!)');

    // Optional: seed a single audit entry indicating seeding completed
    await runQuery(db, `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, 'SEED', 'users', ?, ?, '127.0.0.1')
    `, [
      adminResult.id,
      adminResult.id,
      JSON.stringify({ seeded: true, createdAdmin: true })
    ]);

    console.log('\n Data seeding complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(' Demo Account:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Admin Account:');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(' Next steps:');
    console.log('  1) Run "npm start" to start the server');
    console.log('  2) Create student accounts via Register page\n');

  } catch (error) {
    console.error(' Data seeding failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
