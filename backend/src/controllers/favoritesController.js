const db = require('../config/database');

/**
 * Toggle favorite for an email
 */
exports.toggleFavorite = async (req, res, next) => {
    try {
        const { emailId } = req.params;
        const userId = req.user.userId;

        // Check if already favorited
        const existing = db.get(
            'SELECT id FROM favorites WHERE email_id = ? AND user_id = ?',
            [emailId, userId]
        );

        if (existing) {
            // Remove favorite
            db.run('DELETE FROM favorites WHERE id = ?', [existing.id]);

            // Decrement favorite_count
            db.run(
                'UPDATE emails SET favorite_count = favorite_count - 1 WHERE id = ?',
                [emailId]
            );

            res.json({ message: 'Favorite removed', isFavorited: false });
        } else {
            // Add favorite
            db.run(
                'INSERT INTO favorites (email_id, user_id) VALUES (?, ?)',
                [emailId, userId]
            );

            // Increment favorite_count
            db.run(
                'UPDATE emails SET favorite_count = favorite_count + 1 WHERE id = ?',
                [emailId]
            );

            res.json({ message: 'Favorite added', isFavorited: true });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's favorited emails
 */
exports.getUserFavorites = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const favorites = db.all(`
            SELECT
                e.id,
                e.subject,
                e.from_address,
                e.from_name,
                e.date_received,
                e.category,
                e.favorite_count,
                o.name as organization_name,
                f.created_at as favorited_at
            FROM favorites f
            JOIN emails e ON f.email_id = e.id
            LEFT JOIN organizations o ON e.organization_id = o.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `, [userId]);

        res.json({ favorites });
    } catch (error) {
        next(error);
    }
};

/**
 * Get top 10 most favorited emails (global)
 */
exports.getTopFavorites = async (req, res, next) => {
    try {
        const topFavorites = db.all(`
            SELECT
                e.id,
                e.subject,
                e.from_address,
                e.from_name,
                e.date_received,
                e.category,
                e.favorite_count,
                o.name as organization_name
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            WHERE e.favorite_count > 0
            ORDER BY e.favorite_count DESC, e.date_received DESC
            LIMIT 10
        `);

        res.json({ topFavorites });
    } catch (error) {
        next(error);
    }
};

/**
 * Check if user has favorited specific emails
 */
exports.checkFavorites = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { emailIds } = req.query; // comma-separated list

        if (!emailIds) {
            return res.json({ favorites: {} });
        }

        const ids = emailIds.split(',').map(id => parseInt(id));
        const placeholders = ids.map(() => '?').join(',');

        const favorites = db.all(`
            SELECT email_id
            FROM favorites
            WHERE user_id = ? AND email_id IN (${placeholders})
        `, [userId, ...ids]);

        // Convert to object for easy lookup
        const favoritesMap = {};
        favorites.forEach(f => {
            favoritesMap[f.email_id] = true;
        });

        res.json({ favorites: favoritesMap });
    } catch (error) {
        next(error);
    }
};
