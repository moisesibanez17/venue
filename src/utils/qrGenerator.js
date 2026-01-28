const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class QRGenerator {
    /**
     * Generate QR code as data URL
     */
    static async generateDataURL(data) {
        try {
            return await QRCode.toDataURL(data, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (error) {
            console.error('QR Generation Error:', error);
            throw error;
        }
    }

    /**
     * Generate QR code and save to file
     */
    static async generateFile(data, filename) {
        try {
            const qrDir = path.join(process.cwd(), 'uploads', 'qr-codes');

            // Ensure directory exists
            if (!fs.existsSync(qrDir)) {
                fs.mkdirSync(qrDir, { recursive: true });
            }

            const filepath = path.join(qrDir, filename);

            await QRCode.toFile(filepath, data, {
                errorCorrectionLevel: 'H',
                type: 'png',
                quality: 0.95,
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return filepath;
        } catch (error) {
            console.error('QR File Generation Error:', error);
            throw error;
        }
    }

    /**
     * Generate QR code for ticket
     */
    static async generateForTicket(ticketNumber) {
        // Create ticket validation URL or ticket data
        const qrData = JSON.stringify({
            ticket: ticketNumber,
            timestamp: new Date().toISOString(),
            type: 'event_ticket'
        });

        return await this.generateDataURL(qrData);
    }

    /**
     * Generate QR code buffer for embedding in PDF
     */
    static async generateBuffer(data) {
        try {
            return await QRCode.toBuffer(data, {
                errorCorrectionLevel: 'H',
                type: 'png',
                quality: 0.95,
                margin: 1,
                width: 300
            });
        } catch (error) {
            console.error('QR Buffer Generation Error:', error);
            throw error;
        }
    }
}

module.exports = QRGenerator;
