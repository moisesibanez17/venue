// ================================================
// Profile Page Logic
// ================================================

let currentUser = null;

// Load user profile
async function loadProfile() {
    try {
        const data = await apiCall('/users/profile');
        currentUser = data.user;

        document.getElementById('userName').textContent = currentUser.full_name;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('editFullName').value = currentUser.full_name;
        document.getElementById('editPhone').value = currentUser.phone || '';
    } catch (error) {
        ui.showAlert('Error al cargar perfil', 'error');
    }
}

// Toggle edit mode
function toggleEditMode() {
    const form = document.getElementById('editProfileForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// Update profile
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        ui.showLoading();

        const updates = {
            full_name: document.getElementById('editFullName').value,
            phone: document.getElementById('editPhone').value
        };

        await apiCall('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        ui.showAlert('Perfil actualizado exitosamente', 'success');
        toggleEditMode();
        loadProfile();
    } catch (error) {
        ui.showAlert(error.message || 'Error al actualizar', 'error');
    } finally {
        ui.hideLoading();
    }
});

// Load tickets
async function loadTickets() {
    try {
        ui.showLoading();
        // Updated API call to fetch all tickets, not just upcoming
        const data = await apiCall('/users/tickets');
        renderTickets(data.tickets);
    } catch (error) {
        ui.showAlert('Error al cargar boletos', 'error');
    } finally {
        ui.hideLoading();
    }
}

// Render tickets
function renderTickets(tickets) {
    const container = document.getElementById('ticketsGrid');

    if (!tickets || tickets.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4" style="grid-column: 1 / -1;">
                <h4>No tienes boletos aún</h4>
                <p>¡Explora eventos y consigue tu primer boleto!</p>
                <a href="/" class="btn btn-primary mt-2">Explorar Eventos</a>
            </div>
        `;
        return;
    }

    container.innerHTML = tickets.map(ticket => `
        <div class="card">
            <div class="card-body">
                <div class="flex-between mb-2">
                    <h4>${ticket.event.title}</h4>
                    <span class="badge badge-${ticket.status === 'valid' ? 'success' : 'info'}">${ticket.status === 'valid' ? 'Válido' :
            ticket.status === 'used' ? 'Usado' : ticket.status
        }</span>
                </div>
                <p><strong>📅</strong> ${ui.formatDate(ticket.event.event_date_start)}</p>
                <p><strong>📍</strong> ${ticket.event.location_address || 'Evento en línea'}</p>
                <p><strong>🎟️</strong> ${ticket.ticket_type.name} - #${ticket.ticket_number}</p>
                
                ${ticket.qr_code ? `
                    <div class="text-center mt-3">
                        <img src="${ticket.qr_code}" alt="Código QR" style="max-width: 200px; border: 2px solid var(--gray-light); border-radius: var(--radius-md); padding: 1rem;">
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <a href="/api/payments/download-ticket/${ticket.id}?token=${auth.getToken()}" class="btn btn-primary" style="width: 100%;">Descargar PDF</a>
            </div>
        </div>
    `).join('');
}

// Load purchase history
async function loadPurchaseHistory() {
    try {
        ui.showLoading();
        const data = await apiCall('/users/purchases');
        renderPurchaseHistory(data.purchases);
    } catch (error) {
        ui.showAlert('Error al cargar historial de compras', 'error');
    } finally {
        ui.hideLoading();
    }
}

// Render purchase history
function renderPurchaseHistory(purchases) {
    const container = document.getElementById('purchaseHistory');

    if (purchases.length === 0) {
        container.innerHTML = '<p class="text-center">No hay compras registradas</p>';
        return;
    }

    container.innerHTML = purchases.map(purchase => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="flex-between">
                    <div>
                        <h4>${purchase.event.title}</h4>
                        <p style="color: var(--gray);">${ui.formatShortDate(purchase.created_at)}</p>
                    </div>
                    <div class="text-right">
                        <p><strong>${ui.formatCurrency(purchase.total)}</strong></p>
                        <span class="badge badge-${purchase.payment_status === 'completed' ? 'success' : 'warning'}">${purchase.payment_status === 'completed' ? 'Completado' : 'Pendiente'
        }</span>
                    </div>
                </div>
                <p><strong>Cantidad:</strong> ${purchase.quantity} boleto(s)</p>
                <p><strong>Tipo:</strong> ${purchase.ticket_type.name}</p>
            </div>
        </div>
    `).join('');
}

// Show tab
function showTab(tab) {
    const ticketsSection = document.getElementById('ticketsSection');
    const historySection = document.getElementById('historySection');
    const securitySection = document.getElementById('securitySection');
    const ticketsTab = document.getElementById('ticketsTab');
    const historyTab = document.getElementById('historyTab');
    const securityTab = document.getElementById('securityTab');

    // Hide all
    ticketsSection.style.display = 'none';
    historySection.style.display = 'none';
    securitySection.style.display = 'none';
    ticketsTab.className = 'btn btn-outline';
    historyTab.className = 'btn btn-outline';
    securityTab.className = 'btn btn-outline';

    if (tab === 'tickets') {
        ticketsSection.style.display = 'block';
        ticketsTab.className = 'btn btn-primary';
        loadTickets();
    } else if (tab === 'history') {
        historySection.style.display = 'block';
        historyTab.className = 'btn btn-primary';
        loadPurchaseHistory();
    } else if (tab === 'security') {
        securitySection.style.display = 'block';
        securityTab.className = 'btn btn-primary';
    }
}

// Change Password
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        ui.showAlert('Las nuevas contraseñas no coinciden', 'error');
        return;
    }

    if (newPassword.length < 6) {
        ui.showAlert('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        ui.showLoading();
        await apiCall('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        ui.showAlert('Contraseña actualizada exitosamente', 'success');
        e.target.reset();
        showTab('tickets');
    } catch (error) {
        ui.showAlert(error.message || 'Error al cambiar contraseña', 'error');
    } finally {
        ui.hideLoading();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    loadProfile();
    loadTickets();

    // Set tab button listeners (needs to be global or attached here)
    window.showTab = showTab;
});
