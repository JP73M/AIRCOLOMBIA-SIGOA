
/* AIRCOLOMBIA SIGOA - AUTENTICACIÓN CON MYSQL */

const API_URL = "http://localhost:3000/api/auth";

const $ = id => document.getElementById(id);

function mensaje(id, texto, correcto = false) {
    const elemento = $(id);
    elemento.textContent = texto;
    elemento.style.color = correcto ? "#24794b" : "#a33b32";
}

function cambiarPestana(login) {
    $("loginForm").hidden = !login;
    $("registerForm").hidden = login;

    $("tabLogin").classList.toggle("active", login);
    $("tabRegister").classList.toggle("active", !login);
}

$("tabLogin").addEventListener("click", () => cambiarPestana(true));
$("tabRegister").addEventListener("click", () => cambiarPestana(false));

async function solicitarAPI(ruta, datos) {
    const respuesta = await fetch(`${API_URL}/${ruta}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "Error de conexión.");
    }

    return resultado;
}

/* INICIO DE SESIÓN */

$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const identity = $("loginIdentity").value.trim();
    const password = $("loginPass").value;

    const boton = $("loginForm").querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;
    boton.textContent = "Verificando...";

    try {
        const resultado = await solicitarAPI("login", {
            identity,
            password
        });

        // Guardar token de autenticación
        localStorage.setItem(
            "aircolombia_token",
            resultado.token
        );

        localStorage.setItem(
            "aircolombia_usuario",
            JSON.stringify(resultado.usuario)
        );

        // Compatibilidad temporal con las pantallas anteriores
        const sesion = {
            user: resultado.usuario.username,
            role: resultado.usuario.rol,
            displayName: resultado.usuario.nombres,
            expires: Date.now() + 8 * 60 * 60 * 1000
        };

        localStorage.setItem(
            "aircolombia_admin_session",
            JSON.stringify(sesion)
        );

        localStorage.setItem(
            "aircolombia_user_session",
            JSON.stringify(sesion)
        );

        mensaje(
            "loginMessage",
            "Acceso correcto. Redirigiendo...",
            true
        );

        const rol = resultado.usuario.rol.toLowerCase();

        setTimeout(() => {
            switch (rol) {
                case "administrador":
                    window.location.href = "usuarios.html";
                    break;

                case "cliente":
                    window.location.href = "../index.html";
                    break;

                case "agente":
                    window.location.href = "gestionar-reserva.html";
                    break;

                case "supervisor":
                case "analista":
                    window.location.href = "reportes.html";
                    break;

                default:
                    window.location.href = "../index.html";
            }
        }, 500);

    } catch (error) {
        mensaje("loginMessage", error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Ingresar";
    }
});

/* REGISTRO DE CLIENTES */

$("registerForm").addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = $("regName").value.trim();
    const correo = $("regEmail").value.trim().toLowerCase();
    const username = $("regUser").value.trim();
    const password = $("regPass").value;

    if (password.length < 8) {
        mensaje(
            "registerMessage",
            "La contraseña debe tener mínimo 8 caracteres."
        );
        return;
    }

    const boton = $("registerForm").querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;
    boton.textContent = "Registrando...";

    try {
        const resultado = await solicitarAPI("registro", {
            nombre,
            correo,
            username,
            password
        });

        mensaje(
            "registerMessage",
            resultado.mensaje,
            true
        );

        $("registerForm").reset();

        setTimeout(() => {
            cambiarPestana(true);
            $("loginIdentity").value = username;
        }, 1000);

    } catch (error) {
        mensaje("registerMessage", error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Crear cuenta";
    }
});
