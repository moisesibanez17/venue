// ================================================
// Forgot Password Logic
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;

        try {
            ui.showLoading();

            const data = await apiCall('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            ui.showAlert(data.message || 'Si el correo existe, se ha enviado un enlace de recuperación', 'success');
            form.reset();
        } catch (error) {
            ui.showAlert(error.message || 'Error al procesar la solicitud', 'error');
        } finally {
            ui.hideLoading();
        }
    });
});
