require('dotenv').config();
const db = require('./src/config/database');

console.log('🔄 Migrating images table to allow NULL local_path...\n');

try {
    db.transaction(() => {
        // Create new images table with updated schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS images_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id INTEGER NOT NULL,
                original_url TEXT NOT NULL,
                local_path TEXT,
                file_size INTEGER,
                mime_type TEXT,
                width INTEGER,
                height INTEGER,
                download_success BOOLEAN DEFAULT 0,
                download_error TEXT,
                downloaded_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
            )
        `);

        // Copy existing data
        db.exec(`
            INSERT INTO images_new (id, email_id, original_url, local_path, file_size, mime_type, width, height, download_success, download_error, downloaded_at, created_at)
            SELECT id, email_id, original_url, local_path, file_size, mime_type, width, height, download_success, download_error, downloaded_at, created_at
            FROM images
        `);

        // Drop old table
        db.exec('DROP TABLE images');

        // Rename new table
        db.exec('ALTER TABLE images_new RENAME TO images');

        // Recreate indexes
        db.exec('CREATE INDEX IF NOT EXISTS idx_images_email ON images(email_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_images_url ON images(original_url)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_images_download_status ON images(download_success)');

        console.log('✅ Migration complete! Images table now allows NULL local_path for failed downloads.\n');
    })();

    // Verify the change
    const stats = db.get('SELECT COUNT(*) as count FROM images');
    console.log(`📊 Verified: ${stats.count} existing image records preserved.\n`);

    process.exit(0);
} catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
}
