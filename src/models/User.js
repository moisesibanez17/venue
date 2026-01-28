const { supabaseAdmin } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
    /**
     * Create a new user
     */
    static async create({ email, password, full_name, phone, role = 'user' }) {
        try {
            // Hash password
            const password_hash = await bcrypt.hash(password, 10);

            const { data, error } = await supabaseAdmin
                .from('users')
                .insert([{
                    email,
                    password_hash,
                    full_name,
                    phone,
                    role
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Create a guest user (no password required)
     */
    static async createGuest({ email, full_name }) {
        try {
            // Check if guest user already exists
            const existing = await this.findByEmail(email);
            if (existing && existing.is_guest) {
                return existing;
            }

            const { data, error } = await supabaseAdmin
                .from('users')
                .insert([{
                    email,
                    full_name,
                    role: 'user',
                    is_guest: true,
                    password_hash: null // No password for guests
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Update user
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Verify password
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Generate JWT token
     */
    static generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // Fallback for Heroku debugging
        const secret = process.env.JWT_SECRET || 'temporary_debug_secret_12345';

        return jwt.sign(payload, secret, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
    }

    /**
     * Update password
     */
    static async updatePassword(id, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, 10);

        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ password_hash })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Set verification token
     */
    static async setVerificationToken(id, token) {
        return await this.update(id, { verification_token: token });
    }

    /**
     * Verify user email
     */
    static async verifyEmail(id) {
        return await this.update(id, {
            is_verified: true,
            verification_token: null
        });
    }

    /**
     * Set password reset token
     */
    static async setResetToken(id, token) {
        const expires = new Date(Date.now() + 3600000); // 1 hour
        return await this.update(id, {
            reset_password_token: token,
            reset_password_expires: expires.toISOString()
        });
    }

    /**
     * Get all users (admin only)
     */
    static async getAll({ page = 1, limit = 20, role = null }) {
        let query = supabaseAdmin
            .from('users')
            .select('id, email, full_name, phone, role, is_verified, created_at', { count: 'exact' });

        if (role) {
            query = query.eq('role', role);
        }

        const { data, error, count } = await query
            .range((page - 1) * limit, page * limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            users: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Delete user
     */
    static async delete(id) {
        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

module.exports = User;
