// ================================================
// Organizer Dashboard Logic
// ================================================

let dashboardData = null;
let salesChart = null;
let statusChart = null;

// Load dashboard data
async function loadDashboard() {
    try {
        ui.showLoading();
        const data = await apiCall('/organizer/dashboard');
        dashboardData = data;
        renderDashboard(data);
    } catch (error) {
        ui.showAlert('Error al cargar el panel', 'error');
        console.error(error);
    } finally {
        ui.hideLoading();
    }
}

// Render dashboard
function renderDashboard(data) {
    // Update statistics
    // document.getElementById('totalEvents').textContent = data.summary.totalEvents;
    document.getElementById('upcomingEvents').textContent = data.summary.upcomingEvents;
    document.getElementById('totalTicketsSold').textContent = data.summary.totalTicketsSold;
    document.getElementById('totalRevenue').textContent = ui.formatCurrency(data.summary.totalRevenue);

    // Render events table
    renderEventsTable(data.events);

    // Render charts
    renderSalesChart(data.events);

    // Render recent purchases
    renderRecentPurchases(data.recentPurchases || []);
}

// Render events table
function renderEventsTable(events) {
    const container = document.getElementById('eventsTable');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <h4>No hay eventos aún</h4>
                <p>¡Crea tu primer evento para comenzar!</p>
                <a href="/create-event.html" class="btn btn-primary mt-2">Crear Evento</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--gray-light);">
                        <th style="padding: 1rem; text-align: left;">Evento</th>
                        <th style="padding: 1rem; text-align: left;">Fecha</th>
                        <th style="padding: 1rem; text-align: center;">Estado</th>
                        <th style="padding: 1rem; text-align: right;">Boletos Vendidos</th>
                        <th style="padding: 1rem; text-align: right;">Ingresos</th>
                        <th style="padding: 1rem; text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(event => `
                        <tr style="border-bottom: 1px solid var(--gray-lighter);">
                            <td style="padding: 1rem;">
                                <strong>${event.title}</strong>
                            </td>
                            <td style="padding: 1rem;">
                                ${ui.formatShortDate(event.date)}
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                <span class="badge badge-${getBadgeClass(event.status)}">${event.status === 'published' ? 'Publicado' :
            event.status === 'draft' ? 'Borrador' :
                event.status === 'cancelled' ? 'Cancelado' : 'Finalizado'
        }</span>
                            </td>
                            <td style="padding: 1rem; text-align: right;">
                                ${event.total_tickets_sold || 0}
                            </td>
                            <td style="padding: 1rem; text-align: right;">
                                ${ui.formatCurrency(event.total_revenue || 0)}
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                <a href="/organizer-event-dashboard.html?id=${event.id || event.event_id}" class="btn btn-primary" style="min-width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem; text-decoration: none;">Gestionar</a>
                                <a href="/edit-event.html?id=${event.id || event.event_id}" class="btn btn-outline" style="min-width: auto; padding: 0.5rem 1rem; text-decoration: none;">Editar</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Get badge class for status
function getBadgeClass(status) {
    const classes = {
        'published': 'success',
        'draft': 'warning',
        'cancelled': 'error',
        'completed': 'info'
    };
    return classes[status] || 'info';
}

// Render sales chart
function renderSalesChart(events) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Sort by date and get last 6 events
    const sortedEvents = events
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-6);

    const labels = sortedEvents.map(e => e.title.substring(0, 15) + '...');
    const data = sortedEvents.map(e => e.total_revenue || 0);

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Ingresos (MXN)',
                data,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render recent purchases list
