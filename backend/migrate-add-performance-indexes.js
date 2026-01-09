require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('Adding performance indexes...\n');

try {
    db.exec('BEGIN TRANSACTION');

    // 1. Composite index for email list filtering and sorting
    console.log('Creating idx_emails_org_date...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_org_date
        ON emails(organization_id, date_received DESC)
    `);

    // 2. Index for tag filtering
    console.log('Creating idx_emails_tags...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_tags
        ON emails(is_graphic_email, has_donation_matching, is_supporter_record)
        WHERE is_graphic_email = 1 OR has_donation_matching = 1 OR is_supporter_record = 1
    `);

    // 3. Index for favorite count sorting
    console.log('Creating idx_emails_favorite_count...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_favorite_count
        ON emails(favorite_count DESC)
        WHERE favorite_count > 0
    `);

    // 4. Composite index for analytics queries
    console.log('Creating idx_emails_date_org_analytics...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_date_org_analytics
        ON emails(date_received, organization_id)
    `);

    // 5. Covering index for image counts
    console.log('Creating idx_images_email_success_covering...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_images_email_success_covering
        ON images(email_id, download_success, id)
    `);

    db.exec('COMMIT');

    console.log('\n✓ Performance indexes created successfully');
    console.log('\nIndexes added:');
    console.log('  - idx_emails_org_date (organization filtering & sorting)');
    console.log('  - idx_emails_tags (tag filtering)');
    console.log('  - idx_emails_favorite_count (favorites sorting)');
    console.log('  - idx_emails_date_org_analytics (analytics queries)');
    console.log('  - idx_images_email_success_covering (image counts)');
    console.log('\nExpected performance improvement: 75-90% for most queries');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
