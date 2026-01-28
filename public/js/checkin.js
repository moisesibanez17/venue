// ================================================
// Check-in Logic with Nimiq QR Scanner
// ================================================

let qrScanner = null;
let lastScannedCode = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const videoElem = document.getElementById('qr-video');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const flashBtn = document.getElementById('toggleFlashBtn');
    const camStatus = document.getElementById('camStatus');

    // Initialize Scanner
    QrScanner.WORKER_PATH = '/js/qr-scanner-worker.min.js';

    qrScanner = new QrScanner(
        videoElem,
        result => onScanSuccess(result),
        {
            preferredCamera: 'environment', // Prefer back camera
            highlightScanRegion: true,
            highlightCodeOutline: true,
        }
    );

    // Event Listeners
    startBtn.addEventListener('click', () => {
        startScanner();
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        camStatus.textContent = 'Cámara Activa';
        camStatus.classList.add('active');
    });

    stopBtn.addEventListener('click', () => {
        qrScanner.stop();
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        flashBtn.style.display = 'none';
        camStatus.textContent = 'Cámara Inactiva';
        camStatus.classList.remove('active');
    });

    flashBtn.addEventListener('click', () => {
        qrScanner.toggleFlash().then(() => {
            flashBtn.classList.toggle('active');
        });
    });

    document.getElementById('manualSubmitBtn').addEventListener('click', () => {
        const ticketNumber = document.getElementById('manualTicketInput').value.trim();
        if (ticketNumber) {
            verifyTicket(ticketNumber);
        }
    });

    // Handle initial camera check for flash support
    QrScanner.hasCamera().then(hasCamera => {
        if (!hasCamera) {
            camStatus.textContent = 'No se detectó cámara';
            startBtn.disabled = true;
        }
    });
});

function startScanner() {
    qrScanner.start().then(() => {
        qrScanner.hasFlash().then(hasFlash => {
            if (hasFlash) {
                document.getElementById('toggleFlashBtn').style.display = 'inline-block';
            }
        });
    }).catch(err => {
        console.error(err);
        alert('No se pudo iniciar la cámara. Asegúrate de dar permisos.');
    });
}

function onScanSuccess(result) {
    if (isProcessing) return;

    // Nimiq returns object { data: "...", ... } or string depending on version/usage
    const decodedText = result.data || result;

    if (decodedText === lastScannedCode) return;

    console.log('Scanned Raw:', decodedText);

    try {
        isProcessing = true;
        let ticketNumber = decodedText;

        // Robust JSON parsing
        if (typeof decodedText === 'string' && (decodedText.startsWith('{') || decodedText.startsWith('['))) {
            try {
                const data = JSON.parse(decodedText);
                if (data.ticket) {
                    ticketNumber = data.ticket;
                }
            } catch (e) {
                console.warn('JSON Parse failed, using raw text', e);
            }
        }

        lastScannedCode = ticketNumber;

        // Visual feedback
        const videoContainer = document.querySelector('.scanner-wrapper');
        videoContainer.style.border = '4px solid #3b82f6';
        setTimeout(() => videoContainer.style.border = 'none', 300);

        verifyTicket(ticketNumber);

        // Cooldown
        setTimeout(() => {
            isProcessing = false;
            lastScannedCode = null;
        }, 3000);

    } catch (error) {
        console.error('Scan Error:', error);
        isProcessing = false;
    }
}

async function verifyTicket(ticketNumber) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.style.display = 'block';
    resultDiv.className = 'scan-result';
    resultDiv.innerHTML = '<div class="spinner" style="margin: 0 auto;"></div>';

    try {
        const response = await apiCall('/organizer/check-in', {
            method: 'POST',
            body: JSON.stringify({ ticketNumber })
        });

        // Success
        playSuccessSound();
        showResult(`
            <div style="font-size: 3rem;">✅</div>
            <h3>Acceso Permitido</h3>
            <div style="background: white; border-radius: 8px; padding: 10px; margin-top: 10px; border: 1px solid #ddd;">
                <p style="font-weight: bold; margin-bottom: 5px;">${response.ticket.ticket_type.name}</p>
                <p style="color: #555; margin-bottom: 5px;">${response.ticket.user.full_name}</p>
                <small style="color: #888;">${response.ticket.ticket_number}</small>
            </div>
        `, 'success');

    } catch (error) {
        let message = 'Ticket Inválido';
        let icon = '❌';

        if (error.message === 'Ticket already used') {
            message = 'Ticket Ya Utilizado';
            icon = '⚠️';
        } else if (error.message === 'Ticket not found') {
            message = 'Ticket No Encontrado';
        } else if (error.message === 'Ticket is not valid') {
            message = 'Ticket No Válido (Estado Incorrecto)';
            icon = '⚠️';
        } else if (error.message === 'Unauthorized') {
            message = 'Evento Incorrecto';
            icon = '🚫';
        } else {
            // Show the actual server error if unknown
            message = error.message || 'Error Desconocido';
            icon = '⚠️';
        }

        playErrorSound(); // Using same sound for now or visual cue
        showResult(`
            <div style="font-size: 3rem;">${icon}</div>
            <h3>${message}</h3>
            <p style="margin-top: 10px; font-family: monospace; background: rgba(0,0,0,0.05); padding: 5px; border-radius: 4px;">
                ${ticketNumber.substring(0, 20)}...
            </p>
        `, 'error');
    }
}

function showResult(html, type) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.className = `scan-result ${type}`;
    resultDiv.innerHTML = html;
}

function playSuccessSound() {
    const audio = document.getElementById('successAudio');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed', e));
    }
}

function playErrorSound() {
    // Optional: Add error sound logic
    // const audio = document.getElementById('errorAudio');
    // if(audio) audio.play();
}
