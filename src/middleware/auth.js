const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Check header first, then query param (for downloads)
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // Fallback for Heroku debugging
    const secret = process.env.JWT_SECRET || 'temporary_debug_secret_12345';

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                requiredRole: allowedRoles
            });
        }

        next();
    };
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    // Fallback for Heroku debugging
    const secret = process.env.JWT_SECRET || 'temporary_debug_secret_12345';

    jwt.verify(token, secret, (err, user) => {
        req.user = err ? null : user;
        next();
    });
};

module.exports = {
    authenticateToken,
    authorizeRole,
    optionalAuth
};
