const gmailService = require('../services/gmailService');
const EmailProcessor = require('../services/emailProcessor');
const db = require('../config/database');

// Track sync status in memory
let currentSync = null;

/**
 * Start Gmail sync
 */
exports.startSync = async (req, res, next) => {
    try {
        // Check if sync is already running
        if (currentSync && currentSync.status === 'running') {
            return res.status(409).json({
                error: 'Sync already in progress',
                sync: currentSync
            });
        }

        // Check authentication
        if (!gmailService.isAuthenticated()) {
            return res.status(401).json({
                error: 'Not authenticated with Gmail',
                message: 'Please authenticate first via /api/auth/gmail/start'
            });
        }

        const maxEmails = parseInt(req.query.maxEmails) || 10;
        const query = req.query.query || 'category:promotions';

        // Initialize sync status
        currentSync = {
            status: 'running',
            startedAt: new Date(),
            emailsFetched: 0,
            emailsProcessed: 0,
            errors: []
        };

        // Create sync record in database
        const syncRecord = db.run(`
            INSERT INTO sync_status (
                sync_type, status, started_at
            ) VALUES (?, ?, ?)
        `, ['initial', 'running', currentSync.startedAt.toISOString()]);

        const syncId = syncRecord.lastID;

        // Send immediate response
        res.json({
            message: 'Sync started',
            syncId,
            maxEmails
        });

        // Start sync in background
        performSync(syncId, query, maxEmails).catch(error => {
            console.error('Sync error:', error);
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get sync status
 */
exports.getSyncStatus = async (req, res, next) => {
    try {
        // Get latest sync from database
        const latestSync = db.get(`
            SELECT * FROM sync_status
            ORDER BY id DESC
            LIMIT 1
        `);

        // Merge with in-memory status if sync is running
        const status = currentSync && currentSync.status === 'running'
            ? { ...latestSync, ...currentSync }
            : latestSync || { status: 'none' };

        res.json(status);
    } catch (error) {
        next(error);
    }
};

/**
 * Perform the actual sync (background process)
 */
async function performSync(syncId, query, maxEmails) {
    const processor = new EmailProcessor();

    try {
        // Fetch emails from Gmail
        console.log(`\nStarting sync: ${maxEmails} emails with query "${query}"`);
        const emailList = await gmailService.fetchEmailList(query, maxEmails);

        currentSync.emailsFetched = emailList.length;

        // Update database
        db.run(`
            UPDATE sync_status
            SET emails_fetched = ?
            WHERE id = ?
        `, [emailList.length, syncId]);

        // Process each email
        for (let i = 0; i < emailList.length; i++) {
            try {
                const emailRef = emailList[i];
                console.log(`\nProcessing email ${i + 1}/${emailList.length}: ${emailRef.id}`);

                // Get full email details
                const emailDetails = await gmailService.getEmailDetails(emailRef.id);

                // Process email
                await processor.processEmail(emailDetails);

                currentSync.emailsProcessed++;

                // Update database periodically
                if (currentSync.emailsProcessed % 5 === 0) {
                    db.run(`
                        UPDATE sync_status
                        SET emails_processed = ?
                        WHERE id = ?
                    `, [currentSync.emailsProcessed, syncId]);
                }

            } catch (error) {
                console.error(`Error processing email ${i + 1}:`, error);
                currentSync.errors.push({
                    emailIndex: i + 1,
                    error: error.message
                });
            }
        }

        // Mark sync as completed
        currentSync.status = 'completed';
        currentSync.completedAt = new Date();

        db.run(`
            UPDATE sync_status
            SET status = ?,
                completed_at = ?,
                emails_processed = ?
            WHERE id = ?
        `, ['completed', currentSync.completedAt.toISOString(), currentSync.emailsProcessed, syncId]);

        console.log(`\n✓ Sync completed: ${currentSync.emailsProcessed}/${currentSync.emailsFetched} emails processed`);

    } catch (error) {
        console.error('Sync failed:', error);

        currentSync.status = 'failed';
        currentSync.error = error.message;

        db.run(`
            UPDATE sync_status
            SET status = ?,
                error_message = ?
            WHERE id = ?
        `, ['failed', error.message, syncId]);
    }
}

module.exports = exports;