function renderRecentPurchases(purchases) {
    const container = document.getElementById('recentPurchasesList');

    if (!purchases || purchases.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <p style="color: var(--gray);">No hay compras recientes</p>
            </div>
        `;
        return;
    }

    container.innerHTML = purchases.map(purchase => `
        <div class="flex-between" style="padding: 1rem; border-bottom: 1px solid var(--gray-lighter);">
            <div>
                <div style="font-weight: 500;">${purchase.user ? purchase.user.full_name : 'Usuario Desconocido'}</div>
                <div style="font-size: 0.875rem; color: var(--gray);">
                    ${purchase.event ? purchase.event.title : 'Evento Desconocido'}
                </div>
                <div style="font-size: 0.75rem; color: var(--gray-light);">
                    ${ui.formatDate(purchase.created_at)}
                </div>
            </div>
            <div class="text-right">
                <div style="font-weight: 600; color: var(--primary);">
                    ${ui.formatCurrency(purchase.total)}
                </div>
                <div style="font-size: 0.75rem;">
                    ${purchase.quantity} ${purchase.quantity === 1 ? 'boleto' : 'boletos'}
                </div>
            </div>
        </div>
    `).join('');
}

// View event details
async function viewEventDetails(eventId) {
    console.log('Viewing event details for ID:', eventId);
    try {
        ui.showLoading();

        // Get event details
        const event = await apiCall(`/events/${eventId}`);

        // Get attendees
        const attendeesData = await apiCall(`/organizer/events/${eventId}/attendees?limit=10`);

        // Get analytics
        const analytics = await apiCall(`/organizer/events/${eventId}/analytics`);

        renderEventModal(event, attendeesData, analytics);
        document.getElementById('eventModal').classList.add('active');
    } catch (error) {
        ui.showAlert('Error al cargar detalles del evento', 'error');
    } finally {
        ui.hideLoading();
    }
}

// Render event modal
function renderEventModal(event, attendeesData, analytics) {
    const content = document.getElementById('eventModalContent');
    const checkInRate = analytics.checkIns.total > 0
        ? ((analytics.checkIns.checkedIn / analytics.checkIns.total) * 100).toFixed(1)
        : 0;

    content.innerHTML = `
        <h2>${event.title}</h2>
        <p style="color: var(--gray);">${event.description || 'Sin descripción'}</p>
        
        <div class="grid grid-2 mt-3">
            <div>
                <p><strong>📅 Fecha:</strong> ${ui.formatDate(event.event_date_start)}</p>
                <p><strong>📍 Ubicación:</strong> ${event.location_address || 'En línea'}</p>
                <p><strong>👥 Capacidad:</strong> ${event.capacity || 'Ilimitada'}</p>
            </div>
            <div>
                <p><strong>💰 Ingresos:</strong> ${ui.formatCurrency(analytics.revenue.totalRevenue)}</p>
                <p><strong>🎟️ Boletos Vendidos:</strong> ${analytics.checkIns.total}</p>
                <p><strong>✅ Tasa de Check-in:</strong> ${checkInRate}%</p>
            </div>
        </div>

        <h3 class="mt-4">Asistentes Recientes</h3>
        <div style="max-height: 300px; overflow-y: auto;">
            ${attendeesData.tickets.length > 0 ? attendeesData.tickets.slice(0, 10).map(ticket => `
                <div class="flex-between" style="padding: 0.75rem; border-bottom: 1px solid var(--gray-lighter);">
                    <div>
                        <strong>${ticket.user.full_name}</strong><br>
                        <small style="color: var(--gray);">${ticket.user.email}</small>
                    </div>
                    <span class="badge badge-${ticket.status === 'used' ? 'success' : 'info'}">${ticket.status === 'used' ? 'Usado' :
            ticket.status === 'valid' ? 'Válido' : ticket.status
        }</span>
                </div>
            `).join('') : '<p class="text-center">No hay asistentes aún</p>'}
        </div>

        <div class="flex-center gap-2 mt-4">
            <a href="/organizer/events/${event.id}/export-attendees" class="btn btn-primary">Exportar Asistentes</a>
            <a href="/checkin.html?event=${event.id}" class="btn btn-outline">Check-in</a>
        </div>
    `;
}

// Close event modal
function closeEventModal() {
    document.getElementById('eventModal').classList.remove('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const user = auth.getUser();

    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
        ui.showAlert('Acceso denegado. Se requiere ser organizador.', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    loadDashboard();

    // Attach global functions used in HTML - redundancy
    window.viewEventDetails = viewEventDetails;
    window.closeEventModal = closeEventModal;
});

// Expose globally immediately
window.viewEventDetails = viewEventDetails;
window.closeEventModal = closeEventModal;

// Close modal when clicking outside
document.getElementById('eventModal').addEventListener('click', (e) => {
    if (e.target.id === 'eventModal') {
        closeEventModal();
    }
});
