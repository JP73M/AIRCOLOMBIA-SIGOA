
CREATE DATABASE IF NOT EXISTS sigoa_aircolombia
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sigoa_aircolombia;

-- =====================================
-- 1. SEGURIDAD Y USUARIOS
-- =====================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    estado ENUM('ACTIVO','INACTIVO','BLOQUEADO') DEFAULT 'ACTIVO',
    intentos_fallidos INT DEFAULT 0,
    ultimo_acceso DATETIME NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    direccion_ip VARCHAR(45),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
);

-- =====================================
-- 2. OPERACIÓN AÉREA
-- =====================================

CREATE TABLE aeropuertos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_iata CHAR(3) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL
);

CREATE TABLE aviones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    capacidad INT NOT NULL,
    estado ENUM('ACTIVO','MANTENIMIENTO','INACTIVO') DEFAULT 'ACTIVO'
);

CREATE TABLE vuelos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_vuelo VARCHAR(20) NOT NULL,
    aeropuerto_origen INT NOT NULL,
    aeropuerto_destino INT NOT NULL,
    avion_id INT,
    salida DATETIME NOT NULL,
    llegada DATETIME NOT NULL,
    estado ENUM('PROGRAMADO','ABORDANDO','EN_VUELO','FINALIZADO','CANCELADO','RETRASADO')
        DEFAULT 'PROGRAMADO',
    FOREIGN KEY (aeropuerto_origen) REFERENCES aeropuertos(id),
    FOREIGN KEY (aeropuerto_destino) REFERENCES aeropuertos(id),
    FOREIGN KEY (avion_id) REFERENCES aviones(id),
    INDEX idx_vuelo_salida (salida),
    INDEX idx_vuelo_ruta (aeropuerto_origen, aeropuerto_destino)
);

CREATE TABLE tarifas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vuelo_id INT NOT NULL,
    clase ENUM('ECONOMICA','EJECUTIVA','PRIMERA') NOT NULL,
    tipo_tarifa ENUM('BASICA','ESTANDAR','FLEXIBLE') NOT NULL,
    precio DECIMAL(12,2) NOT NULL,
    cupos_disponibles INT NOT NULL DEFAULT 0,
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id),
    UNIQUE KEY uk_tarifa (vuelo_id, clase, tipo_tarifa)
);

-- =====================================
-- 3. RESERVAS Y PASAJEROS
-- =====================================

CREATE TABLE reservas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    usuario_id INT NULL,
    comprador_nombre VARCHAR(150),
    comprador_correo VARCHAR(150),
    comprador_telefono VARCHAR(30),
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM(
        'PENDIENTE',
        'PAGADA',
        'CANCELACION_SOLICITADA',
        'CANCELADA',
        'EXPIRADA'
    ) DEFAULT 'PENDIENTE',
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
);

CREATE TABLE pasajeros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(30) NOT NULL,
    documento VARCHAR(40) NOT NULL,
    fecha_nacimiento DATE,
    nacionalidad VARCHAR(80),
    correo VARCHAR(150),
    telefono VARCHAR(30),
    UNIQUE KEY uk_documento (tipo_documento, documento)
);

CREATE TABLE reserva_pasajeros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    pasajero_id BIGINT NOT NULL,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros(id),
    UNIQUE KEY uk_reserva_pasajero (reserva_id, pasajero_id)
);

CREATE TABLE reserva_vuelos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    vuelo_id INT NOT NULL,
    tipo_trayecto ENUM('IDA','REGRESO') NOT NULL,
    tarifa_id INT,
    precio DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id),
    FOREIGN KEY (tarifa_id) REFERENCES tarifas(id)
);

-- =====================================
-- 4. SERVICIOS COMPLEMENTARIOS
-- =====================================

CREATE TABLE servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    precio DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE reserva_servicios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    pasajero_id BIGINT NOT NULL,
    servicio_id INT NOT NULL,
    detalle VARCHAR(255),
    precio DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id)
);

-- =====================================
-- 5. PAGOS Y TIQUETES
-- =====================================

CREATE TABLE pagos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    metodo ENUM('PSE','TARJETA','TRANSFERENCIA','MILLAS','BONO') NOT NULL,
    referencia VARCHAR(100),
    valor DECIMAL(12,2) NOT NULL,
    estado ENUM(
        'PENDIENTE',
        'APROBADO',
        'RECHAZADO',
        'CANCELADO',
        'EXPIRADO',
        'ERROR'
    ) DEFAULT 'PENDIENTE',
    fecha_pago DATETIME NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
);

