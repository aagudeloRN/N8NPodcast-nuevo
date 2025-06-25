document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registroForm');
    const emailInput = document.getElementById('email');
    const empresaInput = document.getElementById('empresa');
    const startRecordingBtn = document.getElementById('startRecording');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const audioPreview = document.getElementById('audioPreview');
    const timerDisplay = document.getElementById('timerDisplay');
    const submitStatus = document.getElementById('submitStatus');

    const WEBHOOK_URL = 'https://primary-production-ddbf.up.railway.app/webhook-test/formulario';
    //const WEBHOOK_URL = 'https://primary-production-ddbf.up.railway.app/webhook/formulario';

    let mediaRecorder;
    let audioChunks = [];
    let timerInterval;
    let startTime;

    // Empresa en mayúsculas
    empresaInput.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());

    // Validación de email
    const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Actualizar timer
    const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const minutes = String(Math.floor(elapsed / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
        if (minutes === '02') stopRecording();
    };

    // Iniciar grabación
    startRecordingBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                audioPreview.src = url;
                audioPreview.style.display = 'block';
            };

            mediaRecorder.start();
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);

            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            document.getElementById('audioError').textContent = 'No se pudo acceder al micrófono.';
        }
    });

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            clearInterval(timerInterval);
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };
    stopRecordingBtn.addEventListener('click', stopRecording);

    // Mostrar estado
    const showStatus = (message, isError = false) => {
        submitStatus.textContent = message;
        submitStatus.className = `status-message ${isError ? 'error' : 'success'}`;
    };

    // Envío del formulario
    form.addEventListener('submit', async e => {
        e.preventDefault();
        // Limpiar errores previos
        document.getElementById('emailError').textContent = '';
        document.getElementById('empresaError').textContent = '';
        document.getElementById('audioError').textContent = '';

        // Validaciones
        if (!validateEmail(emailInput.value)) {
            document.getElementById('emailError').textContent = 'Ingresa un correo válido';
            return;
        }
        if (!empresaInput.value.trim()) {
            document.getElementById('empresaError').textContent = 'Ingresa el nombre de la empresa';
            return;
        }
        if (audioChunks.length === 0) {
            document.getElementById('audioError').textContent = 'Graba un audio antes de enviar';
            return;
        }

        showStatus('Preparando envío...');

        try {
            const formData = new FormData();
            formData.append('email', emailInput.value);
            formData.append('empresa', empresaInput.value.toUpperCase());

            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const extension = mimeType.split('/')[1];
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            formData.append('audio', audioBlob, `pitch.${extension}`);

            showStatus('Enviando formulario...');
            const response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });

            if (response.ok) {
                showStatus('¡Formulario enviado con éxito!');
                form.reset();
                audioPreview.style.display = 'none';
                audioChunks = [];
            } else {
                throw new Error(`Servidor respondió ${response.status}`);
            }
        } catch (error) {
            console.error('Error al enviar:', error);
            showStatus(`Error al enviar: ${error.message}`, true);
        }
    });
});
