
/* ==========================================
   AIRCOLOMBIA SIGOA
   MÓDULO DE BÚSQUEDA DE VUELOS
   RF-01 Y RF-02
   ========================================== */

const ciudades = [
    { codigo: "BOG", nombre: "Bogotá", aeropuerto: "El Dorado" },
    { codigo: "MDE", nombre: "Medellín", aeropuerto: "José María Córdova" },
    { codigo: "CLO", nombre: "Cali", aeropuerto: "Alfonso Bonilla Aragón" },
    { codigo: "CTG", nombre: "Cartagena", aeropuerto: "Rafael Núñez" },
    { codigo: "BAQ", nombre: "Barranquilla", aeropuerto: "Ernesto Cortissoz" },
    { codigo: "SMR", nombre: "Santa Marta", aeropuerto: "Simón Bolívar" },
    { codigo: "BGA", nombre: "Bucaramanga", aeropuerto: "Palonegro" },
    { codigo: "PEI", nombre: "Pereira", aeropuerto: "Matecaña" },
    { codigo: "ADZ", nombre: "San Andrés", aeropuerto: "Gustavo Rojas Pinilla" },
    { codigo: "CUC", nombre: "Cúcuta", aeropuerto: "Camilo Daza" },
    { codigo: "LET", nombre: "Leticia", aeropuerto: "Alfredo Vásquez Cobo" },
    { codigo: "PTY", nombre: "Ciudad de Panamá", aeropuerto: "Tocumen" },
    { codigo: "MIA", nombre: "Miami", aeropuerto: "Miami International" },
    { codigo: "MAD", nombre: "Madrid", aeropuerto: "Adolfo Suárez Madrid-Barajas" }
];


/* ==========================================
   ELEMENTOS DEL DOM
   ========================================== */

const form = document.getElementById("searchForm");

const origin = document.getElementById("origin");
const destination = document.getElementById("destination");

const departure = document.getElementById("departure");
const returnDate = document.getElementById("returnDate");
const returnWrap = document.getElementById("returnWrap");

const adults = document.getElementById("adults");
const children = document.getElementById("children");
const infants = document.getElementById("infants");

const travelClass = document.getElementById("travelClass");

const swapCities = document.getElementById("swapCities");

const searchError = document.getElementById("searchError");
const toast = document.getElementById("toast");


/* ==========================================
   FECHAS LOCALES
   ========================================== */

function obtenerFechaLocal(fecha = new Date()) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const fechaHoy = obtenerFechaLocal();

if (departure) {
    departure.min = fechaHoy;
}

if (returnDate) {
    returnDate.min = fechaHoy;
}


/* ==========================================
   CARGAR CIUDADES
   ========================================== */

function cargarCiudades(select) {

    if (!select) return;

    ciudades.forEach(ciudad => {

        const option = document.createElement("option");

        option.value = ciudad.codigo;

        option.textContent =
            `${ciudad.nombre} (${ciudad.codigo})`;

        select.appendChild(option);

    });

}

cargarCiudades(origin);
cargarCiudades(destination);


/* ==========================================
   TIPO DE VIAJE
   ========================================== */

function obtenerTipoViaje() {

    const seleccionado = document.querySelector(
        'input[name="trip"]:checked'
    );

    return seleccionado ? seleccionado.value : "oneway";

}


function actualizarTipoViaje() {

    const tipo = obtenerTipoViaje();

    if (tipo === "round") {

        returnWrap.classList.remove("hidden");

        returnDate.required = true;

    } else {

        returnWrap.classList.add("hidden");

        returnDate.required = false;

        returnDate.value = "";

    }

}


document.querySelectorAll('input[name="trip"]').forEach(radio => {

    radio.addEventListener("change", actualizarTipoViaje);

});


/* ==========================================
   VALIDACIÓN DE FECHAS
   ========================================== */

function actualizarFechaRegreso() {

    if (!departure.value) return;

    returnDate.min = departure.value;

    if (
        returnDate.value &&
        returnDate.value < departure.value
    ) {

        returnDate.value = "";

    }

}

