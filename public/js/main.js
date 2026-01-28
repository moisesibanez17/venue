// ================================================
// Global Configuration & Utilities
// ================================================

const API_URL = window.location.origin + '/api';

// Auth utilities
const auth = {
    getToken() {
        return localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
    },

    removeToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    }
};

// API call wrapper
async function apiCall(endpoint, options = {}) {
    const token = auth.getToken();

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Handle 401 Unauthorized
        if (response.status === 401) {
            auth.removeToken();
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// UI Utilities
const ui = {
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'flex';
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '10000';
        alertDiv.style.minWidth = '300px';
        alertDiv.style.animation = 'slideInRight 0.3s ease';

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    },

    formatDate(dateString) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    },

    formatShortDate(dateString) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }
};

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const inputs = form.querySelectorAll('[required]');
    let isValid = true;

    inputs.forEach(input => {
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('form-error')) {
            errorElement.remove();
        }

        if (!input.value.trim()) {
            isValid = false;
            const error = document.createElement('span');
            error.className = 'form-error';
            error.textContent = 'This field is required';
            input.parentNode.insertBefore(error, input.nextSibling);
        }

        // Email validation
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                isValid = false;
                const error = document.createElement('span');
                error.className = 'form-error';
                error.textContent = 'Invalid email address';
                input.parentNode.insertBefore(error, input.nextSibling);
            }
        }
    });

    return isValid;
}

// Update navbar based on auth state
function updateNavbar() {
    const isAuth = auth.isAuthenticated();
    const user = auth.getUser();

    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const myTicketsLink = document.getElementById('myTicketsLink');
    const dashboardLink = document.getElementById('dashboardLink');

    if (isAuth) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';

        // Show different menu items based on role
        if (user && (user.role === 'organizer' || user.role === 'admin')) {
            // Organizers see "Mis Eventos"
            if (myTicketsLink) myTicketsLink.style.display = 'none';
            if (dashboardLink) {
                dashboardLink.style.display = 'block';
                dashboardLink.href = '/organizer-dashboard.html';
                dashboardLink.textContent = 'Mis Eventos';
            }
        } else {
            // Attendees see "Mis Boletos"
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (myTicketsLink) {
                myTicketsLink.style.display = 'block';
                myTicketsLink.href = '/profile.html';
                myTicketsLink.textContent = 'Mis Boletos';
            }
        }
    } else {
        if (loginLink) loginLink.style.display = 'block';
        if (registerLink) registerLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (myTicketsLink) myTicketsLink.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
}

// Logout handler
function setupLogout() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            auth.removeToken();
            ui.showAlert('Logged out successfully', 'success');
            setTimeout(() => window.location.href = '/', 1000);
        });
    }
}

// Mobile menu toggle
function setupMobileMenu() {
    // IDs must match HTML
    const toggle = document.getElementById('navbarToggle');
    const menu = document.querySelector('.navbar-menu'); // Using class to match CSS selector

    if (toggle && menu) {
        // Toggle click
        // Toggle click
        toggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing it
            menu.classList.toggle('active');

            // Swap SVG Icon
            const isOpen = menu.classList.contains('active');
            toggle.innerHTML = isOpen
                ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>` // X icon
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>`; // Menu icon
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (menu.classList.contains('active') && !menu.contains(e.target) && !toggle.contains(e.target)) {
                menu.classList.remove('active');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });

        // Close when clicking a link
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('active');
            });
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    setupLogout();
    setupMobileMenu();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
