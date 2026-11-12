
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

formulario.addEventListener("submit", async function(event) {
    event.preventDefault();
    const codigo=document.getElementById("codigoReserva").value.trim().toUpperCase();
    const apellido=document.getElementById("apellidoPasajero").value.trim();
    mensaje.textContent="";resultado.hidden=true;reservaEncontrada=null;
    if(!codigo || !apellido){mostrarMensaje("Completa todos los campos.");return;}
    try {
        const response=await fetch(`http://localhost:3000/api/reservas/${encodeURIComponent(codigo)}?apellido=${encodeURIComponent(apellido)}`);
        const data=await response.json();
        if(!response.ok) throw new Error(data.mensaje || "Reserva no encontrada.");
        reservaEncontrada=data.reserva;
        localStorage.setItem(`aircolombia_reserva_${codigo}`,JSON.stringify(data.reserva));
        mostrarReserva(data.reserva);resultado.hidden=false;
        document.getElementById("mensajeAccion").textContent="";
        window.scrollTo({top:resultado.offsetTop-30,behavior:"smooth"});
    }catch(e){mostrarMensaje(e.message || "No se pudo consultar MySQL.");}
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

document.getElementById("btnCancelarReserva").addEventListener("click",async function(){
    if(!reservaEncontrada)return;
    if(!confirm("¿Deseas solicitar la cancelación de esta reserva?"))return;
    const codigo=obtenerCodigo(reservaEncontrada);
    const apellido=document.getElementById("apellidoPasajero").value.trim();
    try{
        const response=await fetch(`http://localhost:3000/api/reservas/${encodeURIComponent(codigo)}/cancelacion`,{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apellido,motivo:"Solicitud del cliente desde la web"})
        });
        const data=await response.json();
        if(!response.ok)throw new Error(data.mensaje||"No se pudo registrar la solicitud.");
        reservaEncontrada.estado="CANCELACION_SOLICITADA";
        document.getElementById("estadoReserva").textContent=reservaEncontrada.estado;
        document.getElementById("mensajeAccion").textContent=data.mensaje;
        localStorage.setItem(`aircolombia_reserva_${codigo}`,JSON.stringify(reservaEncontrada));
    }catch(e){document.getElementById("mensajeAccion").textContent=e.message;}
});
