const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const EventController = require('../controllers/eventController');
const { authenticateToken, authorizeRole, optionalAuth } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');
const upload = require('../middleware/upload');

// Validation rules
const eventValidation = [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('category').optional().trim(),
    body('location_address').optional().trim(),
    body('location_city').optional().trim(),
    body('event_date_start').isISO8601(),
    body('event_date_end').isISO8601(),
    body('capacity').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['draft', 'published', 'cancelled']),
    validateRequest
];

const ticketTypeValidation = [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('quantity_total').isInt({ min: 1 }),
    body('max_per_order').optional().isInt({ min: 1 }),
    body('sales_start').optional().isISO8601(),
    body('sales_end').optional().isISO8601(),
    validateRequest
];

// Public routes
router.get('/', optionalAuth, EventController.getAll);
router.get('/featured', EventController.getFeatured);
router.get('/upcoming', EventController.getUpcoming);
router.get('/categories', EventController.getCategories);
router.get('/:id', optionalAuth, EventController.getById);

// Organizer/Admin routes
router.post('/',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    upload.single('image'),
    eventValidation,
    EventController.create
);

router.put('/:id',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    upload.single('image'),
    EventController.update
);

router.delete('/:id',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    EventController.delete
);

router.post('/:id/duplicate',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    EventController.duplicate
);

router.get('/my/events',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    EventController.getMyEvents
);

// Ticket type management
router.post('/:id/ticket-types',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    ticketTypeValidation,
    EventController.addTicketType
);

router.put('/:id/ticket-types/:ticketTypeId',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    EventController.updateTicketType
);

router.delete('/:id/ticket-types/:ticketTypeId',
    authenticateToken,
    authorizeRole('organizer', 'admin'),
    EventController.deleteTicketType
);

module.exports = router;
