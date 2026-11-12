-- AIRCOLOMBIA SIGOA - Datos de demostracion
-- Ejecutar DESPUES de importar sigoa_aircolombia.sql, dentro de sigoa_aircolombia.
-- Compatible con MariaDB 10.4 / MySQL. No borra registros.
-- Vuelos de prueba relativos a la fecha de ejecucion (proximos 30 dias).
USE `sigoa_aircolombia`;
START TRANSACTION;

-- Catalogos: se omiten registros ya existentes.
INSERT IGNORE INTO roles (id,nombre,descripcion) VALUES
(1,'Administrador','Control total del sistema'),
(2,'Cliente','Consulta y compra de tiquetes'),
(3,'Agente','Gestion de reservas y atencion'),
(4,'Supervisor','Supervision de operaciones'),
(5,'Analista','Consulta de indicadores y reportes');

INSERT IGNORE INTO aeropuertos (id,codigo_iata,nombre,ciudad,pais) VALUES
(1,'BOG','Aeropuerto El Dorado','Bogotá','Colombia'),
(2,'MDE','Aeropuerto José María Córdova','Medellín','Colombia'),
(3,'CLO','Aeropuerto Alfonso Bonilla Aragón','Cali','Colombia'),
(4,'CTG','Aeropuerto Rafael Núñez','Cartagena','Colombia'),
(5,'BAQ','Aeropuerto Ernesto Cortissoz','Barranquilla','Colombia'),
(6,'SMR','Aeropuerto Simón Bolívar','Santa Marta','Colombia'),
(7,'BGA','Aeropuerto Palonegro','Bucaramanga','Colombia'),
(8,'PEI','Aeropuerto Matecaña','Pereira','Colombia'),
(9,'ADZ','Aeropuerto Gustavo Rojas Pinilla','San Andrés','Colombia'),
(10,'CUC','Aeropuerto Camilo Daza','Cúcuta','Colombia'),
(11,'LET','Aeropuerto Alfredo Vásquez Cobo','Leticia','Colombia'),
(12,'PTY','Aeropuerto Tocumen','Ciudad de Panamá','Panamá'),
(13,'MIA','Aeropuerto Internacional de Miami','Miami','Estados Unidos'),
(14,'MAD','Aeropuerto Adolfo Suárez Madrid-Barajas','Madrid','España');

INSERT IGNORE INTO servicios (id,nombre,descripcion,precio,estado) VALUES
(1,'Equipaje adicional','Maleta adicional',120000,1),
(2,'Mascota','Transporte de mascota',180000,1),
(3,'Seguro de viaje','Cobertura de viaje',65000,1),
(4,'Comida especial','Servicio de alimentación especial',35000,1),
(5,'Abordaje prioritario','Prioridad de embarque',45000,1),
(6,'Sala VIP','Acceso a sala VIP',95000,1),
(7,'Transporte terrestre','Traslado terrestre',80000,1),
(8,'Selección de asiento','Selección de silla',30000,1);

INSERT IGNORE INTO aviones (matricula,modelo,capacidad,estado) VALUES
('HK-3201','Airbus A320',180,'ACTIVO'),
('HK-3202','Airbus A320neo',186,'ACTIVO'),
('HK-3301','Airbus A330',280,'ACTIVO');

-- Rutas demo, con duracion aproximada en minutos.
-- Numero de vuelo unico por fecha, ruta y franja horaria.
-- La combinacion fecha+numero permite reimportar sin duplicar vuelos.
INSERT INTO vuelos (numero_vuelo,aeropuerto_origen,aeropuerto_destino,avion_id,salida,llegada,estado)
SELECT CONCAT('AC',DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL dias.dia DAY),'%y%m%d'),
              LPAD(r.n,2,'0'),h.n),
       ao.id,ad.id,av.id,
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL dias.dia DAY),h.hora),
       DATE_ADD(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL dias.dia DAY),h.hora),INTERVAL r.minutos MINUTE),
       'PROGRAMADO'
