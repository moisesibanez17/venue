const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const validateRequest = require('../middleware/validate');

// Validation rules
const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['user', 'organizer', 'attendee']),
    validateRequest
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validateRequest
];

const passwordResetValidation = [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    validateRequest
];

const changePasswordValidation = [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    validateRequest
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.get('/me', authenticateToken, AuthController.me);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', passwordResetValidation, AuthController.resetPassword);
router.post('/change-password', authenticateToken, changePasswordValidation, AuthController.changePassword);

module.exports = router;
