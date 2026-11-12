-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 10, 2026 at 11:04 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sigoa_aircolombia`
--

-- --------------------------------------------------------

--
-- Table structure for table `aeropuertos`
--

CREATE TABLE `aeropuertos` (
  `id` int(11) NOT NULL,
  `codigo_iata` char(3) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `ciudad` varchar(100) NOT NULL,
  `pais` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `aeropuertos`
--

INSERT INTO `aeropuertos` (`id`, `codigo_iata`, `nombre`, `ciudad`, `pais`) VALUES
(1, 'BOG', 'Aeropuerto El Dorado', 'Bogotá', 'Colombia'),
(2, 'MDE', 'Aeropuerto José María Córdova', 'Medellín', 'Colombia'),
(3, 'CLO', 'Aeropuerto Alfonso Bonilla Aragón', 'Cali', 'Colombia'),
(4, 'CTG', 'Aeropuerto Rafael Núñez', 'Cartagena', 'Colombia'),
(5, 'BAQ', 'Aeropuerto Ernesto Cortissoz', 'Barranquilla', 'Colombia'),
(6, 'SMR', 'Aeropuerto Simón Bolívar', 'Santa Marta', 'Colombia'),
(7, 'BGA', 'Aeropuerto Palonegro', 'Bucaramanga', 'Colombia'),
(8, 'PEI', 'Aeropuerto Matecaña', 'Pereira', 'Colombia'),
(9, 'ADZ', 'Aeropuerto Gustavo Rojas Pinilla', 'San Andrés', 'Colombia'),
(10, 'CUC', 'Aeropuerto Camilo Daza', 'Cúcuta', 'Colombia'),
(11, 'LET', 'Aeropuerto Alfredo Vásquez Cobo', 'Leticia', 'Colombia'),
(12, 'PTY', 'Aeropuerto Tocumen', 'Ciudad de Panamá', 'Panamá'),
(13, 'MIA', 'Aeropuerto Internacional de Miami', 'Miami', 'Estados Unidos'),
(14, 'MAD', 'Aeropuerto Adolfo Suárez Madrid-Barajas', 'Madrid', 'España');

-- --------------------------------------------------------

--
-- Table structure for table `auditoria`
--

CREATE TABLE `auditoria` (
  `id` bigint(20) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `direccion_ip` varchar(45) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `aviones`
--

CREATE TABLE `aviones` (
  `id` int(11) NOT NULL,
  `matricula` varchar(20) NOT NULL,
  `modelo` varchar(100) NOT NULL,
  `capacidad` int(11) NOT NULL,
  `estado` enum('ACTIVO','MANTENIMIENTO','INACTIVO') DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cambios`
--

CREATE TABLE `cambios` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `vuelo_anterior` int(11) NOT NULL,
  `vuelo_nuevo` int(11) NOT NULL,
  `diferencia` decimal(12,2) DEFAULT 0.00,
  `estado` enum('PENDIENTE','PENDIENTE_PAGO','APROBADO','RECHAZADO') DEFAULT 'PENDIENTE',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cancelaciones`
--

CREATE TABLE `cancelaciones` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `motivo` text DEFAULT NULL,
  `valor_reembolso` decimal(12,2) DEFAULT 0.00,
  `estado` enum('SOLICITADA','APROBADA','RECHAZADA','PROCESADA') DEFAULT 'SOLICITADA',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pagos`
--

CREATE TABLE `pagos` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `metodo` enum('PSE','TARJETA','TRANSFERENCIA','MILLAS','BONO') NOT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `valor` decimal(12,2) NOT NULL,
  `estado` enum('PENDIENTE','APROBADO','RECHAZADO','CANCELADO','EXPIRADO','ERROR') DEFAULT 'PENDIENTE',
  `fecha_pago` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pasajeros`
--

CREATE TABLE `pasajeros` (
  `id` bigint(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `tipo_documento` varchar(30) NOT NULL,
  `documento` varchar(40) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `nacionalidad` varchar(80) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reembolsos`
--

