
/* ==========================================
   AIRCOLOMBIA SIGOA
   CAMBIOS, CANCELACIONES Y REEMBOLSOS
   RF-21 A RF-25
========================================== */

const reserva = JSON.parse(
    localStorage.getItem("aircolombia_reserva_gestion") || "null"
);

const compra = JSON.parse(
    localStorage.getItem("aircolombia_compra_actual") || "null"
);

const $ = id => document.getElementById(id);

let vueloSeleccionado = null;
let alternativasActuales = [];
let trayectoSeleccionado = "vueloIda";

const formatoCOP = valor =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function obtenerCodigo() {
    return reserva?.codigo || reserva?.codigoReserva || "";
}

function obtenerVueloActual() {
    const selector = $("tipoTrayecto").value;

    trayectoSeleccionado = selector === "regreso"
        ? "vueloRegreso"
        : "vueloIda";

    return reserva?.vuelos?.[trayectoSeleccionado] || null;
}

function obtenerPrecio(vuelo) {
    return Number(
        vuelo?.precio ??
        vuelo?.precioPorPersona ??
        vuelo?.tarifa ??
        0
    );
}

function obtenerNombrePasajero(pasajero) {
    return `${pasajero.nombres || pasajero.nombre || ""} ${
        pasajero.apellidos || pasajero.apellido || ""
    }`.trim();
}

function guardarReserva() {
    const codigo = obtenerCodigo();

    if (!codigo) return;

    localStorage.setItem(
        `aircolombia_reserva_${codigo}`,
        JSON.stringify(reserva)
    );

    localStorage.setItem(
        "aircolombia_reserva_actual",
        JSON.stringify(reserva)
    );

    localStorage.setItem(
        "aircolombia_reserva_gestion",
        JSON.stringify(reserva)
    );
}

