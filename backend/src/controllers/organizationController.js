const db = require('../config/database');

/**
 * List all organizations
 */
exports.list = async (req, res, next) => {
    try {
        const organizations = db.all(`
            SELECT
                o.*,
                COUNT(e.id) as email_count
            FROM organizations o
            LEFT JOIN emails e ON o.id = e.organization_id
            GROUP BY o.id
            ORDER BY o.name ASC
        `);

        res.json(organizations);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new organization
 */
exports.create = async (req, res, next) => {
    try {
        const { name, email_domain, type, notes } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                error: 'Name and type are required'
            });
        }

        const validTypes = ['nonprofit', 'charity', 'political', 'commercial', 'labour_union'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Type must be one of: ${validTypes.join(', ')}`
            });
        }

        const result = db.run(`
            INSERT INTO organizations (name, email_domain, type, notes)
            VALUES (?, ?, ?, ?)
        `, [name, email_domain || null, type, notes || null]);

        const organization = db.get(
            'SELECT * FROM organizations WHERE id = ?',
            [result.lastID]
        );

        res.status(201).json(organization);
    } catch (error) {
        next(error);
    }
};

/**
 * Update an organization
 */
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email_domain, type, notes } = req.body;

        const existing = db.get('SELECT * FROM organizations WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        if (type) {
            const validTypes = ['nonprofit', 'charity', 'political', 'commercial', 'labour_union'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: `Type must be one of: ${validTypes.join(', ')}`
                });
            }
        }

        db.run(`
            UPDATE organizations
            SET name = COALESCE(?, name),
                email_domain = COALESCE(?, email_domain),
                type = COALESCE(?, type),
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, email_domain, type, notes, id]);

        const organization = db.get('SELECT * FROM organizations WHERE id = ?', [id]);
        res.json(organization);
    } catch (error) {
        next(error);
    }
};

/**
 * Assign an email to an organization
 */
exports.assignEmail = async (req, res, next) => {
    try {
        const { emailId } = req.params;
        const { organizationId } = req.body;

        // Verify email exists
        const email = db.get('SELECT * FROM emails WHERE id = ?', [emailId]);
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Verify organization exists (null is allowed to unassign)
        if (organizationId !== null) {
            const org = db.get('SELECT * FROM organizations WHERE id = ?', [organizationId]);
            if (!org) {
                return res.status(404).json({ error: 'Organization not found' });
            }
        }

        db.run(`
            UPDATE emails
            SET organization_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [organizationId, emailId]);

        const updatedEmail = db.get(`
            SELECT
                e.*,
                o.name as organization_name,
                o.type as organization_type
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            WHERE e.id = ?
        `, [emailId]);

        res.json(updatedEmail);
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk assign emails from a sender to an organization
 */
exports.bulkAssignBySender = async (req, res, next) => {
    try {
        const { organizationId, senderAddress } = req.body;

        if (!senderAddress) {
            return res.status(400).json({ error: 'Sender address is required' });
        }

        // Verify organization exists (null is allowed to unassign)
        if (organizationId !== null) {
            const org = db.get('SELECT * FROM organizations WHERE id = ?', [organizationId]);
            if (!org) {
                return res.status(404).json({ error: 'Organization not found' });
            }
        }

        // Check if unassigned emails exist for this sender
        const unassignedCount = db.get(`
            SELECT COUNT(*) as count
            FROM emails
            WHERE from_address = ? AND organization_id IS NULL
        `, [senderAddress]);

        if (unassignedCount.count === 0) {
            return res.status(409).json({
                error: 'No unassigned emails found for this sender.',
                emailsUpdated: 0
            });
        }

        // Update only unassigned emails from this sender
        const result = db.run(`
            UPDATE emails
            SET organization_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE from_address = ? AND organization_id IS NULL
        `, [organizationId, senderAddress]);

        res.json({
            message: 'Emails assigned successfully',
            emailsUpdated: result.changes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an organization
 */
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = db.get('SELECT * FROM organizations WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Set organization_id to NULL for all emails assigned to this org
        db.run('UPDATE emails SET organization_id = NULL WHERE organization_id = ?', [id]);

        // Delete the organization
        db.run('DELETE FROM organizations WHERE id = ?', [id]);

        res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
