require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('Backfilling NULL/empty from_name values...\n');

try {
    // Count emails with NULL or empty from_name
    const missingCount = db.prepare(`
        SELECT COUNT(*) as count FROM emails
        WHERE from_name IS NULL OR from_name = ''
    `).get();

    console.log(`Found ${missingCount.count} emails with NULL/empty from_name\n`);

    if (missingCount.count > 0) {
        db.exec('BEGIN TRANSACTION');

        // Update emails with NULL/empty from_name using email username as fallback
        // Convert "john.doe@example.com" -> "John Doe"
        const result = db.prepare(`
            UPDATE emails
            SET from_name = (
                SELECT
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                SUBSTR(from_address, 1, INSTR(from_address, '@') - 1),
                                '.', ' '
                            ),
                            '_', ' '
                        ),
                        '-', ' '
                    )
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE from_name IS NULL OR from_name = ''
        `).run();

        console.log(`Updated ${result.changes} emails with derived from_name\n`);

        db.exec('COMMIT');
    }

    // Add index on from_name for performance
    console.log('Creating index on from_name...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_from_name
        ON emails(from_name)
    `);

    // Also create a composite index for sender queries
    console.log('Creating composite index for sender queries...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_emails_sender_composite
        ON emails(from_name, from_address)
    `);

    console.log('\n✓ Migration completed successfully');
    console.log('\nChanges made:');
    console.log(`  - Backfilled ${missingCount.count} NULL/empty from_name values`);
    console.log('  - Created idx_emails_from_name index');
    console.log('  - Created idx_emails_sender_composite index');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
