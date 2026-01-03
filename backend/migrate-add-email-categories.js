require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n📊 Adding email categorization columns to database...\n');

try {
    db.exec('BEGIN TRANSACTION');

    // Add primary category column
    db.exec(`
        ALTER TABLE emails
        ADD COLUMN category TEXT CHECK(category IN (
            'fundraising', 'event', 'newsletter', 'share', 'action', 'other'
        ))
    `);

    // Add content feature flags
    db.exec(`
        ALTER TABLE emails
        ADD COLUMN is_graphic_email BOOLEAN DEFAULT 0
    `);

    db.exec(`
        ALTER TABLE emails
        ADD COLUMN has_donation_matching BOOLEAN DEFAULT 0
    `);

    db.exec(`
        ALTER TABLE emails
        ADD COLUMN is_supporter_record BOOLEAN DEFAULT 0
    `);

    // Add classification metadata
    db.exec(`
        ALTER TABLE emails
        ADD COLUMN classified_at DATETIME
    `);

    db.exec(`
        ALTER TABLE emails
        ADD COLUMN classification_confidence REAL
    `);

    // Create index for category queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category)
    `);

    db.exec('COMMIT');

    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - category (fundraising, event, newsletter, share, action, other)');
    console.log('  - is_graphic_email (boolean)');
    console.log('  - has_donation_matching (boolean)');
    console.log('  - is_supporter_record (boolean)');
    console.log('  - classified_at (datetime)');
    console.log('  - classification_confidence (real)');
    console.log('\nCreated index: idx_emails_category\n');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
