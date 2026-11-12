
/* ==========================================
   AIRCOLOMBIA SIGOA
   CONSULTA DE VUELOS DESDE MYSQL
   ========================================== */

const API = "http://localhost:3000/api";

const busqueda = JSON.parse(
    localStorage.getItem("aircolombia_busqueda") || "null"
);

const flightList = document.getElementById("flightList");
const routeTitle = document.getElementById("routeTitle");
const searchDetails = document.getElementById("searchDetails");
const resultsCount = document.getElementById("resultsCount");
const sortFlights = document.getElementById("sortFlights");
const filterStops = document.getElementById("filterStops");
const filterClass = document.getElementById("filterClass");
const emptyResults = document.getElementById("emptyResults");
const selectionSummary = document.getElementById("selectionSummary");
const selectionText = document.getElementById("selectionText");
const selectionPrice = document.getElementById("selectionPrice");
const continueButton = document.getElementById("continueButton");
const flightDirection = document.getElementById("flightDirection");
const sectionTitle = document.getElementById("sectionTitle");
const sectionDescription = document.getElementById("sectionDescription");
const resultsToast = document.getElementById("resultsToast");

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

let vuelos = [];
let vuelosRegreso = [];
let vuelosDisponibles = [];
let vueloIda = null;
let vueloRegreso = null;
let etapa = "ida";

const clases = {
    economica: "Económica",
    ejecutiva: "Ejecutiva",
    primera: "Primera"
};

function notificar(mensaje) {
    resultsToast.textContent = mensaje;
    resultsToast.classList.add("show");

    setTimeout(() => {
        resultsToast.classList.remove("show");
    }, 3000);
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

function fechaBonita(fecha) {
    if (!fecha) return "Fecha no disponible";

    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function minutosAHoras(minutos) {
    const horas = Math.floor(minutos / 60);
    const restantes = minutos % 60;

    return `${horas} h ${String(restantes).padStart(2, "0")} min`;
}

/* ==========================================
   CONSULTAR VUELOS EN MYSQL
   ========================================== */

async function consultarVuelos(origen, destino, fecha, clase) {
    const parametros = new URLSearchParams({
        origen,
        destino,
        fecha,
        clase
    });

    const respuesta = await fetch(`${API}/vuelos?${parametros}`);

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error consultando vuelos.");
    }

    return datos.vuelos.map(vuelo => ({
        id: String(vuelo.id),
        numero: vuelo.numero_vuelo,
        origen: vuelo.origen,
        destino: vuelo.destino,
        ciudadOrigen: vuelo.ciudad_origen,
        ciudadDestino: vuelo.ciudad_destino,
        aeropuertoOrigen: vuelo.aeropuerto_origen,
        aeropuertoDestino: vuelo.aeropuerto_destino,
        fecha: vuelo.fecha,
        salida: vuelo.salida,
        llegada: vuelo.llegada,
        duracion: Number(vuelo.duracion),
        escalas: 0,
        precio: Number(vuelo.precio),
        clase: vuelo.clase.toLowerCase(),
        claseNombre: clases[vuelo.clase.toLowerCase()] || vuelo.clase,
        aeronave: vuelo.aeronave || "Aeronave no asignada",
        asientos: Number(vuelo.asientos)
    }));
}

/* ==========================================
   INICIALIZAR BÚSQUEDA
   ========================================== */

async function prepararPagina() {
    if (!busqueda) {
        routeTitle.textContent = "No hay una búsqueda activa";
        searchDetails.textContent = "Regresa al inicio para buscar vuelos.";
        emptyResults.classList.remove("hidden");
        emptyResults.textContent = "No encontramos información de búsqueda.";
        return;
    }

    routeTitle.textContent =
        `${busqueda.ciudadOrigen} (${busqueda.origen}) → ${busqueda.ciudadDestino} (${busqueda.destino})`;

    searchDetails.textContent =
        `${fechaBonita(busqueda.fechaSalida)} · ${busqueda.totalPasajeros} pasajero(s) · ${clases[busqueda.clase] || "Económica"}`;

    flightList.innerHTML = "<p>Consultando vuelos en la base de datos...</p>";

    try {
        vuelos = await consultarVuelos(
            busqueda.origen,
            busqueda.destino,
            busqueda.fechaSalida,
            busqueda.clase
        );

        if (busqueda.tipoViaje === "round" && busqueda.fechaRegreso) {
            vuelosRegreso = await consultarVuelos(
                busqueda.destino,
                busqueda.origen,
                busqueda.fechaRegreso,
                busqueda.clase
            );
        }

        renderizarVuelos();

        if (vuelos.length === 0) {
            notificar("No hay vuelos para esa fecha. Prueba otra fecha.");
        }

    } catch (error) {
        console.error(error);
        flightList.innerHTML = "";
        emptyResults.classList.remove("hidden");
        emptyResults.textContent =
            "No fue posible consultar los vuelos. Verifica que el servidor esté activo.";
        notificar(error.message);
    }
}

/* ==========================================
   MOSTRAR Y FILTRAR VUELOS
   ========================================== */

function renderizarVuelos() {
    const base = etapa === "ida" ? vuelos : vuelosRegreso;

    vuelosDisponibles = base.filter(vuelo => {
        const coincideEscala =
            filterStops.value === "all" ||
            String(vuelo.escalas) === filterStops.value;

        const coincideClase =
            filterClass.value === "all" ||
            vuelo.clase === filterClass.value;

        return coincideEscala && coincideClase;
    });

    const orden = sortFlights.value;

    vuelosDisponibles.sort((a, b) => {
        if (orden === "duration") return a.duracion - b.duracion;
        if (orden === "departure") return a.salida.localeCompare(b.salida);
        if (orden === "stops") return a.escalas - b.escalas;
        return a.precio - b.precio;
    });

    resultsCount.textContent = `${vuelosDisponibles.length} vuelos`;
    flightList.innerHTML = "";

    emptyResults.classList.toggle(
        "hidden",
        vuelosDisponibles.length > 0
    );

    if (vuelosDisponibles.length === 0) {
        emptyResults.textContent =
            "No encontramos vuelos con esos filtros. Prueba otra combinación.";
    }

    vuelosDisponibles.forEach(vuelo => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "flight-card";

        tarjeta.innerHTML = `
            <div class="flight-airline">
                <strong>AIRCOLOMBIA</strong>
                <small>Vuelo ${escaparHTML(vuelo.numero)}</small>
                <div class="flight-extra">
                    ${escaparHTML(vuelo.aeronave)} · ${escaparHTML(vuelo.claseNombre)}
                </div>
            </div>

            <div class="flight-times">
                <div class="flight-time">
                    <strong>${escaparHTML(vuelo.salida)}</strong>
                    <small>${escaparHTML(vuelo.origen)}</small>
                </div>

                <div class="flight-duration">
                    <small>${minutosAHoras(vuelo.duracion)}</small>
                    <div class="flight-line"></div>
                    <small>Vuelo directo</small>
                </div>

                <div class="flight-time">
                    <strong>${escaparHTML(vuelo.llegada)}</strong>
                    <small>${escaparHTML(vuelo.destino)}</small>
                </div>
            </div>

            <div class="flight-price">
                <strong>${formatoCOP.format(vuelo.precio)}</strong>
                <small>Por pasajero</small>
                <div class="flight-extra">
                    ${vuelo.asientos} asientos disponibles
                </div>
            </div>

            <button class="select-flight"
                data-flight-id="${escaparHTML(vuelo.id)}">
                Seleccionar
            </button>
        `;

        flightList.appendChild(tarjeta);
    });
}

