const transporter = require('../config/email');
const path = require('path');

class EmailService {
    /**
     * Send email
     */
    static async send({ to, subject, html, attachments = [] }) {
        try {
            console.log(`[EmailService] Attempting to send email via Gmail to: ${to}`);

            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'Event Platform'}" <${process.env.GMAIL_USER}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                html,
                attachments: attachments.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    path: att.path // Support both content and path
                }))
            };

            const info = await transporter.sendMail(mailOptions);

            console.log('✅ Email sent successfully via Gmail. ID:', info.messageId);
            return info;
        } catch (error) {
            console.error('❌ Email Service Exception (Gmail SMTP):', {
                message: error.message,
                stack: error.stack,
                details: error
            });
            return null;
        }
    }

    /**
     * Send welcome email
     */
    static async sendWelcome(user) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Event Platform!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.full_name},</h2>
                        <p>Thank you for joining our event management platform!</p>
                        <p>You can now:</p>
                        <ul>
                            <li>Discover amazing events</li>
                            <li>Purchase tickets easily</li>
                            <li>Manage your bookings</li>
                            ${user.role === 'organizer' ? '<li>Create and manage your own events</li>' : ''}
                        </ul>
                        <a href="${process.env.FRONTEND_URL}" class="button">Explore Events</a>
                    </div>
                    <div class="footer">
                        <p>© 2026 Event Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.send({
            to: user.email,
            subject: 'Welcome to Event Platform!',
            html
        });
    }

    /**
     * Send ticket confirmation email
     */
    static async sendTicketConfirmation(purchase, tickets, pdfPath = null) {
        const event = purchase.event;
        const user = purchase.user;

        const eventDate = new Date(event.event_date_start).toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; }
                    .event-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .ticket-info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 10px 0; }
                    .total { font-size: 24px; color: #667eea; font-weight: bold; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Your Tickets Are Ready!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.full_name},</h2>
                        <p>Your purchase was successful! Here are your event details:</p>
                        
                        <div class="event-card">
                            <h3>${event.title}</h3>
                            <p><strong>Date:</strong> ${eventDate}</p>
                            <p><strong>Location:</strong> ${event.location_address || 'Online Event'}</p>
                            ${event.location_city ? `<p><strong>City:</strong> ${event.location_city}</p>` : ''}
                        </div>

                        <div class="ticket-info">
                            <p><strong>Ticket Type:</strong> ${purchase.ticket_type.name}</p>
                            <p><strong>Quantity:</strong> ${purchase.quantity}</p>
                            <p><strong>Total Paid:</strong> <span class="total">$${purchase.total}</span></p>
                        </div>

                        <p>Your tickets are attached to this email as a PDF. You can also access them anytime in your account.</p>

                        <p><strong>Important:</strong> Please present the QR code on your ticket at the event entrance.</p>

                        <a href="${process.env.FRONTEND_URL}/profile.html" class="button">View My Tickets</a>
                    </div>
                    <div class="footer">
                        <p>See you at the event! 🎊</p>
                        <p>© 2026 Event Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const attachments = [];

        if (pdfPath && require('fs').existsSync(pdfPath)) {
            attachments.push({
                filename: `tickets-${purchase.id}.pdf`,
                path: pdfPath
            });
        }

        return await this.send({
            to: user.email,
            subject: `Your Tickets for ${event.title}`,
            html,
            attachments
        });
    }

    /**
     * Send event reminder
     */
    static async sendEventReminder(ticket) {
        const event = ticket.event;
        const user = ticket.user;

        const eventDate = new Date(event.event_date_start).toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .event-info { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .highlight { color: #f5576c; font-weight: bold; font-size: 18px; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Event Reminder</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.full_name},</h2>
                        <p class="highlight">Your event is coming up soon!</p>
                        
                        <div class="event-info">
                            <h3>${event.title}</h3>
                            <p><strong>When:</strong> ${eventDate}</p>
                            <p><strong>Where:</strong> ${event.location_address}</p>
                            <p><strong>Ticket:</strong> ${ticket.ticket_type.name} - #${ticket.ticket_number}</p>
                        </div>

                        <p>Don't forget to bring your ticket with the QR code!</p>
                        <p>We're excited to see you there! 🎉</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Event Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.send({
            to: user.email,
            subject: `Reminder: ${event.title} is tomorrow!`,
            html
        });
    }

    /**
     * Send password reset email
     */
    static async sendPasswordReset(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #333; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .warning { color: #e74c3c; font-size: 12px; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.full_name},</h2>
                        <p>You requested to reset your password. Click the button below to create a new password:</p>
                        
                        <a href="${resetUrl}" class="button">Reset Password</a>

                        <p class="warning">This link will expire in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Event Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.send({
            to: user.email,
            subject: 'Password Reset Request',
            html
        });
    }

    /**
     * Send tickets email
     */
    static async sendTickets(email, { event, tickets, purchase }) {
        const eventDate = new Date(event.event_date_start).toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; }
                    .event-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .ticket { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #667eea; }
                    .qr-code { text-align: center; margin: 20px 0; }
                    .qr-code img { width: 200px; height: 200px; }
                    .total { font-size: 24px; color: #667eea; font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 ¡Tus Boletos Están Listos!</h1>
                    </div>
                    <div class="content">
                        <h2>Hola,</h2>
                        <p>Tu compra fue exitosa. Aquí están los detalles de tu evento:</p>
                        
                        <div class="event-card">
                            <h3>${event.title}</h3>
                            <p><strong>Fecha:</strong> ${eventDate}</p>
                            <p><strong>Ubicación:</strong> ${event.location_address || 'Evento en línea'}</p>
                            ${event.location_city ? `<p><strong>Ciudad:</strong> ${event.location_city}</p>` : ''}
                        </div>

                        <h3>Tus Boletos:</h3>
                        ${tickets.map((ticket, index) => `
                            <div class="ticket">
                                <p><strong>Boleto #${index + 1}</strong></p>
                                <p><strong>Número:</strong> ${ticket.ticket_number}</p>
                                <p><strong>Estado:</strong> ${ticket.status}</p>
                                <div class="qr-code">
                                    <img src="${ticket.qr_code}" alt="QR Code">
                                    <p style="font-size: 12px; color: #666;">Escanea este código en el evento</p>
                                </div>
                            </div>
                        `).join('')}

                        <p><strong>Total Pagado:</strong> <span class="total">$${purchase.total}</span></p>

                        <p><strong>Importante:</strong> Por favor presenta el código QR de tu boleto en la entrada del evento.</p>
                    </div>
                    <div class="footer">
                        <p>¡Nos vemos en el evento! 🎊</p>
                        <p>© 2026 Event Platform. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.send({
            to: email,
            subject: `Tus Boletos para ${event.title}`,
            html
        });
    }
}

module.exports = EmailService;
