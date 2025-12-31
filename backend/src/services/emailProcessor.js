const db = require('../config/database');
const ImageDownloader = require('./imageDownloader');
const HtmlRewriter = require('./htmlRewriter');
const EmailDomainExtractor = require('../utils/emailDomainExtractor');

class EmailProcessor {
    constructor() {
        this.imageDownloader = new ImageDownloader(process.env.STORAGE_ROOT);
        this.htmlRewriter = new HtmlRewriter(process.env.IMAGE_BASE_URL);
        this.domainExtractor = new EmailDomainExtractor();
    }

    /**
     * Process a single email from Gmail message data
     * @param {object} gmailMessage - Gmail API message object
     * @returns {number} - Email ID in database
     */
    async processEmail(gmailMessage) {
        console.log(`\nProcessing email: ${gmailMessage.id}`);

        try {
            // 1. Extract email metadata and content
            const emailData = this.extractEmailData(gmailMessage);

            // Check if email already exists
            const existing = db.get(
                'SELECT id FROM emails WHERE gmail_message_id = ?',
                [emailData.gmailMessageId]
            );

            if (existing) {
                console.log(`Email ${gmailMessage.id} already exists (DB ID: ${existing.id})`);
                return existing.id;
            }

            // 2. Save email to database (without images initially)
            const emailId = await this.saveEmail(emailData);
            console.log(`Saved email to database (ID: ${emailId})`);

            // 3. Download images (if HTML content exists)
            if (emailData.htmlContent) {
                console.log('Downloading images...');
                const imageResults = await this.imageDownloader.downloadEmailImages(
                    emailId,
                    emailData.htmlContent
                );

                // 4. Save image metadata to database
                const imageMapping = await this.saveImages(emailId, imageResults);

                // 5. Rewrite HTML with local image URLs and disabled unsubscribe links
                console.log('Rewriting HTML...');
                const rewrittenHtml = this.htmlRewriter.rewriteHtml(
                    emailData.htmlContent,
                    imageMapping
                );

                // 6. Update email with rewritten HTML
                await this.updateEmailHtml(emailId, rewrittenHtml, imageResults);

                console.log(`✓ Email ${emailId} processed successfully`);
            } else {
                console.log('No HTML content to process');
            }

            return emailId;
        } catch (error) {
            console.error(`Error processing email ${gmailMessage.id}:`, error);
            throw error;
        }
    }

    /**
     * Extract email data from Gmail message
     * @param {object} gmailMessage - Gmail API message object
     * @returns {object} - Extracted email data
     */
    extractEmailData(gmailMessage) {
        const headers = gmailMessage.payload.headers;

        // Helper to get header value
        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : null;
        };

        // Extract HTML and text content
        let htmlContent = null;
        let textContent = null;

        const extractContent = (parts) => {
            if (!parts) return;

            for (const part of parts) {
                if (part.mimeType === 'text/html' && part.body.data) {
                    htmlContent = Buffer.from(part.body.data, 'base64').toString('utf8');
                } else if (part.mimeType === 'text/plain' && part.body.data) {
                    textContent = Buffer.from(part.body.data, 'base64').toString('utf8');
                } else if (part.parts) {
                    extractContent(part.parts);
                }
            }
        };

        if (gmailMessage.payload.parts) {
            extractContent(gmailMessage.payload.parts);
        } else if (gmailMessage.payload.body.data) {
            const content = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf8');
            if (gmailMessage.payload.mimeType === 'text/html') {
                htmlContent = content;
            } else {
                textContent = content;
            }
        }

