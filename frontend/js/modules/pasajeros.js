
/* ==========================================
   AIRCOLOMBIA SIGOA
   REGISTRO DE PASAJEROS
   RF-06, RF-07 Y RF-08
   ========================================== */

const busqueda = JSON.parse(
    localStorage.getItem("aircolombia_busqueda") || "null"
);

const seleccion = JSON.parse(
    localStorage.getItem("aircolombia_vuelos_seleccionados") || "null"
);

const passengerForms = document.getElementById("passengerForms");
const passengerForm = document.getElementById("passengerForm");
const passengerError = document.getElementById("passengerError");

const buyerIsPassenger = document.getElementById("buyerIsPassenger");
const buyerFields = document.getElementById("buyerFields");

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

let cantidadPasajeros = 0;

function mostrarError(mensaje) {
    passengerError.textContent = mensaje;
    passengerError.classList.remove("hidden");
    passengerError.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function ocultarError() {
    passengerError.textContent = "";
    passengerError.classList.add("hidden");
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

function obtenerCantidadPasajeros() {
    if (!busqueda || !busqueda.pasajeros) return null;

    const adultos = Number(busqueda.pasajeros.adultos);
    const ninos = Number(busqueda.pasajeros.ninos);
    const infantes = Number(busqueda.pasajeros.infantes);

    if (
        !Number.isInteger(adultos) ||
        !Number.isInteger(ninos) ||
        !Number.isInteger(infantes) ||
        adultos < 1 ||
        ninos < 0 ||
        infantes < 0 ||
        infantes > adultos ||
        adultos + ninos + infantes > 9
    ) {
        return null;
    }

    return { adultos, ninos, infantes };
}

function agregarFormulario(tipo, numero, indice) {
    const nombres = {
        adulto: "Adulto",
        nino: "Niño",
        infante: "Infante"
    };

    const titulo = nombres[tipo];

    const tarjeta = document.createElement("section");
    tarjeta.className = "passenger-card";

    tarjeta.innerHTML = `
        <div class="passenger-card-header">
            <div>
                <span class="eyebrow">INFORMACIÓN PERSONAL</span>
                <h3>${titulo} ${numero}</h3>
            </div>
            <span class="passenger-type">${titulo.toUpperCase()}</span>
        </div>

        <div class="passenger-fields-grid">

            <div class="form-field">
                <label for="firstName${indice}">Nombres *</label>
                <input type="text" id="firstName${indice}" name="firstName${indice}" required maxlength="60" placeholder="Nombres">
            </div>

            <div class="form-field">
                <label for="lastName${indice}">Apellidos *</label>
                <input type="text" id="lastName${indice}" name="lastName${indice}" required maxlength="60" placeholder="Apellidos">
            </div>

            <div class="form-field">
                <label for="documentType${indice}">Tipo de documento *</label>
                <select id="documentType${indice}" required>
                    <option value="">Seleccionar</option>
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="RC">Registro civil</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="PAS">Pasaporte</option>
                </select>
            </div>

            <div class="form-field">
                <label for="document${indice}">Número de documento *</label>
                <input type="text" id="document${indice}" required maxlength="25" placeholder="Documento">
            </div>

            <div class="form-field">
                <label for="birthDate${indice}">Fecha de nacimiento *</label>
                <input type="date" id="birthDate${indice}" required>
            </div>

            <div class="form-field">
                <label for="nationality${indice}">Nacionalidad *</label>
                <select id="nationality${indice}" required>
                    <option value="">Seleccionar</option>
                    <option value="Colombiana">Colombiana</option>
                    <option value="Panameña">Panameña</option>
                    <option value="Estadounidense">Estadounidense</option>
                    <option value="Española">Española</option>
                    <option value="Venezolana">Venezolana</option>
                    <option value="Otra">Otra</option>
                </select>
            </div>

            <div class="form-field">
                <label for="email${indice}">Correo electrónico *</label>
                <input type="email" id="email${indice}" required maxlength="100" placeholder="correo@ejemplo.com">
            </div>

            <div class="form-field">
                <label for="phone${indice}">Teléfono *</label>
                <input type="tel" id="phone${indice}" required maxlength="20" placeholder="Número de contacto">
            </div>

        </div>
    `;

    passengerForms.appendChild(tarjeta);
}

function generarFormularios() {
    const cantidades = obtenerCantidadPasajeros();

    if (!cantidades || !seleccion || !seleccion.vueloIda) {
        mostrarError("No encontramos una búsqueda o selección de vuelos válida. Regresa al inicio y realiza tu búsqueda nuevamente.");
        passengerForm.classList.add("hidden");
        return;
    }

    const esIdaYRegreso =
        busqueda.tipoViaje === "round" &&
        Boolean(busqueda.fechaRegreso);

    if (esIdaYRegreso && !seleccion.vueloRegreso) {
        mostrarError("Debes seleccionar el vuelo de regreso antes de registrar los pasajeros.");
        passengerForm.classList.add("hidden");
        return;
    }

    const total =
        cantidades.adultos +
        cantidades.ninos +
        cantidades.infantes;

    cantidadPasajeros = total;

    document.getElementById("passengerCount").textContent = total;

    document.getElementById("routeSummary").textContent =
        `${busqueda.origen} → ${busqueda.destino}`;

    document.getElementById("flightSummary").textContent =
        `Vuelo ${seleccion.vueloIda.numero} · ${seleccion.vueloIda.salida} · ${formatoCOP.format(seleccion.precioVuelos)} por pasajero`;

    let indice = 0;

    for (let i = 1; i <= cantidades.adultos; i++) {
        agregarFormulario("adulto", i, indice++);
    }

    for (let i = 1; i <= cantidades.ninos; i++) {
        agregarFormulario("nino", i, indice++);
    }

    for (let i = 1; i <= cantidades.infantes; i++) {
        agregarFormulario("infante", i, indice++);
    }
}

function obtenerEdad(fechaNacimiento) {
    const nacimiento = new Date(`${fechaNacimiento}T12:00:00`);
    const hoy = new Date();

    if (Number.isNaN(nacimiento.getTime()) || nacimiento > hoy) {
        return null;
    }

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const diferenciaMes =
        hoy.getMonth() - nacimiento.getMonth();

    if (
        diferenciaMes < 0 ||
        (diferenciaMes === 0 && hoy.getDate() < nacimiento.getDate())
    ) {
        edad--;
    }

    return edad;
}

function obtenerDatosPasajeros() {
    const pasajeros = [];

    for (let i = 0; i < cantidadPasajeros; i++) {
        const nombres = document.getElementById(`firstName${i}`).value.trim();
        const apellidos = document.getElementById(`lastName${i}`).value.trim();
        const tipoDocumento = document.getElementById(`documentType${i}`).value;
        const documento = document.getElementById(`document${i}`).value.trim();
        const fechaNacimiento = document.getElementById(`birthDate${i}`).value;
        const nacionalidad = document.getElementById(`nationality${i}`).value;
        const correo = document.getElementById(`email${i}`).value.trim();
        const telefono = document.getElementById(`phone${i}`).value.trim();

        const tarjeta = passengerForms.children[i];
        const tipo = tarjeta.querySelector(".passenger-type").textContent;

        const edad = obtenerEdad(fechaNacimiento);

        if (edad === null) {
            throw new Error(`Verifica la fecha de nacimiento del pasajero ${i + 1}.`);
        }

        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(nombres)) {
            throw new Error(`Los nombres del pasajero ${i + 1} no son válidos.`);
        }

        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(apellidos)) {
            throw new Error(`Los apellidos del pasajero ${i + 1} no son válidos.`);
        }

        if (!/^[A-Za-z0-9-]{5,25}$/.test(documento)) {
            throw new Error(`El documento del pasajero ${i + 1} no es válido.`);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            throw new Error(`El correo del pasajero ${i + 1} no es válido.`);
        }

        if (!/^[0-9+\s()-]{7,20}$/.test(telefono)) {
            throw new Error(`El teléfono del pasajero ${i + 1} no es válido.`);
        }

        if (!tipoDocumento || !nacionalidad) {
            throw new Error(`Completa el documento y la nacionalidad del pasajero ${i + 1}.`);
        }

        pasajeros.push({
            numero: i + 1,
            tipo,
            nombres,
            apellidos,
            tipoDocumento,
            documento,
            fechaNacimiento,
            edad,
            nacionalidad,
            correo,
            telefono
        });
    }

    return pasajeros;
}

