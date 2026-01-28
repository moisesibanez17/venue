// ================================================
// Events Page Logic
// ================================================

let currentPage = 1;
let currentFilters = {};

// Load featured events
async function loadFeaturedEvents() {
    try {
        const data = await apiCall('/events/featured?limit=6');
        renderFeaturedEvents(data);
    } catch (error) {
        console.error('Error loading featured events:', error);
    }
}

// Load all events with filters
async function loadEvents(page = 1) {
    try {
        ui.showLoading();

        const params = new URLSearchParams({
            page,
            limit: 12,
            status: 'published',
            ...currentFilters
        });

        const data = await apiCall(`/events?${params}`);
        renderEvents(data.events);
        renderPagination(data.pagination);
        updateResultsCount(data.pagination.total);

        currentPage = page;
    } catch (error) {
        console.error('Error loading events:', error);
        ui.showAlert('Error loading events', 'error');
    } finally {
        ui.hideLoading();
    }
}

// Render featured events
function renderFeaturedEvents(events) {
    const container = document.getElementById('featuredEvents');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<p class="text-center">No featured events at the moment</p>';
        return;
    }

    container.innerHTML = events.map(event => createEventCard(event, true)).join('');
}

// Render events grid
function renderEvents(events) {
    const container = document.getElementById('eventsGrid');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4" style="grid-column: 1 / -1;">
                <h3>No events found</h3>
                <p>Intenta ajustar tu búsqueda o filtros</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(event => createEventCard(event)).join('');
}

// Create event card HTML
function createEventCard(event, isFeatured = false) {
    const minPrice = event.ticket_types && event.ticket_types.length > 0
        ? Math.min(...event.ticket_types.map(t => parseFloat(t.price)))
        : 0;

    const badgeHtml = isFeatured
        ? '<span class="badge badge-primary" style="position: absolute; top: 10px; right: 10px;">Featured</span>'
        : '';

    return `
        <div class="card">
            <div style="position: relative;">
                ${badgeHtml}
                <img src="${event.image_url || '/images/event-placeholder.jpg'}" 
                     alt="${event.title}" 
                     class="card-img"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22><rect width=%22400%22 height=%22200%22 fill=%22%23667eea%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2224%22>Event</text></svg>'">
            </div>
            <div class="card-body">
                <h3 class="card-title">${event.title}</h3>
                <p class="card-text">${event.description ? event.description.substring(0, 100) + '...' : 'No description'}</p>
                <div class="flex-between" style="margin-top: 1rem;">
                    <div>
                        <small style="color: var(--gray);">📅 ${ui.formatShortDate(event.event_date_start)}</small><br>
                        ${event.location_city ? `<small style="color: var(--gray);">📍 ${event.location_city}</small>` : ''}
                    </div>
                    <div style="text-align: right;">
                        ${minPrice > 0 ? `<strong style="color: var(--primary);">${ui.formatCurrency(minPrice)}</strong>` : '<strong style="color: var(--success);">Free</strong>'}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <a href="/event-detail.html?id=${event.id}" class="btn btn-primary" style="width: 100%;">View Details</a>
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="flex-center gap-1">';

    // Previous button
    if (page > 1) {
        html += `<button class="btn btn-secondary" onclick="loadEvents(${page - 1})">← Previous</button>`;
    }

    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        const isActive = i === page ? 'btn-primary' : 'btn-outline';
        html += `<button class="btn ${isActive}" onclick="loadEvents(${i})">${i}</button>`;
    }

    // Next button
    if (page < totalPages) {
        html += `<button class="btn btn-secondary" onclick="loadEvents(${page + 1})">Next →</button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Update results count
function updateResultsCount(total) {
    const container = document.getElementById('resultsCount');
    if (container) {
        container.textContent = `${total} event${total !== 1 ? 's' : ''} found`;
    }
}

// Load categories for filter
async function loadCategories() {
    try {
        const categories = await apiCall('/events/categories');
        const select = document.getElementById('categoryFilter');

        if (select && categories.length > 0) {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Setup event filters
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const sortBy = document.getElementById('sortBy');

    let debounceTimer;

    const handleFilterChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters = {
                ...(searchInput?.value && { search: searchInput.value }),
                ...(categoryFilter?.value && { category: categoryFilter.value }),
                ...(cityFilter?.value && { city: cityFilter.value }),
                ...(sortBy?.value && { orderBy: sortBy.value })
            };
            loadEvents(1);
        }, 500);
    };

    searchInput?.addEventListener('input', handleFilterChange);
    categoryFilter?.addEventListener('change', handleFilterChange);
    cityFilter?.addEventListener('input', handleFilterChange);
    sortBy?.addEventListener('change', handleFilterChange);
}

// Initialize events page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('eventsGrid')) {
        loadFeaturedEvents();
        loadEvents();
        loadCategories();
        setupFilters();
    }
});
