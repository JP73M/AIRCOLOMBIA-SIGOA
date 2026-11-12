
const mysql = require('mysql2/promise');

// Configuración de conexión
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función para comprobar la conexión
async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log('================================');
        console.log(' CONEXION A MYSQL EXITOSA');
        console.log(` Base de datos: ${process.env.DB_NAME}`);
        console.log('================================');

        connection.release();

        return true;

    } catch (error) {
        console.error('ERROR AL CONECTAR CON MYSQL:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};
