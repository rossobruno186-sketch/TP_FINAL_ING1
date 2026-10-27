const formE1 = document.querySelector('.form');

formE1.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(formE1);
    const data = Object.fromEntries(formData);

    // 1. Validar que no haya campos vacíos
    if (data.contacto == '' || data.password_1 == '' || data.password_2 == '') {
        document.getElementById('resultado').style.color = 'RED';
        document.getElementById('resultado').textContent = 'Debe completar todos los campos.';
        return;
    }

    // 2. Verificar que ambas contraseñas sean iguales
    if (data.password_1 !== data.password_2) {
        document.getElementById('resultado').style.color = 'RED';
        document.getElementById('resultado').textContent = 'Las contraseñas no coinciden.';
        return;
    }

    // 3. Preparar los datos para la API (El backend espera 'id' y 'password')
    const resetData = {
        id: data.contacto, // Tu backend usa el email como ID
        password: data.password_1
    };

    // 4. Consumir la API REST
    fetch('http://localhost:8080/api/resetCliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetData),
    })
    .then(res => res.json())
    .then(respuesta => {
        if (respuesta.response == 'OK') {
            document.getElementById('resultado').style.color = 'GREEN';
            document.getElementById('resultado').textContent = 'Contraseña actualizada con éxito. Redirigiendo...';
            setTimeout(() => {
                window.location.href = 'http://127.0.0.1:5500/HTML/loginClient.html';
            }, 2000);
        } else {
            document.getElementById('resultado').style.color = 'RED';
            document.getElementById('resultado').textContent = 'Error: ' + respuesta.message;
        }
    })
    .catch(err => {
        console.log(err);
        document.getElementById('resultado').textContent = 'Error de conexión con el servidor.';
    });
});