const db = require('../config/database');

/**
 * Get all collections for current user
 */
exports.getUserCollections = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const collections = db.all(`
            SELECT
                c.*,
                COUNT(ce.id) as email_count
            FROM collections c
            LEFT JOIN collection_emails ce ON c.id = ce.collection_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        `, [userId]);

        res.json({ collections });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new collection
 */
exports.createCollection = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Collection name is required' });
        }

        const result = db.run(`
            INSERT INTO collections (user_id, name, description)
            VALUES (?, ?, ?)
        `, [userId, name, description || null]);

        const collection = db.get(
            'SELECT * FROM collections WHERE id = ?',
            [result.lastID]
        );

        res.json({ message: 'Collection created', collection });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a collection
 */
exports.updateCollection = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name, description } = req.body;

        // Verify ownership
        const collection = db.get(
            'SELECT * FROM collections WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        db.run(`
            UPDATE collections
            SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name || collection.name, description !== undefined ? description : collection.description, id]);

        const updated = db.get('SELECT * FROM collections WHERE id = ?', [id]);
        res.json({ message: 'Collection updated', collection: updated });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a collection
 */
exports.deleteCollection = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        // Verify ownership
        const collection = db.get(
            'SELECT * FROM collections WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        db.run('DELETE FROM collections WHERE id = ?', [id]);
        res.json({ message: 'Collection deleted' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get emails in a collection
 */
exports.getCollectionEmails = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        // Verify ownership
        const collection = db.get(
            'SELECT * FROM collections WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        const emails = db.all(`
            SELECT
                e.*,
                o.name as organization_name,
                ce.added_at
            FROM collection_emails ce
            JOIN emails e ON ce.email_id = e.id
            LEFT JOIN organizations o ON e.organization_id = o.id
            WHERE ce.collection_id = ?
            ORDER BY ce.added_at DESC
        `, [id]);

        res.json({ collection, emails });
    } catch (error) {
        next(error);
    }
};

/**
 * Add email to collection
 */
exports.addEmailToCollection = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // collection id
        const { emailId } = req.body;

        // Verify ownership
        const collection = db.get(
            'SELECT * FROM collections WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        // Check if already in collection
        const existing = db.get(
            'SELECT id FROM collection_emails WHERE collection_id = ? AND email_id = ?',
            [id, emailId]
        );

        if (existing) {
            return res.status(400).json({ error: 'Email already in collection' });
        }

        db.run(`
            INSERT INTO collection_emails (collection_id, email_id)
            VALUES (?, ?)
        `, [id, emailId]);

        // Update collection updated_at
        db.run(
            'UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        res.json({ message: 'Email added to collection' });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove email from collection
 */
exports.removeEmailFromCollection = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id, emailId } = req.params;

        // Verify ownership
        const collection = db.get(
            'SELECT * FROM collections WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        db.run(
            'DELETE FROM collection_emails WHERE collection_id = ? AND email_id = ?',
            [id, emailId]
        );

        res.json({ message: 'Email removed from collection' });
    } catch (error) {
        next(error);
    }
};