CREATE TABLE tiquetes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    pasajero_id BIGINT NOT NULL,
    vuelo_id INT NOT NULL,
    numero_tiquete VARCHAR(30) NOT NULL UNIQUE,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('EMITIDO','CANCELADO','REEMBOLSADO') DEFAULT 'EMITIDO',
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros(id),
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id)
);

-- =====================================
-- 6. CAMBIOS, CANCELACIONES Y REEMBOLSOS
-- =====================================

CREATE TABLE cambios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    vuelo_anterior INT NOT NULL,
    vuelo_nuevo INT NOT NULL,
    diferencia DECIMAL(12,2) DEFAULT 0,
    estado ENUM('PENDIENTE','PENDIENTE_PAGO','APROBADO','RECHAZADO')
        DEFAULT 'PENDIENTE',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (vuelo_anterior) REFERENCES vuelos(id),
    FOREIGN KEY (vuelo_nuevo) REFERENCES vuelos(id)
);

CREATE TABLE cancelaciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    motivo TEXT,
    valor_reembolso DECIMAL(12,2) DEFAULT 0,
    estado ENUM('SOLICITADA','APROBADA','RECHAZADA','PROCESADA')
        DEFAULT 'SOLICITADA',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
);

CREATE TABLE reembolsos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cancelacion_id BIGINT NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    estado ENUM('PENDIENTE','PROCESADO','RECHAZADO') DEFAULT 'PENDIENTE',
    referencia VARCHAR(100),
    fecha_proceso DATETIME NULL,
    FOREIGN KEY (cancelacion_id) REFERENCES cancelaciones(id)
);

-- =====================================
-- 7. DATOS INICIALES
-- =====================================

INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Control total del sistema'),
('Cliente', 'Consulta y compra de tiquetes'),
('Agente', 'Gestión de reservas y atención'),
('Supervisor', 'Supervisión de operaciones'),
('Analista', 'Consulta de indicadores y reportes');

INSERT INTO servicios (nombre, descripcion, precio) VALUES
('Equipaje adicional', 'Maleta adicional', 120000),
('Mascota', 'Transporte de mascota', 180000),
('Seguro de viaje', 'Cobertura de viaje', 65000),
('Comida especial', 'Servicio de alimentación especial', 35000),
('Abordaje prioritario', 'Prioridad de embarque', 45000),
('Sala VIP', 'Acceso a sala VIP', 95000),
('Transporte terrestre', 'Traslado terrestre', 80000),
('Selección de asiento', 'Selección de silla', 30000);

INSERT INTO aeropuertos (codigo_iata, nombre, ciudad, pais) VALUES
('BOG', 'Aeropuerto El Dorado', 'Bogotá', 'Colombia'),
('MDE', 'Aeropuerto José María Córdova', 'Medellín', 'Colombia'),
('CLO', 'Aeropuerto Alfonso Bonilla Aragón', 'Cali', 'Colombia'),
('CTG', 'Aeropuerto Rafael Núñez', 'Cartagena', 'Colombia'),
('BAQ', 'Aeropuerto Ernesto Cortissoz', 'Barranquilla', 'Colombia'),
('SMR', 'Aeropuerto Simón Bolívar', 'Santa Marta', 'Colombia'),
('BGA', 'Aeropuerto Palonegro', 'Bucaramanga', 'Colombia'),
('PEI', 'Aeropuerto Matecaña', 'Pereira', 'Colombia'),
('ADZ', 'Aeropuerto Gustavo Rojas Pinilla', 'San Andrés', 'Colombia'),
('CUC', 'Aeropuerto Camilo Daza', 'Cúcuta', 'Colombia'),
('LET', 'Aeropuerto Alfredo Vásquez Cobo', 'Leticia', 'Colombia'),
('PTY', 'Aeropuerto Tocumen', 'Ciudad de Panamá', 'Panamá'),
('MIA', 'Aeropuerto Internacional de Miami', 'Miami', 'Estados Unidos'),
('MAD', 'Aeropuerto Adolfo Suárez Madrid-Barajas', 'Madrid', 'España');
