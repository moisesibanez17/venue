// ================================================
// Reset Password Logic
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetPasswordForm');
    const invalidMessage = document.getElementById('invalidTokenMessage');

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        form.style.display = 'none';
        invalidMessage.style.display = 'block';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            ui.showAlert('Las contraseñas no coinciden', 'error');
            return;
        }

        if (newPassword.length < 6) {
            ui.showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            ui.showLoading();

            await apiCall('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, newPassword })
            });

            ui.showAlert('Contraseña restablecida exitosamente', 'success');

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

        } catch (error) {
            ui.showAlert(error.message || 'Error al restablecer la contraseña', 'error');
        } finally {
            ui.hideLoading();
        }
    });
});
