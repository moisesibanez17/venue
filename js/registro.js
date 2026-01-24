// Script de registro - manejo de cantidad, descuentos y redirección a pago

let currentDiscount = null;
let debounceTimer = null;

// Elements
const quantitySelect = document.getElementById('quantity');
const discountCodeInput = document.getElementById('discount-code');
const discountMessage = document.getElementById('discount-message');
const bulkDiscountMessage = document.getElementById('bulk-discount-message');
const quantityDisplay = document.getElementById('quantity-display');
const subtotalDisplay = document.getElementById('subtotal-display');
const discountLine = document.getElementById('discount-line');
const discountAmount = document.getElementById('discount-amount');
const totalPrice = document.getElementById('total-price');

/**
 * Calculate price per ticket based on quantity
 */
function calculatePricePerTicket(quantity) {
    return quantity >= 4 ? 20 : 25;
}

/**
 * Update pricing display
 */
function updatePricing() {
    const quantity = parseInt(quantitySelect.value);
    const pricePerTicket = calculatePricePerTicket(quantity);
    let subtotal = pricePerTicket * quantity;
    const platformFee = 5;

    // Show/hide bulk discount message
    if (quantity >= 4) {
        bulkDiscountMessage.classList.remove('hidden');
    } else {
        bulkDiscountMessage.classList.add('hidden');
    }

    // Update quantity display
    quantityDisplay.textContent = `${quantity} boleto${quantity > 1 ? 's' : ''} × $${pricePerTicket.toFixed(2)}`;

    // Apply discount if any
    let discountAmt = 0;
    if (currentDiscount) {
        if (currentDiscount.type === 'percentage') {
            discountAmt = subtotal * (currentDiscount.value / 100);
        } else if (currentDiscount.type === 'fixed') {
            discountAmt = currentDiscount.value;
        }
        discountAmt = Math.min(discountAmt, subtotal); // Can't discount more than subtotal
    }

    const finalSubtotal = subtotal - discountAmt;
    const total = finalSubtotal + platformFee;

    // Update displays
    subtotalDisplay.textContent = `$${subtotal.toFixed(2)}`;

    if (discountAmt > 0) {
        discountLine.classList.remove('hidden');
        discountAmount.textContent = `-$${discountAmt.toFixed(2)}`;
    } else {
        discountLine.classList.add('hidden');
    }

    totalPrice.textContent = `$${Math.max(total, platformFee).toFixed(0)}`;
}

/**
 * Validate discount code
 */
async function validateDiscountCode(code) {
    if (!code || code.trim() === '') {
        currentDiscount = null;
        discountMessage.classList.add('hidden');
        updatePricing();
        return;
    }

    try {
        const response = await fetch(`/api/validate-discount/${code.trim()}`);
        const data = await response.json();

        if (data.valid) {
            currentDiscount = data.discount;
            discountMessage.classList.remove('hidden');
            discountMessage.querySelector('p').textContent = `✓ Código ${data.discount.code} aplicado`;
        } else {
            currentDiscount = null;
            discountMessage.classList.remove('hidden');
            discountMessage.querySelector('p').textContent = `✗ ${data.message}`;
            discountMessage.querySelector('p').classList.remove('text-neon-lime');
            discountMessage.querySelector('p').classList.add('text-red-500');

            // Reset color after 3 seconds
            setTimeout(() => {
                discountMessage.classList.add('hidden');
                discountMessage.querySelector('p').classList.remove('text-red-500');
                discountMessage.querySelector('p').classList.add('text-neon-lime');
            }, 3000);
        }

        updatePricing();
    } catch (error) {
        console.error('Error validating discount code:', error);
        currentDiscount = null;
        updatePricing();
    }
}

// Event listeners
quantitySelect.addEventListener('change', updatePricing);

discountCodeInput.addEventListener('input', (e) => {
    // Debounce the validation
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        validateDiscountCode(e.target.value);
    }, 500);
});

discountCodeInput.addEventListener('blur', (e) => {
    // Immediate validation on blur
    clearTimeout(debounceTimer);
    validateDiscountCode(e.target.value);
});

// Checkout button handler
document.getElementById('checkout-btn').addEventListener('click', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('checkout-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="animate-pulse">Procesando...</span>';
    btn.disabled = true;

    // Get form data
    const fullName = document.getElementById('full-name')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;
    const quantity = parseInt(quantitySelect.value);
    const discountCode = discountCodeInput.value.trim() || null;
    const terms = document.getElementById('terms')?.checked;

    if (!terms) {
        alert('Debes aceptar los términos y condiciones.');
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    if (!fullName || !email || !phone) {
        alert('Por favor completa todos los campos.');
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    try {
        // Register user in backend
        const registerResponse = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullName,
                email,
                phone,
                quantity,
                discount_code: discountCode
            })
        });

        if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            throw new Error(errorData.error || 'Error en validación de registro');
        }
        const userData = await registerResponse.json();

        // Save info in sessionStorage and redirect to payment.html
        sessionStorage.setItem('registration_data', JSON.stringify({
            ticket_token: userData.ticket_token,
            email: email,
            full_name: fullName,
            quantity: quantity,
            pricing: userData.pricing
        }));

        window.location.href = '/payment.html';

    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Initialize pricing display on load
updatePricing();