function obtenerComprador(pasajeros) {
    if (buyerIsPassenger.checked) {
        const adulto = pasajeros.find(p => p.tipo === "ADULTO");

        if (!adulto) {
            throw new Error("No encontramos un pasajero adulto para registrar como comprador.");
        }

        return {
            esPasajero: true,
            nombres: adulto.nombres,
            apellidos: adulto.apellidos,
            documento: adulto.documento,
            correo: adulto.correo,
            telefono: adulto.telefono
        };
    }

    const nombres = document.getElementById("buyerName").value.trim();
    const documento = document.getElementById("buyerDocument").value.trim();
    const correo = document.getElementById("buyerEmail").value.trim();
    const telefono = document.getElementById("buyerPhone").value.trim();

    if (!nombres || !documento || !correo || !telefono) {
        throw new Error("Completa todos los datos del comprador.");
    }

    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(nombres)) {
        throw new Error("El nombre del comprador no es válido.");
    }

    if (!/^[A-Za-z0-9-]{5,25}$/.test(documento)) {
        throw new Error("El documento del comprador no es válido.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        throw new Error("El correo del comprador no es válido.");
    }

    if (!/^[0-9+\s()-]{7,20}$/.test(telefono)) {
        throw new Error("El teléfono del comprador no es válido.");
    }

    return {
        esPasajero: false,
        nombres,
        documento,
        correo,
        telefono
    };
}

