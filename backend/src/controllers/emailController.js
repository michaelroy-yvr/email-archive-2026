const db = require('../config/database');

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

        // Search in subject
        if (req.query.search) {
            whereClause.push('e.subject LIKE ?');
            params.push(`%${req.query.search}%`);
        }

        const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        // Get emails
        const emails = db.all(`
            SELECT
                e.id,
                e.gmail_message_id,
                e.subject,
                e.from_address,
                e.from_name,
                e.date_received,
                e.has_images,
                e.images_downloaded,
                o.name as organization_name,
                o.type as organization_type,
                COUNT(DISTINCT i.id) as image_count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            LEFT JOIN images i ON e.id = i.email_id AND i.download_success = 1
            ${where}
            GROUP BY e.id
            ORDER BY e.date_received DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const totalResult = db.get(`
            SELECT COUNT(DISTINCT e.id) as total
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
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
 * Get unique senders
 */
exports.getSenders = async (req, res, next) => {
    try {
        const senders = db.all(`
            SELECT DISTINCT
                from_address,
                from_name,
                COUNT(*) as email_count
            FROM emails
            WHERE organization_id IS NULL
            GROUP BY from_address
            ORDER BY email_count DESC, from_name ASC
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
                    from_name,
                    from_address,
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