departure.addEventListener("change", actualizarFechaRegreso);


/* ==========================================
   INTERCAMBIAR CIUDADES
   ========================================== */

swapCities.addEventListener("click", () => {

    const ciudadOrigen = origin.value;
    const ciudadDestino = destination.value;

    origin.value = ciudadDestino;
    destination.value = ciudadOrigen;

    mostrarToast("Ciudades intercambiadas correctamente.");

});


/* ==========================================
   VALIDACIÓN DE PASAJEROS
   ========================================== */

function obtenerPasajeros() {

    return {
        adultos: Number(adults.value),
        ninos: Number(children.value),
        infantes: Number(infants.value)
    };

}


function validarPasajeros() {

    const pasajeros = obtenerPasajeros();

    const total =
        pasajeros.adultos +
        pasajeros.ninos +
        pasajeros.infantes;

    if (
        !Number.isInteger(pasajeros.adultos) ||
        pasajeros.adultos < 1 ||
        pasajeros.adultos > 9
    ) {

        return "Debes registrar entre 1 y 9 adultos.";

    }

    if (
        !Number.isInteger(pasajeros.ninos) ||
        pasajeros.ninos < 0 ||
        pasajeros.ninos > 8
    ) {

        return "La cantidad de niños no es válida.";

    }

    if (
        !Number.isInteger(pasajeros.infantes) ||
        pasajeros.infantes < 0 ||
        pasajeros.infantes > 8
    ) {

        return "La cantidad de infantes no es válida.";

    }

    // Cada infante debe estar acompañado por un adulto
    if (pasajeros.infantes > pasajeros.adultos) {
        return "No puedes registrar más infantes que adultos. Cada infante debe viajar acompañado de un adulto.";
    }

    // Máximo de pasajeros por reserva
    if (total > 9) {
        return "El máximo permitido es de 9 pasajeros por reserva.";
    }

    return null;

}

/* ==========================================
   VALIDACIÓN INMEDIATA DE INFANTES
   ========================================== */

function validarRelacionInfantes() {

    const pasajeros = obtenerPasajeros();

    const mensaje =
        "No puedes registrar más infantes que adultos. Cada infante debe viajar acompañado de un adulto.";

    if (pasajeros.infantes > pasajeros.adultos) {

        mostrarError(mensaje);

        return false;
    }

    // Quitar el mensaje cuando la cantidad vuelva a ser válida
    if (searchError.textContent === mensaje) {
        ocultarError();
    }

    return true;
}

adults.addEventListener("change", validarRelacionInfantes);
infants.addEventListener("change", validarRelacionInfantes);


/* ==========================================
   VALIDAR FORMULARIO
   ========================================== */

function validarBusqueda() {

    if (!origin.value) {

        return "Selecciona una ciudad de origen.";

    }

    if (!destination.value) {

        return "Selecciona una ciudad de destino.";

    }

    if (origin.value === destination.value) {

        return "El origen y el destino deben ser diferentes.";

    }

    if (!departure.value) {

        return "Selecciona la fecha de salida.";

    }

    if (departure.value < fechaHoy) {

        return "La fecha de salida no puede ser anterior a hoy.";

    }

    if (obtenerTipoViaje() === "round") {

        if (!returnDate.value) {

            return "Debes seleccionar una fecha de regreso.";

        }

        if (returnDate.value <= departure.value) {

            return "La fecha de regreso debe ser posterior a la salida.";

        }

    }

    const errorPasajeros = validarPasajeros();

    if (errorPasajeros) {

        return errorPasajeros;

    }

    if (!travelClass.value) {

        return "Selecciona una clase de servicio.";

    }

    return null;

}


/* ==========================================
   OBTENER INFORMACIÓN DE CIUDADES
   ========================================== */

function buscarCiudad(codigo) {

    return ciudades.find(ciudad => ciudad.codigo === codigo);

}


