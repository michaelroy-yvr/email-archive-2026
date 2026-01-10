require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n🏆 Adding Contest tag column to database...\n');

try {
    db.exec('BEGIN TRANSACTION');

    // Add contest tag column
    db.exec(`
        ALTER TABLE emails
        ADD COLUMN is_contest BOOLEAN DEFAULT 0
    `);

    db.exec('COMMIT');

    console.log('✅ Migration completed successfully!\n');
    console.log('Added column:');
    console.log('  - is_contest (boolean)');
    console.log('');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
