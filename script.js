document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registroForm');
    const emailInput = document.getElementById('email');
    const empresaInput = document.getElementById('empresa');
    const startRecordingBtn = document.getElementById('startRecording');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const audioPreview = document.getElementById('audioPreview');
    const timerDisplay = document.getElementById('timerDisplay');
    const submitStatus = document.getElementById('submitStatus');

    let mediaRecorder;
    let audioChunks = [];
    let timerInterval;
    let startTime;

    // Convertir empresa a mayúsculas mientras se escribe
    empresaInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Validación de email
    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    // Función para actualizar el timer
    const updateTimer = () => {
        const currentTime = new Date().getTime();
        const elapsedTime = new Date(currentTime - startTime);
        const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
        const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;

        // Detener la grabación después de 2 minutos
        if (minutes === '02') {
            stopRecording();
        }
    };

    // Iniciar grabación
    startRecordingBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPreview.src = audioUrl;
                audioPreview.style.display = 'block';
            };

            mediaRecorder.start();
            startTime = new Date().getTime();
            timerInterval = setInterval(updateTimer, 1000);
            
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            document.getElementById('audioError').textContent = 'Error al acceder al micrófono. Por favor, asegúrate de dar los permisos necesarios.';
        }
    });

    // Detener grabación
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

    // Función para mostrar mensajes de estado
    const showStatus = (message, isError = false) => {
        submitStatus.textContent = message;
        submitStatus.className = `status-message ${isError ? 'error' : 'success'}`;
    };

    // Manejo del envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar email
        if (!validateEmail(emailInput.value)) {
            document.getElementById('emailError').textContent = 'Por favor, ingresa un correo electrónico válido';
            return;
        }

        // Validar empresa
        if (!empresaInput.value.trim()) {
            document.getElementById('empresaError').textContent = 'Por favor, ingresa el nombre de la empresa';
            return;
        }

        // Validar audio
        if (audioChunks.length === 0) {
            document.getElementById('audioError').textContent = 'Por favor, graba un audio antes de enviar el formulario';
            return;
        }

        // Preparar datos para enviar
        const formData = new FormData();
        formData.append('email', emailInput.value);
        formData.append('empresa', empresaInput.value);
        formData.append('audio', new Blob(audioChunks, { type: 'audio/wav' }));

        showStatus('Enviando formulario...');

        try {
            const response = await fetch('https://purely-able-marmot.ngrok-free.app/webhook/441261da-69c3-4c27-8f7c-b5ea347c8295', {
                method: 'POST',
                body: formData,
                mode: 'no-cors', // Agregamos modo no-cors
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Debido a que estamos usando modo no-cors, no podemos acceder a la respuesta
            // Asumimos que si no hay error, el envío fue exitoso
            showStatus('¡Formulario enviado con éxito! Si no recibes confirmación, por favor contacta al administrador.');
            form.reset();
            audioPreview.style.display = 'none';
            audioChunks = [];
            
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error al enviar el formulario. Por favor, verifica tu conexión e intenta nuevamente.', true);
        }
    });
}); 
