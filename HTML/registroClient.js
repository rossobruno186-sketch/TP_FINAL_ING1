const formE1 = document.querySelector('.form');

formE1.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(formE1);
    const data = Object.fromEntries(formData);

    // 1. Verificamos que ningún campo esté vacío (incluyendo confirmar contraseña)
    if (data.nombre == '' || data.contacto == '' || data.password == '' || data.confirmPassword == '') {
        document.getElementById('resultado').style.color = 'RED';
        document.getElementById('resultado').textContent = 'Debe completar todos los campos.';
        return;
    }

    // 2. NUEVO: Validamos que las contraseñas coincidan
    if (data.password !== data.confirmPassword) {
        document.getElementById('resultado').style.color = 'RED';
        document.getElementById('resultado').textContent = 'Error: Las contraseñas no coinciden.';
        return;
    }

    // 3. Verificamos los términos y condiciones
    if (data.termscondition != 'on') {
        document.getElementById('resultado').style.color = 'RED';
        document.getElementById('resultado').textContent = 'Debe aceptar los términos y condiciones.';
        return;
    }

    const nuevoCliente = {
        nombre: data.nombre,
        contacto: data.contacto,
        password: data.password
    };

    fetch('http://localhost:8080/api/addCliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente),
    })
    .then(res => res.json())
    .then(respuesta => {
        if (respuesta.response == 'OK') {
            document.getElementById('resultado').style.color = 'GREEN';
            document.getElementById('resultado').textContent = 'Registro exitoso. Redirigiendo al login...';
            setTimeout(() => {
                // Redirección con ruta relativa corregida
                window.location.href = 'loginClient.html';
            }, 2000);
        } else {
            document.getElementById('resultado').style.color = 'RED';
            document.getElementById('resultado').textContent = 'Error: ' + respuesta.message;
        }
    })
    .catch(err => console.log(err));
});