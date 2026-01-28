const { supabaseAdmin } = require('../config/database');

class Ticket {
    /**
     * Create individual tickets from a purchase
     */
    static async createFromPurchase(purchaseId, userId, eventId, ticketTypeId, quantity) {
        const tickets = [];

        for (let i = 0; i < quantity; i++) {
            const { data, error } = await supabaseAdmin
                .from('tickets')
                .insert([{
                    purchase_id: purchaseId,
                    user_id: userId,
                    event_id: eventId,
                    ticket_type_id: ticketTypeId,
                    status: 'valid'
                }])
                .select()
                .single();

            if (error) throw error;
            tickets.push(data);
        }

        return tickets;
    }

    /**
     * Find ticket by ID
     */
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .select(`
                *,
                event:events (
                    id,
                    title,
                    event_date_start,
                    event_date_end,
                    location_address,
                    location_city,
                    image_url
                ),
                ticket_type:ticket_types (
                    id,
                    name,
                    price
                ),
                user:users!tickets_user_id_fkey (
                    id,
                    email,
                    full_name,
                    phone
                ),
                purchase:purchases (
                    id,
                    total,
                    created_at
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Find ticket by ticket number
     */
    static async findByTicketNumber(ticketNumber) {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .select(`
                *,
                event:events (
                    id,
                    title,
                    event_date_start,
                    event_date_end,
                    location_address
                ),
                ticket_type:ticket_types (
                    name,
                    price
                ),
                user:users!tickets_user_id_fkey (
                    full_name,
                    email
                )
            `)
            .eq('ticket_number', ticketNumber)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get user's tickets
     */
    static async getByUser(userId, { page = 1, limit = 10, upcoming = false }) {
        let query = supabaseAdmin
            .from('tickets')
            .select(`
                *,
                event:events (
                    id,
                    title,
                    event_date_start,
                    event_date_end,
                    location_address,
                    location_city,
                    image_url,
                    status
                ),
                ticket_type:ticket_types (
                    name,
                    price
                ),
                purchase:purchases (
                    total,
                    created_at
                )
            `, { count: 'exact' })
            .eq('user_id', userId);

        if (upcoming) {
            // Join with events to filter by date
            query = query.gte('event.event_date_start', new Date().toISOString());
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            tickets: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get tickets by purchase
     */
    static async getByPurchase(purchaseId) {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .select(`
                *,
                event:events (
                    title,
                    event_date_start,
                    location_address
                ),
                ticket_type:ticket_types (
                    name
                )
            `)
            .eq('purchase_id', purchaseId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Get tickets for an event
     */
    static async getByEvent(eventId, { page = 1, limit = 100, status = null }) {
        let query = supabaseAdmin
            .from('tickets')
            .select(`
                *,
                user:users!tickets_user_id_fkey (
                    id,
                    full_name,
                    email,
                    phone
                ),
                ticket_type:ticket_types (
                    name
                ),
                purchase:purchases (
                    created_at,
                    total
                )
            `, { count: 'exact' })
            .eq('event_id', eventId);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            tickets: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Update ticket
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Set QR code for ticket
     */
    static async setQRCode(id, qrCode) {
        return await this.update(id, { qr_code: qrCode });
    }

    /**
     * Check in ticket
     */
    static async checkIn(ticketNumber, checkedInBy) {
        const ticket = await this.findByTicketNumber(ticketNumber);

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        if (ticket.status === 'used') {
            throw new Error('Ticket already used');
        }

        if (ticket.status !== 'valid') {
            throw new Error('Ticket is not valid');
        }

        // Update ticket status
        const updated = await this.update(ticket.id, {
            status: 'used',
            checked_in_at: new Date().toISOString(),
            checked_in_by: checkedInBy
        });

        // Create check-in record
        await supabaseAdmin
            .from('check_ins')
            .insert([{
                ticket_id: ticket.id,
                event_id: ticket.event_id,
                checked_in_by: checkedInBy,
                check_in_method: 'qr'
            }]);

        return await this.findById(ticket.id);
    }

    /**
     * Cancel/Refund ticket
     */
    static async cancel(id) {
        return await this.update(id, { status: 'cancelled' });
    }

    /**
     * Get check-in statistics for event
     */
    static async getCheckInStats(eventId) {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .select('status')
            .eq('event_id', eventId);

        if (error) throw error;

        const total = data.length;
        const checkedIn = data.filter(t => t.status === 'used').length;
        const valid = data.filter(t => t.status === 'valid').length;

        return {
            total,
            checkedIn,
            valid,
            percentage: total > 0 ? ((checkedIn / total) * 100).toFixed(2) : 0
        };
    }
}

module.exports = Ticket;
