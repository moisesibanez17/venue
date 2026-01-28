const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const PaymentController = require('../controllers/paymentController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');

// Validation rules
const preferenceValidation = [
    body('ticketTypeId').isUUID(),
    body('quantity').isInt({ min: 1, max: 20 }),
    body('promoCode').optional().trim(),
    body('guestEmail').optional().isEmail(),
    body('guestName').optional().trim(),
    validateRequest
];

// Routes
router.post('/create-checkout-session',
    optionalAuth, // Allow both authenticated and guest users
    preferenceValidation,
    PaymentController.createCheckoutSession
);

router.get('/verify-stripe-session/:sessionId',
    optionalAuth, // Allow both authenticated and guest users
    PaymentController.verifyStripeSession
);

router.post('/stripe-webhook', PaymentController.stripeWebhook);

router.post('/create-preference',
    authenticateToken,
    preferenceValidation,
    PaymentController.createPreference
);

router.post('/webhook', PaymentController.webhook);

router.get('/verify/:purchaseId',
    authenticateToken,
    PaymentController.verifyPayment
);

router.get('/download-ticket/:ticketId',
    optionalAuth,
    PaymentController.downloadTicketPDF
);

module.exports = router;
