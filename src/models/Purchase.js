const { supabaseAdmin } = require('../config/database');

class Purchase {
    /**
     * Create a new purchase
     */
    static async create(purchaseData) {
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .insert([purchaseData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Find purchase by ID
     */
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .select(`
                *,
                event:events (
                    id,
                    title,
                    event_date_start,
                    event_date_end,
                    location_address,
                    image_url
                ),
                ticket_type:ticket_types (
                    id,
                    name,
                    description
                ),
                user:users (
                    id,
                    email,
                    full_name,
                    phone
                ),
                promo_code:promo_codes (
                    id,
                    code,
                    discount_type,
                    discount_value
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Find purchase by Stripe session ID
     */
    static async findByStripeSessionId(sessionId) {
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get user's purchase history
     */
    static async getByUser(userId, { page = 1, limit = 10 }) {
        const { data, error, count } = await supabaseAdmin
            .from('purchases')
            .select(`
                *,
                event:events (
                    id,
                    title,
                    event_date_start,
                    image_url,
                    location_city
                ),
                ticket_type:ticket_types (
                    name
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            purchases: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get purchases for an event
     */
    static async getByEvent(eventId, { page = 1, limit = 50, status = null }) {
        let query = supabaseAdmin
            .from('purchases')
            .select(`
                *,
                user:users (
                    id,
                    email,
                    full_name,
                    phone
                ),
                ticket_type:ticket_types (
                    name
                )
            `, { count: 'exact' })
            .eq('event_id', eventId);

        if (status) {
            query = query.eq('payment_status', status);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            purchases: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get purchases by organizer
     */
    static async getByOrganizer(organizerId, { limit = 10 }) {
        // First get all event IDs for this organizer
        const { data: events, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('organizer_id', organizerId);

        if (eventError) throw eventError;

        const eventIds = events.map(e => e.id);

        if (eventIds.length === 0) {
            return { purchases: [] };
        }

        // Now get purchases for these events
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .select(`
                *,
                event:events (
                    id,
                    title
                ),
                user:users (
                    full_name,
                    email
                ),
                ticket_type:ticket_types (
                    name
                )
            `)
            .in('event_id', eventIds)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { purchases: data };
    }

    /**
     * Update purchase
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update payment status
     */
    static async updatePaymentStatus(id, status, stripePaymentIntentId = null) {
        const updates = { payment_status: status };

        if (stripePaymentIntentId) {
            updates.stripe_payment_intent_id = stripePaymentIntentId;
        }

        return await this.update(id, updates);
    }

    /**
     * Calculate totals with promo code
     */
    static calculateTotal(unitPrice, quantity, promoCode = null) {
        const subtotal = unitPrice * quantity;
        let discount = 0;

        if (promoCode) {
            if (promoCode.discount_type === 'percentage') {
                discount = subtotal * (promoCode.discount_value / 100);
            } else if (promoCode.discount_type === 'fixed') {
                discount = promoCode.discount_value;
            }
        }

        const total = Math.max(0, subtotal - discount);

        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount: parseFloat(discount.toFixed(2)),
            total: parseFloat(total.toFixed(2))
        };
    }

    /**
     * Get revenue statistics for event
     */
    static async getEventRevenue(eventId) {
        const { data, error } = await supabaseAdmin
            .from('purchases')
            .select('total, payment_status, created_at')
            .eq('event_id', eventId)
            .eq('payment_status', 'completed');

        if (error) throw error;

        const totalRevenue = data.reduce((sum, p) => sum + parseFloat(p.total), 0);
        const totalSales = data.length;

        return {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalSales,
            purchases: data
        };
    }
}

module.exports = Purchase;
