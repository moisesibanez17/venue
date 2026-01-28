const { supabaseAdmin } = require('../config/database');

class TicketType {
    /**
     * Create a new ticket type
     */
    static async create(ticketTypeData) {
        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .insert([ticketTypeData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Find ticket type by ID
     */
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get all ticket types for an event
     */
    static async getByEvent(eventId) {
        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .select('*')
            .eq('event_id', eventId)
            .order('price', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Get available ticket types for an event
     */
    static async getAvailable(eventId) {
        const now = new Date();

        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .select('*')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (error) throw error;

        // Filter tickets based on dates and availability
        return data.filter(ticket => {
            // Check quantity
            if (ticket.quantity_sold >= ticket.quantity_total) return false;

            // Check sales start (if set)
            if (ticket.sales_start && new Date(ticket.sales_start) > now) return false;

            // Check sales end (if set)
            if (ticket.sales_end && new Date(ticket.sales_end) < now) return false;

            return true;
        });
    }

    /**
     * Update ticket type
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete ticket type
     */
    static async delete(id) {
        const { error } = await supabaseAdmin
            .from('ticket_types')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    /**
     * Check availability and reserve tickets
     */
    static async checkAndReserve(ticketTypeId, quantity) {
        const ticketType = await this.findById(ticketTypeId);

        if (!ticketType) {
            throw new Error('Ticket type not found');
        }

        if (!ticketType.is_active) {
            throw new Error('Ticket type is not available');
        }

        const available = ticketType.quantity_total - ticketType.quantity_sold;

        if (available < quantity) {
            throw new Error(`Only ${available} tickets available`);
        }

        if (quantity > ticketType.max_per_order) {
            throw new Error(`Maximum ${ticketType.max_per_order} tickets per order`);
        }

        // Check sales window
        const now = new Date();
        if (ticketType.sales_start && new Date(ticketType.sales_start) > now) {
            throw new Error('Sales have not started yet');
        }

        if (ticketType.sales_end && new Date(ticketType.sales_end) < now) {
            throw new Error('Sales have ended');
        }

        // Increment quantity_sold (optimistic locking)
        const { data, error } = await supabaseAdmin
            .from('ticket_types')
            .update({ quantity_sold: ticketType.quantity_sold + quantity })
            .eq('id', ticketTypeId)
            .eq('quantity_sold', ticketType.quantity_sold) // Ensure concurrent safety
            .select()
            .single();

        if (error) {
            throw new Error('Failed to reserve tickets. Please try again.');
        }

        return data;
    }

    /**
     * Release reserved tickets (in case of payment failure)
     */
    static async releaseReservation(ticketTypeId, quantity) {
        const ticketType = await this.findById(ticketTypeId);

        if (!ticketType) return;

        const newQuantitySold = Math.max(0, ticketType.quantity_sold - quantity);

        await this.update(ticketTypeId, {
            quantity_sold: newQuantitySold
        });
    }
}

module.exports = TicketType;
