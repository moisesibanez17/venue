// ================================================
// Event Detail Page Logic
// ================================================

let currentEvent = null;
const eventId = new URLSearchParams(window.location.search).get('id');

// Load event details
async function loadEvent() {
    if (!eventId) {
        ui.showAlert('Evento no encontrado', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        ui.showLoading();
        currentEvent = await apiCall(`/events/${eventId}`);
        renderEvent(currentEvent);
    } catch (error) {
        ui.showAlert('Error al cargar el evento', 'error');
        console.error(error);
    } finally {
        ui.hideLoading();
    }
}

// Render event
function renderEvent(event) {
    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventDescription').textContent = event.description || 'Sin descripción disponible';
    document.getElementById('eventCategory').textContent = event.category || 'General';
    document.getElementById('eventDate').textContent = ui.formatDate(event.event_date_start);
    document.getElementById('eventLocation').textContent = event.location_address || event.location_city || 'Evento en línea';
    document.getElementById('eventCapacity').textContent = event.capacity ? `${event.capacity} personas` : 'Ilimitado';
    document.getElementById('eventOrganizer').textContent = event.organizer?.full_name || 'Desconocido';

    const statusBadge = document.getElementById('eventStatus');
    const statusMap = {
        'published': 'Publicado',
        'draft': 'Borrador',
        'cancelled': 'Cancelado',
        'completed': 'Finalizado'
    };
    statusBadge.textContent = statusMap[event.status] || event.status;
    statusBadge.className = `badge badge-${event.status === 'published' ? 'success' : 'warning'}`;

    // Set image
    const imgElement = document.getElementById('eventImage');
    const bgElement = document.getElementById('eventBackdropImage');
    const imageSrc = event.image_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="%23667eea"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48">Evento</text></svg>';

    imgElement.src = imageSrc;
    imgElement.alt = event.title;

    // Set blurred background
    if (bgElement) {
        bgElement.style.backgroundImage = `url('${imageSrc}')`;
    }

    // Render ticket types
    renderTicketTypes(event.ticket_types || [], event.status);
}

// Render ticket types
function renderTicketTypes(ticketTypes, eventStatus) {
    const container = document.getElementById('ticketTypes');

    if (ticketTypes.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No hay boletos disponibles</p>';
        return;
    }

    container.innerHTML = ticketTypes.map(ticket => {
        const available = (ticket.quantity_total || 0) - (ticket.quantity_sold || 0);
        const isAvailable = available > 0 && eventStatus === 'published';

        let buttonText = 'Comprar';
        let buttonClass = 'btn btn-primary';
        if (!isAvailable) {
            buttonText = available <= 0 ? 'Agotado' : 'No Disponible';
            buttonClass = 'btn btn-secondary';
        }

        return `
            <div class="ticket-card fade-in-up">
                <div class="flex-between mb-2 align-start">
                    <div>
                        <div class="ticket-name">${ticket.name}</div>
                        ${ticket.description ? `<p style="font-size: 0.85rem; color: var(--gray); margin-bottom: 0.5rem;">${ticket.description}</p>` : ''}
                    </div>
                    <div class="ticket-price">${ui.formatCurrency(ticket.price)}</div>
                </div>
                
                <div class="flex-between align-end mt-3">
                    <div style="flex-grow: 1;">
                        <p style="font-size: 0.8rem; color: ${available < 10 ? 'var(--warning)' : 'var(--success)'}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            ${isAvailable ? `⚡ ${available} disponibles` : '🚫 Agotado'}
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        ${isAvailable ? `
                            <select id="quantity-${ticket.id}" class="form-control" style="width: 70px; padding: 0.4rem;" onchange="this.className = 'form-control'">
                                ${Array.from({ length: Math.min(available, 10) }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                            </select>
                        ` : ''}
                        
                        <button class="${buttonClass}" style="padding: 0.5rem 1.25rem; min-width: 100px;" 
                            onclick="buyTicket('${ticket.id}')" ${!isAvailable ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Buy ticket
function buyTicket(ticketTypeId) {
    const quantitySelect = document.getElementById(`quantity-${ticketTypeId}`);
    if (!quantitySelect) return;

    const quantity = quantitySelect.value;

    // Add loading state to button
    const btn = event.currentTarget; // This might be undefined depending on how called, safer to just redirect

    window.location.href = `/checkout.html?ticketType=${ticketTypeId}&quantity=${quantity}&event=${eventId}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadEvent();
});