CREATE TABLE `reembolsos` (
  `id` bigint(20) NOT NULL,
  `cancelacion_id` bigint(20) NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `estado` enum('PENDIENTE','PROCESADO','RECHAZADO') DEFAULT 'PENDIENTE',
  `referencia` varchar(100) DEFAULT NULL,
  `fecha_proceso` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservas`
--

CREATE TABLE `reservas` (
  `id` bigint(20) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `comprador_nombre` varchar(150) DEFAULT NULL,
  `comprador_correo` varchar(150) DEFAULT NULL,
  `comprador_telefono` varchar(30) DEFAULT NULL,
  `fecha_reserva` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('PENDIENTE','PAGADA','CANCELACION_SOLICITADA','CANCELADA','EXPIRADA') DEFAULT 'PENDIENTE',
  `total` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reserva_pasajeros`
--

CREATE TABLE `reserva_pasajeros` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `pasajero_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reserva_servicios`
--

CREATE TABLE `reserva_servicios` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `pasajero_id` bigint(20) NOT NULL,
  `servicio_id` int(11) NOT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `precio` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reserva_vuelos`
--

CREATE TABLE `reserva_vuelos` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `vuelo_id` int(11) NOT NULL,
  `tipo_trayecto` enum('IDA','REGRESO') NOT NULL,
  `tarifa_id` int(11) DEFAULT NULL,
  `precio` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Control total del sistema'),
(2, 'Cliente', 'Consulta y compra de tiquetes'),
(3, 'Agente', 'Gestión de reservas y atención'),
(4, 'Supervisor', 'Supervisión de operaciones'),
(5, 'Analista', 'Consulta de indicadores y reportes');

-- --------------------------------------------------------

--
-- Table structure for table `servicios`
--

CREATE TABLE `servicios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `precio` decimal(12,2) NOT NULL DEFAULT 0.00,
  `estado` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `servicios`
--

INSERT INTO `servicios` (`id`, `nombre`, `descripcion`, `precio`, `estado`) VALUES
(1, 'Equipaje adicional', 'Maleta adicional', 120000.00, 1),
(2, 'Mascota', 'Transporte de mascota', 180000.00, 1),
(3, 'Seguro de viaje', 'Cobertura de viaje', 65000.00, 1),
(4, 'Comida especial', 'Servicio de alimentación especial', 35000.00, 1),
(5, 'Abordaje prioritario', 'Prioridad de embarque', 45000.00, 1),
(6, 'Sala VIP', 'Acceso a sala VIP', 95000.00, 1),
(7, 'Transporte terrestre', 'Traslado terrestre', 80000.00, 1),
(8, 'Selección de asiento', 'Selección de silla', 30000.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tarifas`
--

CREATE TABLE `tarifas` (
  `id` int(11) NOT NULL,
  `vuelo_id` int(11) NOT NULL,
  `clase` enum('ECONOMICA','EJECUTIVA','PRIMERA') NOT NULL,
  `tipo_tarifa` enum('BASICA','ESTANDAR','FLEXIBLE') NOT NULL,
  `precio` decimal(12,2) NOT NULL,
  `cupos_disponibles` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tiquetes`
--

CREATE TABLE `tiquetes` (
  `id` bigint(20) NOT NULL,
  `reserva_id` bigint(20) NOT NULL,
  `pasajero_id` bigint(20) NOT NULL,
  `vuelo_id` int(11) NOT NULL,
  `numero_tiquete` varchar(30) NOT NULL,
  `fecha_emision` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('EMITIDO','CANCELADO','REEMBOLSADO') DEFAULT 'EMITIDO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol_id` int(11) NOT NULL,
  `estado` enum('ACTIVO','INACTIVO','BLOQUEADO') DEFAULT 'ACTIVO',
  `intentos_fallidos` int(11) DEFAULT 0,
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vuelos`
--

CREATE TABLE `vuelos` (
  `id` int(11) NOT NULL,
  `numero_vuelo` varchar(20) NOT NULL,
  `aeropuerto_origen` int(11) NOT NULL,
  `aeropuerto_destino` int(11) NOT NULL,
  `avion_id` int(11) DEFAULT NULL,
  `salida` datetime NOT NULL,
  `llegada` datetime NOT NULL,
  `estado` enum('PROGRAMADO','ABORDANDO','EN_VUELO','FINALIZADO','CANCELADO','RETRASADO') DEFAULT 'PROGRAMADO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aeropuertos`
--
ALTER TABLE `aeropuertos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo_iata` (`codigo_iata`);

--
-- Indexes for table `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indexes for table `aviones`
--
ALTER TABLE `aviones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `matricula` (`matricula`);

--
-- Indexes for table `cambios`
--
ALTER TABLE `cambios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reserva_id` (`reserva_id`),
  ADD KEY `vuelo_anterior` (`vuelo_anterior`),
  ADD KEY `vuelo_nuevo` (`vuelo_nuevo`);

--
-- Indexes for table `cancelaciones`
--
ALTER TABLE `cancelaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reserva_id` (`reserva_id`);

--
-- Indexes for table `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reserva_id` (`reserva_id`);

--
-- Indexes for table `pasajeros`
--
ALTER TABLE `pasajeros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_documento` (`tipo_documento`,`documento`);

--
-- Indexes for table `reembolsos`
--
ALTER TABLE `reembolsos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cancelacion_id` (`cancelacion_id`);

--
-- Indexes for table `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indexes for table `reserva_pasajeros`
--
ALTER TABLE `reserva_pasajeros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_reserva_pasajero` (`reserva_id`,`pasajero_id`),
  ADD KEY `pasajero_id` (`pasajero_id`);

--
-- Indexes for table `reserva_servicios`
--
ALTER TABLE `reserva_servicios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reserva_id` (`reserva_id`),
  ADD KEY `pasajero_id` (`pasajero_id`),
  ADD KEY `servicio_id` (`servicio_id`);

--
-- Indexes for table `reserva_vuelos`
--
ALTER TABLE `reserva_vuelos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reserva_id` (`reserva_id`),
  ADD KEY `vuelo_id` (`vuelo_id`),
  ADD KEY `tarifa_id` (`tarifa_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `tarifas`
--
ALTER TABLE `tarifas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_tarifa` (`vuelo_id`,`clase`,`tipo_tarifa`);

--
-- Indexes for table `tiquetes`
--
ALTER TABLE `tiquetes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_tiquete` (`numero_tiquete`),
  ADD KEY `reserva_id` (`reserva_id`),
  ADD KEY `pasajero_id` (`pasajero_id`),
  ADD KEY `vuelo_id` (`vuelo_id`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `rol_id` (`rol_id`);

--
-- Indexes for table `vuelos`
--
ALTER TABLE `vuelos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `aeropuerto_destino` (`aeropuerto_destino`),
  ADD KEY `avion_id` (`avion_id`),
  ADD KEY `idx_vuelo_salida` (`salida`),
  ADD KEY `idx_vuelo_ruta` (`aeropuerto_origen`,`aeropuerto_destino`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aeropuertos`
--
ALTER TABLE `aeropuertos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `aviones`
--
ALTER TABLE `aviones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cambios`
--
ALTER TABLE `cambios`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cancelaciones`
--
ALTER TABLE `cancelaciones`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pasajeros`
--
ALTER TABLE `pasajeros`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reembolsos`
--
ALTER TABLE `reembolsos`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reserva_pasajeros`
--
ALTER TABLE `reserva_pasajeros`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reserva_servicios`
--
ALTER TABLE `reserva_servicios`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reserva_vuelos`
--
ALTER TABLE `reserva_vuelos`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `servicios`
--
ALTER TABLE `servicios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tarifas`
--
ALTER TABLE `tarifas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tiquetes`
--
ALTER TABLE `tiquetes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vuelos`
--
ALTER TABLE `vuelos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `auditoria`
--
ALTER TABLE `auditoria`
  ADD CONSTRAINT `auditoria_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cambios`
--
ALTER TABLE `cambios`
  ADD CONSTRAINT `cambios_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`),
  ADD CONSTRAINT `cambios_ibfk_2` FOREIGN KEY (`vuelo_anterior`) REFERENCES `vuelos` (`id`),
  ADD CONSTRAINT `cambios_ibfk_3` FOREIGN KEY (`vuelo_nuevo`) REFERENCES `vuelos` (`id`);

--
-- Constraints for table `cancelaciones`
--
ALTER TABLE `cancelaciones`
  ADD CONSTRAINT `cancelaciones_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`);

--
-- Constraints for table `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`);

--
-- Constraints for table `reembolsos`
--
ALTER TABLE `reembolsos`
  ADD CONSTRAINT `reembolsos_ibfk_1` FOREIGN KEY (`cancelacion_id`) REFERENCES `cancelaciones` (`id`);

--
-- Constraints for table `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reserva_pasajeros`
--
ALTER TABLE `reserva_pasajeros`
  ADD CONSTRAINT `reserva_pasajeros_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`),
  ADD CONSTRAINT `reserva_pasajeros_ibfk_2` FOREIGN KEY (`pasajero_id`) REFERENCES `pasajeros` (`id`);

