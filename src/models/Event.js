const { supabaseAdmin } = require('../config/database');

class Event {
    /**
     * Create a new event
     */
    static async create(eventData) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Find event by ID with organizer info
     */
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                organizer:users!organizer_id (
                    id,
                    full_name,
                    email
                ),
                ticket_types (
                    id,
                    name,
                    description,
                    price,
                    quantity_total,
                    quantity_sold,
                    max_per_order,
                    sales_start,
                    sales_end,
                    is_active
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Get all events with filters and pagination
     */
    static async getAll({
        page = 1,
        limit = 12,
        status = null,
        category = null,
        city = null,
        search = null,
        organizer_id = null,
        startDate = null,
        endDate = null,
        orderBy = 'event_date_start',
        orderDirection = 'asc'
    }) {
        let query = supabaseAdmin
            .from('events')
            .select(`
                *,
                organizer:users!organizer_id (
                    id,
                    full_name
                ),
                ticket_types (
                    id,
                    price
                )
            `, { count: 'exact' });

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }

        if (category) {
            query = query.eq('category', category);
        }

        if (city) {
            query = query.ilike('location_city', `%${city}%`);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        if (organizer_id) {
            query = query.eq('organizer_id', organizer_id);
        }

        if (startDate) {
            query = query.gte('event_date_start', startDate);
        }

        if (endDate) {
            query = query.lte('event_date_end', endDate);
        }

        // Ordering
        const ascending = orderDirection === 'asc';
        query = query.order(orderBy, { ascending });

        // Pagination
        const { data, error, count } = await query
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            events: data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Update event
     */
    static async update(id, updates) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete event
     */
    static async delete(id) {
        const { error } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    /**
     * Check if user owns event
     */
    static async isOwner(eventId, userId) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (error) return false;
        return data.organizer_id === userId;
    }

    /**
     * Get event statistics
     */
    /**
     * Get event statistics
     */
    static async getStatistics(eventId) {
        // Calculate Revenue and Tickets Sold from COMPLETED purchases only
        const { data: purchases, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .select('amount:total, quantity')
            .eq('event_id', eventId)
            .eq('payment_status', 'completed');

        if (purchaseError) throw purchaseError;

        let totalRevenue = 0;
        let totalTicketsSold = 0;

        purchases.forEach(p => {
            totalRevenue += parseFloat(p.amount || 0);
            totalTicketsSold += parseInt(p.quantity || 0);
        });

        // Count Checked-in Tickets
        // Assuming 'used' means checked in, or we look at a boolean is_checked_in?
        // Let's check Ticket model or just count 'used' status.
        // Assuming 'used' for now based on typical flows, or we can query 'tickets' count.
        const { count: ticketsCheckedIn, error: checkinError } = await supabaseAdmin
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'used'); // Review if 'used' is the check-in status

        if (checkinError) console.error('Error counting checkins:', checkinError);

        return {
            total_purchases: purchases.length,
            total_tickets_sold: totalTicketsSold,
            total_revenue: totalRevenue,
            tickets_checked_in: ticketsCheckedIn || 0,
            average_rating: 0, // Placeholder
            review_count: 0
        };
    }

    /**
     * Get featured events
     */
    static async getFeatured(limit = 6) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                organizer:users!organizer_id (
                    id,
                    full_name
                ),
                ticket_types (
                    id,
                    price
                )
            `)
            .eq('status', 'published')
            .eq('is_featured', true)
            .gte('event_date_start', new Date().toISOString())
            .order('event_date_start', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    /**
     * Get upcoming events
     */
    static async getUpcoming(limit = 12) {
        const { data, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                organizer:users!organizer_id (
                    id,
                    full_name
                ),
                ticket_types (
                    id,
                    price
                )
            `)
            .eq('status', 'published')
            .gte('event_date_start', new Date().toISOString())
            .order('event_date_start', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    /**
     * Get event categories
     */
    static async getCategories() {
        const { data, error } = await supabaseAdmin
            .from('events')
            .select('category')
            .not('category', 'is', null)
            .eq('status', 'published');

        if (error) throw error;

        // Get unique categories
        const categories = [...new Set(data.map(e => e.category))];
        return categories;
    }

    /**
     * Duplicate event
     */
    static async duplicate(eventId, organizerId) {
        // Get original event
        const original = await this.findById(eventId);
        if (!original) throw new Error('Event not found');

        // Check ownership
        if (original.organizer_id !== organizerId) {
            throw new Error('Unauthorized');
        }

        // Create duplicate (without ID and with draft status)
        const { id, created_at, updated_at, ticket_types, organizer, ...eventData } = original;
        const duplicate = await this.create({
            ...eventData,
            title: `${eventData.title} (Copy)`,
            status: 'draft',
            organizer_id: organizerId
        });

        // Duplicate ticket types
        if (ticket_types && ticket_types.length > 0) {
            const TicketType = require('./TicketType');
            for (const ticketType of ticket_types) {
                const { id, event_id, created_at, updated_at, quantity_sold, ...ticketData } = ticketType;
                await TicketType.create({
                    ...ticketData,
                    event_id: duplicate.id,
                    quantity_sold: 0
                });
            }
        }

        return duplicate;
    }
}

module.exports = Event;
