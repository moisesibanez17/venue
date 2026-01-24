// Admin Dashboard JavaScript
// Handles login, QR scanning, free ticket generation, and discount codes

let authToken = sessionStorage.getItem('admin_token');
let html5QrCode;
let validCount = 0;
let invalidCount = 0;
let totalCount = 0;

// Elements
const loginModal = document.getElementById('login-modal');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Check if already logged in
if (authToken) {
    showDashboard();
    loadDiscountCodes();
} else {
    showLogin();
}

function showLogin() {
    loginModal.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
}

function showDashboard() {
    loginModal.classList.add('hidden');
    adminDashboard.classList.remove('hidden');

    // Set username display
    const username = sessionStorage.getItem('admin_username') || 'Admin';
    document.getElementById('admin-username').textContent = `@${username}`;

    // Activate first tab
    switchTab('scanner');
}

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            sessionStorage.setItem('admin_token', data.token);
            sessionStorage.setItem('admin_username', data.username);
            showDashboard();
            loadDiscountCodes();
        } else {
            loginError.classList.remove('hidden');
            loginError.querySelector('p').textContent = data.message || 'Credenciales inválidas';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.classList.remove('hidden');
        loginError.querySelector('p').textContent = 'Error de conexión';
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_username');
    authToken = null;
    showLogin();
});

// Tab switching
function switchTab(tabName) {
    // Update buttons
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('bg-neon-cyan', 'text-midnight');
            btn.classList.remove('bg-white/5', 'text-slate-400');
        } else {
            btn.classList.remove('bg-neon-cyan', 'text-midnight');
            btn.classList.add('bg-white/5', 'text-slate-400');
        }
    });

    // Update content
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================
// QR SCANNER FUNCTIONALITY
// ============================================

const startBtn = document.getElementById('start-scan-btn');
const stopBtn = document.getElementById('stop-scan-btn');
const resultContainer = document.getElementById('result-container');
const resultContent = document.getElementById('result-content');
const scanAnotherBtn = document.getElementById('scan-another-btn');

function updateStats() {
    document.getElementById('valid-count').textContent = validCount;
    document.getElementById('invalid-count').textContent = invalidCount;
    document.getElementById('total-count').textContent = totalCount;
}

function showResult(isValid, message, ticketData = null) {
    resultContainer.classList.remove('hidden');

    let html = `
        <div class="text-center">
            <div class="mb-6">
                <span class="material-symbols-outlined text-6xl ${isValid ? 'text-neon-cyan' : 'text-neon-pink'}">
                    ${isValid ? 'check_circle' : 'cancel'}
                </span>
            </div>
            <h2 class="text-2xl font-black uppercase mb-2 ${isValid ? 'text-neon-cyan' : 'text-neon-pink'}">
                ${isValid ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
            </h2>
            <p class="text-base text-white font-bold mb-4">${message}</p>
    `;

    if (ticketData) {
        html += `
            <div class="bg-white/5 p-4 border border-white/10 text-left space-y-2 text-sm">
                <div><span class="text-slate-500">Nombre:</span> <span class="text-white font-bold">${ticketData.full_name}</span></div>
                ${ticketData.email ? `<div><span class="text-slate-500">Email:</span> <span class="text-white">${ticketData.email}</span></div>` : ''}
                ${ticketData.quantity ? `<div><span class="text-slate-500">Cantidad:</span> <span class="text-white">${ticketData.quantity} boleto(s)</span></div>` : ''}
                ${ticketData.scanned_at ? `<div class="text-xs"><span class="text-slate-500">Escaneado:</span> <span class="text-white">${new Date(ticketData.scanned_at).toLocaleString()}</span></div>` : ''}
                ${ticketData.payment_status ? `<div><span class="text-slate-500">Pago:</span> <span class="text-white">${ticketData.payment_status}</span></div>` : ''}
            </div>
        `;
    }

    html += `</div>`;
    resultContent.innerHTML = html;

    totalCount++;
    if (isValid) {
        validCount++;
    } else {
        invalidCount++;
    }
    updateStats();
}

async function validateTicket(url) {
    try {
        const urlParts = url.split('/');
        const token = urlParts[urlParts.length - 1];

        const response = await fetch(`/api/validate/${token}`, {
            method: 'POST'
        });

        const data = await response.json();
        showResult(data.valid, data.message, data.ticket);

    } catch (error) {
        console.error('Error validando:', error);
        showResult(false, 'Error de conexión al servidor');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    html5QrCode.stop().then(() => {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        validateTicket(decodedText);
    });
}

function onScanError(errorMessage) {
    // Ignore scan errors (very common)
}

startBtn.addEventListener('click', () => {
    resultContainer.classList.add('hidden');

    html5QrCode = new Html5Qrcode("reader");

    const isMobile = window.innerWidth < 640;
    const qrBoxSize = isMobile ? Math.min(window.innerWidth - 100, 250) : 250;

    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: qrBoxSize, height: qrBoxSize }
        },
        onScanSuccess,
        onScanError
    ).then(() => {
        startBtn.disabled = true;
        stopBtn.disabled = false;
    }).catch(err => {
        console.error('Error iniciando scanner:', err);
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
    });
});

