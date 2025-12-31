const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GmailService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI
        );

        this.gmail = null;
        this.tokenPath = path.join(__dirname, '../../config/gmail-tokens.json');

        // Try to load existing tokens
        this.loadTokensIfExist();
    }

    /**
     * Load saved tokens if they exist
     */
    loadTokensIfExist() {
        try {
            if (fs.existsSync(this.tokenPath)) {
                const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
                this.oauth2Client.setCredentials(tokens);
                this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
                console.log('Gmail tokens loaded successfully');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading Gmail tokens:', error);
            return false;
        }
    }

    /**
     * Check if we have valid credentials
     */
    isAuthenticated() {
        return this.gmail !== null && this.oauth2Client.credentials.access_token;
    }

    /**
     * Generate OAuth URL for user authentication
     */
    getAuthUrl() {
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.readonly'],
            prompt: 'consent' // Force consent screen to get refresh token
        });

        console.log('Generated auth URL');
        return authUrl;
    }

    /**
     * Exchange authorization code for tokens
     */
    async authenticate(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Save tokens to file
            await this.saveTokens(tokens);

            // Initialize Gmail API client
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

            console.log('Gmail authentication successful');
            return true;
        } catch (error) {
            console.error('Gmail authentication error:', error);
            throw error;
        }
    }

    /**
     * Save tokens to file
     */
    async saveTokens(tokens) {
        try {
            const configDir = path.dirname(this.tokenPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
            console.log('Gmail tokens saved to:', this.tokenPath);
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    /**
     * Get user's email address
     */
    async getUserEmail() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await this.gmail.users.getProfile({
                userId: 'me'
            });

            return response.data.emailAddress;
        } catch (error) {
            console.error('Error getting user email:', error);
            throw error;
        }
    }

    /**
     * Fetch email list with query
     * @param {string} query - Gmail search query (e.g., 'category:promotions')
     * @param {number} maxResults - Maximum number of results
     */
    async fetchEmailList(query = 'category:promotions', maxResults = 100) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const emails = [];
            let pageToken = null;

            do {
                // Rate limiting: ~20ms delay
                await this.sleep(20);

                const response = await this.gmail.users.messages.list({
                    userId: 'me',
                    q: query,
                    maxResults: Math.min(maxResults - emails.length, 100),
                    pageToken: pageToken
                });

                if (response.data.messages) {
                    emails.push(...response.data.messages);
                }

                pageToken = response.data.nextPageToken;

            } while (pageToken && emails.length < maxResults);

            console.log(`Fetched ${emails.length} email IDs`);
            return emails;
        } catch (error) {
            console.error('Error fetching email list:', error);
            throw error;
        }
    }

    /**
     * Get full email details by message ID
     * @param {string} messageId - Gmail message ID
     */
    async getEmailDetails(messageId) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            // Rate limiting
            await this.sleep(20);

            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });

            return response.data;
        } catch (error) {
            console.error(`Error fetching email ${messageId}:`, error);
            throw error;
        }
    }

    /**
     * Get new emails using History API (for incremental sync)
     * @param {string} lastHistoryId - Last known history ID
     */
    async getNewEmails(lastHistoryId) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await this.gmail.users.history.list({
                userId: 'me',
                startHistoryId: lastHistoryId,
                historyTypes: ['messageAdded'],
                labelId: 'CATEGORY_PROMOTIONS'
            });

            if (!response.data.history) {
                return { messages: [], historyId: response.data.historyId };
            }

            const messageIds = new Set();
            response.data.history.forEach(record => {
                if (record.messagesAdded) {
                    record.messagesAdded.forEach(item => {
                        messageIds.add(item.message.id);
                    });
                }
            });

            return {
                messages: Array.from(messageIds),
                historyId: response.data.historyId
            };
        } catch (error) {
            console.error('Error fetching new emails:', error);
            throw error;
        }
    }

    /**
     * Utility: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const gmailService = new GmailService();

module.exports = gmailService;
