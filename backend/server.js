
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testConnection, pool } = require("./config/database");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        sistema: "AIRCOLOMBIA - SIGOA",
        mensaje: "Servidor funcionando correctamente",
        estado: "Activo"
    });
});

app.get("/api/estado", (req, res) => {
    res.json({
        mensaje: "API de SIGOA funcionando",
        backend: "Node.js + Express"
    });
});

app.get("/api/estado-db", async (req, res) => {
    try {
        const [resultado] = await pool.query(
            "SELECT DATABASE() AS base_datos, NOW() AS fecha"
        );

        res.json({
            mensaje: "Conexion con MySQL exitosa",
            baseDatos: resultado[0].base_datos,
            fechaServidor: resultado[0].fecha
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al consultar MySQL"
        });
    }
});

app.use("/api/auth", authRoutes);

const notificacionRoutes = require("./routes/notificacionRoutes");
app.use("/api/notificaciones", notificacionRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);


app.get("/api/vuelos", async (req, res) => {
    try {
        const { origen, destino, fecha, clase } = req.query;

        if (!origen || !destino || !fecha || !clase) {
            return res.status(400).json({
                mensaje: "Faltan origen, destino, fecha o clase."
            });
        }

        const clasesPermitidas = {
            economica: "ECONOMICA",
            ejecutiva: "EJECUTIVA",
            primera: "PRIMERA"
        };

        const claseDB = clasesPermitidas[clase.toLowerCase()];

        if (!claseDB) {
            return res.status(400).json({
                mensaje: "Clase de vuelo no válida."
            });
        }

        const sql = `
            SELECT
                v.id,
                v.numero_vuelo,
                ao.codigo_iata AS origen,
                ao.ciudad AS ciudad_origen,
                ao.nombre AS aeropuerto_origen,
                ad.codigo_iata AS destino,
                ad.ciudad AS ciudad_destino,
                ad.nombre AS aeropuerto_destino,
                DATE_FORMAT(v.salida, '%Y-%m-%d') AS fecha,
                DATE_FORMAT(v.salida, '%H:%i') AS salida,
                DATE_FORMAT(v.llegada, '%H:%i') AS llegada,
                TIMESTAMPDIFF(MINUTE, v.salida, v.llegada) AS duracion,
                a.modelo AS aeronave,
                t.clase,
                t.precio,
                t.cupos_disponibles AS asientos
            FROM vuelos v
            INNER JOIN aeropuertos ao
                ON v.aeropuerto_origen = ao.id
            INNER JOIN aeropuertos ad
                ON v.aeropuerto_destino = ad.id
            LEFT JOIN aviones a
                ON v.avion_id = a.id
            INNER JOIN tarifas t
                ON v.id = t.vuelo_id
            WHERE ao.codigo_iata = ?
                AND ad.codigo_iata = ?
                AND DATE(v.salida) = ?
                AND t.clase = ?
                AND t.cupos_disponibles > 0
                AND v.estado = 'PROGRAMADO'
            ORDER BY v.salida ASC
        `;

        const [vuelos] = await pool.query(sql, [
            origen,
            destino,
            fecha,
            claseDB
        ]);

        res.json({
            total: vuelos.length,
            vuelos
        });

    } catch (error) {
        console.error("Error consultando vuelos:", error);

        res.status(500).json({
            mensaje: "Error al consultar los vuelos."
        });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log("================================");
    console.log(" AIRCOLOMBIA - SIGOA");
    console.log(` Servidor activo en puerto ${PORT}`);
    console.log("================================");

    await testConnection();
});
