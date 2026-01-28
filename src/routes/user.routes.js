const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');

// Validation rules
const profileUpdateValidation = [
    body('full_name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    validateRequest
];

// Routes (all require authentication)
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, profileUpdateValidation, UserController.updateProfile);
router.get('/purchases', authenticateToken, UserController.getPurchaseHistory);
router.get('/tickets', authenticateToken, UserController.getTickets);
router.get('/tickets/:ticketId', authenticateToken, UserController.getTicket);

module.exports = router;
