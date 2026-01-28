// ================================================
// Create Event Page Logic
// ================================================

let ticketTypes = [];

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

    // Initialize with one ticket type
    addTicketType();

    // Add Ticket Type Button
    document.getElementById('addTicketTypeBtn').addEventListener('click', () => {
        addTicketType();
    });

    // Form Submission
    document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            ui.showLoading();

            // Validate ticket types
            const currentTicketTypes = getTicketTypesFromDOM();
            if (currentTicketTypes.length === 0) {
                throw new Error('Debe agregar al menos un tipo de boleto');
            }

            const formData = new FormData();

            // Append text fields
            formData.append('title', document.getElementById('title').value);
            formData.append('description', document.getElementById('description').value);
            formData.append('category', document.getElementById('category').value);
            formData.append('status', document.getElementById('status').value);
            formData.append('event_date_start', document.getElementById('startDate').value);
            formData.append('event_date_end', document.getElementById('endDate').value);
            // location_name removed as it does not exist in DB schema
            formData.append('location_address', document.getElementById('location').value);
            formData.append('location_city', document.getElementById('city').value);
            formData.append('capacity', document.getElementById('capacity').value);

            // Append ticket types
            formData.append('ticket_types', JSON.stringify(currentTicketTypes));

            // Append image file
            const imageInput = document.getElementById('imageFile');
            if (imageInput.files.length > 0) {
                formData.append('image', imageInput.files[0]);
            }

            await apiCall('/events', {
                method: 'POST',
                body: formData
            });

            ui.showAlert('¡Evento creado exitosamente!', 'success');
            setTimeout(() => window.location.href = '/organizer-dashboard.html', 1500);

        } catch (error) {
            ui.showAlert(error.message || 'Error al crear evento', 'error');
        } finally {
            ui.hideLoading();
        }
    });
});

function addTicketType() {
    const container = document.getElementById('ticketTypesContainer');
    const id = Date.now();

    const div = document.createElement('div');
    div.className = 'ticket-type-row card mb-3';
    div.style.border = '1px solid var(--gray-lighter)';
    div.innerHTML = `
        <div class="card-body p-3">
            <div class="flex-between mb-2">
                <h5 class="m-0">Tipo de Boleto</h5>
                ${container.children.length > 0 ? `<button type="button" class="btn btn-sm btn-danger remove-ticket-btn" onclick="removeTicketType(this)">Eliminar</button>` : ''}
            </div>
            <div class="grid grid-3 gap-2">
                <div class="form-group mb-0">
                    <label class="small text-muted">Nombre</label>
                    <input type="text" class="form-control form-control-sm ticket-name" placeholder="Ej. General" required>
                </div>
                <div class="form-group mb-0">
                    <label class="small text-muted">Precio</label>
                    <input type="number" class="form-control form-control-sm ticket-price" placeholder="0.00" min="0" step="0.01" required>
                </div>
                <div class="form-group mb-0">
                    <label class="small text-muted">Cantidad</label>
                    <input type="number" class="form-control form-control-sm ticket-quantity" placeholder="100" min="1" required>
                </div>
            </div>
        </div>
    `;

    container.appendChild(div);
}

function removeTicketType(btn) {
    btn.closest('.ticket-type-row').remove();
}

function getTicketTypesFromDOM() {
    const rows = document.querySelectorAll('.ticket-type-row');
    const types = [];

    rows.forEach(row => {
        types.push({
            name: row.querySelector('.ticket-name').value,
            price: parseFloat(row.querySelector('.ticket-price').value),
            quantity_total: parseInt(row.querySelector('.ticket-quantity').value),
            max_per_order: 10, // Default
            description: '',
            is_active: true
        });
    });

    return types;
}

// Expose globally
window.removeTicketType = removeTicketType;
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

// Form Submission
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        ui.showLoading();

        const formData = new FormData();

        // Append text fields
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('status', document.getElementById('status').value);
        formData.append('event_date_start', document.getElementById('startDate').value);
        formData.append('event_date_end', document.getElementById('endDate').value);
        // location_name removed as it does not exist in DB schema
        formData.append('location_address', document.getElementById('location').value);
        formData.append('location_city', document.getElementById('city').value);
        formData.append('capacity', document.getElementById('capacity').value);

        // Append image file
        const imageInput = document.getElementById('imageFile');
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        await apiCall('/events', {
            method: 'POST',
            body: formData
        });

        ui.showAlert('¡Evento creado exitosamente!', 'success');
        setTimeout(() => window.location.href = '/organizer-dashboard.html', 1500);

    } catch (error) {
        ui.showAlert(error.message || 'Error al crear evento', 'error');
    } finally {
        ui.hideLoading();
    }
});
});
