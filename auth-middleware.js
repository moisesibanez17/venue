const bcrypt = require('bcrypt');
const crypto = require('crypto');
const supabase = require('./database');

// Simple in-memory session store (for production, use Redis or similar)
const activeSessions = new Map();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure session token
 */
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Authenticate admin user
 */
async function authenticateAdmin(username, password) {
    try {
        console.log('  → Searching for username in DB:', username);

        // Get admin user from database
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.log('  → DB Error:', error.message);
            return { success: false, message: 'Invalid credentials' };
        }

        if (!admin) {
            console.log('  → User not found in database');
            return { success: false, message: 'Invalid credentials' };
        }

        console.log('  → User found! ID:', admin.id);
        console.log('  → Hash in DB (first 20 chars):', admin.password_hash.substring(0, 20) + '...');

        // Verify password
        console.log('  → Verifying password with bcrypt...');
        const isValid = await verifyPassword(password, admin.password_hash);

        console.log('  → Password valid:', isValid);

        if (!isValid) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Generate session token
        const token = generateSessionToken();
        const expiresAt = Date.now() + SESSION_DURATION;

        // Store session
        activeSessions.set(token, {
            userId: admin.id,
            username: admin.username,
            expiresAt
        });

        // Update last login
        await supabase
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', admin.id);

        console.log('  → ✅ Authentication successful!');

        return {
            success: true,
            token,
            username: admin.username
        };
    } catch (error) {
        console.error('  → Authentication error:', error);
        return { success: false, message: 'Authentication failed' };
    }
}

/**
 * Verify session token
 */
function verifySession(token) {
    const session = activeSessions.get(token);

    if (!session) {
        return { valid: false, message: 'Invalid session' };
    }

    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return { valid: false, message: 'Session expired' };
    }

    return { valid: true, session };
}

/**
 * Logout - invalidate session
 */
function logout(token) {
    activeSessions.delete(token);
}

/**
 * Express middleware to protect admin routes
 */
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }

    const verification = verifySession(token);

    if (!verification.valid) {
        return res.status(401).json({ error: verification.message });
    }

    req.admin = verification.session;
    next();
}

/**
 * Clean up expired sessions (run periodically)
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
            activeSessions.delete(token);
        }
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    authenticateAdmin,
    verifySession,
    logout,
    requireAuth,
    hashPassword
};
