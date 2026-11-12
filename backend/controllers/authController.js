
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const MAX_INTENTOS = 5;
const TIEMPO_BLOQUEO = 5 * 60 * 1000;

// REGISTRO DE AUDITORÍA
async function registrarAuditoria(usuarioId, accion, descripcion, ip) {
    await pool.query(
        `INSERT INTO auditoria
        (usuario_id, accion, descripcion, direccion_ip)
        VALUES (?, ?, ?, ?)`,
        [usuarioId || null, accion, descripcion, ip || null]
    );
}

// REGISTRAR CLIENTE
exports.registrar = async (req, res) => {
    try {
        const { nombre, correo, username, password } = req.body;

        if (!nombre || !correo || !username || !password) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener mínimo 8 caracteres."
            });
        }

        const [existentes] = await pool.query(
            `SELECT id FROM usuarios
             WHERE username = ? OR correo = ?`,
            [username.trim(), correo.trim().toLowerCase()]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: "El usuario o correo ya está registrado."
            });
        }

        const [roles] = await pool.query(
            "SELECT id FROM roles WHERE nombre = 'Cliente'"
        );

        if (!roles.length) {
            return res.status(500).json({
                mensaje: "No existe el rol Cliente."
            });
        }

        const partes = nombre.trim().split(/\s+/);
        const nombres = partes.shift();
        const apellidos = partes.join(" ") || nombres;

        const passwordHash = await bcrypt.hash(password, 12);

        const [resultado] = await pool.query(
            `INSERT INTO usuarios
            (nombres, apellidos, correo, username, password_hash, rol_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombres,
                apellidos,
                correo.trim().toLowerCase(),
                username.trim(),
                passwordHash,
                roles[0].id
            ]
        );

        await registrarAuditoria(
            resultado.insertId,
            "REGISTRO",
            "Cliente registrado desde el portal",
            req.ip
        );

        return res.status(201).json({
            mensaje: "Cuenta de cliente creada correctamente."
        });

    } catch (error) {
        console.error("Error de registro:", error);

        return res.status(500).json({
            mensaje: "No fue posible registrar el usuario."
        });
    }
};

// INICIAR SESIÓN
exports.login = async (req, res) => {
    try {
        const { identity, password } = req.body;

        if (!identity || !password) {
            return res.status(400).json({
                mensaje: "Ingresa usuario y contraseña."
            });
        }

        const [usuarios] = await pool.query(
            `SELECT u.*, r.nombre AS rol
             FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE u.username = ? OR u.correo = ?
             LIMIT 1`,
            [identity.trim(), identity.trim().toLowerCase()]
        );

        if (!usuarios.length) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        if (usuario.estado !== "ACTIVO") {
            return res.status(403).json({
                mensaje: "La cuenta está inactiva o bloqueada."
            });
        }

        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            const intentos =
                Number(usuario.intentos_fallidos || 0) + 1;

            const bloqueado = intentos >= MAX_INTENTOS;

            await pool.query(
                `UPDATE usuarios
                 SET intentos_fallidos = ?,
                     estado = ?
                 WHERE id = ?`,
                [
                    bloqueado ? 0 : intentos,
                    bloqueado ? "BLOQUEADO" : "ACTIVO",
                    usuario.id
                ]
            );

            await registrarAuditoria(
                usuario.id,
                "INICIO FALLIDO",
                `Intento fallido número ${intentos}`,
                req.ip
            );

            return res.status(bloqueado ? 423 : 401).json({
                mensaje: bloqueado
                    ? "Cinco intentos fallidos. Cuenta bloqueada. Contacta al administrador para desbloquearla."
                    : `Credenciales incorrectas. Intento ${intentos} de 5.`
            });
        }

        await pool.query(
            `UPDATE usuarios
             SET intentos_fallidos = 0,
                 ultimo_acceso = NOW()
             WHERE id = ?`,
            [usuario.id]
        );

        const token = jwt.sign(
            {
                id: usuario.id,
                username: usuario.username,
                role: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        await registrarAuditoria(
            usuario.id,
            "INICIO DE SESIÓN",
            `Acceso correcto con rol ${usuario.rol}`,
            req.ip
        );

        return res.json({
            mensaje: "Inicio de sesión exitoso.",
            token,
            usuario: {
                id: usuario.id,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                username: usuario.username,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error de inicio de sesión:", error);

        return res.status(500).json({
            mensaje: "Error interno al iniciar sesión."
        });
    }
};

// CONSULTAR PERFIL PROTEGIDO
exports.perfil = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            `SELECT u.id, u.nombres, u.apellidos,
                    u.correo, u.username,
                    r.nombre AS rol
             FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE u.id = ? AND u.estado = 'ACTIVO'`,
            [req.usuario.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        return res.json({
            usuario: usuarios[0]
        });

    } catch (error) {
        console.error("Error consultando perfil:", error);

        return res.status(500).json({
            mensaje: "No fue posible consultar el perfil."
        });
    }
};
