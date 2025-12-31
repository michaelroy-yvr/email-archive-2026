require('dotenv').config();
const db = require('./src/config/database');

console.log('🔄 Migrating organizations table to add labour_union type...\n');

try {
    // Temporarily disable foreign keys for migration
    db.exec('PRAGMA foreign_keys = OFF');

    db.transaction(() => {
        // Create new organizations table with updated schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS organizations_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email_domain TEXT,
                type TEXT CHECK(type IN ('nonprofit', 'charity', 'political', 'commercial', 'labour_union')) NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Copy existing data
        db.exec(`
            INSERT INTO organizations_new (id, name, email_domain, type, notes, created_at, updated_at)
            SELECT id, name, email_domain, type, notes, created_at, updated_at
            FROM organizations
        `);

        // Drop old table
        db.exec('DROP TABLE organizations');

        // Rename new table
        db.exec('ALTER TABLE organizations_new RENAME TO organizations');

        // Recreate indexes
        db.exec('CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(email_domain)');

        console.log('✅ Migration complete! Organizations table now supports labour_union type.\n');
    })();

    // Re-enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');

    // Verify the change
    const stats = db.get('SELECT COUNT(*) as count FROM organizations');
    console.log(`📊 Verified: ${stats.count} existing organization records preserved.\n`);

    process.exit(0);
} catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    // Re-enable foreign keys even on error
    db.exec('PRAGMA foreign_keys = ON');
    process.exit(1);
}
