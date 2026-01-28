// ================================================
// Checkout Page Logic - Stripe Checkout
// ================================================

const urlParams = new URLSearchParams(window.location.search);
const ticketTypeId = urlParams.get('ticketType');
const quantity = parseInt(urlParams.get('quantity') || 1);
const eventId = urlParams.get('event');
const canceled = urlParams.get('canceled');

let ticketType, event;
let appliedPromo = null;

// Show cancellation message if user returned from Stripe
if (canceled) {
    ui.showAlert('Pago cancelado. Puedes intentar de nuevo.', 'warning');
}

// Load order data
async function loadOrderData() {
    try {
        ui.showLoading();

        // Load event
        event = await apiCall(`/events/${eventId}`);

        // Find ticket type
        ticketType = event.ticket_types.find(t => t.id === ticketTypeId);

        if (!ticketType) {
            throw new Error('Tipo de boleto no encontrado');
        }

        // Load user data if authenticated
        const userData = auth.getUser();
        if (userData) {
            document.getElementById('fullName').value = userData.full_name || '';
            document.getElementById('email').value = userData.email || '';
        }
        // For guest users, fields will remain empty for them to fill

        renderOrderSummary();
    } catch (error) {
        ui.showAlert('Error cargando datos de la orden', 'error');
        console.error(error);
    } finally {
        ui.hideLoading();
    }
}

// Render order summary
function renderOrderSummary() {
    const subtotal = ticketType.price * quantity;
    const fee = subtotal * 0.10; // 10% Platform Fee
    const discount = appliedPromo ? (subtotal * appliedPromo.discount_percent / 100) : 0;
    const total = subtotal + fee - discount;

    document.getElementById('orderSummary').innerHTML = `
        <div style="margin-bottom: 1rem;">
            <p><strong>${event.title}</strong></p>
            <p style="color: var(--gray);">${ticketType.name}</p>
        </div>
        <div class="flex-between mb-2">
            <span>Cantidad:</span>
            <span>${quantity}</span>
        </div>
        <div class="flex-between mb-2">
            <span>Precio Unitario:</span>
            <span>${ui.formatCurrency(ticketType.price)}</span>
        </div>
        <div class="flex-between mb-2">
            <span>Subtotal:</span>
            <span>${ui.formatCurrency(subtotal)}</span>
        </div>
        <div class="flex-between mb-2" style="font-size: 0.9em; color: var(--gray);">
            <span>Tarifa de Servicio (10%):</span>
            <span>${ui.formatCurrency(fee)}</span>
        </div>
        ${discount > 0 ? `
            <div class="flex-between mb-2" style="color: var(--success);">
                <span>Descuento (${appliedPromo.code}):</span>
                <span>-${ui.formatCurrency(discount)}</span>
            </div>
        ` : ''}
        <hr>
        <div class="flex-between">
            <strong>Total:</strong>
            <strong style="color: var(--primary); font-size: 1.5rem;">${ui.formatCurrency(total)}</strong>
        </div>
    `;
}

// Apply promo code
async function applyPromoCode() {
    const code = document.getElementById('promoCode').value.trim();
    const messageEl = document.getElementById('promoMessage');

    if (!code) {
        messageEl.innerHTML = '';
        appliedPromo = null;
        renderOrderSummary();
        return;
    }

    try {
        // Validate promo code
        const response = await apiCall(`/promo-codes/validate?code=${code}&eventId=${eventId}`);
        appliedPromo = response;
        messageEl.innerHTML = `<div class="alert alert-success">¡Código aplicado! ${response.discount_percent}% de descuento</div>`;
        renderOrderSummary();
    } catch (error) {
        messageEl.innerHTML = `<div class="alert alert-error">${error.message || 'Código inválido'}</div>`;
        appliedPromo = null;
        renderOrderSummary();
    }
}

// Handle form submission - Redirect to Stripe Checkout
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm('checkoutForm')) {
        return;
    }

    try {
        ui.showLoading();
        document.getElementById('submitBtn').disabled = true;

        const requestBody = {
            ticketTypeId: ticketTypeId,
            quantity: quantity,
            promoCode: appliedPromo?.code
        };

        // If not authenticated, send guest data
        if (!auth.isAuthenticated()) {
            requestBody.guestEmail = document.getElementById('email').value;
            requestBody.guestName = document.getElementById('fullName').value;
        }

        // Create Stripe Checkout Session
        const response = await apiCall('/payments/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        // Redirect to Stripe Checkout
        window.location.href = response.url;

    } catch (error) {
        ui.showAlert(error.message || 'Error al procesar el pago', 'error');
        document.getElementById('submitBtn').disabled = false;
        ui.hideLoading();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Allow both authenticated and guest users
    if (!ticketTypeId || !eventId) {
        ui.showAlert('Solicitud inválida', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    loadOrderData();
});
