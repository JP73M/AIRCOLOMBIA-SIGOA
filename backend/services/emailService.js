
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

async function enviarConfirmacion(datos) {
    const {
        reserva,
        comprador,
        pasajeros,
        vueloIda,
        vueloRegreso,
        tiquetes,
        total,
        referencia
    } = datos;

    if (!comprador?.correo) {
        throw new Error("La reserva no tiene correo del comprador.");
    }

    const filasTiquetes = tiquetes.map(t => `
        <tr>
            <td>${escapar(t.pasajero)}</td>
            <td>${escapar(t.numero)}</td>
            <td>${escapar(t.documento)}</td>
        </tr>
    `).join("");

    const detalleVuelo = vuelo => `
        <p>
            <strong>${escapar(vuelo.numero)}</strong><br>
            ${escapar(vuelo.origen)} → ${escapar(vuelo.destino)}<br>
            Fecha: ${escapar(vuelo.fecha || "Según itinerario")}<br>
            Salida: ${escapar(vuelo.salida)} · Llegada: ${escapar(vuelo.llegada)}
        </p>
    `;

    const html = `
    <div style="font-family:Arial,sans-serif;color:#32101b;max-width:650px;margin:auto">
        <div style="background:#390b19;color:white;padding:25px;text-align:center">
            <h1>AIRCOLOMBIA</h1>
            <p>Confirmación de compra</p>
        </div>

        <div style="padding:25px">
            <h2>¡Tu compra ha sido confirmada!</h2>

            <p>Hola ${escapar(comprador.nombres)},</p>

            <p>Tu pago ha sido aprobado y tus tiquetes electrónicos han sido emitidos.</p>

            <h3>Código de reserva</h3>
            <p style="font-size:25px;font-weight:bold">
                ${escapar(reserva)}
            </p>

            <h3>Itinerario</h3>
            ${detalleVuelo(vueloIda)}
            ${vueloRegreso ? detalleVuelo(vueloRegreso) : ""}

            <h3>Pasajeros y tiquetes</h3>
            <table style="width:100%;border-collapse:collapse" border="1" cellpadding="9">
                <thead>
                    <tr>
                        <th>Pasajero</th>
                        <th>Tiquete</th>
                        <th>Documento</th>
                    </tr>
                </thead>
                <tbody>${filasTiquetes}</tbody>
            </table>

            <h3>Resumen de pago</h3>
            <p><strong>Total pagado:</strong> ${Number(total).toLocaleString("es-CO")} COP</p>
            <p><strong>Referencia:</strong> ${escapar(referencia)}</p>

            <p>Gracias por elegir AIRCOLOMBIA.</p>
        </div>

        <div style="background:#f5f0eb;padding:18px;text-align:center">
            AIRCOLOMBIA · SIGOA<br>
            <small>Confirmación académica de demostración.</small>
        </div>
    </div>`;

    return transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: comprador.correo,
        subject: `Confirmación de compra - Reserva ${reserva}`,
        html: html
    });
}

transporter.verify()
    .then(() => {
        console.log("SMTP CONECTADO CORRECTAMENTE A GMAIL");
    })
    .catch(error => {
        console.error("ERROR DE CONEXION SMTP:", error);
    });

module.exports = { enviarConfirmacion };
