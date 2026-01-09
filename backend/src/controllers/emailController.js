const db = require('../config/database');
const { highlightSearchResults } = require('../utils/searchHighlight');

/**
 * List emails with pagination and filters
 */
exports.list = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let whereClause = [];
        let params = [];

        // Filter by organization
        if (req.query.organizationId) {
            whereClause.push('e.organization_id = ?');
            params.push(req.query.organizationId);
        }

        // Filter by unassigned (no organization)
        if (req.query.unassigned === 'true') {
            whereClause.push('e.organization_id IS NULL');
        }

        // Filter by organization type
        if (req.query.organizationType) {
            whereClause.push('o.type = ?');
            params.push(req.query.organizationType);
        }

        // Filter by email category
        if (req.query.category) {
            whereClause.push('e.category = ?');
            params.push(req.query.category);
        }

        // Filter by tags
        if (req.query.isGraphicEmail === 'true') {
            whereClause.push('e.is_graphic_email = 1');
        }

        if (req.query.hasDonationMatching === 'true') {
            whereClause.push('e.has_donation_matching = 1');
        }

        if (req.query.isSupporterRecord === 'true') {
            whereClause.push('e.is_supporter_record = 1');
        }

        // Filter by date range
        if (req.query.startDate) {
            whereClause.push('e.date_received >= ?');
            params.push(req.query.startDate);
        }

        if (req.query.endDate) {
            whereClause.push('e.date_received <= ?');
            params.push(req.query.endDate);
        }

        // Filter by sender
        if (req.query.from) {
            whereClause.push('(e.from_address LIKE ? OR e.from_name LIKE ?)');
            params.push(`%${req.query.from}%`, `%${req.query.from}%`);
        }

        // Full-text search using FTS5
        if (req.query.fulltext) {
            // Use FTS5 for full-text search across subject, body, and sender
            whereClause.push(`e.id IN (
                SELECT rowid FROM emails_fts
                WHERE emails_fts MATCH ?
                ORDER BY rank
            )`);
            params.push(req.query.fulltext);
        }
        // Fallback to simple LIKE search in subject only
        else if (req.query.search) {
            whereClause.push('e.subject LIKE ?');
            params.push(`%${req.query.search}%`);
        }

        const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        // Get emails (image_count removed for performance - not displayed in UI anyway)
        let emails = db.all(`
            SELECT
                e.id,
                e.gmail_message_id,
                e.subject,
                e.from_address,
                e.from_name,
                e.date_received,
                e.has_images,
                e.images_downloaded,
                e.text_content,
                e.category,
                e.is_graphic_email,
                e.has_donation_matching,
                e.is_supporter_record,
                e.classification_confidence,
                o.name as organization_name,
                o.type as organization_type
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            ORDER BY e.date_received DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Generate snippets for all emails
        emails = emails.map(email => {
            let snippet;

            if (req.query.fulltext) {
                // Use highlighting for search results
                snippet = highlightSearchResults(
                    email.text_content || email.subject,
                    req.query.fulltext,
                    150
                );
            } else {
                // Generate plain snippet from text content
                const text = email.text_content || email.subject || '';
                if (text.length > 150) {
                    snippet = text.substring(0, 150).trim() + '...';
                } else {
                    snippet = text;
                }
            }

            // Remove text_content from response to reduce payload size
            const { text_content, ...emailWithoutText } = email;

            return {
                ...emailWithoutText,
                snippet
            };
        });

        // Get total count
        const totalResult = db.get(`
            SELECT COUNT(*) as total
            FROM emails e
            ${where.includes('o.type') ? 'LEFT JOIN organizations o ON e.organization_id = o.id' : ''}
            ${where}
        `, params);

        res.json({
            emails,
            pagination: {
                page,
                limit,
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single email by ID
 */
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const email = db.get(`
            SELECT
                e.*,
                o.name as organization_name,
                o.type as organization_type
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = ?
        `, [id]);

        if (!email) {
            return res.status(404).json({
                error: 'Email not found'
            });
        }

        // Get images
        const images = db.all(`
            SELECT * FROM images
            WHERE email_id = ?
            ORDER BY download_success DESC, id ASC
        `, [id]);

        res.json({
            email,
            images
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get email HTML content for iframe display
 */
exports.getHtml = async (req, res, next) => {
    try {
        const { id } = req.params;

        const email = db.get(
            'SELECT rewritten_html_content FROM emails WHERE id = ?',
            [id]
        );

        if (!email) {
            return res.status(404).send('Email not found');
        }

        if (!email.rewritten_html_content) {
            return res.status(404).send('No HTML content available');
        }

        // Send HTML directly
        res.set('Content-Type', 'text/html');
        res.send(email.rewritten_html_content);
    } catch (error) {
        next(error);
    }
};

/**
 * Update email category (manual reclassification)
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category } = req.body;

        // Validate category
        const validCategories = ['fundraising', 'event', 'newsletter', 'share', 'action', 'other', null];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                error: 'Invalid category. Must be one of: fundraising, event, newsletter, share, action, other, or null'
            });
        }

        // Update the category
        db.run(`
            UPDATE emails
            SET category = ?,
                classification_confidence = 1.0,
                classified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [category, id]);

        res.json({
            message: 'Category updated successfully',
            category
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove tag from email (admin only)
 */
exports.removeTag = async (req, res, next) => {
    try {
        console.log('removeTag called - params:', req.params);
        console.log('removeTag called - body:', req.body);
        console.log('removeTag called - user:', req.user);

        const { id } = req.params;
        const { tag } = req.body;

        // Check if user is admin (optional - could also be added as middleware)
        if (!req.user || !req.user.isAdmin) {
            console.log('Admin access denied - user:', req.user);
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Validate tag
        const validTags = ['is_graphic_email', 'has_donation_matching', 'is_supporter_record'];
        if (!validTags.includes(tag)) {
            console.log('Invalid tag:', tag);
            return res.status(400).json({ error: 'Invalid tag' });
        }

        console.log('Removing tag:', tag, 'from email:', id);

        // Remove the tag by setting it to 0
        db.run(`
            UPDATE emails
            SET ${tag} = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);

        console.log('Tag removed successfully');
        res.json({ message: 'Tag removed successfully' });
    } catch (error) {
        console.error('Error in removeTag:', error);
        next(error);
    }
};

/**
 * Get unique senders
 */
exports.getSenders = async (req, res, next) => {
    try {
        const senders = db.all(`
            SELECT
                from_address,
                COUNT(DISTINCT from_name) as name_count,
                GROUP_CONCAT(DISTINCT from_name) as sender_names,
                COUNT(*) as email_count
            FROM emails
            WHERE organization_id IS NULL
            GROUP BY from_address
            ORDER BY email_count DESC
        `);

        res.json(senders);
    } catch (error) {
        next(error);
    }
};

/**
 * Get statistics
 */
exports.getStats = async (req, res, next) => {
    try {
        const stats = {
            totalEmails: db.get('SELECT COUNT(*) as count FROM emails').count,
            totalImages: db.get('SELECT COUNT(*) as count FROM images WHERE download_success = 1').count,
            failedImages: db.get('SELECT COUNT(*) as count FROM images WHERE download_success = 0').count,
            storageUsed: db.get('SELECT SUM(file_size) as size FROM images WHERE download_success = 1').size || 0,
            emailsByOrganizationType: db.all(`
                SELECT
                    o.type,
                    COUNT(e.id) as count
                FROM emails e
                LEFT JOIN organizations o ON e.organization_id = o.id
                GROUP BY o.type
            `),
            topSenders: db.all(`
                SELECT
                    from_address,
                    COUNT(DISTINCT from_name) as name_count,
                    COUNT(*) as count
                FROM emails
                GROUP BY from_address
                ORDER BY count DESC
                LIMIT 10
            `)
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an email
 */
exports.deleteEmail = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if email exists
        const email = db.get('SELECT * FROM emails WHERE id = ?', [id]);
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Delete the email (images will be cascade deleted due to foreign key)
        db.run('DELETE FROM emails WHERE id = ?', [id]);

        res.json({
            message: 'Email deleted successfully',
            emailId: parseInt(id)
        });
    } catch (error) {
        next(error);
    }
};
