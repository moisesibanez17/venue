// ================================================
// Success Page Logic
// ================================================

const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');
const purchaseId = urlParams.get('purchase_id');

async function verifyAndCompletePurchase() {
    if (!sessionId) {
        ui.showAlert('Sesión inválida', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        ui.showLoading();

        // Verify Stripe session and complete payment
        const response = await apiCall(`/payments/verify-stripe-session/${sessionId}`);

        if (response.paymentPending) {
            document.getElementById('successMessage').innerHTML = `
                <div class="alert alert-warning">
                    <h2>⏳ Pago Pendiente</h2>
                    <p>Tu pago está siendo procesado. Por favor espera unos momentos y recarga la página.</p>
                </div>
            `;
            return;
        }

        // Display success message
        const { purchase, tickets } = response;
        console.log('📦 Response from API:', response);
        console.log('🎫 Tickets:', tickets);
        console.log('💰 Purchase:', purchase);

        const isGuest = !auth.isAuthenticated();

        document.getElementById('successMessage').innerHTML = `
            <div class="alert alert-success">
                <h2>✅ ¡Compra Exitosa!</h2>
                <p>Tu compra ha sido procesada correctamente.</p>
                <p><strong>ID de Compra:</strong> ${purchase.id}</p>
                <p><strong>Total:</strong> ${ui.formatCurrency(purchase.total)}</p>
                <p><strong>Boletos:</strong> ${tickets.length}</p>
            </div>
            
            ${isGuest ? `
                <div class="alert alert-info mt-3">
                    <p><strong>💡 Consejo:</strong> Crea una cuenta para gestionar fácilmente todos tus boletos en un solo lugar.</p>
                    <a href="/register.html" class="btn btn-outline mt-2">Crear Cuenta</a>
                </div>
            ` : ''}
            
            <div class="card mt-4">
                <div class="card-body">
                    <h3>📧 Tus Boletos</h3>
                    <p>Se ha enviado un correo electrónico con tus boletos a <strong>${tickets[0]?.user?.email || 'tu correo'}</strong></p>
                    
                    <div class="mt-4">
                        ${tickets.map((ticket, index) => `
                            <div class="card mb-3" style="border: 2px solid var(--primary);">
                                <div class="card-body">
                                    <div class="ticket-grid">
                                        <div>
                                            <h4 style="margin-bottom: 0.5rem;">Boleto #${index + 1}</h4>
                                            <p style="margin: 0.25rem 0;"><strong>Número:</strong> ${ticket.ticket_number}</p>
                                            <p style="margin: 0.25rem 0;"><strong>Tipo:</strong> ${ticket.ticket_type?.name || 'N/A'}</p>
                                            <p style="margin: 0.25rem 0;"><strong>Estado:</strong> <span class="badge badge-success">${ticket.status}</span></p>
                                            <div class="mt-3">
                                                <a href="/api/payments/download-ticket/${ticket.id}?token=${auth.getToken()}" class="btn btn-primary w-full-mobile" download>
                                                    📥 Descargar Boleto PDF
                                                </a>
                                            </div>
                                        </div>
                                        <div class="qr-container">
                                            <img src="${ticket.qr_code}" alt="QR Code" class="qr-image">
                                            <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--gray);">Escanea en el evento</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mt-4" style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        ${!isGuest ? `<a href="/profile.html" class="btn btn-primary">Ver Mis Boletos</a>` : ''}
                        <a href="/" class="btn btn-outline">Volver al Inicio</a>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error verifying purchase:', error);
        document.getElementById('successMessage').innerHTML = `
            <div class="alert alert-error">
                <h2>❌ Error</h2>
                <p>${error.message || 'Hubo un problema al verificar tu compra'}</p>
                <p>Por favor contacta a soporte con tu ID de compra: <strong>${purchaseId}</strong></p>
            </div>
        `;
    } finally {
        ui.hideLoading();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Allow both authenticated and guest users
    verifyAndCompletePurchase();
});
