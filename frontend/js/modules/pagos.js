
/* ==========================================
   AIRCOLOMBIA SIGOA
   PAGOS Y EMISIÓN DE TIQUETES
   RF-17, RF-18, RF-19 Y RF-20
   ========================================== */

const reserva = JSON.parse(
    localStorage.getItem("aircolombia_reserva_actual") || "null"
);

const compra = JSON.parse(
    localStorage.getItem("aircolombia_compra_actual") || "null"
);

const flightSummary = document.getElementById("paymentFlightSummary");
const passengersContainer = document.getElementById("paymentPassengers");
const servicesContainer = document.getElementById("paymentServices");
const paymentExtraFields = document.getElementById("paymentExtraFields");
const paymentError = document.getElementById("paymentError");
const paymentResult = document.getElementById("paymentResult");
const payButton = document.getElementById("payButton");

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

let procesando = false;

function mostrarError(mensaje) {
    paymentError.textContent = mensaje;
    paymentError.classList.remove("hidden");
    paymentError.scrollIntoView({ behavior: "smooth", block: "center" });
}

function ocultarError() {
    paymentError.textContent = "";
    paymentError.classList.add("hidden");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function obtenerMetodo() {
    return document.querySelector(
        'input[name="paymentMethod"]:checked'
    )?.value || "pse";
}

function calcularTotales() {
    const vuelos = Number(compra.totalVuelos || 0);
    const servicios = Number(compra.totalServicios || 0);

    // Impuestos ilustrativos del prototipo: 0% adicional.
    const impuestos = 0;

    return {
        vuelos,
        servicios,
        impuestos,
        total: vuelos + servicios + impuestos
    };
}

function renderizarResumen() {
    if (!reserva || !compra || !reserva.vuelos?.vueloIda) {
        mostrarError("No encontramos la información de tu compra. Regresa y completa los pasos anteriores.");
        payButton.disabled = true;
        return false;
    }

    const ida = reserva.vuelos.vueloIda;
    const regreso = reserva.vuelos.vueloRegreso;

    flightSummary.innerHTML = `
        <div class="payment-detail-row">
            <span>Trayecto de ida</span>
            <strong>${escaparHTML(ida.origen)} → ${escaparHTML(ida.destino)}</strong>
        </div>
        <div class="payment-detail-row">
            <span>Vuelo de ida</span>
            <strong>${escaparHTML(ida.numero)} · ${escaparHTML(ida.salida)}</strong>
        </div>
        ${regreso ? `
            <div class="payment-detail-row">
                <span>Trayecto de regreso</span>
                <strong>${escaparHTML(regreso.origen)} → ${escaparHTML(regreso.destino)}</strong>
            </div>
            <div class="payment-detail-row">
                <span>Vuelo de regreso</span>
                <strong>${escaparHTML(regreso.numero)} · ${escaparHTML(regreso.salida)}</strong>
            </div>
        ` : ""}
        <div class="payment-detail-row">
            <span>Código de reserva</span>
            <strong>${escaparHTML(reserva.codigo)}</strong>
        </div>
    `;

    passengersContainer.innerHTML = reserva.pasajeros.map(p => `
        <div class="payment-detail-row">
            <span>${escaparHTML(p.tipo)} · ${escaparHTML(p.nombres)} ${escaparHTML(p.apellidos)}</span>
            <strong>${escaparHTML(p.documento)}</strong>
        </div>
    `).join("");

    servicesContainer.innerHTML = "";

    (compra.servicios || []).forEach(item => {
        const seleccionados = Object.entries(item.servicios)
            .filter(([, valor]) => Boolean(valor));

        if (!seleccionados.length) return;

        const nombres = {
            asiento: "Asiento",
            equipaje: "Equipaje",
            mascota: "Mascota",
            seguro: "Seguro",
            alimentacion: "Alimentación",
            prioridad: "Embarque prioritario",
            vip: "Sala VIP",
            transporte: "Transporte terrestre"
        };

        const detalle = seleccionados
            .map(([clave, valor]) => `${nombres[clave]}: ${valor}`)
            .join(" · ");

        servicesContainer.innerHTML += `
            <div class="payment-detail-row">
                <span>${escaparHTML(item.pasajero.nombres)} ${escaparHTML(item.pasajero.apellidos)}</span>
                <strong>${escaparHTML(detalle)}</strong>
            </div>
        `;
    });

    if (!servicesContainer.innerHTML) {
        servicesContainer.innerHTML =
            '<div class="payment-detail-row"><span>Sin servicios adicionales</span><strong>$0</strong></div>';
    }

    const totales = calcularTotales();

    document.getElementById("priceFlights").textContent =
        formatoCOP.format(totales.vuelos);

    document.getElementById("priceServices").textContent =
        formatoCOP.format(totales.servicios);

    document.getElementById("priceTaxes").textContent =
        formatoCOP.format(totales.impuestos);

    document.getElementById("paymentTotal").textContent =
        formatoCOP.format(totales.total);

    return true;
}

function renderizarCamposPago() {
    const metodo = obtenerMetodo();

    if (metodo === "pse") {
        paymentExtraFields.innerHTML = `
            <div class="payment-extra-fields">
                <div class="form-field full-width">
                    <label for="bank">Entidad bancaria</label>
                    <select id="bank" required>
                        <option value="">Selecciona tu banco</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Davivienda">Davivienda</option>
                        <option value="Banco de Bogotá">Banco de Bogotá</option>
                        <option value="BBVA">BBVA</option>
                        <option value="Banco Popular">Banco Popular</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
            </div>
        `;
    } else if (metodo === "card") {
        paymentExtraFields.innerHTML = `
            <div class="payment-extra-fields">
                <div class="form-field full-width">
                    <label for="cardName">Nombre del titular (demostración)</label>
                    <input id="cardName" type="text" placeholder="Nombre del titular" required>
                </div>
                <div class="form-field full-width">
                    <label for="cardType">Tipo de tarjeta</label>
                    <select id="cardType" required>
                        <option value="">Selecciona</option>
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Otra">Otra</option>
                    </select>
                </div>
            </div>
        `;
    } else {
        paymentExtraFields.innerHTML = `
            <div class="payment-extra-fields">
                <div class="form-field full-width">
                    <label for="transferBank">Banco de origen</label>
                    <select id="transferBank" required>
                        <option value="">Selecciona tu banco</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Davivienda">Davivienda</option>
                        <option value="Banco de Bogotá">Banco de Bogotá</option>
                        <option value="BBVA">BBVA</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
            </div>
        `;
    }

    paymentExtraFields.insertAdjacentHTML("beforeend", `
        <div class="payment-extra-fields">
            <div class="form-field full-width">
                <label for="simulationResult">Resultado de prueba (solo demostración)</label>
                <select id="simulationResult">
                    <option value="approved">Pago aprobado</option>
                    <option value="pending">Pago pendiente</option>
                    <option value="rejected">Pago rechazado</option>
                    <option value="error">Error de comunicación</option>
                </select>
            </div>
        </div>
    `);
}

function validarMetodoPago() {
    const metodo = obtenerMetodo();

    if (metodo === "pse" && !document.getElementById("bank")?.value) {
        throw new Error("Selecciona una entidad bancaria para continuar.");
    }

    if (metodo === "card") {
        const nombre = document.getElementById("cardName")?.value.trim();
        const tipo = document.getElementById("cardType")?.value;

        if (!nombre || !tipo) {
            throw new Error("Completa los datos de demostración de la tarjeta.");
        }
    }

    if (
        metodo === "transfer" &&
        !document.getElementById("transferBank")?.value
    ) {
        throw new Error("Selecciona el banco de origen.");
    }
}

function generarReferencia() {
    return "TRX-" + Date.now() + "-" +
        Math.floor(Math.random() * 9000 + 1000);
}

function generarNumeroTiquete(indice) {
    return "AC" + Date.now().toString().slice(-8) +
        String(indice + 1).padStart(2, "0");
}

function guardarEstadoReserva(estado, transaccion) {
    const reservaActualizada = {
        ...reserva,
        estado,
        pago: transaccion,
        ultimaActualizacion: new Date().toISOString()
    };

    localStorage.setItem(
        "aircolombia_reserva_actual",
        JSON.stringify(reservaActualizada)
    );

    localStorage.setItem(
        `aircolombia_reserva_${reserva.codigo}`,
        JSON.stringify(reservaActualizada)
    );

    return reservaActualizada;
}

function mostrarResultado(resultado, transaccion) {
    paymentResult.classList.remove("hidden");

    const titulos = {
        approved: "¡Pago aprobado!",
        pending: "Pago pendiente de confirmación",
        rejected: "Pago rechazado",
        error: "No fue posible confirmar el pago"
    };

    const mensajes = {
        approved: "Tu compra fue confirmada y los tiquetes electrónicos han sido emitidos.",
        pending: "Tu reserva permanece pendiente. No se han emitido tiquetes. La disponibilidad debe confirmarse antes de completar el pago.",
        rejected: "La entidad financiera rechazó el pago. No se emitieron tiquetes.",
        error: "Se presentó un problema de comunicación. Tu pago no ha sido confirmado y no se emitieron tiquetes."
    };

    paymentResult.innerHTML = `
        <h2>${titulos[resultado]}</h2>
        <p>${mensajes[resultado]}</p>
        <p><strong>Reserva:</strong> ${escaparHTML(reserva.codigo)}</p>
        <p><strong>Referencia de transacción:</strong> ${escaparHTML(transaccion.referencia)}</p>
        <p><strong>Estado:</strong> ${escaparHTML(transaccion.estado)}</p>
        ${resultado === "approved" ? `
            <p><strong>Número de tiquetes emitidos:</strong> ${transaccion.tiquetes.length}</p>
            <button id="viewConfirmation">Ver confirmación y tiquetes</button>
        ` : `
            <button id="backToPayment">Volver a intentar</button>
        `}
    `;

    if (resultado === "approved") {
        document.getElementById("viewConfirmation").addEventListener("click", () => {
            window.location.href = "confirmacion.html";
        });
    } else {
        document.getElementById("backToPayment").addEventListener("click", () => {
            paymentResult.classList.add("hidden");
            payButton.disabled = false;
            payButton.textContent = "Confirmar y pagar";
        });
    }

    paymentResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

function procesarPago() {
    if (procesando) return;

    ocultarError();

    try {
        validarMetodoPago();

        procesando = true;
        payButton.disabled = true;
        payButton.textContent = "Procesando demostración...";

        const resultado = document.getElementById("simulationResult").value;
        const referencia = generarReferencia();
        const totales = calcularTotales();

        const transaccion = {
            referencia,
            metodo: obtenerMetodo(),
            estado: resultado,
            monto: totales.total,
            fecha: new Date().toISOString()
        };

        let estadoReserva;
        let tiquetes = [];

        if (resultado === "approved") {
            estadoReserva = "PAGADA - TIQUETES EMITIDOS";

            tiquetes = reserva.pasajeros.map((pasajero, indice) => ({
                numero: generarNumeroTiquete(indice),
                pasajero: `${pasajero.nombres} ${pasajero.apellidos}`,
                documento: pasajero.documento,
                vueloIda: reserva.vuelos.vueloIda.numero,
                vueloRegreso: reserva.vuelos.vueloRegreso?.numero || null,
                reserva: reserva.codigo,
                fechaEmision: new Date().toISOString()
            }));

            transaccion.tiquetes = tiquetes;

            const reservaFinal = guardarEstadoReserva(
                estadoReserva,
                transaccion
            );

            reservaFinal.tiquetes = tiquetes;

            localStorage.setItem(
                "aircolombia_reserva_actual",
                JSON.stringify(reservaFinal)
            );

            localStorage.setItem(
                `aircolombia_reserva_${reserva.codigo}`,
                JSON.stringify(reservaFinal)
            );

        } else if (resultado === "pending") {
            estadoReserva = "PAGO PENDIENTE";
            guardarEstadoReserva(estadoReserva, transaccion);
        } else if (resultado === "rejected") {
            estadoReserva = "PAGO RECHAZADO";
            guardarEstadoReserva(estadoReserva, transaccion);
        } else {
            estadoReserva = "ERROR DE COMUNICACIÓN";
            guardarEstadoReserva(estadoReserva, transaccion);
        }


        setTimeout(async () => {

            let correoEnviado = false;

            if (resultado === "approved") {
                try {
                    const reservaFinal = JSON.parse(
                        localStorage.getItem("aircolombia_reserva_actual")
                    );

                    const respuestaCorreo = await fetch(
                        "http://localhost:3000/api/notificaciones/confirmacion",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                reserva: reservaFinal.codigo,
                                comprador: reservaFinal.comprador,
                                pasajeros: reservaFinal.pasajeros,
                                vueloIda: reservaFinal.vuelos.vueloIda,
                                vueloRegreso: reservaFinal.vuelos.vueloRegreso,
                                tiquetes,
                                total: totales.total,
                                referencia: transaccion.referencia
                            })
                        }
                    );

                    const resultadoCorreo = await respuestaCorreo.json();
                    correoEnviado = respuestaCorreo.ok && resultadoCorreo.enviado;

                    console.log(resultadoCorreo.mensaje);

                } catch (error) {
                    console.error("No se pudo enviar el correo:", error);
                }
            }

            mostrarResultado(resultado, {
                ...transaccion,
                estado: estadoReserva,
                tiquetes
            });

            if (resultado === "approved") {
                const aviso = document.createElement("p");
                aviso.textContent = correoEnviado
                    ? "Confirmación enviada correctamente al correo del comprador."
                    : "Compra confirmada, pero no se pudo enviar el correo. Revisa la configuración SMTP.";

                paymentResult.appendChild(aviso);
                payButton.textContent = "Pago completado";
            } else {
                payButton.disabled = false;
                payButton.textContent = "Volver a intentar";
            }

            procesando = false;

        }, 900);


    } catch (error) {
        procesando = false;
        payButton.disabled = false;
        payButton.textContent = "Confirmar y pagar";
        mostrarError(error.message);
    }
}

document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener("change", renderizarCamposPago);
});

payButton.addEventListener("click", procesarPago);

if (renderizarResumen()) {
    renderizarCamposPago();
    console.log("AIRCOLOMBIA SIGOA | Módulo de pagos inicializado.");
}
