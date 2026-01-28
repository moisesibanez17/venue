// ================================================
// Register Page Logic
// ================================================

// Role selection handler
document.addEventListener('DOMContentLoaded', () => {
    // Setup role selection
    const roleCards = document.querySelectorAll('.role-card');
    const roleInput = document.getElementById('role');

    roleCards.forEach(card => {
        card.addEventListener('click', function () {
            // Remove active class from all cards
            roleCards.forEach(c => c.classList.remove('active'));

            // Add active class to clicked card
            this.classList.add('active');

            // Update hidden input value
            const role = this.getAttribute('data-role');
            roleInput.value = role;

            console.log('Rol seleccionado:', role);
        });
    });

    // Form submission
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate passwords match
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            ui.showAlert('Las contraseñas no coinciden', 'error');
            return;
        }

        if (password.length < 8) {
            ui.showAlert('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }

        if (!validateForm('registerForm')) {
            return;
        }

        try {
            ui.showLoading();

            const role = roleInput.value;
            const userData = {
                full_name: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                password: password,
                role: role
            };

            console.log('Enviando datos de registro:', userData);

            const data = await apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            // Store token and user data
            auth.setToken(data.token);
            auth.setUser(data.user);

            ui.showAlert('¡Cuenta creada exitosamente!', 'success');

            setTimeout(() => {
                if (data.user.role === 'organizer' || data.user.role === 'admin') {
                    window.location.href = '/organizer-dashboard.html';
                } else {
                    window.location.href = '/';
                }
            }, 1500);

        } catch (error) {
            ui.showAlert(error.message || 'Error al crear la cuenta', 'error');
        } finally {
            ui.hideLoading();
        }
    });

    // Redirect if already logged in
    if (auth.isAuthenticated()) {
        const user = auth.getUser();
        window.location.href = (user.role === 'organizer' || user.role === 'admin')
            ? '/organizer-dashboard.html'
            : '/';
    }
});
