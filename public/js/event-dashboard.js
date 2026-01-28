// ================================================
// Event Dashboard Logic
// ================================================

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

let eventData = null;
let attendeesList = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    if (!eventId) {
        ui.showAlert('ID de evento no especificado', 'error');
        setTimeout(() => window.location.href = '/organizer-dashboard.html', 1500);
        return;
    }

    loadEventData();

    // Event listeners
    document.getElementById('searchAttendee').addEventListener('input', (e) => {
        filterAttendees(e.target.value);
    });

    document.getElementById('exportExcelBtn').addEventListener('click', exportAttendees);
    document.getElementById('exportSalesBtn').addEventListener('click', exportSales);
});

async function loadEventData() {
    try {
        ui.showLoading();

        // Load Event Details
        const event = await apiCall(`/events/${eventId}`);
        eventData = event;
        renderHeader(event);

        // Load Analytics
        const analytics = await apiCall(`/organizer/events/${eventId}/analytics`);
        renderStats(analytics);

        // Load Attendees
        const attendeesData = await apiCall(`/organizer/events/${eventId}/attendees?limit=1000`);
        attendeesList = attendeesData.tickets;
        renderAttendeesTable(attendeesList);

    } catch (error) {
        console.error(error);
        ui.showAlert('Error al cargar datos del evento', 'error');
    } finally {
        ui.hideLoading();
    }
}

function renderHeader(event) {
    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventDate').textContent = ui.formatDate(event.event_date_start);

    const badge = document.getElementById('eventStatusBadge');
    badge.textContent = event.status === 'published' ? 'Publicado' :
        event.status === 'draft' ? 'Borrador' : event.status;
    badge.className = `badge badge-${getBadgeClass(event.status)} mb-2`;

    // Action buttons
    document.getElementById('viewEventBtn').href = `/event-detail.html?id=${event.id}`;
    document.getElementById('editEventBtn').href = `/edit-event.html?id=${event.id}`;
    document.getElementById('scanTicketsBtn').href = `/checkin.html?event=${event.id}`;
}

function renderStats(analytics) {
    document.getElementById('eventRevenue').textContent = ui.formatCurrency(analytics.revenue.totalRevenue);
    document.getElementById('eventTicketsSold').textContent = analytics.checkIns.total;

    // Check-in rate
    const total = analytics.checkIns.total;
    const checkedIn = analytics.checkIns.checkedIn;
    const rate = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : 0;

    document.getElementById('eventCheckInRate').textContent = `${rate}%`;
    document.getElementById('eventCheckInCount').textContent = `${checkedIn} de ${total}`;
}

function renderAttendeesTable(attendees) {
    const container = document.getElementById('attendeesTable');

    if (attendees.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <p>Aún no hay asistentes registrados.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--gray-light);">
                        <th style="padding: 1rem; text-align: left;">Nombre</th>
                        <th style="padding: 1rem; text-align: left;">Email</th>
                        <th style="padding: 1rem; text-align: left;">Ticket</th>
                        <th style="padding: 1rem; text-align: center;">Estado</th>
                        <th style="padding: 1rem; text-align: right;">Fecha Compra</th>
                    </tr>
                </thead>
                <tbody>
                    ${attendees.map(ticket => `
                        <tr style="border-bottom: 1px solid var(--gray-lighter);">
                            <td style="padding: 1rem; font-weight: 500;">
                                ${ticket.user.full_name}
                            </td>
                            <td style="padding: 1rem; color: var(--gray);">
                                ${ticket.user.email}
                            </td>
                            <td style="padding: 1rem;">
                                ${ticket.ticket_number}<br>
                                <small style="color: var(--gray);">${ticket.ticket_type.name}</small>
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                <span class="badge badge-${ticket.status === 'used' ? 'success' : 'info'}">
                                    ${ticket.status === 'used' ? 'Ingresó' : 'Pendiente'}
                                </span>
                            </td>
                            <td style="padding: 1rem; text-align: right;">
                                ${ui.formatShortDate(ticket.created_at)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterAttendees(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = attendeesList.filter(ticket =>
        ticket.user.full_name.toLowerCase().includes(lowerQuery) ||
        ticket.user.email.toLowerCase().includes(lowerQuery) ||
        ticket.ticket_number.toLowerCase().includes(lowerQuery)
    );
    renderAttendeesTable(filtered);
}

function getBadgeClass(status) {
    const classes = {
        'published': 'success',
        'draft': 'warning',
        'cancelled': 'error',
        'completed': 'info'
    };
    return classes[status] || 'info';
}



async function exportAttendees() {
    try {
        window.location.href = `/api/organizer/events/${eventId}/export-attendees?token=${auth.getToken()}`;
    } catch (error) {
        console.error(error);
        ui.showAlert('Error al exportar', 'error');
    }
}

async function exportSales() {
    try {
        window.location.href = `/api/organizer/events/${eventId}/export-sales?token=${auth.getToken()}`;
    } catch (error) {
        console.error(error);
        ui.showAlert('Error al exportar ventas', 'error');
    }
}
