
/* ==========================================
   AIRCOLOMBIA SIGOA
   CONFIRMACIÓN Y CONSULTA DE RESERVA
   ========================================== */

const reserva = JSON.parse(
    localStorage.getItem("aircolombia_reserva_actual") || "null"
);

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

const errorBox = document.getElementById("confirmationError");

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function mostrarError(mensaje) {
    errorBox.textContent = mensaje;
    errorBox.classList.remove("hidden");
}

function crearDetalle(etiqueta, valor) {
    return `
        <div class="confirmation-detail">
            <span>${escaparHTML(etiqueta)}</span>
            <strong>${escaparHTML(valor)}</strong>
        </div>
    `;
}

function validarReserva() {
    if (!reserva) {
        mostrarError("No encontramos una reserva registrada.");
        return false;
    }

    if (reserva.estado !== "PAGADA - TIQUETES EMITIDOS") {
        mostrarError(
            "Esta reserva no tiene un pago aprobado. No es posible mostrar tiquetes electrónicos."
        );
        return false;
    }

    if (!Array.isArray(reserva.tiquetes) || reserva.tiquetes.length === 0) {
        mostrarError("No encontramos tiquetes emitidos para esta reserva.");
        return false;
    }

    return true;
}

function renderizarVuelos() {
    const contenedor = document.getElementById("confirmedFlights");
    const ida = reserva.vuelos.vueloIda;
    const regreso = reserva.vuelos.vueloRegreso;

    contenedor.innerHTML = `
        <div class="confirmation-detail">
            <span>Trayecto de ida</span>
            <strong>${escaparHTML(ida.origen)} → ${escaparHTML(ida.destino)}</strong>
        </div>
        <div class="confirmation-detail">
            <span>Vuelo de ida</span>
            <strong>${escaparHTML(ida.numero)} · ${escaparHTML(ida.salida)} - ${escaparHTML(ida.llegada)}</strong>
        </div>
        <div class="confirmation-detail">
            <span>Fecha de salida</span>
            <strong>${escaparHTML(reserva.busqueda.fechaSalida)}</strong>
        </div>
        ${regreso ? `
            <div class="confirmation-detail">
                <span>Trayecto de regreso</span>
                <strong>${escaparHTML(regreso.origen)} → ${escaparHTML(regreso.destino)}</strong>
            </div>
            <div class="confirmation-detail">
                <span>Vuelo de regreso</span>
                <strong>${escaparHTML(regreso.numero)} · ${escaparHTML(regreso.salida)} - ${escaparHTML(regreso.llegada)}</strong>
            </div>
            <div class="confirmation-detail">
                <span>Fecha de regreso</span>
                <strong>${escaparHTML(reserva.busqueda.fechaRegreso)}</strong>
            </div>
        ` : ""}
    `;
}

function renderizarTiquetes() {
    const contenedor = document.getElementById("confirmedTickets");

    contenedor.innerHTML = reserva.tiquetes.map(tiquete => `
        <article class="ticket-item">
            <h3>TIQUETE ELECTRÓNICO</h3>
            <div class="ticket-number">${escaparHTML(tiquete.numero)}</div>
            <p><strong>Pasajero:</strong> ${escaparHTML(tiquete.pasajero)}</p>
            <p><strong>Documento:</strong> ${escaparHTML(tiquete.documento)}</p>
            <p><strong>Vuelo de ida:</strong> ${escaparHTML(tiquete.vueloIda)}</p>
            ${tiquete.vueloRegreso ? `
                <p><strong>Vuelo de regreso:</strong> ${escaparHTML(tiquete.vueloRegreso)}</p>
            ` : ""}
            <p><strong>Reserva:</strong> ${escaparHTML(tiquete.reserva)}</p>
        </article>
    `).join("");
}

function renderizarPasajeros() {
    const contenedor = document.getElementById("confirmedPassengers");

    contenedor.innerHTML = reserva.pasajeros.map((pasajero, indice) => `
        <div class="confirmation-detail">
            <span>${escaparHTML(pasajero.tipo)} ${indice + 1}</span>
            <strong>${escaparHTML(pasajero.nombres)} ${escaparHTML(pasajero.apellidos)}</strong>
        </div>
    `).join("");
}

function renderizarPago() {
    const contenedor = document.getElementById("confirmedPayment");
    const pago = reserva.pago || {};

    contenedor.innerHTML = `
        ${crearDetalle("Estado de la transacción", "APROBADA")}
        ${crearDetalle("Método de pago", pago.metodo || "No disponible")}
        ${crearDetalle("Referencia", pago.referencia || "No disponible")}
        ${crearDetalle("Fecha de pago", pago.fecha ? new Date(pago.fecha).toLocaleString("es-CO") : "No disponible")}
        ${crearDetalle("Total pagado", formatoCOP.format(pago.monto || reserva.totalCompra || 0))}
    `;
}

function inicializar() {
    if (!validarReserva()) {
        document.querySelector(".confirmation-success").classList.add("hidden");
        return;
    }

    document.getElementById("confirmationCode").textContent =
        reserva.codigo;

    renderizarVuelos();
    renderizarTiquetes();
    renderizarPasajeros();
    renderizarPago();
}

document.getElementById("copyCode").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(reserva.codigo);
        document.getElementById("copyCode").textContent = "¡Copiado!";
    } catch {
        mostrarError("No fue posible copiar el código. Puedes seleccionarlo manualmente.");
    }
});

document.getElementById("printConfirmation").addEventListener("click", () => {
    window.print();
});

document.getElementById("newBooking").addEventListener("click", () => {
    const claves = [
        "aircolombia_busqueda",
        "aircolombia_vuelos_seleccionados",
        "aircolombia_reserva_actual",
        "aircolombia_compra_actual"
    ];

    claves.forEach(clave => localStorage.removeItem(clave));

    window.location.href = "../index.html";
});

inicializar();

console.log("AIRCOLOMBIA SIGOA | Confirmación de reserva inicializada.");
