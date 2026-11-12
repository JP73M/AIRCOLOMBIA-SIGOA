
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

async function buscarAlternativas() {
    if(reserva.estado!=="PAGADA - TIQUETES EMITIDOS"){
        mostrarMensaje("Solo puedes solicitar cambios de reservas pagadas.","error");return;
    }
    const actual=obtenerVueloActual(),fecha=$("nuevaFecha").value;
    if(!actual||!fecha){mostrarMensaje("Selecciona una fecha y un trayecto.","error");return;}
    try{
        const params=new URLSearchParams({origen:actual.origen,destino:actual.destino,fecha,clase:String(actual.clase||"ECONOMICA").toLowerCase()});
        const resp=await fetch(`http://localhost:3000/api/vuelos?${params}`);
        const data=await resp.json();if(!resp.ok)throw Error(data.mensaje||"No se pudieron consultar vuelos.");
        alternativasActuales=(data.vuelos||[]).map(v=>({id:v.id,numero:v.numero_vuelo,origen:v.origen,destino:v.destino,fecha:v.fecha,salida:v.salida,horaSalida:v.salida,duracion:`${v.duracion} min`,escalas:0,precio:Number(v.precio),clase:v.clase}));
        vueloSeleccionado=null;
        $("alternativasContainer").hidden=false;$("resumenCambio").hidden=true;
        $("listaAlternativas").innerHTML=alternativasActuales.map((v,i)=>`<article class="alternative-card" id="alternativa-${i}"><h4>Vuelo ${escapar(v.numero)}</h4><div class="alternative-route"><strong>${escapar(v.origen)}</strong> → <strong>${escapar(v.destino)}</strong></div><div class="alternative-details">${escapar(v.fecha)} · ${escapar(v.salida)} · ${escapar(v.clase)}</div><div class="alternative-price">${formatoCOP(v.precio)}</div><button type="button" data-indice="${i}">Seleccionar vuelo</button></article>`).join('')||'<p>No hay vuelos disponibles para esta fecha.</p>';
        $("listaAlternativas").querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>seleccionarVuelo(Number(b.dataset.indice))));
        mostrarMensaje(`${alternativasActuales.length} vuelos consultados desde MySQL.`,"success");
    }catch(e){mostrarMensaje(e.message,"error");}
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

async function confirmarCambio() {
    if(!vueloSeleccionado){mostrarMensaje("Selecciona un vuelo alternativo.","error");return;}
    if(!window.confirm("¿Registrar solicitud de cambio en MySQL? El vuelo actual no se modificará hasta su aprobación."))return;
    try{
        const resp=await fetch(`http://localhost:3000/api/reservas/${encodeURIComponent(obtenerCodigo())}/cambio`,{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apellido:reserva.pasajeros?.[0]?.apellidos,tipo:trayectoSeleccionado==="vueloRegreso"?"REGRESO":"IDA",vueloNuevoId:vueloSeleccionado.id})
        });
        const data=await resp.json();if(!resp.ok)throw Error(data.mensaje||"Error registrando solicitud.");
        registrarSolicitud("CAMBIO DE VUELO",data.mensaje,data.diferencia,data.estado);
        $("alternativasContainer").hidden=true;
        mostrarMensaje(data.mensaje,"success");
    }catch(e){mostrarMensaje(e.message,"error");}
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

async function solicitarCancelacion(){
    if(!reserva)return;
    if(!window.confirm("¿Enviar solicitud de cancelación a MySQL? No se procesa un reembolso automáticamente."))return;
    try{
        const resp=await fetch(`http://localhost:3000/api/reservas/${encodeURIComponent(obtenerCodigo())}/cancelacion`,{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apellido:reserva.pasajeros?.[0]?.apellidos,motivo:"Solicitud desde gestión de cambios"})
        });
        const data=await resp.json();if(!resp.ok)throw Error(data.mensaje||"No se pudo registrar.");
        reserva.estado="CANCELACION_SOLICITADA";guardarReserva();
        $("estadoReserva").textContent=reserva.estado;
        $("btnSolicitarCancelacion").disabled=true;
        registrarSolicitud("CANCELACIÓN",data.mensaje,0,"SOLICITADA");
        mostrarMensaje(data.mensaje,"success");
    }catch(e){mostrarMensaje(e.message,"error");}
}

$("tipoTrayecto").addEventListener("change", actualizarVueloActual);
$("btnBuscarAlternativas").addEventListener("click", buscarAlternativas);
$("btnConfirmarCambio").addEventListener("click", confirmarCambio);
$("tipoTarifa").addEventListener("change", actualizarReembolso);
$("btnSolicitarCancelacion").addEventListener("click", solicitarCancelacion);

inicializar();