/* ==========================================
   MOSTRAR ERRORES
   ========================================== */

function mostrarError(mensaje) {

    searchError.textContent = mensaje;

    searchError.classList.remove("hidden");

    searchError.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function ocultarError() {

    searchError.textContent = "";

    searchError.classList.add("hidden");

}


/* ==========================================
   NOTIFICACIONES
   ========================================== */

function mostrarToast(mensaje) {

    if (!toast) return;

    toast.textContent = mensaje;

    toast.classList.add("show");

    clearTimeout(window.aircolombiaToastTimeout);

    window.aircolombiaToastTimeout = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* ==========================================
   GUARDAR BÚSQUEDA
   ========================================== */

function guardarBusqueda() {

    const pasajeros = obtenerPasajeros();

    const ciudadOrigen = buscarCiudad(origin.value);

    const ciudadDestino = buscarCiudad(destination.value);

    const busqueda = {

        identificador: crypto.randomUUID(),

        origen: ciudadOrigen.codigo,

        ciudadOrigen: ciudadOrigen.nombre,

        aeropuertoOrigen: ciudadOrigen.aeropuerto,

        destino: ciudadDestino.codigo,

        ciudadDestino: ciudadDestino.nombre,

        aeropuertoDestino: ciudadDestino.aeropuerto,

        tipoViaje: obtenerTipoViaje(),

        fechaSalida: departure.value,

        fechaRegreso:
            obtenerTipoViaje() === "round"
                ? returnDate.value
                : null,

        pasajeros: pasajeros,

        totalPasajeros:
            pasajeros.adultos +
            pasajeros.ninos +
            pasajeros.infantes,

        clase: travelClass.value,

        moneda: "COP",

        fechaConsulta: new Date().toISOString()

    };

    localStorage.setItem(
        "aircolombia_busqueda",
        JSON.stringify(busqueda)
    );

    return busqueda;

}


/* ==========================================
   ENVIAR BÚSQUEDA
   ========================================== */

form.addEventListener("submit", (event) => {

    event.preventDefault();

    ocultarError();

    const error = validarBusqueda();

    if (error) {

        mostrarError(error);

        return;

    }

    guardarBusqueda();

    mostrarToast("Buscando alternativas de vuelo...");

    setTimeout(() => {

        window.location.href = "pages/resultados.html";

    }, 500);

});


/* ==========================================
   RESTAURAR ÚLTIMA BÚSQUEDA
   ========================================== */

function restaurarBusqueda() {

    try {

        const guardada = localStorage.getItem(
            "aircolombia_busqueda"
        );

        if (!guardada) return;

        const datos = JSON.parse(guardada);

        if (ciudades.some(c => c.codigo === datos.origen)) {
            origin.value = datos.origen;
        }

        if (ciudades.some(c => c.codigo === datos.destino)) {
            destination.value = datos.destino;
        }

        if (datos.fechaSalida >= fechaHoy) {
            departure.value = datos.fechaSalida;
        }

        if (
            datos.fechaRegreso &&
            datos.fechaRegreso >= fechaHoy
        ) {

            document.querySelector(
                'input[name="trip"][value="round"]'
            ).checked = true;

            actualizarTipoViaje();

            returnDate.value = datos.fechaRegreso;

        }

        adults.value = datos.pasajeros?.adultos ?? 1;
        children.value = datos.pasajeros?.ninos ?? 0;
        infants.value = datos.pasajeros?.infantes ?? 0;

        if (
            ["economica", "ejecutiva", "primera"].includes(datos.clase)
        ) {

            travelClass.value = datos.clase;

        }

    } catch (error) {

        console.error(
            "No fue posible restaurar la búsqueda:",
            error
        );

    }

}


/* ==========================================
   INICIALIZACIÓN
   ========================================== */

restaurarBusqueda();

actualizarTipoViaje();

console.log(
    "AIRCOLOMBIA SIGOA | Módulo de búsqueda inicializado."
);
