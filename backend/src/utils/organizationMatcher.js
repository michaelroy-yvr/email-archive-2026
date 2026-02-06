const db = require('../config/database');

/**
 * Extract domain from email address
 * @param {string} emailAddress - Full email address (e.g., "hello@bcndp.ca")
 * @returns {string} - Domain (e.g., "bcndp.ca")
 */
function extractDomain(emailAddress) {
    if (!emailAddress || typeof emailAddress !== 'string') {
        return null;
    }

    const match = emailAddress.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
}

/**
 * Find organization ID by email domain
 * Supports exact domain matches and subdomain matches
 * @param {string} emailAddress - Email address to match
 * @returns {number|null} - Organization ID or null if no match
 */
function findOrganizationByDomain(emailAddress) {
    const domain = extractDomain(emailAddress);

    if (!domain) {
        return null;
    }

    // First try exact match (case-insensitive)
    let org = db.get(`
        SELECT id
        FROM organizations
        WHERE LOWER(email_domain) = LOWER(?)
        LIMIT 1
    `, [domain]);

    if (org) {
        return org.id;
    }

    // If no exact match, check for subdomain match
    // e.g., if org domain is "sherrodbrown.com" and email is from "e.sherrodbrown.com"
    const allOrgs = db.all(`
        SELECT id, email_domain
        FROM organizations
        WHERE email_domain IS NOT NULL AND email_domain != ''
    `);

    for (const organization of allOrgs) {
        const orgDomain = organization.email_domain.toLowerCase();
        const emailDomain = domain.toLowerCase();

        // Check if email domain ends with "." + org domain (subdomain match)
        if (emailDomain.endsWith('.' + orgDomain)) {
            return organization.id;
        }
    }

    return null;
}

/**
 * Auto-assign organization to email based on sender domain
 * @param {string} fromAddress - Sender email address
 * @returns {number|null} - Organization ID if matched, null otherwise
 */
function autoAssignOrganization(fromAddress) {
    return findOrganizationByDomain(fromAddress);
}

module.exports = {
    extractDomain,
    findOrganizationByDomain,
    autoAssignOrganization
};
