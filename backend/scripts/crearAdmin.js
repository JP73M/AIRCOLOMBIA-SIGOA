
require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

async function crearAdmin() {
    try {
        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE nombre = 'Administrador'"
        );

        if (!roles.length) {
            throw new Error("No existe el rol Administrador.");
        }

        const [existentes] = await pool.query(
            "SELECT id FROM usuarios WHERE username = 'admin'"
        );

        if (existentes.length) {
            console.log("El administrador ya existe. No se modificó.");
            return;
        }

        const hash = await bcrypt.hash("Admin123!", 12);

        await pool.query(
            `INSERT INTO usuarios
            (nombres, apellidos, correo, username, password_hash, rol_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                "Administrador",
                "Principal",
                "admin@aircolombia.com",
                "admin",
                hash,
                roles[0].id
            ]
        );

        console.log("Administrador creado correctamente.");
        console.log("Usuario: admin");
        console.log("Contraseña inicial: Admin123!");
        console.log("Cambia esta contraseña después del primer acceso.");

    } catch (error) {
        console.error("Error creando administrador:", error);
    } finally {
        await pool.end();
    }
}

crearAdmin();