function generarCodigoReserva() {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo;

    do {
        let aleatorio = "";

        for (let i = 0; i < 8; i++) {
            aleatorio += caracteres[
                Math.floor(Math.random() * caracteres.length)
            ];
        }

        codigo = `AC-${aleatorio}`;

    } while (
        localStorage.getItem(`aircolombia_reserva_${codigo}`)
    );

    return codigo;
}

buyerIsPassenger.addEventListener("change", () => {
    buyerFields.classList.toggle(
        "hidden",
        buyerIsPassenger.checked
    );

    buyerFields.querySelectorAll("input").forEach(input => {
        input.required = !buyerIsPassenger.checked;
    });
});

passengerForm.addEventListener("submit", event => {
    event.preventDefault();
    ocultarError();

    try {
        if (!passengerForm.reportValidity()) return;

        const pasajeros = obtenerDatosPasajeros();
        const comprador = obtenerComprador(pasajeros);

        const codigoReserva = generarCodigoReserva();

        const reserva = {
            codigo: codigoReserva,
            estado: "PENDIENTE DE SERVICIOS Y PAGO",
            busqueda,
            vuelos: seleccion,
            pasajeros,
            comprador,
            fechaCreacion: new Date().toISOString(),
            moneda: "COP"
        };

        localStorage.setItem(
            `aircolombia_reserva_${codigoReserva}`,
            JSON.stringify(reserva)
        );

        localStorage.setItem(
            "aircolombia_reserva_actual",
            JSON.stringify(reserva)
        );

        window.location.href = "servicios.html";

    } catch (error) {
        mostrarError(error.message);
    }
});

generarFormularios();

buyerFields.querySelectorAll("input").forEach(input => {
    input.required = !buyerIsPassenger.checked;
});

console.log("AIRCOLOMBIA SIGOA | Registro de pasajeros inicializado.");
