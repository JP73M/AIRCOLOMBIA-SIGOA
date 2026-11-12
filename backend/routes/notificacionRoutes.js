
const express = require("express");
const router = express.Router();
const { enviarConfirmacion } = require("../services/emailService");

router.post("/confirmacion", async (req, res) => {
    try {
        const datos = req.body;

        if (
            !datos.reserva ||
            !datos.comprador?.correo ||
            !datos.tiquetes?.length ||
            !datos.vueloIda
        ) {
            return res.status(400).json({
                mensaje: "Faltan datos para enviar la confirmación."
            });
        }

        const resultado = await enviarConfirmacion(datos);

        console.log("Correo de confirmación enviado:", resultado.messageId);

        res.json({
            enviado: true,
            mensaje: "Confirmación enviada al correo del comprador."
        });

    } catch (error) {
        console.error("Error enviando correo:", error);

        res.status(500).json({
            enviado: false,
            mensaje: "No fue posible enviar el correo de confirmación."
        });
    }
});

module.exports = router;
