const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Ticket = require('../models/Ticket');

class UserController {
    /**
     * Get user profile
     */
    static async getProfile(req, res, next) {
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
     * Update user profile
     */
    static async updateProfile(req, res, next) {
        try {
            const { full_name, phone } = req.body;
            const userId = req.user.id;

            const updates = {};
            if (full_name) updates.full_name = full_name;
            if (phone) updates.phone = phone;

            const user = await User.update(userId, updates);
            const { password_hash, ...userData } = user;

            res.json({
                message: 'Profile updated successfully',
                user: userData
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's purchase history
     */
    static async getPurchaseHistory(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user.id;

            const result = await Purchase.getByUser(userId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's tickets
     */
    static async getTickets(req, res, next) {
        try {
            const { page = 1, limit = 10, upcoming = false } = req.query;
            const userId = req.user.id;

            const result = await Ticket.getByUser(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                upcoming: upcoming === 'true'
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get specific ticket
     */
    static async getTicket(req, res, next) {
        try {
            const { ticketId } = req.params;
            const userId = req.user.id;

            const ticket = await Ticket.findById(ticketId);

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            // Check ownership
            if (ticket.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            res.json(ticket);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = UserController;
