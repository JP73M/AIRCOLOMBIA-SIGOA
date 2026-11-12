
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

async function auditoria(usuarioId, accion, descripcion, ip) {
    await pool.query(
        `INSERT INTO auditoria
        (usuario_id, accion, descripcion, direccion_ip)
        VALUES (?, ?, ?, ?)`,
        [usuarioId, accion, descripcion, ip || null]
    );
}

// LISTAR USUARIOS
exports.listarUsuarios = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            `SELECT u.id, u.nombres, u.apellidos, u.correo,
                    u.username, u.estado, u.intentos_fallidos,
                    u.bloqueado_hasta, u.ultimo_acceso,
                    u.area, r.nombre AS rol
             FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             ORDER BY u.id DESC`
        );

        res.json({
            usuarios: usuarios.map(u => ({
                ...u,
                activo: u.estado === "ACTIVO",
                bloqueado: u.bloqueado_hasta &&
                    new Date(u.bloqueado_hasta) > new Date()
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al consultar usuarios." });
    }
};

// CREAR USUARIO
exports.crearUsuario = async (req, res) => {
    try {
        const { nombre, username, correo, password, rol, area } = req.body;

        if (!nombre || !username || !correo || !password || !rol || !area) {
            return res.status(400).json({
                mensaje: "Completa todos los campos."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener mínimo 8 caracteres."
            });
        }

        const [existentes] = await pool.query(
            "SELECT id FROM usuarios WHERE username = ? OR correo = ?",
            [username.trim(), correo.trim().toLowerCase()]
        );

        if (existentes.length) {
            return res.status(409).json({
                mensaje: "El usuario o correo ya está registrado."
            });
        }

        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE nombre = ?",
            [rol]
        );

        if (!roles.length) {
            return res.status(400).json({
                mensaje: "El rol seleccionado no existe."
            });
        }

        const partes = nombre.trim().split(/\s+/);
        const nombres = partes.shift();
        const apellidos = partes.join(" ") || nombres;
        const hash = await bcrypt.hash(password, 12);

        const [resultado] = await pool.query(
            `INSERT INTO usuarios
            (nombres, apellidos, correo, username, password_hash,
             rol_id, estado, intentos_fallidos, area)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', 0, ?)`,
            [
                nombres,
                apellidos,
                correo.trim().toLowerCase(),
                username.trim(),
                hash,
                roles[0].id,
                area
            ]
        );

        await auditoria(
            req.usuario.id,
            "USUARIO CREADO",
            `${username} / ${rol}`,
            req.ip
        );

        res.status(201).json({
            mensaje: "Usuario creado correctamente.",
            id: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "No fue posible crear el usuario."
        });
    }
};

// CAMBIAR ROL
exports.cambiarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE nombre = ?",
            [rol]
        );

        if (!roles.length) {
            return res.status(400).json({ mensaje: "Rol no válido." });
        }

        const [usuarios] = await pool.query(
            "SELECT username FROM usuarios WHERE id = ?",
            [id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }

        if (Number(id) === Number(req.usuario.id)) {
            return res.status(400).json({
                mensaje: "No puedes cambiar tu propio rol."
            });
        }

        await pool.query(
            "UPDATE usuarios SET rol_id = ? WHERE id = ?",
            [roles[0].id, id]
        );

        await auditoria(
            req.usuario.id,
            "ROL MODIFICADO",
            `${usuarios[0].username}: ${rol}`,
            req.ip
        );

        res.json({ mensaje: "Rol actualizado correctamente." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al cambiar el rol." });
    }
};

// ACTIVAR / DESACTIVAR
exports.cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        const [usuarios] = await pool.query(
            "SELECT username FROM usuarios WHERE id = ?",
            [id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }

        if (Number(id) === Number(req.usuario.id) && !activo) {
            return res.status(400).json({
                mensaje: "No puedes desactivar tu propia cuenta."
            });
        }

        await pool.query(
            "UPDATE usuarios SET estado = ? WHERE id = ?",
            [activo ? "ACTIVO" : "INACTIVO", id]
        );

        await auditoria(
            req.usuario.id,
            "ESTADO DE USUARIO",
            `${usuarios[0].username}: ${activo ? "ACTIVO" : "INACTIVO"}`,
            req.ip
        );

        res.json({ mensaje: "Estado actualizado correctamente." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al cambiar el estado." });
    }
};

// DESBLOQUEAR CUENTA
exports.desbloquear = async (req, res) => {
    try {
        const { id } = req.params;

        const [usuarios] = await pool.query(
            "SELECT username FROM usuarios WHERE id = ?",
            [id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }

        await pool.query(
            `UPDATE usuarios
             SET intentos_fallidos = 0,
                 bloqueado_hasta = NULL,
                 estado = 'ACTIVO'
             WHERE id = ?`,
            [id]
        );

        await auditoria(
            req.usuario.id,
            "USUARIO DESBLOQUEADO",
            usuarios[0].username,
            req.ip
        );

        res.json({ mensaje: "Cuenta desbloqueada correctamente." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al desbloquear la cuenta." });
    }
};

// CONSULTAR AUDITORÍA
exports.listarAuditoria = async (req, res) => {
    try {
        const [eventos] = await pool.query(
            `SELECT a.fecha, a.accion, a.descripcion,
                    a.direccion_ip, u.username
             FROM auditoria a
             LEFT JOIN usuarios u ON u.id = a.usuario_id
             ORDER BY a.fecha DESC
             LIMIT 100`
        );

        res.json({ eventos });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al consultar la auditoría."
        });
    }
};
