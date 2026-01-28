const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Purchase = require('../models/Purchase');
const ExcelExporter = require('../utils/excelExporter');

class OrganizerController {
    /**
     * Get organizer dashboard statistics
     */
    static async getDashboard(req, res, next) {
        try {
            const organizerId = req.user.id;

            // Get organizer's events
            const { events } = await Event.getAll({
                organizer_id: organizerId,
                limit: 100
            });

            // Calculate totals
            let totalRevenue = 0;
            let totalTicketsSold = 0;
            let totalEvents = events.length;
            let upcomingEvents = 0;
            let totalCapacity = 0;

            const eventStats = [];

            for (const event of events) {
                const stats = await Event.getStatistics(event.id);

                totalRevenue += parseFloat(stats.total_revenue || 0);
                totalTicketsSold += parseInt(stats.total_tickets_sold || 0);
                if (event.capacity) {
                    totalCapacity += parseInt(event.capacity);
                }

                if (new Date(event.event_date_start) > new Date()) {
                    upcomingEvents++;
                }

                eventStats.push({
                    id: event.id,
                    event_id: event.id,
                    title: event.title,
                    date: event.event_date_start,
                    status: event.status,
                    ...stats
                });
            }

            // Get recent purchases
            const { purchases: recentPurchases } = await Purchase.getByOrganizer(organizerId, { limit: 10 });

            res.json({
                summary: {
                    totalEvents,
                    upcomingEvents,
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    totalTicketsSold,
                    totalCapacity
                },
                events: eventStats,
                recentPurchases
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get event attendees list
     */
    static async getAttendees(req, res, next) {
        try {
            const { eventId } = req.params;
            const { page = 1, limit = 100, status } = req.query;

            // Check ownership
            const isOwner = await Event.isOwner(eventId, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const result = await Ticket.getByEvent(eventId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Export attendees to Excel
     */
    static async exportAttendees(req, res, next) {
        try {
            const { eventId } = req.params;

            // Check ownership
            const isOwner = await Event.isOwner(eventId, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const event = await Event.findById(eventId);
            const { tickets } = await Ticket.getByEvent(eventId, { limit: 10000 });

            const filePath = await ExcelExporter.exportAttendees(event, tickets);

            res.download(filePath, `attendees-${event.title}.xlsx`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Export sales report
     */
    static async exportSales(req, res, next) {
        try {
            const { eventId } = req.params;

            // Check ownership
            const isOwner = await Event.isOwner(eventId, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const event = await Event.findById(eventId);
            const { purchases } = await Purchase.getByEvent(eventId, {
                limit: 10000,
                status: 'completed'
            });

            const filePath = await ExcelExporter.exportSalesReport(event, purchases);

            res.download(filePath, `sales-${event.title}.xlsx`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check-in ticket
     */
    static async checkInTicket(req, res, next) {
        try {
            const { ticketNumber } = req.body;

            const ticket = await Ticket.findByTicketNumber(ticketNumber);

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            // Check if user is organizer of this event
            const isOwner = await Event.isOwner(ticket.event_id, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Check in ticket
            const checkedInTicket = await Ticket.checkIn(ticketNumber, req.user.id);

            res.json({
                message: 'Ticket checked in successfully',
                ticket: checkedInTicket
            });
        } catch (error) {
            console.error('Check-in Error:', error.message);
            if (error.message === 'Ticket already used') {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === 'Ticket is not valid') {
                return res.status(400).json({ error: error.message });
            }
            next(error);
        }
    }

    /**
     * Get check-in statistics
     */
    static async getCheckInStats(req, res, next) {
        try {
            const { eventId } = req.params;

            // Check ownership
            const isOwner = await Event.isOwner(eventId, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const stats = await Ticket.getCheckInStats(eventId);

            res.json(stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get sales analytics
     */
    static async getSalesAnalytics(req, res, next) {
        try {
            const { eventId } = req.params;

            // Check ownership
            const isOwner = await Event.isOwner(eventId, req.user.id);
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const revenue = await Purchase.getEventRevenue(eventId);
            const checkInStats = await Ticket.getCheckInStats(eventId);

            res.json({
                revenue,
                checkIns: checkInStats
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OrganizerController;
