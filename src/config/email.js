const nodemailer = require('nodemailer');

// Verify configuration
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('⚠️  Gmail SMTP credentials not configured (GMAIL_USER, GMAIL_PASS)');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// Verify connection
if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    transporter.verify(function (error, success) {
        if (error) {
            console.error('❌ Gmail SMTP connection error:', error);
        } else {
            console.log('✅ Gmail SMTP service ready');
        }
    });
}

module.exports = transporter;
