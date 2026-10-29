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

    // 3. Preparar los datos para la API (Ahora mandamos 'contacto' y 'password')
    const resetData = {
        contacto: data.contacto, // Usamos 'contacto' tal como lo espera ahora el backend
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
            // Mostrar la alerta pop-up
            window.alert('¡Contraseña actualizada con éxito! Presiona Aceptar para ir al login.');
            // Redirigir al usuario al login inmediatamente después de que cierre la alerta
            window.location.href = 'loginClient.html';
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