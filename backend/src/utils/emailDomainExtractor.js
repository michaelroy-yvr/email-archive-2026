/**
 * EmailDomainExtractor - Utility for extracting domain from email addresses
 */
class EmailDomainExtractor {
    /**
     * Extract domain from email address
     * @param {string} emailAddress - Email address (e.g., "user@example.com")
     * @returns {string|null} - Domain (e.g., "example.com") or null if invalid
     */
    extractDomain(emailAddress) {
        if (!emailAddress || typeof emailAddress !== 'string') {
            return null;
        }

        const atIndex = emailAddress.indexOf('@');
        if (atIndex === -1) {
            return null;
        }

        return emailAddress.substring(atIndex + 1).toLowerCase().trim();
    }
}

module.exports = EmailDomainExtractor;
