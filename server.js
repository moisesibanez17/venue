require('dotenv').config(); // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./database'); // Ahora importa el cliente Supabase
const fs = require('fs');
const bcrypt = require('bcrypt');
const { authenticateAdmin, requireAuth, logout, hashPassword } = require('./auth-middleware');
const { sendTicketEmail, sendReminderEmail } = require('./email-service');

const app = express();
const PORT = 3000;

// Configuración de Mercado Pago
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

/**
 * Calculate ticket price based on quantity
 * 1-2 tickets: $25 each
 * 3+ tickets: $20 each (bulk discount)
 */
function calculatePricePerTicket(quantity) {
    return quantity >= 3 ? 20 : 25;
}

/**
 * Calculate total pricing including discounts
 */
function calculateTotalPrice(quantity, discountCode = null, discountValue = 0, discountType = null) {
    const pricePerTicket = calculatePricePerTicket(quantity);
    let subtotal = pricePerTicket * quantity;
    const platformFee = 5; // $5 total per order

    // Apply discount code if provided
    let discountAmount = 0;
    if (discountCode && discountValue > 0) {
        if (discountType === 'percentage') {
            discountAmount = subtotal * (discountValue / 100);
        } else if (discountType === 'fixed') {
            discountAmount = discountValue;
        }
        subtotal = Math.max(0, subtotal - discountAmount);
    }

    const total = subtotal + platformFee;

    return {
        pricePerTicket,
        subtotal: subtotal + discountAmount, // Original subtotal
        discountAmount,
        finalSubtotal: subtotal,
        platformFee,
        total
    };
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Middleware de logs
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Test endpoint para verificar conectividad
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is reachable' });
});

// Webhook de Mercado Pago
app.post('/api/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));

        // Mercado Pago envía notificaciones de tipo "payment"
        if (type === 'payment') {
            const paymentId = data.id;

            // Importar Payment SDK para consultar detalles
            const { Payment } = require('mercadopago');
            const payment = new Payment(client);

            // Obtener información del pago
            const paymentInfo = await payment.get({ id: paymentId });

            console.log('Payment Info:', JSON.stringify(paymentInfo, null, 2));

            const externalReference = paymentInfo.external_reference; // ticket_token
            const status = paymentInfo.status; // approved, pending, rejected

            if (status === 'approved' && externalReference) {
                // Actualizar en Supabase
                const { data: updateData, error } = await supabase
                    .from('bookings')
                    .update({
                        payment_status: 'completed',
                        mercadopago_id: paymentId.toString()
                    })
                    .eq('ticket_token', externalReference);

                if (error) {
                    console.error('Error actualizando Supabase:', error);
                } else {
                    console.log('✅ Pago confirmado y actualizado en DB para:', externalReference);

                    // Fetch booking data to send email
                    const { data: booking, error: fetchError } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('ticket_token', externalReference)
                        .single();

                    if (!fetchError && booking) {
                        // Generate QR code
                        const validationUrl = `http://localhost:${PORT}/validate/${externalReference}`;
                        const qrCodeImage = await QRCode.toDataURL(validationUrl);

                        // Send ticket email
                        const emailResult = await sendTicketEmail({
                            email: booking.email,
                            full_name: booking.full_name,
                            quantity: booking.quantity || 1,
                            ticket_token: externalReference,
                            qr_code: qrCodeImage
                        });

                        if (emailResult.success) {
                            console.log('✅ Ticket email sent successfully');
                        } else {
                            console.error('❌ Failed to send ticket email:', emailResult.error);
                        }
                    }
                }
            }
        }

        // Sempre responder 200 OK para que Mercado Pago no reintente
        res.sendStatus(200);

    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(200); // Aun con error, responder 200
    }
});

// Ruta para guardar registro inicial
app.post('/api/register', async (req, res) => {
    const { full_name, email, phone, quantity = 1, discount_code = null } = req.body;
    const ticket_token = uuidv4();

    try {
        // Validate and apply discount code if provided
        let discountData = null;
        if (discount_code) {
            const { data: discount, error: discountError } = await supabase
                .from('discount_codes')
                .select('*')
                .eq('code', discount_code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (!discountError && discount) {
                // Check if discount has reached max uses
                if (discount.max_uses && discount.current_uses >= discount.max_uses) {
                    return res.status(400).json({ error: 'Código de descuento ya no está disponible' });
                }
                discountData = discount;
            }
        }

        // Calculate pricing
        const pricing = calculateTotalPrice(
            quantity,
            discountData?.code,
            discountData?.discount_value,
            discountData?.discount_type
        );

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                full_name,
                email,
                phone,
                ticket_token,
                quantity,
                discount_code: discountData?.code || null,
                price_per_ticket: pricing.pricePerTicket,
                final_price: pricing.total
            }])
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("No se devolvieron datos al insertar.");

        // Increment discount code usage if used
        if (discountData) {
            await supabase
                .from('discount_codes')
                .update({ current_uses: discountData.current_uses + 1 })
                .eq('id', discountData.id);
        }

        res.json({
            id: data[0].id,
            ticket_token: ticket_token,
            pricing,
            message: 'Registro guardado correctamente'
        });
    } catch (error) {
        console.error('Error Supabase (Register):', error.message);
        res.status(500).json({ error: 'Error al registrar usuario en base de datos' });
    }
});