FROM (
 SELECT unidades.n + decenas.n*10 + 1 AS dia
 FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
       UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) unidades
 CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2) decenas
) dias
CROSS JOIN (
 SELECT 1 n,'BOG' origen,'MDE' destino,65 minutos,'HK-3201' matricula UNION ALL
 SELECT 2,'MDE','BOG',65,'HK-3201' UNION ALL
 SELECT 3,'BOG','CLO',60,'HK-3201' UNION ALL
 SELECT 4,'CLO','BOG',60,'HK-3201' UNION ALL
 SELECT 5,'BOG','CTG',90,'HK-3201' UNION ALL
 SELECT 6,'CTG','BOG',90,'HK-3201' UNION ALL
 SELECT 7,'BOG','BAQ',90,'HK-3201' UNION ALL
 SELECT 8,'BAQ','BOG',90,'HK-3201' UNION ALL
 SELECT 9,'BOG','SMR',90,'HK-3201' UNION ALL
 SELECT 10,'SMR','BOG',90,'HK-3201' UNION ALL
 SELECT 11,'MDE','CTG',75,'HK-3202' UNION ALL
 SELECT 12,'CTG','MDE',75,'HK-3202' UNION ALL
 SELECT 13,'BOG','MIA',240,'HK-3301' UNION ALL
 SELECT 14,'MIA','BOG',240,'HK-3301' UNION ALL
 SELECT 15,'BOG','PTY',100,'HK-3202' UNION ALL
 SELECT 16,'PTY','BOG',100,'HK-3202'
) r
CROSS JOIN (
 SELECT 1 n,'06:00:00' hora UNION ALL
 SELECT 2,'10:00:00' UNION ALL
 SELECT 3,'15:00:00' UNION ALL
 SELECT 4,'19:00:00'
) h
JOIN aeropuertos ao ON ao.codigo_iata=r.origen
JOIN aeropuertos ad ON ad.codigo_iata=r.destino
JOIN aviones av ON av.matricula=r.matricula
WHERE NOT EXISTS (
 SELECT 1 FROM vuelos existente
 WHERE existente.numero_vuelo=CONCAT('AC',DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL dias.dia DAY),'%y%m%d'),LPAD(r.n,2,'0'),h.n)
);

-- Tres clases/tarifas por vuelo demo. No altera tarifas existentes.
INSERT INTO tarifas (vuelo_id,clase,tipo_tarifa,precio,cupos_disponibles)
SELECT v.id,t.clase,t.tipo_tarifa,
       CASE WHEN ao.codigo_iata='MIA' OR ad.codigo_iata='MIA' THEN t.precio*3
            WHEN ao.codigo_iata='PTY' OR ad.codigo_iata='PTY' THEN t.precio*2
            ELSE t.precio END,
       t.cupos
FROM vuelos v
JOIN aeropuertos ao ON ao.id=v.aeropuerto_origen
JOIN aeropuertos ad ON ad.id=v.aeropuerto_destino
CROSS JOIN (
 SELECT 'ECONOMICA' clase,'BASICA' tipo_tarifa,189000 precio,100 cupos UNION ALL
 SELECT 'EJECUTIVA','ESTANDAR',450000,30 UNION ALL
 SELECT 'PRIMERA','FLEXIBLE',850000,10
) t
WHERE v.numero_vuelo LIKE 'AC%'
  AND v.salida >= CURDATE()
  AND NOT EXISTS (
    SELECT 1 FROM tarifas ta
    WHERE ta.vuelo_id=v.id AND ta.clase=t.clase AND ta.tipo_tarifa=t.tipo_tarifa
  );
COMMIT;

-- Verificacion
SELECT 'aeropuertos' tabla,COUNT(*) registros FROM aeropuertos
UNION ALL SELECT 'roles',COUNT(*) FROM roles
UNION ALL SELECT 'servicios',COUNT(*) FROM servicios
UNION ALL SELECT 'aviones',COUNT(*) FROM aviones
UNION ALL SELECT 'vuelos',COUNT(*) FROM vuelos
UNION ALL SELECT 'tarifas',COUNT(*) FROM tarifas
UNION ALL SELECT 'usuarios',COUNT(*) FROM usuarios
UNION ALL SELECT 'reservas',COUNT(*) FROM reservas;

-- NOTA: No se crean usuarios ni reservas ficticias.
-- Para el administrador utilizar el script de Node backend/scripts/crearAdmin.js
-- despues de configurar el entorno; no almacenar contrasenas en SQL ni Git.
