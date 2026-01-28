const User = require('../models/User');
const EmailService = require('../utils/emailService');
const crypto = require('crypto');

class AuthController {
    /**
     * Register a new user
     */
    static async register(req, res, next) {
        try {
            const { email, password, full_name, phone, role } = req.body;

            // Check if user exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Create user
            const user = await User.create({
                email,
                password,
                full_name,
                phone,
                role: role || 'user'
            });

            // Generate verification token (optional)
            const verificationToken = crypto.randomBytes(32).toString('hex');
            await User.setVerificationToken(user.id, verificationToken);

            // Send welcome email (async, don't wait)
            EmailService.sendWelcome(user).catch(err =>
                console.error('Welcome email error:', err)
            );

            // Generate JWT
            const token = User.generateToken(user);

            // Remove password from response
            const { password_hash, ...userData } = user;

            res.status(201).json({
                message: 'User registered successfully',
                user: userData,
                token
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * User login
     */
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Verify password
            const isValid = await User.verifyPassword(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT
            const token = User.generateToken(user);

            // Remove password from response
            const { password_hash, ...userData } = user;

            res.json({
                message: 'Login successful',
                user: userData,
                token
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current user profile
     */
    static async me(req, res, next) {
        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const { password_hash, ...userData } = user;

            res.json({ user: userData });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Request password reset
     */
    static async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal if email exists
                return res.json({
                    message: 'If that email exists, a reset link has been sent'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            await User.setResetToken(user.id, resetToken);

            // Send reset email
            await EmailService.sendPasswordReset(user, resetToken);

            res.json({
                message: 'If that email exists, a reset link has been sent'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reset password
     */
    static async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;

            // Find user by reset token
            const { data: users } = await require('../config/database').supabaseAdmin
                .from('users')
                .select('*')
                .eq('reset_password_token', token)
                .gt('reset_password_expires', new Date().toISOString());

            if (!users || users.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }

            const user = users[0];

            // Update password
            await User.updatePassword(user.id, newPassword);

            // Clear reset token
            await User.update(user.id, {
                reset_password_token: null,
                reset_password_expires: null
            });

            res.json({ message: 'Password reset successful' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Change password (authenticated)
     */
    static async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            // Get user
            const user = await User.findById(userId);

            // Verify current password
            const isValid = await User.verifyPassword(currentPassword, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Update password
            await User.updatePassword(userId, newPassword);

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
