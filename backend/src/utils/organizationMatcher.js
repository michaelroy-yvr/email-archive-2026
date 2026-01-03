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
 * @param {string} emailAddress - Email address to match
 * @returns {number|null} - Organization ID or null if no match
 */
function findOrganizationByDomain(emailAddress) {
    const domain = extractDomain(emailAddress);

    if (!domain) {
        return null;
    }

    // Query organizations with matching email_domain
    const org = db.get(`
        SELECT id
        FROM organizations
        WHERE email_domain = ?
        LIMIT 1
    `, [domain]);

    return org ? org.id : null;
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
