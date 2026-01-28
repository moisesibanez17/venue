const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const OrganizerController = require('../controllers/organizerController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');

// Validation rules
const checkInValidation = [
    body('ticketNumber').trim().notEmpty(),
    validateRequest
];

// All routes require organizer or admin role
router.use(authenticateToken);
router.use(authorizeRole('organizer', 'admin'));

// Routes
router.get('/dashboard', OrganizerController.getDashboard);
router.get('/events/:eventId/attendees', OrganizerController.getAttendees);
router.get('/events/:eventId/export-attendees', OrganizerController.exportAttendees);
router.get('/events/:eventId/export-sales', OrganizerController.exportSales);
router.post('/check-in', checkInValidation, OrganizerController.checkInTicket);
router.get('/events/:eventId/checkin-stats', OrganizerController.getCheckInStats);
router.get('/events/:eventId/analytics', OrganizerController.getSalesAnalytics);

module.exports = router;
