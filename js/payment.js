// Script de pago - Mercado Pago Checkout Pro
// Cargar datos de registro desde sessionStorage
const registrationData = JSON.parse(sessionStorage.getItem('registration_data') || '{}');

console.log('Payment.js loaded. Registration data:', registrationData);

if (!registrationData.ticket_token) {
    console.warn('No ticket token found in sessionStorage');
    alert('No se encontraron datos de registro. Redirigiendo...');
    window.location.href = '/registro.html';
}

// Display pricing information
if (registrationData.pricing) {
    const pricing = registrationData.pricing;
    const quantity = registrationData.quantity || 1;

    // Update quantity display
    document.getElementById('quantity-display').textContent =
        `${quantity} boleto${quantity > 1 ? 's' : ''} × $${pricing.pricePerTicket.toFixed(2)}`;

    // Update subtotal
    document.getElementById('subtotal-display').textContent =
        `$${pricing.subtotal.toFixed(2)}`;

    // Show discount if applied
    if (pricing.discountAmount > 0) {
        document.getElementById('discount-line').classList.remove('hidden');
        document.getElementById('discount-amount').textContent =
            `-$${pricing.discountAmount.toFixed(2)}`;
    }

    // Show bulk discount badge if 3+ tickets
    if (quantity >= 3) {
        document.getElementById('bulk-discount-badge').classList.remove('hidden');
    }

    // Update total
    document.getElementById('total-price').textContent =
        `$${Math.round(pricing.total)}`;
}


document.getElementById('pay-btn').addEventListener('click', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('pay-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="animate-pulse">Cargando Mercado Pago...</span>';
    btn.disabled = true;

    try {
        console.log('Attempting to create preference...');

        // Send ticket token to backend - pricing is already stored in the booking
        const response = await fetch('/api/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_token: registrationData.ticket_token
            })
        });

        console.log('Response received:', response.status, response.statusText);

        if (!response.ok) {
            const text = await response.text();
            console.error('Server Error Body:', text);
            throw new Error(`Server returned ${response.status}: ${text}`);
        }

        const data = await response.json();

        // Redirect to Mercado Pago
        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            throw new Error('No se recibió URL de pago');
        }

    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
