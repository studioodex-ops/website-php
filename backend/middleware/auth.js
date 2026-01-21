/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts tenant info
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT Token
 * Adds user and tenantId to request object
 */
const verifyToken = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request
        req.user = decoded;
        req.tenantId = decoded.tenantId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Verify Admin Access
 * Only allows super admin users
 */
const verifyAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Optional Token Verification
 * Continues even without token (for public endpoints)
 */
const optionalToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            req.tenantId = decoded.tenantId;
        }
    } catch (error) {
        // Continue without user info
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    optionalToken
};
