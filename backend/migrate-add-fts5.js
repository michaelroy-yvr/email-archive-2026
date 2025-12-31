require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('Starting FTS5 migration...');

try {
    db.exec('BEGIN TRANSACTION');

    // Create FTS5 virtual table
    console.log('Creating FTS5 virtual table...');
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
            subject,
            text_content,
            from_name,
            content='emails',
            content_rowid='id',
            tokenize='unicode61'
        )
    `);

    // Populate FTS table with existing emails
    console.log('Populating FTS index with existing emails...');
    db.exec(`
        INSERT INTO emails_fts(rowid, subject, text_content, from_name)
        SELECT id, subject, COALESCE(text_content, ''), COALESCE(from_name, '')
        FROM emails
    `);

    // Create INSERT trigger
    console.log('Creating INSERT trigger...');
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS emails_fts_insert
        AFTER INSERT ON emails
        BEGIN
            INSERT INTO emails_fts(rowid, subject, text_content, from_name)
            VALUES (
                new.id,
                new.subject,
                COALESCE(new.text_content, ''),
                COALESCE(new.from_name, '')
            );
        END
    `);

    // Create UPDATE trigger
    console.log('Creating UPDATE trigger...');
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS emails_fts_update
        AFTER UPDATE ON emails
        BEGIN
            DELETE FROM emails_fts WHERE rowid = old.id;
            INSERT INTO emails_fts(rowid, subject, text_content, from_name)
            VALUES (
                new.id,
                new.subject,
                COALESCE(new.text_content, ''),
                COALESCE(new.from_name, '')
            );
        END
    `);

    // Create DELETE trigger
    console.log('Creating DELETE trigger...');
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS emails_fts_delete
        AFTER DELETE ON emails
        BEGIN
            DELETE FROM emails_fts WHERE rowid = old.id;
        END
    `);

    db.exec('COMMIT');

    // Verify migration
    const count = db.prepare('SELECT COUNT(*) as count FROM emails_fts').get();
    const emailCount = db.prepare('SELECT COUNT(*) as count FROM emails').get();

    console.log('');
    console.log('✅ FTS5 migration completed successfully!');
    console.log(`✓ Indexed ${count.count} emails`);
    console.log(`✓ Total emails in database: ${emailCount.count}`);
    console.log('');
    console.log('💡 FTS5 triggers created - new emails will be automatically indexed');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
