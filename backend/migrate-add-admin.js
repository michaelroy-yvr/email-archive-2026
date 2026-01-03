require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n👑 Adding admin system...\n');

try {
    db.exec('BEGIN TRANSACTION');

    // Check if is_admin column exists
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const hasIsAdmin = tableInfo.some(col => col.name === 'is_admin');

    if (!hasIsAdmin) {
        // Add is_admin column to users table
        db.exec(`
            ALTER TABLE users
            ADD COLUMN is_admin INTEGER DEFAULT 0
        `);
        console.log('✓ Added is_admin column to users table');
    } else {
        console.log('✓ is_admin column already exists, skipping');
    }

    // Update mikelroy@gmail.com to be admin
    const result = db.prepare(`
        UPDATE users
        SET is_admin = 1
        WHERE email = ?
    `).run('mikelroy@gmail.com');

    if (result.changes > 0) {
        console.log('✓ Set mikelroy@gmail.com as admin user');
    } else {
        console.log('⚠ User mikelroy@gmail.com not found - will be set as admin on first registration');
    }

    db.exec('COMMIT');

    console.log('\n✅ Admin system migration completed successfully!\n');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
