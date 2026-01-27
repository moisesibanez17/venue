// Email Service using Resend
// Handles all email notifications for the ticketing system

const { Resend } = require('resend');
const QRCode = require('qrcode');
const { generateTicketImage } = require('./ticket-image-generator');
require('dotenv').config();
// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || '');

// Email configuration
const FROM_EMAIL = 'Neón Night Party <eventos@diferente.email>';
// Use environment variables for sensitive info to avoid Netlify secrets scanning false positives
const EVENT_NAME = process.env.EVENT_NAME || 'Evento';
const EVENT_DATE = process.env.EVENT_DATE || 'Fecha por definir';
const EVENT_TIME = process.env.EVENT_TIME || 'Hora por definir';
const EVENT_LOCATION = process.env.EVENT_LOCATION || 'Ubicación por definir';

/**
 * Send ticket email with QR code
 * @param {Object} ticketData - Ticket information
 * @param {string} ticketData.email - Recipient email
 * @param {string} ticketData.full_name - Customer name
 * @param {number} ticketData.quantity - Number of tickets
 * @param {string} ticketData.ticket_token - Unique ticket token
 * @param {string} ticketData.qr_code - QR code data URL
 */
async function sendTicketEmail(ticketData) {
    const { email, full_name, quantity, ticket_token, qr_code } = ticketData;

    try {
        // Generate ticket image with QR code
        const ticketImageBuffer = await generateTicketImage({
            full_name,
            quantity,
            ticket_token,
            qr_code,
            event_name: EVENT_NAME,
            event_date: EVENT_DATE,
            event_time: EVENT_TIME,
            event_location: EVENT_LOCATION
        });

        // Convert ticket image to base64 for email attachment
        const ticketImageBase64 = ticketImageBuffer.toString('base64');

        // Keep QR data URL for inline display in HTML
        const qrDataUrl = qr_code;

        // Also get base64 for QR attachment
        const base64Data = qr_code.replace(/^data:image\/png;base64,/, '');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu Boleto - ${EVENT_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #000000;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #000000;">
        <!-- Header -->
        <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #ccff00 0%, #ffff00 100%);">
                <h1 style="margin: 0; color: #000000; font-size: 32px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🎉 ${EVENT_NAME}
                </h1>
            </td>
        </tr>
        
        <!-- Content -->
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #ccff00; margin: 0 0 20px; font-size: 24px; text-transform: uppercase; text-shadow: 0 0 10px rgba(204,255,0,0.5);">
                    ¡Tu Boleto Está Listo!
                </h2>
                
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hola <strong style="color: #ccff00;">${full_name}</strong>,
                </p>
                
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    ¡Gracias por tu compra! Tu boleto para <strong>${EVENT_NAME}</strong> ha sido confirmado. 
                    A continuación encontrarás tu boleto digital.
                </p>
                
                <!-- Ticket Image -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="data:image/png;base64,${ticketImageBase64}" alt="Tu Boleto" style="max-width: 100%; width: 600px; height: auto; display: block; margin: 0 auto; border: 3px solid #ccff00; border-radius: 8px;" />
                </div>
                
                <!-- Important Info -->
                <div style="background: rgba(255,255,0,0.1); border-left: 4px solid #ffff00; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #ffff00; font-size: 14px; font-weight: bold; margin: 0 0 8px;">
                        ⚠️ IMPORTANTE
                    </p>
                    <ul style="color: #cccccc; font-size: 13px; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 5px;">Guarda esta imagen en tu dispositivo</li>
                        <li style="margin-bottom: 5px;">Presenta el código QR en la entrada</li>
                        <li style="margin-bottom: 5px;">Llega temprano para evitar filas</li>
                        <li style="margin-bottom: 5px;">Se requiere identificación oficial</li>
                        <li>Válido para ${quantity} persona${quantity > 1 ? 's' : ''}</li>
                    </ul>
                </div>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="padding: 30px; text-align: center; background-color: #000000; border-top: 2px solid #ccff00;">
                <p style="color: #888888; font-size: 12px; margin: 0 0 10px;">
                    ¿Tienes preguntas? Contáctanos
                </p>
                <p style="color: #ccff00; font-size: 14px; margin: 0;">
                    <strong>${EVENT_NAME}</strong>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        `;


        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `🎫 Tu Boleto - ${EVENT_NAME}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `boleto-${ticket_token.substring(0, 8)}.png`,
                    content: ticketImageBase64,
                    disposition: 'attachment'
                }
            ]
        });

        console.log('✅ Ticket email sent to:', email, '- ID:', result.id);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('❌ Error sending ticket email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send reminder email before event
 * @param {Object} ticketData - Ticket information
 * @param {string} ticketData.email - Recipient email
 * @param {string} ticketData.full_name - Customer name
 * @param {number} ticketData.quantity - Number of tickets
 */
async function sendReminderEmail(ticketData) {
    const { email, full_name, quantity } = ticketData;

    try {
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio - ${EVENT_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e;">
        <!-- Header -->
        <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                    ⏰ ¡ES MAÑANA!
                </h1>
            </td>
        </tr>
        
        <!-- Content -->
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #00f5ff; margin: 0 0 20px; font-size: 24px; text-transform: uppercase;">
                    ${EVENT_NAME}
                </h2>
                
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hola <strong style="color: #ff006e;">${full_name}</strong>,
                </p>
                
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    ¡No olvides que el evento es mañana! Asegúrate de tener tu código QR listo para el acceso.
                </p>
                
                <!-- Event Details -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0,245,255,0.1); border: 2px solid #00f5ff; border-radius: 8px; margin-bottom: 30px;">
                    <tr>
                        <td style="padding: 25px; text-align: center;">
                            <p style="color: #00f5ff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px;">
                                📅 Detalles del Evento
                            </p>
                            <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 5px;">
                                ${EVENT_DATE}
                            </p>
                            <p style="color: #ffffff; font-size: 18px; margin: 0 0 15px;">
                                ${EVENT_TIME}
                            </p>
                            <p style="color: #cccccc; font-size: 14px; margin: 0;">
                                📍 ${EVENT_LOCATION}
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Checklist -->
                <div style="background: rgba(255,0,110,0.1); border-left: 4px solid #ff006e; padding: 20px; margin-bottom: 30px;">
                    <p style="color: #ff006e; font-size: 16px; font-weight: bold; margin: 0 0 15px;">
                        ✓ Lista de Verificación
                    </p>
                    <ul style="color: #cccccc; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Tu código QR (impreso o en celular)</li>
                        <li>Identificación oficial</li>
                        <li>Buen ánimo y energía 🎉</li>
                    </ul>
                </div>
                
                <p style="color: #cccccc; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                    <strong>Boletos:</strong> ${quantity} persona${quantity > 1 ? 's' : ''}
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #00f5ff; font-size: 18px; font-weight: bold; margin: 0;">
                        ¡Nos vemos mañana! 🎊
                    </p>
                </div>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="padding: 30px; text-align: center; background-color: #0d0d1a;">
                <p style="color: #888888; font-size: 12px; margin: 0;">
                    ${EVENT_NAME}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `⏰ ¡Mañana es el evento! - ${EVENT_NAME}`,
            html: htmlContent,
        });

        console.log('✅ Reminder email sent to:', email, '- ID:', result.id);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('❌ Error sending reminder email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendTicketEmail,
    sendReminderEmail
};
