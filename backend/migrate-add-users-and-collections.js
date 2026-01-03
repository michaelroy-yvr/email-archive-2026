require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n👥 Adding users, favorites, and collections tables...\n');

try {
    db.exec('BEGIN TRANSACTION');

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Favorites table (tracks which users favorited which emails)
    db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(email_id, user_id)
        )
    `);

    // Add favorite_count column to emails table for performance (if it doesn't exist)
    const tableInfo = db.prepare('PRAGMA table_info(emails)').all();
    const hasFavoriteCount = tableInfo.some(col => col.name === 'favorite_count');

    if (!hasFavoriteCount) {
        db.exec(`
            ALTER TABLE emails
            ADD COLUMN favorite_count INTEGER DEFAULT 0
        `);
        console.log('✓ Added favorite_count column to emails table');
    } else {
        console.log('✓ favorite_count column already exists, skipping');
    }

    // Collections table
    db.exec(`
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Collection emails table (many-to-many relationship)
    db.exec(`
        CREATE TABLE IF NOT EXISTS collection_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            email_id INTEGER NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
            UNIQUE(collection_id, email_id)
        )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_email ON favorites(email_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_collection_emails_collection ON collection_emails(collection_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_collection_emails_email ON collection_emails(email_id)`);

    db.exec('COMMIT');

    console.log('✅ Migration completed successfully!\n');
    console.log('Created tables:');
    console.log('  - users (email, password_hash, name)');
    console.log('  - favorites (email_id, user_id)');
    console.log('  - collections (user_id, name, description)');
    console.log('  - collection_emails (collection_id, email_id)');
    console.log('\nAdded column:');
    console.log('  - emails.favorite_count (for performance)');
    console.log('\nCreated 5 indexes for query performance\n');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