// Ruta para crear preferencia de Mercado Pago
app.post('/api/create-preference', async (req, res) => {
    const { ticket_token } = req.body;

    try {
        // Get booking details to get actual pricing
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('ticket_token', ticket_token)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        const preference = new Preference(client);

        // Ensure all values are proper numbers
        const finalPrice = Number(booking.final_price) || 30;
        const platformFee = 5;
        const ticketPrice = finalPrice - platformFee;

        console.log('Creating preference with:', {
            finalPrice,
            platformFee,
            ticketPrice,
            quantity: booking.quantity
        });

        // Create items array based on what's in the booking
        const items = [
            {
                title: `Entrada Neón Night Party - Preventa (x${booking.quantity})`,
                quantity: 1, // Always 1 because we're selling this as a single item
                unit_price: Number(ticketPrice.toFixed(2)),
                currency_id: 'MXN',
            },
            {
                title: 'Tarifa de Plataforma',
                quantity: 1,
                unit_price: Number(platformFee.toFixed(2)),
                currency_id: 'MXN',
            }
        ];

        console.log('Items to send to Mercado Pago:', JSON.stringify(items, null, 2));

        const result = await preference.create({
            body: {
                items,
                external_reference: ticket_token,
                back_urls: {
                    success: "https://094c61c07388.ngrok-free.app/success.html",
                    failure: "https://094c61c07388.ngrok-free.app/failure.html",
                    pending: "https://094c61c07388.ngrok-free.app/pending.html",
                },
                auto_return: 'approved',
                statement_descriptor: 'NEON NIGHT PARTY',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 6
                },
                notification_url: "https://094c61c07388.ngrok-free.app/api/webhook",
            }
        });

        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error Mercado Pago:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message || JSON.stringify(error) });
    }
});

// Ruta para buscar ticket por email
app.get('/api/ticket-by-email/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const { data: rows, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('email', email)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró ningún ticket' });
        }

        const row = rows[0];
        const validationUrl = `http://localhost:${PORT}/validate/${row.ticket_token}`;
        const qrCodeImage = await QRCode.toDataURL(validationUrl);

        res.json({
            ...row,
            qr_code: qrCodeImage
        });

    } catch (err) {
        console.error('Error buscando ticket:', err.message);
        res.status(500).json({ error: 'Error buscando ticket en base de datos' });
    }
});

// Ruta para generar QR (simulada/validada post-pago)
app.get('/api/ticket/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Consultar Supabase
        const { data: row, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('ticket_token', token)
            .single();

        if (error) throw error;
        if (!row) return res.status(404).json({ error: 'Boleto no encontrado' });

        // Generar QR con la información del token o una URL de validación
        const validationUrl = `http://localhost:${PORT}/validate/${token}`;
        const qrCodeImage = await QRCode.toDataURL(validationUrl);

        res.json({
            ...row,
            qr_code: qrCodeImage
        });

    } catch (err) {
        console.error('Error recuperando boleto:', err.message);
        res.status(500).json({ error: 'Error generando QR o consultando base de datos' });
    }
});

// Endpoint para validar/escanear tickets (Admin)
app.post('/api/validate/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Buscar ticket
        const { data: ticket, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .eq('ticket_token', token)
            .single();

        if (fetchError) throw fetchError;
        if (!ticket) {
            return res.status(404).json({
                valid: false,
                message: 'Ticket no encontrado'
            });
        }

        // Verificar si ya fue usado
        if (ticket.scanned_at) {
            return res.json({
                valid: false,
                message: 'Ticket ya fue escaneado',
                ticket: {
                    full_name: ticket.full_name,
                    scanned_at: ticket.scanned_at,
                    payment_status: ticket.payment_status
                }
            });
        }

        // Verificar si el pago fue completado
        if (ticket.payment_status !== 'completed') {
            return res.json({
                valid: false,
                message: 'Pago no completado',
                ticket: {
                    full_name: ticket.full_name,
                    payment_status: ticket.payment_status
                }
            });
        }

        // Marcar como escaneado
        const { data: updated, error: updateError } = await supabase
            .from('bookings')
            .update({ scanned_at: new Date().toISOString() })
            .eq('ticket_token', token)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            valid: true,
            message: '✅ Ticket válido - Acceso permitido',
            ticket: {
                full_name: updated.full_name,
                email: updated.email,
                scanned_at: updated.scanned_at
            }
        });

    } catch (error) {
        console.error('Error validando ticket:', error);
        res.status(500).json({
            valid: false,
            message: 'Error del servidor'
        });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Username received:', username);
    console.log('Password received:', password);

    if (!username || !password) {
        console.log('❌ Missing username or password');
        return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authenticateAdmin(username, password);

    console.log('Auth result:', result);
    console.log('=== END LOGIN ATTEMPT ===\n');

    if (result.success) {
        res.json({
            success: true,
            token: result.token,
            username: result.username
        });
    } else {
        res.status(401).json({ success: false, message: result.message });
    }
});

