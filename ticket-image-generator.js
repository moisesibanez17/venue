const { createCanvas, loadImage } = require('canvas');

/**
 * Generate a ticket image with QR code
 * @param {Object} ticketData - Ticket information
 * @returns {Buffer} PNG image buffer
 */
async function generateTicketImage(ticketData) {
    const { full_name, quantity, ticket_token, qr_code, event_name, event_date, event_time, event_location } = ticketData;

    // Canvas dimensions (ticket size)
    const width = 800;
    const height = 1000;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Header gradient - Lime to Yellow
    const gradient = ctx.createLinearGradient(0, 0, width, 150);
    gradient.addColorStop(0, '#ccff00');
    gradient.addColorStop(1, '#ffff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 150);

    // Event name
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(event_name.toUpperCase(), width / 2, 90);

    // White section for QR
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 180, width - 100, 450);

    // Border for white section
    ctx.strokeStyle = '#ccff00';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 180, width - 100, 450);

    // "Tu Código de Entrada" text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TU CÓDIGO DE ENTRADA', width / 2, 230);

    // Load and draw QR code
    try {
        const qrImage = await loadImage(qr_code);
        const qrSize = 300;
        const qrX = (width - qrSize) / 2;
        const qrY = 260;
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    } catch (error) {
        console.error('Error loading QR code:', error);
    }

    // Ticket code text
    ctx.fillStyle = '#666666';
    ctx.font = '18px Arial';
    ctx.fillText(`Código: ${ticket_token.substring(0, 8).toUpperCase()}`, width / 2, 600);

    // Event details section
    const detailsY = 680;
    const lineHeight = 50;

    // Details background
    ctx.fillStyle = 'rgba(204, 255, 0, 0.1)';
    ctx.fillRect(50, detailsY, width - 100, 250);

    // Details border
    ctx.strokeStyle = '#ccff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, detailsY, width - 100, 250);

    // Detail items
    ctx.textAlign = 'left';

    // Date
    ctx.fillStyle = '#ccff00';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('📅 FECHA', 80, detailsY + 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(event_date, 80, detailsY + 70);

    // Time
    ctx.fillStyle = '#ccff00';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🕐 HORA', 80, detailsY + 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(event_time, 80, detailsY + 140);

    // Location
    ctx.fillStyle = '#ccff00';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('📍 LUGAR', 80, detailsY + 180);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(event_location, 80, detailsY + 210);

    // Attendee info at bottom
    ctx.fillStyle = '#ccff00';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(full_name.toUpperCase(), width / 2, 960);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`${quantity} BOLETO${quantity > 1 ? 'S' : ''}`, width / 2, 985);

    // Return PNG buffer
    return canvas.toBuffer('image/png');
}

module.exports = { generateTicketImage };
