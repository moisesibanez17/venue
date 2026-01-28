// ================================================
// Edit Event Page Logic
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const user = auth.getUser();
    if (user.role !== 'organizer' && user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    // Get Event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        ui.showAlert('ID de evento no especificado', 'error');
        setTimeout(() => window.location.href = '/organizer-dashboard.html', 1500);
        return;
    }

    // Load Event Data
    loadEventData(eventId);

    // Add Ticket Type Button
    document.getElementById('addTicketTypeBtn').addEventListener('click', () => {
        addTicketTypeUI();
    });

    // Form Submission
    document.getElementById('editEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateEvent(eventId);
    });
});

async function loadEventData(eventId) {
    try {
        ui.showLoading();
        const event = await apiCall(`/events/${eventId}`);

        // Populate fields
        document.getElementById('eventId').value = event.id;
        document.getElementById('title').value = event.title;
        document.getElementById('description').value = event.description;
        document.getElementById('category').value = event.category || '';
        document.getElementById('status').value = event.status;

        // Format dates for datetime-local (YYYY-MM-DDThh:mm)
        const startDate = new Date(event.event_date_start);
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
        document.getElementById('startDate').value = startDate.toISOString().slice(0, 16);

        if (event.event_date_end) {
            const endDate = new Date(event.event_date_end);
            endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
            document.getElementById('endDate').value = endDate.toISOString().slice(0, 16);
        }

        document.getElementById('location').value = event.location_address;
        document.getElementById('city').value = event.location_city || '';
        document.getElementById('capacity').value = event.capacity;

        // Show current image
        if (event.image_url) {
            document.getElementById('currentImageContainer').innerHTML = `
                <img src="${event.image_url}" alt="Event Image" style="max-width: 200px; border-radius: 8px;">
            `;
        }

        // Load Ticket Types
        if (event.ticket_types && event.ticket_types.length > 0) {
            event.ticket_types.forEach(type => addTicketTypeUI(type));
        } else {
            addTicketTypeUI(); // Add empty row if none
        }

    } catch (error) {
        ui.showAlert('Error al cargar datos del evento', 'error');
        console.error(error);
    } finally {
        ui.hideLoading();
    }
}

function addTicketTypeUI(data = null) {
    const container = document.getElementById('ticketTypesContainer');
    const div = document.createElement('div');
    div.className = 'ticket-type-row card mb-3';
    div.style.border = '1px solid var(--gray-lighter)';

    // If data exists, store ID
    const typeId = data ? `data-id="${data.id}"` : '';

    div.innerHTML = `
        <div class="card-body p-3" ${typeId}>
            <div class="flex-between mb-2">
                <h5 class="m-0">Tipo de Boleto</h5>
                <button type="button" class="btn btn-sm btn-danger remove-ticket-btn" onclick="removeTicketType(this)">Eliminar</button>
            </div>
            <div class="grid grid-3 gap-2">
                <div class="form-group mb-0">
                    <label class="small text-muted">Nombre</label>
                    <input type="text" class="form-control form-control-sm ticket-name" 
                        value="${data ? data.name : ''}" placeholder="Ej. General" required>
                </div>
                <div class="form-group mb-0">
                    <label class="small text-muted">Precio</label>
                    <input type="number" class="form-control form-control-sm ticket-price" 
                        value="${data ? data.price : ''}" placeholder="0.00" min="0" step="0.01" required>
                </div>
                <div class="form-group mb-0">
                    <label class="small text-muted">Cantidad Total</label>
                    <input type="number" class="form-control form-control-sm ticket-quantity" 
                        value="${data ? data.quantity_total : ''}" placeholder="100" min="1" required>
                </div>
            </div>
            ${data ? `<small class="text-muted mt-2 d-block">Vendidos: ${data.quantity_sold}</small>` : ''}
        </div>
    `;

    container.appendChild(div);
}

function removeTicketType(btn) {
    const row = btn.closest('.ticket-type-row');
    // If it has an ID, we might want to warn the user that deleting it will remove it from DB
    if (row.hasAttribute('data-id')) {
        if (!confirm('¿Estás seguro de eliminar este tipo de boleto? Si ya tiene ventas, podría no eliminarse.')) {
            return;
        }
    }
    row.remove();
}

async function updateEvent(eventId) {
    try {
        ui.showLoading();

        // Validate ticket types
        const ticketTypes = getTicketTypesFromDOM();
        if (ticketTypes.length === 0) {
            throw new Error('Debe tener al menos un tipo de boleto');
        }

        const formData = new FormData();

        // Append text fields
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('status', document.getElementById('status').value);
        formData.append('event_date_start', document.getElementById('startDate').value);
        formData.append('event_date_end', document.getElementById('endDate').value);
        formData.append('location_address', document.getElementById('location').value);
        formData.append('location_city', document.getElementById('city').value);
        formData.append('capacity', document.getElementById('capacity').value);

        // Append ticket types
        formData.append('ticket_types', JSON.stringify(ticketTypes));

        // Append image file if selected
        const imageInput = document.getElementById('imageFile');
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        await apiCall(`/events/${eventId}`, {
            method: 'PUT',
            body: formData
        });

        ui.showAlert('¡Evento actualizado exitosamente!', 'success');
        setTimeout(() => window.location.href = '/organizer-dashboard.html', 1500);

    } catch (error) {
        ui.showAlert(error.message || 'Error al actualizar evento', 'error');
    } finally {
        ui.hideLoading();
    }
}

function getTicketTypesFromDOM() {
    const rows = document.querySelectorAll('.ticket-type-row');
    const types = [];

    rows.forEach(row => {
        const type = {
            name: row.querySelector('.ticket-name').value,
            price: parseFloat(row.querySelector('.ticket-price').value),
            quantity_total: parseInt(row.querySelector('.ticket-quantity').value),
            max_per_order: 10,
            description: '',
            is_active: true
        };

        const body = row.querySelector('.card-body');
        if (body.hasAttribute('data-id')) {
            type.id = body.getAttribute('data-id');
        }

        types.push(type);
    });

    return types;
}

// Expose globally
window.removeTicketType = removeTicketType;