--
-- Constraints for table `reserva_servicios`
--
ALTER TABLE `reserva_servicios`
  ADD CONSTRAINT `reserva_servicios_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`),
  ADD CONSTRAINT `reserva_servicios_ibfk_2` FOREIGN KEY (`pasajero_id`) REFERENCES `pasajeros` (`id`),
  ADD CONSTRAINT `reserva_servicios_ibfk_3` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`);

--
-- Constraints for table `reserva_vuelos`
--
ALTER TABLE `reserva_vuelos`
  ADD CONSTRAINT `reserva_vuelos_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`),
  ADD CONSTRAINT `reserva_vuelos_ibfk_2` FOREIGN KEY (`vuelo_id`) REFERENCES `vuelos` (`id`),
  ADD CONSTRAINT `reserva_vuelos_ibfk_3` FOREIGN KEY (`tarifa_id`) REFERENCES `tarifas` (`id`);

--
-- Constraints for table `tarifas`
--
ALTER TABLE `tarifas`
  ADD CONSTRAINT `tarifas_ibfk_1` FOREIGN KEY (`vuelo_id`) REFERENCES `vuelos` (`id`);

--
-- Constraints for table `tiquetes`
--
ALTER TABLE `tiquetes`
  ADD CONSTRAINT `tiquetes_ibfk_1` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`),
  ADD CONSTRAINT `tiquetes_ibfk_2` FOREIGN KEY (`pasajero_id`) REFERENCES `pasajeros` (`id`),
  ADD CONSTRAINT `tiquetes_ibfk_3` FOREIGN KEY (`vuelo_id`) REFERENCES `vuelos` (`id`);

--
-- Constraints for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `vuelos`
--
ALTER TABLE `vuelos`
  ADD CONSTRAINT `vuelos_ibfk_1` FOREIGN KEY (`aeropuerto_origen`) REFERENCES `aeropuertos` (`id`),
  ADD CONSTRAINT `vuelos_ibfk_2` FOREIGN KEY (`aeropuerto_destino`) REFERENCES `aeropuertos` (`id`),
  ADD CONSTRAINT `vuelos_ibfk_3` FOREIGN KEY (`avion_id`) REFERENCES `aviones` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
