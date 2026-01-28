const Event = require('../models/Event');
const TicketType = require('../models/TicketType');
const { supabase } = require('../config/database');

class EventController {
    /**
     * Get all events (public)
     */
    static async getAll(req, res, next) {
        try {
            const {
                page = 1,
                limit = 12,
                status = 'published',
                category,
                city,
                search,
                startDate,
                endDate,
                orderBy = 'event_date_start',
                orderDirection = 'asc'
            } = req.query;

            const result = await Event.getAll({
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                category,
                city,
                search,
                startDate,
                endDate,
                orderBy,
                orderDirection
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get event by ID (public)
     */
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const event = await Event.findById(id);

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Get statistics if user is organizer or admin
            if (req.user && (req.user.id === event.organizer_id || req.user.role === 'admin')) {
                const stats = await Event.getStatistics(id);
                event.statistics = stats;
            }

            res.json(event);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get featured events (public)
     */
    static async getFeatured(req, res, next) {
        try {
            const { limit = 6 } = req.query;
            const events = await Event.getFeatured(parseInt(limit));
            res.json(events);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get upcoming events (public)
     */
    static async getUpcoming(req, res, next) {
        try {
            const { limit = 12 } = req.query;
            const events = await Event.getUpcoming(parseInt(limit));
            res.json(events);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get event categories (public)
     */
    static async getCategories(req, res, next) {
        try {
            const categories = await Event.getCategories();
            res.json(categories);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create event (organizer/admin)
     */
    static async create(req, res, next) {
        try {
            const eventData = {
                ...req.body,
                organizer_id: req.user.id,
                status: req.body.status || 'draft'
            };

            // Handle image upload if present
            if (req.file) {
                const fileExt = req.file.originalname.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `events/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('events')
                    .upload(filePath, req.file.buffer, {
                        contentType: req.file.mimetype
                    });

                if (uploadError) {
                    throw new Error(`Error uploading image: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('events')
                    .getPublicUrl(filePath);

                eventData.image_url = publicUrl;
            }

            const event = await Event.create(eventData);

            // Handle ticket types
            if (req.body.ticket_types) {
                const ticketTypes = JSON.parse(req.body.ticket_types);
                for (const type of ticketTypes) {
                    await TicketType.create({
                        ...type,
                        event_id: event.id,
                        quantity_sold: 0
                    });
                }
            }

            res.status(201).json({
                message: 'Event created successfully',
                event
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update event (organizer/admin)
     */
    static async update(req, res, next) {
        try {
            const { id } = req.params;

            // Check ownership
            if (req.user.role !== 'admin') {
                const isOwner = await Event.isOwner(id, req.user.id);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }

            const { ticket_types, ...updates } = req.body;

            // Handle image upload if present
            if (req.file) {
                const fileExt = req.file.originalname.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `events/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('events')
                    .upload(filePath, req.file.buffer, {
                        contentType: req.file.mimetype
                    });

                if (uploadError) {
                    throw new Error(`Error uploading image: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('events')
                    .getPublicUrl(filePath);

                updates.image_url = publicUrl;
            }

            const event = await Event.update(id, updates);

            // Handle ticket types update
            if (req.body.ticket_types) {
                const ticketTypes = JSON.parse(req.body.ticket_types);

                // Get existing ticket types
                const currentTypes = await TicketType.getByEvent(id);
                const currentIds = currentTypes.map(t => t.id);
                const incomingIds = ticketTypes.filter(t => t.id).map(t => t.id);

                // Delete removed types (only if no sales)
                const toDelete = currentTypes.filter(t => !incomingIds.includes(t.id));
                for (const type of toDelete) {
                    if (type.quantity_sold === 0) {
                        await TicketType.delete(type.id);
                    }
                }

                // Update or Create
                for (const type of ticketTypes) {
                    if (type.id && currentIds.includes(type.id)) {
                        // Update
                        await TicketType.update(type.id, {
                            name: type.name,
                            description: type.description,
                            price: type.price,
                            quantity_total: type.quantity_total,
                            max_per_order: type.max_per_order,
                            sales_start: type.sales_start,
                            sales_end: type.sales_end
                        });
                    } else {
                        // Create new ticket type
                        const newTypeData = {
                            name: type.name,
                            description: type.description,
                            price: type.price,
                            quantity_total: type.quantity_total,
                            max_per_order: type.max_per_order,
                            sales_start: type.sales_start,
                            sales_end: type.sales_end,
                            event_id: id,
                            quantity_sold: 0,
                            is_active: type.is_active !== undefined ? type.is_active : true
                        };

                        await TicketType.create(newTypeData);
                    }
                }
            }

            res.json({
                message: 'Event updated successfully',
                event
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete event (organizer/admin)
     */
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            // Check ownership
            if (req.user.role !== 'admin') {
                const isOwner = await Event.isOwner(id, req.user.id);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }

            await Event.delete(id);

            res.json({ message: 'Event deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Duplicate event (organizer/admin)
     */
    static async duplicate(req, res, next) {
        try {
            const { id } = req.params;

            const duplicated = await Event.duplicate(id, req.user.id);

            res.status(201).json({
                message: 'Event duplicated successfully',
                event: duplicated
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get organizer's events (organizer)
     */
    static async getMyEvents(req, res, next) {
        try {
            const { page = 1, limit = 10, status } = req.query;

            const result = await Event.getAll({
                page: parseInt(page),
                limit: parseInt(limit),
                organizer_id: req.user.id,
                status
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add ticket type to event (organizer/admin)
     */
    static async addTicketType(req, res, next) {
        try {
            const { id } = req.params;

            // Check ownership
            if (req.user.role !== 'admin') {
                const isOwner = await Event.isOwner(id, req.user.id);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }

            const ticketTypeData = {
                ...req.body,
                event_id: id
            };

            const ticketType = await TicketType.create(ticketTypeData);

            res.status(201).json({
                message: 'Ticket type created successfully',
                ticketType
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update ticket type (organizer/admin)
     */
    static async updateTicketType(req, res, next) {
        try {
            const { id, ticketTypeId } = req.params;

            // Check ownership
            if (req.user.role !== 'admin') {
                const isOwner = await Event.isOwner(id, req.user.id);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }

            const ticketType = await TicketType.update(ticketTypeId, req.body);

            res.json({
                message: 'Ticket type updated successfully',
                ticketType
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete ticket type (organizer/admin)
     */
    static async deleteTicketType(req, res, next) {
        try {
            const { id, ticketTypeId } = req.params;

            // Check ownership
            if (req.user.role !== 'admin') {
                const isOwner = await Event.isOwner(id, req.user.id);
                if (!isOwner) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }

            await TicketType.delete(ticketTypeId);

            res.json({ message: 'Ticket type deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = EventController;
