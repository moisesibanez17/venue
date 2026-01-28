// ================================================
// Login Page Logic
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm('loginForm')) {
            return;
        }

        try {
            ui.showLoading();

            const credentials = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            const data = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            // Store token and user data
            auth.setToken(data.token);
            auth.setUser(data.user);

            ui.showAlert('¡Inicio de sesión exitoso!', 'success');

            // Get redirect URL if exists
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect') ||
                (data.user.role === 'organizer' || data.user.role === 'admin' ? '/organizer-dashboard.html' : '/');

            setTimeout(() => {
                window.location.href = redirect;
            }, 1000);

        } catch (error) {
            ui.showAlert(error.message || 'Error al iniciar sesión', 'error');
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
