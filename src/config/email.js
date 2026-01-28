const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Verify API key is configured
if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured');
} else {
    console.log('✅ Resend email service configured');
}

module.exports = resend;
