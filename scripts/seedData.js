/**
 * Seed Data Script
 * BPA Web Application - SkillSwap
 * 
 * Creates demo data for presentation and testing
 */

const { initializeDatabase, runQuery, getOne, closeDatabase } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

async function seedData() {
  let db;

  try {
    console.log(' Starting data seeding...\n');

    // Initialize database connection
    db = await initializeDatabase();

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
      INSERT INTO user_profiles (user_id, full_name, bio, privacy_level, is_under_16)
      VALUES (?, ?, ?, ?, ?)
    `, [
      adminResult.id,
      'System Administrator',
      'SkillSwap platform administrator',
      'public',
      0
    ]);

    console.log('    Admin user created (username: admin, password: Admin123!)');

    // Create demo student users
    const students = [
      {
        username: 'alice_math',
        email: 'alice@skillswap.edu',
        full_name: 'Alice Johnson',
        bio: 'Math enthusiast looking to learn Spanish and teach calculus',
        is_under_16: 0
      },
      {
        username: 'bob_coder',
        email: 'bob@skillswap.edu',
        full_name: 'Bob Martinez',
        bio: 'Computer science student, teaching Python and seeking art lessons',
        is_under_16: 0
      },
      {
        username: 'carol_artist',
        email: 'carol@skillswap.edu',
        full_name: 'Carol Smith',
        bio: 'Digital artist offering design lessons, wants to learn coding',
        is_under_16: 1
      },
      {
        username: 'david_music',
        email: 'david@skillswap.edu',
        full_name: 'David Chen',
        bio: 'Guitarist and music theory tutor, interested in learning photography',
        is_under_16: 0
      },
      {
        username: 'emma_science',
        email: 'emma@skillswap.edu',
        full_name: 'Emma Williams',
        bio: 'Biology and chemistry tutor seeking creative writing help',
        is_under_16: 0
      }
    ];

    const studentPassword = await hashPassword('Student123!');
    const studentIds = [];

    for (const student of students) {
      const result = await runQuery(db, `
        INSERT INTO users (username, email, password_hash, role_id, status)
        VALUES (?, ?, ?, 2, 'active')
      `, [student.username, student.email, studentPassword]);

      studentIds.push(result.id);

      await runQuery(db, `
        INSERT INTO user_profiles (user_id, full_name, bio, privacy_level, is_under_16)
        VALUES (?, ?, ?, ?, ?)
      `, [result.id, student.full_name, student.bio, student.is_under_16 ? 'private' : 'public', student.is_under_16]);
    }

    console.log(`    ${students.length} student users created (password: Student123!)`);

    console.log('\n Creating skills...');

    // Skills for Alice (Math)
    await runQuery(db, `
      INSERT INTO skills (user_id, skill_name, skill_type, proficiency, description)
      VALUES 
        (?, 'Calculus', 'offered', 'expert', 'AP Calculus tutoring, derivatives, integrals'),
        (?, 'Algebra', 'offered', 'expert', 'Algebra I & II tutoring'),
        (?, 'Spanish', 'sought', 'beginner', 'Want to learn conversational Spanish')
    `, [studentIds[0], studentIds[0], studentIds[0]]);

    // Skills for Bob (Coding)
    await runQuery(db, `
      INSERT INTO skills (user_id, skill_name, skill_type, proficiency, description)
      VALUES 
        (?, 'Python Programming', 'offered', 'expert', 'Python basics to advanced, data structures'),
        (?, 'Web Development', 'offered', 'intermediate', 'HTML, CSS, JavaScript basics'),
        (?, 'Digital Art', 'sought', 'beginner', 'Want to learn digital illustration')
    `, [studentIds[1], studentIds[1], studentIds[1]]);

    // Skills for Carol (Art)
    await runQuery(db, `
      INSERT INTO skills (user_id, skill_name, skill_type, proficiency, description)
      VALUES 
        (?, 'Digital Art', 'offered', 'expert', 'Photoshop, Illustrator, digital painting'),
        (?, 'Graphic Design', 'offered', 'expert', 'Logo design, posters, branding'),
        (?, 'Python Programming', 'sought', 'beginner', 'Want to learn basic programming')
    `, [studentIds[2], studentIds[2], studentIds[2]]);

    // Skills for David (Music)
    await runQuery(db, `
      INSERT INTO skills (user_id, skill_name, skill_type, proficiency, description)
      VALUES 
        (?, 'Guitar', 'offered', 'expert', 'Acoustic and electric guitar lessons'),
        (?, 'Music Theory', 'offered', 'intermediate', 'Basic to intermediate theory'),
        (?, 'Photography', 'sought', 'beginner', 'Want to learn portrait photography')
    `, [studentIds[3], studentIds[3], studentIds[3]]);

    // Skills for Emma (Science)
    await runQuery(db, `
      INSERT INTO skills (user_id, skill_name, skill_type, proficiency, description)
      VALUES 
        (?, 'Biology', 'offered', 'expert', 'AP Biology tutoring, cell biology, genetics'),
        (?, 'Chemistry', 'offered', 'expert', 'General and organic chemistry tutoring'),
        (?, 'Creative Writing', 'sought', 'intermediate', 'Want to improve essay writing')
    `, [studentIds[4], studentIds[4], studentIds[4]]);

    console.log('    Skills created for all users');

    console.log('\n Creating skill requests and sessions...');

    // Bob requests Python help from Alice -> Accepted
    const request1 = await runQuery(db, `
      INSERT INTO skill_requests (requester_id, provider_id, skill_id, status, message)
      VALUES (?, ?, 1, 'accepted', 'Would love to learn calculus fundamentals!')
    `, [studentIds[1], studentIds[0]]);

    // Carol requests Python from Bob -> Accepted
    const request2 = await runQuery(db, `
      INSERT INTO skill_requests (requester_id, provider_id, skill_id, status, message)
      VALUES (?, ?, 4, 'accepted', 'Need help getting started with Python!')
    `, [studentIds[2], studentIds[1]]);

    // Bob requests Digital Art from Carol -> Pending
    await runQuery(db, `
      INSERT INTO skill_requests (requester_id, provider_id, skill_id, status, message)
      VALUES (?, ?, 7, 'pending', 'Interested in learning digital illustration!')
    `, [studentIds[1], studentIds[2]]);

    console.log('    Skill requests created');

    // Create completed session for request 1
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

    const session1 = await runQuery(db, `
      INSERT INTO sessions (request_id, tutor_id, student_id, skill_id, scheduled_date, duration, location, status, notes, completed_at)
      VALUES (?, ?, ?, 1, ?, 60, 'Library Study Room 3', 'completed', 'Great session! Covered derivatives.', ?)
    `, [request1.id, studentIds[0], studentIds[1], pastDate.toISOString(), pastDate.toISOString()]);

    // Create upcoming session for request 2
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

    await runQuery(db, `
      INSERT INTO sessions (request_id, tutor_id, student_id, skill_id, scheduled_date, duration, location, status, notes)
      VALUES (?, ?, ?, 4, ?, 90, 'Computer Lab B', 'scheduled', 'Introduction to Python basics')
    `, [request2.id, studentIds[1], studentIds[2], futureDate.toISOString()]);

    console.log('    Sessions created (1 completed, 1 upcoming)');

    console.log('\n⭐ Creating rating...');

    // Bob rates Alice after completed session
    await runQuery(db, `
      INSERT INTO ratings (session_id, rater_id, rated_id, rating, feedback)
      VALUES (?, ?, ?, 5, 'Alice is an excellent teacher! Explained calculus concepts clearly and patiently.')
    `, [session1.id, studentIds[1], studentIds[0]]);

    console.log('    Rating created');

    console.log('\n Creating messages...');

    // Messages between users
    await runQuery(db, `
      INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
      VALUES 
        (?, ?, 'Thanks for the session!', 'Hey Alice, thanks for the great calculus session yesterday. Looking forward to the next one!', 1),
        (?, ?, 'Re: Thanks for the session!', 'You''re welcome Bob! Happy to help. See you next week!', 1),
        (?, ?, 'Question about Python', 'Hi Bob, I have a question about the homework you assigned. Can we schedule a quick call?', 0)
    `, [
      studentIds[1], studentIds[0],
      studentIds[0], studentIds[1],
      studentIds[2], studentIds[1]
    ]);

    console.log('    Messages created');

    console.log('\n Creating achievements...');

    // Achievements for active users
    await runQuery(db, `
      INSERT INTO achievements (user_id, badge_name, badge_type, description)
      VALUES 
        (?, 'First Session', 'milestone', 'Completed your first tutoring session'),
        (?, 'Highly Rated', 'quality', 'Received a 5-star rating'),
        (?, 'First Session', 'milestone', 'Completed your first tutoring session')
    `, [studentIds[0], studentIds[0], studentIds[1]]);

    console.log('   Achievements created');

    console.log('\n Creating audit logs...');

    // Sample audit logs
    await runQuery(db, `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES 
        (1, 'LOGIN', 'users', 1, '{"username":"admin"}', '127.0.0.1'),
        (?, 'CREATE', 'sessions', ?, '{"status":"scheduled"}', '127.0.0.1'),
        (?, 'CREATE', 'ratings', 1, '{"rating":5}', '127.0.0.1')
    `, [studentIds[1], session1.id, studentIds[1]]);

    console.log('    Audit logs created');

    console.log('\n Data seeding complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(' Demo Accounts:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Admin Account:');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('');
    console.log('Student Accounts (all use password: Student123!):');
    console.log('  - alice_math    (Math tutor)');
    console.log('  - bob_coder     (Programming tutor)');
    console.log('  - carol_artist  (Art tutor)');
    console.log('  - david_music   (Music tutor)');
    console.log('  - emma_science  (Science tutor)');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(' Next step: Run "npm start" to start the server\n');

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
