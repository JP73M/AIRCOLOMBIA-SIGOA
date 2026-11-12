
/* ==========================================
   AIRCOLOMBIA SIGOA
   SERVICIOS COMPLEMENTARIOS
   ========================================== */

const reserva = JSON.parse(
    localStorage.getItem("aircolombia_reserva_actual") || "null"
);

const selectorPasajero = document.getElementById("servicePassenger");
const servicesGrid = document.getElementById("servicesGrid");
const servicesError = document.getElementById("servicesError");
const continueButton = document.getElementById("continueServices");

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

// Tarifas demostrativas en pesos colombianos
const tarifas = {
    seatType: {
        standard: 25000,
        window: 35000,
        aisle: 35000,
        premium: 65000
    },
    baggageType: {
        "15": 70000,
        "23": 110000,
        "32": 150000
    },
    petType: {
        cabin: 120000,
        hold: 220000
    },
    insuranceType: {
        basic: 35000,
        premium: 65000
    },
    foodType: {
        vegetarian: 30000,
        vegan: 35000,
        gluten: 35000,
        special: 45000
    },
    priorityType: {
        priority: 40000
    },
    vipType: {
        national: 85000,
        international: 130000
    },
    transportType: {
        standard: 60000,
        premium: 120000
    }
};

const preciosVisuales = {
    seatType: "seatPrice",
    baggageType: "baggagePrice",
    petType: "petPrice",
    insuranceType: "insurancePrice",
    foodType: "foodPrice",
    priorityType: "priorityPrice",
    vipType: "vipPrice",
    transportType: "transportPrice"
};

let serviciosPorPasajero = {};
let pasajeroActual = "0";

function mostrarError(mensaje) {
    servicesError.textContent = mensaje;
    servicesError.classList.remove("hidden");
    servicesError.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function ocultarError() {
    servicesError.textContent = "";
    servicesError.classList.add("hidden");
}

function inicializar() {
    if (!reserva || !reserva.pasajeros || !reserva.vuelos) {
        mostrarError("No encontramos una reserva válida. Regresa y completa el registro de pasajeros.");
        servicesGrid.classList.add("hidden");
        continueButton.disabled = true;
        return false;
    }

    const pasajeros = reserva.pasajeros;

    document.getElementById("servicePassengerCount").textContent =
        pasajeros.length;

    selectorPasajero.innerHTML = "";

    pasajeros.forEach((pasajero, indice) => {
        const option = document.createElement("option");

        option.value = String(indice);
        option.textContent =
            `${pasajero.nombres} ${pasajero.apellidos} (${pasajero.tipo})`;

        selectorPasajero.appendChild(option);

        serviciosPorPasajero[indice] = crearServiciosVacios();
    });

    actualizarResumen();
    actualizarPreciosVisuales();

    return true;
}

function crearServiciosVacios() {
    return {
        asiento: "",
        equipaje: "",
        mascota: "",
        seguro: "",
        alimentacion: "",
        prioridad: "",
        vip: "",
        transporte: ""
    };
}

function obtenerServiciosActuales() {
    return serviciosPorPasajero[pasajeroActual];
}

const equivalencias = {
    seatType: "asiento",
    baggageType: "equipaje",
    petType: "mascota",
    insuranceType: "seguro",
    foodType: "alimentacion",
    priorityType: "prioridad",
    vipType: "vip",
    transportType: "transporte"
};

function actualizarPreciosVisuales() {
    Object.keys(equivalencias).forEach(id => {
        const campo = document.getElementById(id);
        const precioId = preciosVisuales[id];

        const valor = campo.value;
        const precio = tarifas[id][valor] || 0;

        document.getElementById(precioId).textContent =
            formatoCOP.format(precio);
    });
}

function cargarServiciosPasajero() {
    const servicios = obtenerServiciosActuales();

    Object.entries(equivalencias).forEach(([campo, propiedad]) => {
        document.getElementById(campo).value =
            servicios[propiedad] || "";
    });

    actualizarPreciosVisuales();
}

function actualizarResumen() {
    const totalVuelosPorPasajero =
        Number(reserva.vuelos.precioVuelos || 0);

    const totalVuelos =
        totalVuelosPorPasajero * reserva.pasajeros.length;

    const totalServicios = calcularTotalServicios();

    const total = totalVuelos + totalServicios;

    document.getElementById("servicesTotal").textContent =
        formatoCOP.format(total);

    document.getElementById("servicesSummary").textContent =
        `Vuelos: ${formatoCOP.format(totalVuelos)} · Servicios: ${formatoCOP.format(totalServicios)}`;
}

function calcularTotalServicios() {
    let total = 0;

    Object.values(serviciosPorPasajero).forEach(servicios => {
        Object.entries(equivalencias).forEach(([campo, propiedad]) => {
            const valor = servicios[propiedad];
            total += tarifas[campo][valor] || 0;
        });
    });

    return total;
}

servicesGrid.addEventListener("change", event => {
    if (!event.target.matches("select")) return;

    const campo = event.target.id;
    const propiedad = equivalencias[campo];

    if (!propiedad) return;

    obtenerServiciosActuales()[propiedad] = event.target.value;

    actualizarPreciosVisuales();
    actualizarResumen();
    ocultarError();
});

selectorPasajero.addEventListener("change", () => {
    pasajeroActual = selectorPasajero.value;
    cargarServiciosPasajero();
});

continueButton.addEventListener("click", () => {
    ocultarError();

    if (!reserva) {
        mostrarError("No existe una reserva válida.");
        return;
    }

    const serviciosSeleccionados = [];

    reserva.pasajeros.forEach((pasajero, indice) => {
        const servicios = serviciosPorPasajero[indice];

        const tieneMascota = Boolean(servicios.mascota);

        serviciosSeleccionados.push({
            pasajero: {
                numero: indice + 1,
                nombres: pasajero.nombres,
                apellidos: pasajero.apellidos
            },
            servicios: { ...servicios },
            subtotal: Object.entries(equivalencias).reduce(
                (suma, [campo, propiedad]) => {
                    return suma + (tarifas[campo][servicios[propiedad]] || 0);
                },
                0
            ),
            requiereConfirmacionMascota: tieneMascota
        });
    });

    const totalVuelos =
        Number(reserva.vuelos.precioVuelos || 0) *
        reserva.pasajeros.length;

    const totalServicios = calcularTotalServicios();

    const compra = {
        codigoReserva: reserva.codigo,
        servicios: serviciosSeleccionados,
        totalVuelos,
        totalServicios,
        totalCompra: totalVuelos + totalServicios,
        moneda: "COP",
        fechaActualizacion: new Date().toISOString()
    };

    localStorage.setItem(
        "aircolombia_compra_actual",
        JSON.stringify(compra)
    );

    // Actualizar también la reserva
    reserva.servicios = serviciosSeleccionados;
    reserva.totalVuelos = totalVuelos;
    reserva.totalServicios = totalServicios;
    reserva.totalCompra = compra.totalCompra;

    localStorage.setItem(
        "aircolombia_reserva_actual",
        JSON.stringify(reserva)
    );

    window.location.href = "pago.html";
});

inicializar();
