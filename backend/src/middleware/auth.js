const jwt = require('jsonwebtoken');

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Auth middleware - verifies JWT token
 * Attaches user info to req.user if valid
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.token ||
                     (req.headers.authorization?.startsWith('Bearer ')
                         ? req.headers.authorization.substring(7)
                         : null);

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, name }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Optional auth middleware - doesn't fail if no token
 * Just attaches user info if token exists
 */
const optionalAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token ||
                     (req.headers.authorization?.startsWith('Bearer ')
                         ? req.headers.authorization.substring(7)
                         : null);

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid, but that's okay for optional auth
    }
    next();
};

module.exports = {
    authMiddleware,
    optionalAuth,
    JWT_SECRET
};