/* ==========================================
   SELECCIONAR VUELOS
   ========================================== */

function seleccionarVuelo(id) {
    const vuelo = vuelosDisponibles.find(item => item.id === id);

    if (!vuelo) return;

    if (etapa === "ida") {
        vueloIda = vuelo;

        if (busqueda.tipoViaje === "round" && busqueda.fechaRegreso) {
            etapa = "regreso";

            flightDirection.textContent = "SEGUNDO TRAMO";
            sectionTitle.textContent = "Selecciona tu vuelo de regreso";

            sectionDescription.textContent =
                `Regreso: ${busqueda.destino} → ${busqueda.origen} · ${fechaBonita(busqueda.fechaRegreso)}`;

            filterStops.value = "all";
            filterClass.value = "all";

            renderizarVuelos();

            selectionSummary.classList.remove("hidden");
            selectionText.textContent =
                `Ida seleccionada: ${vuelo.salida} · ${vuelo.numero}`;

            selectionPrice.textContent =
                `Precio de ida: ${formatoCOP.format(vuelo.precio)}`;

            notificar("Vuelo de ida seleccionado. Ahora elige el regreso.");
            return;
        }

        guardarSeleccion();
        return;
    }

    vueloRegreso = vuelo;
    guardarSeleccion();
}

function guardarSeleccion() {
    const seleccion = {
        busqueda,
        vueloIda,
        vueloRegreso,
        precioVuelos:
            vueloIda.precio + (vueloRegreso ? vueloRegreso.precio : 0),
        fechaSeleccion: new Date().toISOString()
    };

    localStorage.setItem(
        "aircolombia_vuelos_seleccionados",
        JSON.stringify(seleccion)
    );

    selectionSummary.classList.remove("hidden");

    selectionText.textContent = vueloRegreso
        ? `Ida ${vueloIda.salida} / Regreso ${vueloRegreso.salida}`
        : `Vuelo ${vueloIda.numero} seleccionado`;

    selectionPrice.textContent =
        `Total por pasajero: ${formatoCOP.format(seleccion.precioVuelos)}`;

    continueButton.textContent = "Continuar a pasajeros →";

    notificar("Selección de vuelos guardada correctamente.");
}

/* ==========================================
   EVENTOS
   ========================================== */

flightList.addEventListener("click", event => {
    const boton = event.target.closest(".select-flight");

    if (!boton) return;

    seleccionarVuelo(boton.dataset.flightId);
});

sortFlights.addEventListener("change", renderizarVuelos);
filterStops.addEventListener("change", renderizarVuelos);
filterClass.addEventListener("change", renderizarVuelos);

continueButton.addEventListener("click", () => {
    const seleccion = JSON.parse(
        localStorage.getItem("aircolombia_vuelos_seleccionados") || "null"
    );

    if (!seleccion || !seleccion.vueloIda) {
        notificar("Primero debes seleccionar un vuelo.");
        return;
    }

    if (
        busqueda.tipoViaje === "round" &&
        busqueda.fechaRegreso &&
        !seleccion.vueloRegreso
    ) {
        notificar("Debes seleccionar también el vuelo de regreso.");
        return;
    }

    window.location.href = "pasajeros.html";
});

/* ==========================================
   INICIO
   ========================================== */

prepararPagina();

console.log("AIRCOLOMBIA SIGOA | Consulta de vuelos MySQL");
