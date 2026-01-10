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

        // Get all unassigned emails
        const unassignedEmails = db.prepare(`
            SELECT id, from_address
            FROM emails
            WHERE organization_id IS NULL
        `).all();

        let assigned = 0;

        // Check each email for exact or subdomain match
        for (const email of unassignedEmails) {
            const emailDomain = extractDomain(email.from_address);
            if (!emailDomain) continue;

            const orgDomain = org.email_domain.toLowerCase();
            const fromDomain = emailDomain.toLowerCase();

            // Check for exact match or subdomain match
            // Exact: email@ndp.ca matches ndp.ca
            // Subdomain: email@action.ndp.ca matches ndp.ca (ends with .ndp.ca)
            const isExactMatch = fromDomain === orgDomain;
            const isSubdomainMatch = fromDomain.endsWith('.' + orgDomain);

            if (isExactMatch || isSubdomainMatch) {
                db.prepare(`
                    UPDATE emails
                    SET organization_id = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(org.id, email.id);
                assigned++;
            }
        }

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