// Admin logout
app.post('/api/admin/logout', requireAuth, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    logout(token);
    res.json({ success: true });
});

// Validate discount code
app.get('/api/validate-discount/:code', async (req, res) => {
    const { code } = req.params;

    try {
        const { data: discount, error } = await supabase
            .from('discount_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error || !discount) {
            return res.json({
                valid: false,
                message: 'Código no válido o inactivo'
            });
        }

        // Check max uses
        if (discount.max_uses && discount.current_uses >= discount.max_uses) {
            return res.json({
                valid: false,
                message: 'Código ya alcanzó el límite de usos'
            });
        }

        res.json({
            valid: true,
            discount: {
                code: discount.code,
                type: discount.discount_type,
                value: discount.discount_value
            }
        });
    } catch (error) {
        console.error('Error validating discount:', error);
        res.status(500).json({ error: 'Error validando código' });
    }
});

// Generate free ticket (requires admin auth)
app.post('/api/admin/generate-free-ticket', requireAuth, async (req, res) => {
    const { full_name, email, phone, quantity = 1 } = req.body;

    if (!full_name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
        const ticket_token = uuidv4();

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                full_name,
                email,
                phone: phone || 'N/A',
                ticket_token,
                quantity,
                payment_status: 'completed', // Free tickets are pre-approved
                price_per_ticket: 0,
                final_price: 0,
                discount_code: 'FREE_ADMIN'
            }])
            .select();

        if (error) throw error;

        // Generate QR code
        const validationUrl = `http://localhost:${PORT}/validate/${ticket_token}`;
        const qrCodeImage = await QRCode.toDataURL(validationUrl);

        // Send ticket email
        const emailResult = await sendTicketEmail({
            email,
            full_name,
            quantity,
            ticket_token,
            qr_code: qrCodeImage
        });

        if (emailResult.success) {
            console.log('✅ Free ticket email sent successfully to:', email);
        } else {
            console.error('❌ Failed to send free ticket email:', emailResult.error);
        }

        res.json({
            success: true,
            ticket: {
                ...data[0],
                qr_code: qrCodeImage
            },
            email_sent: emailResult.success
        });
    } catch (error) {
        console.error('Error generating free ticket:', error);
        res.status(500).json({ error: 'Error generando boleto gratis' });
    }
});

// Create discount code (requires admin auth)
app.post('/api/admin/create-discount-code', requireAuth, async (req, res) => {
    const { code, discount_type, discount_value, max_uses = null } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
        return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
        return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .insert([{
                code: code.toUpperCase(),
                discount_type,
                discount_value: Number(discount_value),
                max_uses: max_uses ? Number(max_uses) : null,
                created_by: req.admin.username
            }])
            .select();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ error: 'Código ya existe' });
            }
            throw error;
        }

        res.json({ success: true, discount: data[0] });
    } catch (error) {
        console.error('Error creating discount code:', error);
        res.status(500).json({ error: 'Error creando código de descuento' });
    }
});

// Get all discount codes (requires admin auth)
app.get('/api/admin/discount-codes', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ codes: data });
    } catch (error) {
        console.error('Error fetching discount codes:', error);
        res.status(500).json({ error: 'Error obteniendo códigos' });
    }
});

// Toggle discount code active status (requires admin auth)
app.patch('/api/admin/discount-code/:id/toggle', requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        // Get current status
        const { data: current, error: fetchError } = await supabase
            .from('discount_codes')
            .select('is_active')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Toggle status
        const { data, error } = await supabase
            .from('discount_codes')
            .update({ is_active: !current.is_active })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, discount: data[0] });
    } catch (error) {
        console.error('Error toggling discount code:', error);
        res.status(500).json({ error: 'Error actualizando código' });
    }
});

// Send reminder emails to all attendees
app.post('/api/admin/send-reminders', requireAuth, async (req, res) => {
    try {
        // Get all completed bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_status', 'completed');

        if (error) throw error;

        if (!bookings || bookings.length === 0) {
            return res.json({
                success: true,
                message: 'No bookings found',
                sent: 0
            });
        }

        let sentCount = 0;
        let failedCount = 0;

        // Send reminder to each booking
        for (const booking of bookings) {
            const result = await sendReminderEmail({
                email: booking.email,
                full_name: booking.full_name,
                quantity: booking.quantity || 1
            });

            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
            }
        }

        console.log(`✅ Sent ${sentCount} reminder emails, ${failedCount} failed`);

        res.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            total: bookings.length
        });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ error: 'Error enviando recordatorios' });
    }
});

// Export app for serverless usage
module.exports = app;

// Only start the server if running directly (not required by module)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}
