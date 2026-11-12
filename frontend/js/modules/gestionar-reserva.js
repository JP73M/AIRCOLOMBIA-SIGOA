
const formulario = document.getElementById("formBuscarReserva");
const resultado = document.getElementById("resultadoReserva");
const mensaje = document.getElementById("mensajeBusqueda");
const informacion = document.getElementById("informacionReserva");

let reservaEncontrada = null;

// Normalizar textos para comparar apellidos
function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

// Obtener código independientemente del nombre de la propiedad
function obtenerCodigo(reserva) {
    return reserva.codigoReserva || reserva.codigo || "";
}

// Obtener nombre del pasajero
function obtenerNombre(pasajero) {
    return pasajero.nombres || pasajero.nombre || "";
}

// Obtener apellidos del pasajero
function obtenerApellido(pasajero) {
    return pasajero.apellidos ||
        pasajero.apellido ||
        pasajero.primerApellido ||
        "";
}

// Obtener documento
function obtenerDocumento(pasajero) {
    return pasajero.documento ||
        pasajero.numeroDocumento ||
        "";
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function mostrarMensaje(texto, tipo = "error") {
    mensaje.textContent = texto;
    mensaje.className = `form-message ${tipo}`;
}

formulario.addEventListener("submit", function(event) {
    event.preventDefault();

    const codigo = document
        .getElementById("codigoReserva")
        .value.trim()
        .toUpperCase();

    const apellidoIngresado = normalizarTexto(
        document.getElementById("apellidoPasajero").value
    );

    mensaje.textContent = "";
    resultado.hidden = true;
    reservaEncontrada = null;

    if (!codigo || !apellidoIngresado) {
        mostrarMensaje("Completa todos los campos.");
        return;
    }

    const reservaGuardada = localStorage.getItem(
        `aircolombia_reserva_${codigo}`
    );

    if (!reservaGuardada) {
        mostrarMensaje(
            "No encontramos una reserva con ese código."
        );
        return;
    }

    try {
        const reserva = JSON.parse(reservaGuardada);

        const pasajeros = reserva.pasajeros || [];

        const pasajeroValido = pasajeros.some(pasajero => {
            const apellidos = normalizarTexto(
                obtenerApellido(pasajero)
            );

            // Acepta el apellido completo o uno de sus componentes.
            const componentes = apellidos.split(" ");

            return apellidos === apellidoIngresado ||
                componentes.includes(apellidoIngresado);
        });

        if (!pasajeroValido) {
            mostrarMensaje(
                "El apellido no coincide con los pasajeros de la reserva."
            );
            return;
        }

        reservaEncontrada = reserva;

        mostrarReserva(reserva);

        resultado.hidden = false;

        document.getElementById("mensajeAccion").textContent = "";

        window.scrollTo({
            top: resultado.offsetTop - 30,
            behavior: "smooth"
        });

    } catch (error) {
        console.error("Error consultando reserva:", error);

        mostrarMensaje(
            "No fue posible procesar la información de la reserva."
        );
    }
});

function mostrarReserva(reserva) {
    document.getElementById("estadoReserva").textContent =
        reserva.estado || "ESTADO NO DISPONIBLE";

    const pasajeros = reserva.pasajeros || [];

    const codigo = obtenerCodigo(reserva);

    const fechaCompra = reserva.fechaCompra ||
        reserva.fechaCreacion ||
        "No disponible";

    let html = `
        <div class="reservation-info-grid">

            <div class="reservation-info-item">
                <span>Código de reserva</span>
                <strong>${escapar(codigo)}</strong>
            </div>

            <div class="reservation-info-item">
                <span>Número de pasajeros</span>
                <strong>${pasajeros.length}</strong>
            </div>

            <div class="reservation-info-item">
                <span>Fecha de compra</span>
                <strong>${escapar(fechaCompra)}</strong>
            </div>

        </div>

        <h3>Pasajeros</h3>

        <div class="reservation-passengers">
    `;

    pasajeros.forEach(pasajero => {
        html += `
            <div class="passenger-row">
                <strong>
                    ${escapar(obtenerNombre(pasajero))}
                    ${escapar(obtenerApellido(pasajero))}
                </strong>

                <span>
                    ${escapar(pasajero.tipoDocumento || "")}
                    ${escapar(obtenerDocumento(pasajero))}
                </span>
            </div>
        `;
    });

    html += `</div><h3>Itinerario</h3>`;

    const vuelos = reserva.vuelos || {};

    const vueloIda = vuelos.ida || vuelos.vueloIda;
    const vueloRegreso = vuelos.regreso || vuelos.vueloRegreso;

    if (vueloIda) {
        html += crearTarjetaVuelo(vueloIda, "Vuelo de ida");
    }

    if (vueloRegreso) {
        html += crearTarjetaVuelo(vueloRegreso, "Vuelo de regreso");
    }

    if (!vueloIda && !vueloRegreso) {
        html += `<p>No hay información de vuelos disponible.</p>`;
    }

    const tiquetes = reserva.tiquetes || [];

    if (tiquetes.length > 0) {
        html += `
            <h3>Tiquetes emitidos</h3>
            <div class="reservation-tickets">
        `;

        tiquetes.forEach(tiquete => {
            html += `
                <div class="ticket-row">
                    <span>${escapar(tiquete.pasajero || "Pasajero")}</span>
                    <strong>${escapar(tiquete.numero || "No disponible")}</strong>
                </div>
            `;
        });

        html += `</div>`;
    }

    informacion.innerHTML = html;
}

function crearTarjetaVuelo(vuelo, titulo) {
    const origen = vuelo.origen || vuelo.codigoOrigen || "N/D";
    const destino = vuelo.destino || vuelo.codigoDestino || "N/D";

    return `
        <div class="managed-flight-card">
            <h4>${titulo}</h4>

            <div class="managed-flight-route">
                <div>
                    <strong>${escapar(origen)}</strong>
                    <span>Origen</span>
                </div>

                <span class="flight-arrow">→</span>

                <div>
                    <strong>${escapar(destino)}</strong>
                    <span>Destino</span>
                </div>
            </div>

            <div class="managed-flight-details">
                <span>Vuelo: ${escapar(vuelo.numero || "N/D")}</span>
                <span>Fecha: ${escapar(vuelo.fecha || "N/D")}</span>
                <span>Hora: ${escapar(vuelo.horaSalida || vuelo.salida || "N/D")}</span>
            </div>
        </div>
    `;
}

document
    .getElementById("btnCambiarReserva")
    .addEventListener("click", function() {

        if (!reservaEncontrada) return;

        localStorage.setItem(
            "aircolombia_reserva_gestion",
            JSON.stringify(reservaEncontrada)
        );

        window.location.href = "cambios.html";
    });

document
    .getElementById("btnCancelarReserva")
    .addEventListener("click", function() {

        if (!reservaEncontrada) return;

        const confirmar = confirm(
            "¿Estás seguro de que deseas solicitar la cancelación de esta reserva?"
        );

        if (!confirmar) return;

        const codigo = obtenerCodigo(reservaEncontrada);

        if (reservaEncontrada.estado === "CANCELADA") {
            document.getElementById("mensajeAccion").textContent =
                "Esta reserva ya se encuentra cancelada.";
            return;
        }

        reservaEncontrada.estado = "CANCELACIÓN SOLICITADA";

        localStorage.setItem(
            `aircolombia_reserva_${codigo}`,
            JSON.stringify(reservaEncontrada)
        );

        localStorage.setItem(
            "aircolombia_reserva_actual",
            JSON.stringify(reservaEncontrada)
        );

        localStorage.setItem(
            "aircolombia_reserva_gestion",
            JSON.stringify(reservaEncontrada)
        );

        document.getElementById("estadoReserva").textContent =
            reservaEncontrada.estado;

        document.getElementById("mensajeAccion").textContent =
            "La solicitud de cancelación fue registrada.";
    });
