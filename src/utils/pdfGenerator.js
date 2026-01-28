const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRGenerator = require('./qrGenerator');

class PDFGenerator {
    /**
     * Generate ticket PDF
     */
    static async generateTicket(ticket, outputPath = null) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });

                // If no output path, generate one
                if (!outputPath) {
                    const pdfDir = path.join(process.cwd(), 'uploads', 'tickets');
                    if (!fs.existsSync(pdfDir)) {
                        fs.mkdirSync(pdfDir, { recursive: true });
                    }
                    outputPath = path.join(pdfDir, `ticket-${ticket.ticket_number}.pdf`);
                }

                const stream = fs.createWriteStream(outputPath);
                doc.pipe(stream);

                // Colors
                const colors = {
                    primary: '#4F46E5', // Indigo 600
                    secondary: '#1F2937', // Gray 800
                    accent: '#818CF8', // Indigo 400
                    text: '#374151', // Gray 700
                    lightText: '#6B7280', // Gray 500
                    white: '#FFFFFF',
                    bg: '#F3F4F6' // Gray 100
                };

                // Background
                doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);

                // TICKET CONTAINER (Card style)
                const margin = 40;
                const cardWidth = doc.page.width - (margin * 2);
                const cardHeight = doc.page.height - (margin * 2);

                // Shadow effect (simulated with gray rectangles)
                doc.roundedRect(margin + 5, margin + 5, cardWidth, cardHeight, 10).fill('#E5E7EB');

                // Main Card
                doc.roundedRect(margin, margin, cardWidth, cardHeight, 10).fill(colors.white);
                doc.clip(); // Clip everything to the rounded card

                // === HEADER ===
                const headerHeight = 120;
                doc.rect(margin, margin, cardWidth, headerHeight).fill(colors.primary);

                // Event Title (White text on primary color)
                doc.fontSize(24)
                    .font('Helvetica-Bold')
                    .fillColor(colors.white)
                    .text(ticket.event.title.toUpperCase(), margin + 30, margin + 35, {
                        width: cardWidth - 60,
                        align: 'center'
                    });

                // Subtitle / Label
                doc.fontSize(12)
                    .font('Helvetica')
                    .fillColor(colors.accent)
                    .text('TICKET DE ACCESO', margin + 30, margin + 80, {
                        width: cardWidth - 60,
                        align: 'center',
                        characterSpacing: 2
                    });

                // === EVENT DETAILS ===
                const contentStart = margin + headerHeight + 40;
                let currentY = contentStart;

                // Date Box
                const eventDate = new Date(ticket.event.event_date_start);
                const dateBoxWidth = (cardWidth - 60) / 2;

                // Column 1: Date & Time
                doc.fillColor(colors.secondary).fontSize(10).font('Helvetica-Bold').text('FECHA Y HORA', margin + 30, currentY);
                doc.moveDown(0.5);
                doc.fillColor(colors.text).fontSize(14).font('Helvetica').text(eventDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase(), margin + 30);

                doc.fillColor(colors.lightText).fontSize(12).text(eventDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' HRS');

                // Column 2: Location
                const col2X = margin + (cardWidth / 2) + 15;
                doc.fillColor(colors.secondary).fontSize(10).font('Helvetica-Bold').text('UBICACIÓN', col2X, currentY);
                doc.moveDown(0.5);

                if (ticket.event.location_address) {
                    doc.fillColor(colors.text).fontSize(12).font('Helvetica').text(ticket.event.location_address, col2X, doc.y, { width: dateBoxWidth - 10 });
                }
                if (ticket.event.location_city) {
                    doc.moveDown(0.2);
                    doc.fillColor(colors.lightText).fontSize(10).text(ticket.event.location_city, col2X);
                }

                currentY += 100;

                // Separator Line
                doc.moveTo(margin + 30, currentY)
                    .lineTo(margin + cardWidth - 30, currentY)
                    .strokeColor('#E5E7EB')
                    .lineWidth(1)
                    .dash(5, { space: 5 })
                    .stroke();

                currentY += 30;

                // === ATTENDEE & TICKET INFO ===
                doc.undash();

                // Attendee Label
                doc.fillColor(colors.secondary).fontSize(10).font('Helvetica-Bold').text('ASISTENTE', margin + 30, currentY);
                doc.moveDown(0.5);
                doc.fillColor(colors.text).fontSize(16).text(ticket.user.full_name, margin + 30);
                doc.fillColor(colors.lightText).fontSize(10).text(ticket.user.email);

                // Ticket Type Label (Right aligned)
                doc.fillColor(colors.secondary).fontSize(10).font('Helvetica-Bold').text('TIPO DE BOLETO', col2X, currentY);
                doc.moveDown(0.5);
                doc.fillColor(colors.primary).fontSize(16).text(ticket.ticket_type.name, col2X);
                doc.fillColor(colors.lightText).fontSize(10).text(`ID: ${ticket.ticket_number}`, col2X);

                currentY += 100;

                // === QR CODE ===
                const qrSize = 180;
                const qrX = margin + (cardWidth - qrSize) / 2;

                // QR Background Box
                doc.roundedRect(qrX - 10, currentY - 10, qrSize + 20, qrSize + 20, 5)
                    .fill('#FFFFFF')
                    .stroke('#E5E7EB')
                    .lineWidth(1)
                    .stroke();

                // Generate and Embed QR
                try {
                    const qrData = JSON.stringify({
                        ticket: ticket.ticket_number,
                        event: ticket.event_id,
                        user: ticket.user_id
                    });
                    const qrBuffer = await QRGenerator.generateBuffer(qrData);
                    doc.image(qrBuffer, qrX, currentY, { width: qrSize, height: qrSize });
                } catch (e) {
                    console.error("Error embedding QR", e);
                }

                currentY += qrSize + 30;

                // Footer Text
                doc.font('Helvetica')
                    .fontSize(9)
                    .fillColor(colors.lightText)
                    .text('Presenta este código QR en la entrada del evento.', margin, currentY, {
                        width: cardWidth,
                        align: 'center'
                    });

                doc.moveDown(0.5);
                doc.fontSize(8)
                    .text('Este boleto es personal e intransferible.', { align: 'center' });

                // Footer Branding
                doc.text(process.env.APP_NAME || 'Event Platform', margin, margin + cardHeight - 30, {
                    width: cardWidth,
                    align: 'center',
                    color: colors.primary
                });

                doc.end();

                stream.on('finish', () => {
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate multiple tickets PDF
     */
    static async generateMultipleTickets(tickets, outputPath) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const stream = fs.createWriteStream(outputPath);
                doc.pipe(stream);

                for (let i = 0; i < tickets.length; i++) {
                    if (i > 0) {
                        doc.addPage();
                    }

                    const ticket = tickets[i];

                    // Similar content as single ticket
                    // (Simplified for brevity - reuse code from generateTicket)

                    doc.fontSize(24).text('EVENT TICKET', { align: 'center' });
                    doc.moveDown();
                    doc.fontSize(12).text(`Ticket #${ticket.ticket_number}`, { align: 'center' });
                    doc.moveDown(2);
                    doc.fontSize(18).text(ticket.event.title);
                    doc.moveDown();
                    doc.fontSize(12).text(`Type: ${ticket.ticket_type.name}`);
                    doc.text(`Attendee: ${ticket.user.full_name}`);
                    doc.moveDown(2);

                    const qrData = JSON.stringify({
                        ticket: ticket.ticket_number,
                        event: ticket.event_id
                    });

                    const qrBuffer = await QRGenerator.generateBuffer(qrData);
                    const qrSize = 200;
                    const xPosition = (doc.page.width - qrSize) / 2;

                    doc.image(qrBuffer, xPosition, doc.y, {
                        fit: [qrSize, qrSize]
                    });
                }

                doc.end();

                stream.on('finish', () => {
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFGenerator;