stopBtn.addEventListener('click', () => {
    html5QrCode.stop().then(() => {
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });
});

scanAnotherBtn.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
    startBtn.click();
});

// ============================================
// FREE TICKET GENERATION
// ============================================

const freeTicketForm = document.getElementById('free-ticket-form');
const generatedTicket = document.getElementById('generated-ticket');

freeTicketForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('free-name').value;
    const email = document.getElementById('free-email').value;
    const phone = document.getElementById('free-phone').value;
    const quantity = parseInt(document.getElementById('free-quantity').value);

    try {
        const response = await fetch('/api/admin/generate-free-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ full_name: name, email, phone, quantity })
        });

        const data = await response.json();

        if (data.success) {
            // Show generated ticket
            document.getElementById('generated-qr').src = data.ticket.qr_code;
            document.getElementById('generated-info').textContent =
                `${name} - ${quantity} boleto(s) - ${email}`;
            generatedTicket.classList.remove('hidden');

            // Store QR for download
            generatedTicket.dataset.qrCode = data.ticket.qr_code;

            // Reset form
            freeTicketForm.reset();

            // Scroll to ticket
            generatedTicket.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error generando boleto:', error);
        alert('Error generando boleto gratis');
    }
});

// Download QR code
document.getElementById('download-qr').addEventListener('click', () => {
    const qrCode = generatedTicket.dataset.qrCode;
    if (qrCode) {
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = 'ticket-qr.png';
        link.click();
    }
});

// ============================================
// DISCOUNT CODE MANAGEMENT
// ============================================

const discountForm = document.getElementById('discount-form');
const discountsList = document.getElementById('discounts-list');

async function loadDiscountCodes() {
    try {
        const response = await fetch('/api/admin/discount-codes', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        displayDiscountCodes(data.codes);
    } catch (error) {
        console.error('Error loading discount codes:', error);
    }
}

function displayDiscountCodes(codes) {
    if (!codes || codes.length === 0) {
        discountsList.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">No hay códigos creados</p>';
        return;
    }

    discountsList.innerHTML = codes.map(code => `
        <div class="bg-white/5 border border-white/10 p-4 flex justify-between items-center">
            <div>
                <div class="font-black text-white uppercase">${code.code}</div>
                <div class="text-xs text-slate-400 mt-1">
                    ${code.discount_type === 'percentage' ? `${code.discount_value}% OFF` : `$${code.discount_value} OFF`}
                    ${code.max_uses ? ` · ${code.current_uses}/${code.max_uses} usos` : ` · ${code.current_uses} usos`}
                </div>
            </div>
            <button onclick="toggleDiscount(${code.id})" 
                class="px-4 py-2 text-xs font-black uppercase ${code.is_active ? 'bg-neon-lime text-midnight' : 'bg-white/10 text-white'}">
                ${code.is_active ? 'Activo' : 'Inactivo'}
            </button>
        </div>
    `).join('');
}

discountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = document.getElementById('discount-code-input').value;
    const type = document.getElementById('discount-type').value;
    const value = document.getElementById('discount-value').value;
    const maxUses = document.getElementById('discount-max-uses').value;

    try {
        const response = await fetch('/api/admin/create-discount-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                code,
                discount_type: type,
                discount_value: parseFloat(value),
                max_uses: maxUses ? parseInt(maxUses) : null
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✓ Código ${code} creado exitosamente`);
            discountForm.reset();
            loadDiscountCodes();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error creando código:', error);
        alert('Error creando código de descuento');
    }
});

async function toggleDiscount(id) {
    try {
        const response = await fetch(`/api/admin/discount-code/${id}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            loadDiscountCodes();
        }
    } catch (error) {
        console.error('Error toggling discount:', error);
    }
}

// Make toggleDiscount available globally
window.toggleDiscount = toggleDiscount;

// ============================================
// REMINDER EMAILS
// ============================================

const sendRemindersBtn = document.getElementById('send-reminders-btn');
const reminderResult = document.getElementById('reminder-result');
const reminderMessage = document.getElementById('reminder-message');

sendRemindersBtn.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de enviar recordatorios a todos los asistentes confirmados?')) {
        return;
    }

    sendRemindersBtn.disabled = true;
    sendRemindersBtn.textContent = 'Enviando...';

    try {
        const response = await fetch('/api/admin/send-reminders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            reminderResult.classList.remove('hidden', 'border-neon-pink');
            reminderResult.classList.add('border-neon-lime');
            reminderMessage.classList.remove('text-neon-pink');
            reminderMessage.classList.add('text-neon-lime');
            reminderMessage.textContent = `✅ Enviados: ${data.sent}/${data.total} emails`;

            if (data.failed > 0) {
                reminderMessage.textContent += ` (${data.failed} fallidos)`;
            }
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error sending reminders:', error);
        reminderResult.classList.remove('hidden', 'border-neon-lime');
        reminderResult.classList.add('border-neon-pink');
        reminderMessage.classList.remove('text-neon-lime');
        reminderMessage.classList.add('text-neon-pink');
        reminderMessage.textContent = '❌ Error enviando recordatorios: ' + error.message;
    } finally {
        sendRemindersBtn.disabled = false;
        sendRemindersBtn.textContent = 'Enviar Recordatorios';
    }
});
