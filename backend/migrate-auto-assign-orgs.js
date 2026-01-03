require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n🔄 Auto-assigning organizations to existing emails based on sender domain...\n');

/**
 * Extract domain from email address
 */
function extractDomain(emailAddress) {
    if (!emailAddress || typeof emailAddress !== 'string') {
        return null;
    }

    const match = emailAddress.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
}

try {
    db.exec('BEGIN TRANSACTION');

    // Get all organizations with email_domain set
    const organizations = db.prepare(`
        SELECT id, name, email_domain
        FROM organizations
        WHERE email_domain IS NOT NULL AND email_domain != ''
        ORDER BY name
    `).all();

    console.log(`Found ${organizations.length} organizations with email domains configured:\n`);

    let totalAssigned = 0;

    // For each organization, find and assign emails from that domain
    for (const org of organizations) {
        console.log(`📧 ${org.name} (${org.email_domain})`);

        // Find unassigned emails from this domain
        const result = db.prepare(`
            UPDATE emails
            SET organization_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE organization_id IS NULL
              AND LOWER(from_address) LIKE '%@' || LOWER(?)
        `).run(org.id, org.email_domain);

        const assigned = result.changes;
        totalAssigned += assigned;

        if (assigned > 0) {
            console.log(`   ✓ Assigned ${assigned} email(s)\n`);
        } else {
            console.log(`   - No unassigned emails found\n`);
        }
    }

    db.exec('COMMIT');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Total emails assigned: ${totalAssigned}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show summary stats
    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_emails,
            COUNT(organization_id) as assigned_emails,
            COUNT(*) - COUNT(organization_id) as unassigned_emails
        FROM emails
    `).get();

    console.log('Current Status:');
    console.log(`  Total emails: ${stats.total_emails.toLocaleString()}`);
    console.log(`  Assigned: ${stats.assigned_emails.toLocaleString()} (${((stats.assigned_emails / stats.total_emails) * 100).toFixed(1)}%)`);
    console.log(`  Unassigned: ${stats.unassigned_emails.toLocaleString()} (${((stats.unassigned_emails / stats.total_emails) * 100).toFixed(1)}%)\n`);

} catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
