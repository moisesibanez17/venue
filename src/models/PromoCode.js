const { supabaseAdmin } = require('../config/database');

class PromoCode {
    /**
     * Create a new promo code
     */
    static async create(promoData) {
        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .insert([promoData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Find promo code by code
     */
    static async findByCode(code) {
        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Validate and use promo code
     */
    static async validateAndUse(code, eventId = null) {
        const promoCode = await this.findByCode(code);

        if (!promoCode) {
            throw new Error('Invalid promo code');
        }

        if (!promoCode.is_active) {
            throw new Error('Promo code is inactive');
        }

        // Check event restriction
        if (promoCode.event_id && promoCode.event_id !== eventId) {
            throw new Error('Promo code not valid for this event');
        }

        // Check dates
        const now = new Date();
        if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
            throw new Error('Promo code not yet valid');
        }

        if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
            throw new Error('Promo code expired');
        }

        // Check usage limit
        if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
            throw new Error('Promo code usage limit reached');
        }

        // Increment usage
        await supabaseAdmin
            .from('promo_codes')
            .update({ current_uses: promoCode.current_uses + 1 })
            .eq('id', promoCode.id);

        return promoCode;
    }

    /**
     * Get promo codes for an event
     */
    static async getByEvent(eventId) {
        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Update promo code
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete promo code
     */
    static async delete(id) {
        const { error } = await supabaseAdmin
            .from('promo_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

module.exports = PromoCode;