function mostrarMensaje(texto, tipo = "success") {
    const elemento = $("mensajeGeneral");

    elemento.textContent = texto;
    elemento.className = `change-message ${tipo}`;
    elemento.hidden = false;

    elemento.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function registrarSolicitud(tipo, descripcion, valor = 0, estado = "REGISTRADA") {
    if (!Array.isArray(reserva.solicitudes)) {
        reserva.solicitudes = [];
    }

    reserva.solicitudes.unshift({
        tipo,
        descripcion,
        valor,
        fecha: new Date().toLocaleString("es-CO"),
        estado
    });

    guardarReserva();
    mostrarHistorial();
}

function mostrarHistorial() {
    const solicitudes = reserva?.solicitudes || [];
    const contenedor = $("historialSolicitudes");

    if (!solicitudes.length) {
        contenedor.innerHTML =
            '<p class="empty-history">No hay solicitudes registradas.</p>';
        return;
    }

    contenedor.innerHTML = solicitudes.map(solicitud => `
        <div class="history-item">
            <strong>${escapar(solicitud.tipo)}</strong>
            <p>${escapar(solicitud.descripcion)}</p>
            <p>
                ${escapar(solicitud.fecha)} ·
                ${escapar(solicitud.estado)}
            </p>
            ${Number(solicitud.valor) > 0
                ? `<strong>${formatoCOP(solicitud.valor)}</strong>`
                : ""}
        </div>
    `).join("");
}

function inicializar() {
    if (!reserva) {
        $("codigoReserva").textContent = "No disponible";
        $("estadoReserva").textContent = "Sin reserva";

        $("btnBuscarAlternativas").disabled = true;
        $("btnSolicitarCancelacion").disabled = true;

        mostrarMensaje(
            "No encontramos una reserva para gestionar. Consulta primero tu reserva.",
            "error"
        );

        return;
    }

    $("codigoReserva").textContent = obtenerCodigo() || "No disponible";

    $("estadoReserva").textContent =
        reserva.estado || "Sin estado";

    $("cantidadPasajeros").textContent =
        reserva.pasajeros?.length || 0;

    if (!reserva.vuelos?.vueloRegreso) {
        $("tipoTrayecto").querySelector(
            'option[value="regreso"]'
        ).disabled = true;
    }

    const minimo = new Date();
    minimo.setDate(minimo.getDate() + 1);

    $("nuevaFecha").min = minimo.toISOString().split("T")[0];

    actualizarVueloActual();
    actualizarReembolso();
    mostrarHistorial();

    if (reserva.estado === "CANCELADA") {
        $("btnSolicitarCancelacion").disabled = true;
        $("btnBuscarAlternativas").disabled = true;
    }
}

function actualizarVueloActual() {
    const vuelo = obtenerVueloActual();

    if (!vuelo) {
        $("vueloActual").textContent =
            "No hay información disponible para este trayecto.";

        return;
    }

    $("vueloActual").innerHTML = `
        <strong>Vuelo actual: ${escapar(vuelo.numero || "N/D")}</strong><br>
        Ruta: ${escapar(vuelo.origen || "N/D")} →
        ${escapar(vuelo.destino || "N/D")}<br>
        Fecha: ${escapar(vuelo.fecha || "N/D")}<br>
        Salida: ${escapar(vuelo.salida || vuelo.horaSalida || "N/D")}<br>
        Tarifa por pasajero: ${formatoCOP(obtenerPrecio(vuelo))}
    `;

    $("alternativasContainer").hidden = true;
    $("resumenCambio").hidden = true;

    vueloSeleccionado = null;
}

function generarAlternativas(vuelo, fecha) {
    const precioBase = obtenerPrecio(vuelo);

    const variaciones = [0.85, 1, 1.15, 1.30];

    return variaciones.map((factor, indice) => ({
        ...vuelo,
        numero: `AC${420 + indice}`,
        origen: vuelo.origen,
        destino: vuelo.destino,
        fecha,
        salida: ["07:30", "11:45", "15:20", "19:10"][indice],
        horaSalida: ["07:30", "11:45", "15:20", "19:10"][indice],
        duracion: ["1 h 10 min", "1 h 15 min", "1 h 20 min", "1 h 25 min"][indice],
        escalas: 0,
        precio: Math.round(precioBase * factor),
        clase: vuelo.clase || "Económica"
    }));
}

function buscarAlternativas() {
    if (reserva.estado !== "PAGADA - TIQUETES EMITIDOS") {
        mostrarMensaje(
            "Solo puedes cambiar vuelos de reservas pagadas y con tiquetes emitidos.",
            "error"
        );
        return;
    }

    const vueloActual = obtenerVueloActual();
    const nuevaFecha = $("nuevaFecha").value;

    if (!vueloActual) {
        mostrarMensaje("No encontramos el vuelo seleccionado.", "error");
        return;
    }

    if (!nuevaFecha) {
        mostrarMensaje("Selecciona una nueva fecha de viaje.", "error");
        return;
    }

    if (nuevaFecha === vueloActual.fecha) {
        mostrarMensaje("Selecciona una fecha diferente.", "error");
        return;
    }

    if (nuevaFecha < $("nuevaFecha").min) {
        mostrarMensaje("La fecha debe ser posterior a hoy.", "error");
        return;
    }

    if (obtenerPrecio(vueloActual) <= 0) {
        mostrarMensaje(
            "No podemos calcular la diferencia porque el vuelo no tiene una tarifa individual registrada.",
            "error"
        );
        return;
    }

    alternativasActuales = generarAlternativas(vueloActual, nuevaFecha);
    vueloSeleccionado = null;

    $("alternativasContainer").hidden = false;
    $("resumenCambio").hidden = true;

    $("listaAlternativas").innerHTML =
        alternativasActuales.map((vuelo, indice) => `
            <article class="alternative-card" id="alternativa-${indice}">
                <h4>Vuelo ${escapar(vuelo.numero)}</h4>

                <div class="alternative-route">
                    <strong>${escapar(vuelo.origen)}</strong>
                    <span>→</span>
                    <strong>${escapar(vuelo.destino)}</strong>
                </div>

                <div class="alternative-details">
                    <span>Fecha: ${escapar(vuelo.fecha)}</span>
                    <span>Salida: ${escapar(vuelo.salida)}</span>
                    <span>Duración: ${escapar(vuelo.duracion)}</span>
                    <span>Escalas: ${vuelo.escalas}</span>
                    <span>Clase: ${escapar(vuelo.clase)}</span>
                </div>

                <div class="alternative-price">
                    ${formatoCOP(vuelo.precio)}
                    <small>por pasajero</small>
                </div>

                <button type="button" data-indice="${indice}">
                    Seleccionar vuelo
                </button>
            </article>
        `).join("");

    $("listaAlternativas").querySelectorAll("button").forEach(boton => {
        boton.addEventListener("click", () => {
            seleccionarVuelo(Number(boton.dataset.indice));
        });
    });

    mostrarMensaje(
        "Encontramos cuatro alternativas simuladas para tu ruta.",
        "success"
    );
}

function seleccionarVuelo(indice) {
    vueloSeleccionado = alternativasActuales[indice];

    document.querySelectorAll(".alternative-card").forEach(card => {
        card.classList.remove("selected");
    });

    $(`alternativa-${indice}`).classList.add("selected");

    const precioActual = obtenerPrecio(obtenerVueloActual());
    const precioNuevo = obtenerPrecio(vueloSeleccionado);
    const pasajeros = reserva.pasajeros?.length || 1;

    const diferencia = precioNuevo - precioActual;
    const total = Math.max(0, diferencia) * pasajeros;

    $("precioActual").textContent = formatoCOP(precioActual);
    $("precioNuevo").textContent = formatoCOP(precioNuevo);

    $("diferenciaPasajero").textContent =
        diferencia < 0
            ? `A favor del pasajero: ${formatoCOP(Math.abs(diferencia))}`
            : formatoCOP(diferencia);

    $("totalDiferencia").textContent = formatoCOP(total);

    $("resumenCambio").hidden = false;
}

function confirmarCambio() {
    if (!vueloSeleccionado) {
        mostrarMensaje("Primero selecciona un vuelo alternativo.", "error");
        return;
    }

    const precioActual = obtenerPrecio(obtenerVueloActual());
    const precioNuevo = obtenerPrecio(vueloSeleccionado);
    const pasajeros = reserva.pasajeros?.length || 1;

    const diferencia = precioNuevo - precioActual;
    const total = Math.max(0, diferencia) * pasajeros;

    if (diferencia > 0) {
        const solicitudPendiente = {
            trayecto: trayectoSeleccionado,
            vueloAnterior: { ...obtenerVueloActual() },
            vueloNuevo: { ...vueloSeleccionado },
            diferenciaPorPasajero: diferencia,
            totalDiferencia: total,
            fecha: new Date().toISOString(),
            estado: "PENDIENTE DE PAGO"
        };

        reserva.solicitudCambioPendiente = solicitudPendiente;

        registrarSolicitud(
            "CAMBIO DE VUELO",
            `Solicitud para cambiar al vuelo ${vueloSeleccionado.numero}. Diferencia pendiente de pago: ${formatoCOP(total)}.`,
            total,
            "PENDIENTE DE PAGO"
        );

        mostrarMensaje(
            `Solicitud registrada. Debes pagar ${formatoCOP(total)} antes de confirmar el nuevo itinerario. No se ha modificado el vuelo actual.`,
            "success"
        );

        $("alternativasContainer").hidden = true;
        return;
    }

    const confirmar = window.confirm(
        `¿Confirmas el cambio de vuelo?\n\n` +
        `No hay diferencia adicional por pagar.\n` +
        `Esta operación es una simulación.`
    );

    if (!confirmar) return;

    const vueloAnterior = { ...obtenerVueloActual() };

    reserva.vuelos[trayectoSeleccionado] = {
        ...vueloSeleccionado
    };

    reserva.estado = "CAMBIO DE VUELO REGISTRADO";

    registrarSolicitud(
        "CAMBIO DE VUELO",
        `Cambio de ${vueloAnterior.numero || "vuelo anterior"} a ${vueloSeleccionado.numero}. No hay diferencia adicional por pagar.`,
        0,
        "CONFIRMADO"
    );

    $("estadoReserva").textContent = reserva.estado;

    actualizarVueloActual();

    $("alternativasContainer").hidden = true;

    mostrarMensaje(
        "Cambio registrado correctamente. El nuevo vuelo ya está asociado a la reserva.",
        "success"
    );
}

function calcularTotalVuelos() {
    const totalCompra = Number(compra?.totalVuelos || 0);

    if (totalCompra > 0) return totalCompra;

    const vuelos = reserva.vuelos || {};

    const ida = obtenerPrecio(vuelos.vueloIda);
    const regreso = obtenerPrecio(vuelos.vueloRegreso);

    return (ida + regreso) * (reserva.pasajeros?.length || 1);
}

function actualizarReembolso() {
    const tarifa = $("tipoTarifa").value;

    const porcentajes = {
        flexible: 1,
        estandar: 0.5,
        basica: 0
    };

    const totalVuelos = calcularTotalVuelos();
    const porcentaje = porcentajes[tarifa];

    const reembolso = Math.round(totalVuelos * porcentaje);

    $("valorReembolso").textContent = formatoCOP(reembolso);

    $("detalleReembolso").textContent =
        `${porcentaje * 100}% del valor de los vuelos. ` +
        `Base de cálculo: ${formatoCOP(totalVuelos)}.`;

    return {
        tarifa,
        porcentaje,
        totalVuelos,
        reembolso
    };
}

function solicitarCancelacion() {
    if (!reserva) return;

    if (reserva.estado === "CANCELADA") {
        mostrarMensaje("Esta reserva ya está cancelada.", "error");
        return;
    }

    if (reserva.estado !== "PAGADA - TIQUETES EMITIDOS") {
        mostrarMensaje(
            "Solo puedes cancelar reservas pagadas y con tiquetes emitidos.",
            "error"
        );
        return;
    }

    if (reserva.solicitudCambioPendiente) {
        mostrarMensaje(
            "Existe un cambio de vuelo pendiente de pago. Resuelve esa solicitud antes de cancelar.",
            "error"
        );
        return;
    }

    const calculo = actualizarReembolso();

    const confirmar = window.confirm(
        `¿Deseas cancelar esta reserva?\n\n` +
        `Tarifa: ${calculo.tarifa}\n` +
        `Reembolso estimado: ${formatoCOP(calculo.reembolso)}\n\n` +
        `Esta operación es una simulación.`
    );

    if (!confirmar) return;

    reserva.estado = "CANCELADA";

    reserva.reembolso = {
        tarifa: calculo.tarifa,
        porcentaje: calculo.porcentaje * 100,
        valorBase: calculo.totalVuelos,
        valorReembolso: calculo.reembolso,
        estado: calculo.reembolso > 0
            ? "REEMBOLSO SOLICITADO"
            : "SIN DERECHO A REEMBOLSO",
        fecha: new Date().toISOString()
    };

    registrarSolicitud(
        "CANCELACIÓN DE RESERVA",
        `Reserva cancelada. Reembolso estimado: ${formatoCOP(calculo.reembolso)}. Estado: ${reserva.reembolso.estado}.`,
        calculo.reembolso,
        "CANCELADA"
    );

    $("estadoReserva").textContent = reserva.estado;
    $("btnSolicitarCancelacion").disabled = true;
    $("btnBuscarAlternativas").disabled = true;

    mostrarMensaje(
        `Reserva cancelada. ${reserva.reembolso.estado}: ${formatoCOP(calculo.reembolso)}.`,
        "success"
    );
}

$("tipoTrayecto").addEventListener("change", actualizarVueloActual);
$("btnBuscarAlternativas").addEventListener("click", buscarAlternativas);
$("btnConfirmarCambio").addEventListener("click", confirmarCambio);
$("tipoTarifa").addEventListener("change", actualizarReembolso);
$("btnSolicitarCancelacion").addEventListener("click", solicitarCancelacion);

inicializar();
