const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Email, password, and name are required'
            });
        }

        // Check if user already exists
        const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({
                error: 'Email already registered'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Check if this is the admin user
        const is_admin = (email === 'mikelroy@gmail.com') ? 1 : 0;

        // Create user
        const result = db.run(`
            INSERT INTO users (email, password_hash, name, is_admin)
            VALUES (?, ?, ?, ?)
        `, [email, password_hash, name, is_admin]);

        const userId = result.lastID;

        // Generate JWT token
        const token = jwt.sign(
            { userId, email, name, isAdmin: !!is_admin },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Registration successful',
            user: { id: userId, email, name, isAdmin: !!is_admin },
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = db.get(
            'SELECT id, email, name, password_hash, is_admin FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user info
 */
exports.getCurrentUser = async (req, res, next) => {
    try {
        const user = db.get(
            'SELECT id, email, name, is_admin, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: { ...user, isAdmin: !!user.is_admin } });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user (client should delete token)
 */
exports.logout = async (req, res, next) => {
    res.json({ message: 'Logout successful' });
};

/**
 * Get all users (admin only)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = db.all('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC');

        res.json({ users });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle admin status (admin only)
 */
exports.toggleAdmin = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { id } = req.params;
        const { isAdmin } = req.body;

        // Prevent demoting yourself
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot change your own admin status' });
        }

        db.run(
            'UPDATE users SET is_admin = ? WHERE id = ?',
            [isAdmin ? 1 : 0, id]
        );

        res.json({ message: 'Admin status updated successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user (admin only)
 */
exports.deleteUser = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        db.run('DELETE FROM users WHERE id = ?', [id]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};