        return {
            gmailMessageId: gmailMessage.id,
            gmailThreadId: gmailMessage.threadId,
            subject: getHeader('Subject'),
            fromAddress: this.parseEmail(getHeader('From')),
            fromName: this.parseName(getHeader('From')),
            toAddress: getHeader('To'),
            dateReceived: new Date(parseInt(gmailMessage.internalDate)),
            htmlContent,
            textContent,
            labels: JSON.stringify(gmailMessage.labelIds || [])
        };
    }

    /**
     * Parse email address from "Name <email@domain.com>" format
     * @param {string} fromHeader - From header value
     * @returns {string} - Email address
     */
    parseEmail(fromHeader) {
        if (!fromHeader) return '';
        const match = fromHeader.match(/<([^>]+)>/);
        return match ? match[1] : fromHeader;
    }

    /**
     * Parse name from "Name <email@domain.com>" format
     * @param {string} fromHeader - From header value
     * @returns {string} - Name
     */
    parseName(fromHeader) {
        if (!fromHeader) return '';
        const match = fromHeader.match(/^([^<]+)</);
        return match ? match[1].trim().replace(/"/g, '') : '';
    }

    /**
     * Find organization by email domain
     * @param {string} emailAddress - Email address to extract domain from
     * @returns {number|null} - Organization ID or null if not found
     */
    async findOrganizationByDomain(emailAddress) {
        try {
            const domain = this.domainExtractor.extractDomain(emailAddress);

            if (!domain) {
                return null;
            }

            const organization = db.get(
                'SELECT id FROM organizations WHERE email_domain = ? LIMIT 1',
                [domain]
            );

            return organization ? organization.id : null;
        } catch (error) {
            console.error(`Error finding organization for domain of ${emailAddress}:`, error);
            return null;
        }
    }

    /**
     * Save email to database
     * @param {object} emailData - Email data
     * @returns {number} - Email ID
     */
    async saveEmail(emailData) {
        // Find organization based on sender's email domain
        const organizationId = await this.findOrganizationByDomain(emailData.fromAddress);

        const result = db.run(`
            INSERT INTO emails (
                gmail_message_id, gmail_thread_id, subject, from_address, from_name,
                to_address, date_received, html_content, text_content, labels,
                has_images, organization_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            emailData.gmailMessageId,
            emailData.gmailThreadId,
            emailData.subject,
            emailData.fromAddress,
            emailData.fromName,
            emailData.toAddress,
            emailData.dateReceived.toISOString(),
            emailData.htmlContent,
            emailData.textContent,
            emailData.labels,
            emailData.htmlContent ? 1 : 0,
            organizationId
        ]);

        return result.lastID;
    }

    /**
     * Save image metadata to database
     * @param {number} emailId - Email ID
     * @param {Array} imageResults - Array of image download results
     * @returns {object} - Image mapping (original URL -> local path)
     */
    async saveImages(emailId, imageResults) {
        const imageMapping = {};

        for (const result of imageResults) {
            if (result.success && !result.skipped) {
                db.run(`
                    INSERT INTO images (
                        email_id, original_url, local_path, file_size,
                        mime_type, width, height, download_success, downloaded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                `, [
                    emailId,
                    result.originalUrl,
                    result.localPath,
                    result.fileSize,
                    result.mimeType,
                    result.width,
                    result.height
                ]);

                imageMapping[result.originalUrl] = result.localPath;
            } else if (!result.success && !result.skipped) {
                // Record failed download
                db.run(`
                    INSERT INTO images (
                        email_id, original_url, download_success, download_error
                    ) VALUES (?, ?, 0, ?)
                `, [emailId, result.originalUrl, result.error]);
            }
        }

        return imageMapping;
    }

    /**
     * Update email with rewritten HTML
     * @param {number} emailId - Email ID
     * @param {string} rewrittenHtml - Rewritten HTML content
     * @param {Array} imageResults - Array of image download results
     */
    async updateEmailHtml(emailId, rewrittenHtml, imageResults) {
        const successCount = imageResults.filter(r => r.success && !r.skipped).length;
        const totalCount = imageResults.filter(r => !r.skipped).length;

        db.run(`
            UPDATE emails
            SET rewritten_html_content = ?,
                images_downloaded = ?,
                image_download_attempts = image_download_attempts + 1,
                last_image_download_attempt = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            rewrittenHtml,
            successCount === totalCount ? 1 : 0,
            emailId
        ]);
    }

    /**
     * Get processing statistics
     * @returns {object} - Statistics
     */
    async getStats() {
        const emailCount = db.get('SELECT COUNT(*) as count FROM emails');
        const imageCount = db.get('SELECT COUNT(*) as count FROM images WHERE download_success = 1');
        const failedImages = db.get('SELECT COUNT(*) as count FROM images WHERE download_success = 0');

        return {
            totalEmails: emailCount.count,
            totalImages: imageCount.count,
            failedImages: failedImages.count
        };
    }
}

module.exports = EmailProcessor;
