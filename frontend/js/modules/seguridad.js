
const API = "http://localhost:3000/api/admin";
const AUTH = "http://localhost:3000/api/auth";

const $ = id => document.getElementById(id);

const token = localStorage.getItem("aircolombia_token");

const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
        if (response.status === 401) {
            localStorage.removeItem("aircolombia_token");
            localStorage.removeItem("aircolombia_usuario");
            window.location.href = "login.html";
        }
    }

    if (!response.ok) {
        throw new Error(data.mensaje || "Error en la operación.");
    }

    return data;
}

function say(id, text, success = false) {
    const element = $(id);
    if (!element) return;

    element.textContent = text;
    element.style.color = success ? "#24794b" : "#a33b32";
}

function fechaBonita(fecha) {
    if (!fecha) return "Sin registros";

    return new Date(fecha).toLocaleString("es-CO");
}

// VALIDAR SESIÓN ADMINISTRATIVA
async function validarSesion() {
    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    try {
        const response = await request(`${AUTH}/perfil`);

        if (response.usuario.rol !== "Administrador") {
            alert("No tienes permisos para acceder a administración.");
            window.location.href = "../index.html";
            return false;
        }

        $("loginPanel").hidden = true;
        $("adminWorkspace").hidden = false;

        return true;

    } catch (error) {
        console.error(error);

        if (error.message) {
            alert(error.message);
        }

        return false;
    }
}

// CONSULTAR USUARIOS
async function cargarUsuarios() {
    const data = await request(`${API}/usuarios`);
    const usuarios = data.usuarios || [];

    $("userCount").textContent = usuarios.length;
    $("activeCount").textContent =
        usuarios.filter(u => u.activo).length;

    $("lockedCount").textContent =
        usuarios.filter(u => u.bloqueado).length;

    $("usersTable").innerHTML = usuarios.map(u => `
        <tr>
            <td>
                ${esc(u.nombres)} ${esc(u.apellidos)}
                <br><small>${esc(u.correo)}</small>
            </td>
            <td>${esc(u.username)}</td>
            <td>${esc(u.rol)}</td>
            <td>${esc(u.area || "Operaciones")}</td>
            <td>
                <span class="status-pill ${u.activo ? "" : "off"}">
                    ${u.activo ? "Activo" : "Inactivo"}
                    ${u.bloqueado ? " / Bloqueado" : ""}
                </span>
            </td>
            <td>
                <button data-act="role" data-id="${u.id}"
                    ${Number(u.id) === Number(
                        JSON.parse(localStorage.getItem("aircolombia_usuario") || "{}").id
                    ) ? "disabled" : ""}>
                    Cambiar rol
                </button>

                <button data-act="active" data-id="${u.id}"
                    ${Number(u.id) === Number(
                        JSON.parse(localStorage.getItem("aircolombia_usuario") || "{}").id
                    ) ? "disabled" : ""}>
                    ${u.activo ? "Desactivar" : "Activar"}
                </button>

                <button data-act="unlock" data-id="${u.id}">
                    Desbloquear
                </button>
            </td>
        </tr>
    `).join("") || `
        <tr><td colspan="6">No hay usuarios registrados.</td></tr>
    `;
}

// CONSULTAR AUDITORÍA
async function cargarAuditoria() {
    const data = await request(`${API}/auditoria`);
    const eventos = data.eventos || [];

    $("auditTable").innerHTML = eventos.map(evento => `
        <tr>
            <td>${esc(fechaBonita(evento.fecha))}</td>
            <td>${esc(evento.username || "Sistema")}</td>
            <td>${esc(evento.accion)}</td>
            <td>${esc(evento.descripcion)}</td>
        </tr>
    `).join("") || `
        <tr><td colspan="4">Sin eventos registrados.</td></tr>
    `;
}

async function actualizarPanel() {
    try {
        await Promise.all([
            cargarUsuarios(),
            cargarAuditoria()
        ]);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// CREAR USUARIO
$("userForm").addEventListener("submit", async event => {
    event.preventDefault();

    const datos = {
        nombre: $("newName").value.trim(),
        username: $("newUsername").value.trim(),
        correo: $("newEmail").value.trim(),
        password: $("newPassword").value,
        rol: $("newRole").value,
        area: $("newArea").value
    };

    try {
        const resultado = await request(`${API}/usuarios`, {
            method: "POST",
            body: JSON.stringify(datos)
        });

        $("userForm").reset();

        say("userMessage", resultado.mensaje, true);

        await actualizarPanel();

    } catch (error) {
        say("userMessage", error.message);
    }
});

// ACCIONES SOBRE USUARIOS
$("usersTable").addEventListener("click", async event => {
    const button = event.target.closest("button[data-act]");

    if (!button || button.disabled) return;

    const id = button.dataset.id;
    const action = button.dataset.act;

    try {
        if (action === "role") {
            const roles = [
                "Agente",
                "Supervisor",
                "Analista",
                "Administrador",
                "Cliente"
            ];

            const data = await request(`${API}/usuarios`);
            const usuario = data.usuarios.find(u => String(u.id) === id);

            if (!usuario) return;

            const actual = roles.indexOf(usuario.rol);
            const siguiente = roles[(actual + 1) % roles.length];

            if (!confirm(`¿Cambiar el rol de ${usuario.username} a ${siguiente}?`)) {
                return;
            }

            await request(`${API}/usuarios/${id}/rol`, {
                method: "PATCH",
                body: JSON.stringify({ rol: siguiente })
            });
        }

        if (action === "active") {
            const data = await request(`${API}/usuarios`);
            const usuario = data.usuarios.find(u => String(u.id) === id);

            if (!usuario) return;

            const nuevoEstado = !usuario.activo;

            if (!confirm(
                `¿${nuevoEstado ? "Activar" : "Desactivar"} a ${usuario.username}?`
            )) {
                return;
            }

            await request(`${API}/usuarios/${id}/estado`, {
                method: "PATCH",
                body: JSON.stringify({ activo: nuevoEstado })
            });
        }

        if (action === "unlock") {
            if (!confirm("¿Desbloquear esta cuenta?")) return;

            await request(`${API}/usuarios/${id}/desbloquear`, {
                method: "PATCH"
            });
        }

        await actualizarPanel();

    } catch (error) {
        alert(error.message);
    }
});

// CERRAR SESIÓN
$("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("aircolombia_token");
    localStorage.removeItem("aircolombia_usuario");
    localStorage.removeItem("aircolombia_admin_session");
    localStorage.removeItem("aircolombia_user_session");

    window.location.href = "login.html";
});

// INICIAR PANEL
(async function iniciar() {
    const autorizado = await validarSesion();

    if (autorizado) {
        await actualizarPanel();
    }
})();
