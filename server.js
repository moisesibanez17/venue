require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const eventRoutes = require('./src/routes/event.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const userRoutes = require('./src/routes/user.routes');
const organizerRoutes = require('./src/routes/organizer.routes');

// Import error handler
const errorHandler = require('./src/middleware/errorHandler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy for ngrok/Rate Limit
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://js.stripe.com", "https://unpkg.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.stripe.com"],
            mediaSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.stripe.com", "https://*.stripe.com", "https://unpkg.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://*.stripe.com"],
            workerSrc: ["'self'", "blob:"],
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_WINDOW || '15') * 60 * 1000,
    max: parseInt(process.env.API_RATE_LIMIT || '100'),
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organizer', organizerRoutes);

// Serve frontend HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   Event Management Platform - Server     ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`🎨 Frontend: http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  - POST   /api/auth/register');
    console.log('  - POST   /api/auth/login');
    console.log('  - GET    /api/events');
    console.log('  - POST   /api/events (auth)');
    console.log('  - POST   /api/payments/create-preference (auth)');
    console.log('  - GET    /api/organizer/dashboard (auth)');
    console.log('');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

module.exports = app;
