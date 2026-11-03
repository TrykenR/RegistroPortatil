-- =====================================================================
-- DATOS DE PRUEBA SINTÉTICOS (Autogestión de portátiles · Uniguajira)
-- Ejecutar ANTES de las pruebas:
--   mysql -u root -p -P 3307 < pruebas_datos.sql
--
-- Todos los documentos empiezan por 9000 para reconocerlos y borrarlos
-- después con pruebas_limpieza.sql. Son datos inventados: nunca uses
-- datos reales de estudiantes en las pruebas.
--
-- Si ya los habías creado, corre primero pruebas_limpieza.sql (los
-- documentos son únicos y repetirlos daría error).
-- =====================================================================
USE autogestion_portatiles;

INSERT INTO Estudiantes
    (numero_documento, nombres, apellidos, acepto_tratamiento_datos, fecha_aceptacion_datos)
VALUES
    ('9000000001', 'Prueba', 'Humo',            TRUE,  NOW()),   -- CP-HUM-01 y CP-REG-01
    ('9000000002', 'Prueba', 'Integracion',     TRUE,  NOW()),   -- CP-INT-01
    ('9000000003', 'Prueba', 'Aceptacion',      TRUE,  NOW()),   -- CP-ACE-01 (celular)
    ('9000000004', 'Prueba', 'SinConsentimiento', FALSE, NULL);  -- CP-CUM-01

-- Un portátil HP GRIS para cada uno de los tres primeros.
INSERT INTO Dispositivos_Estudiante (id_estudiante, id_marca, id_color, alias)
SELECT e.id_estudiante,
       (SELECT id_marca FROM Marcas   WHERE nombre = 'HP'),
       (SELECT id_color FROM Colores  WHERE nombre = 'GRIS'),
       CONCAT('Equipo de prueba ', e.apellidos)
  FROM Estudiantes e
 WHERE e.numero_documento IN ('9000000001', '9000000002', '9000000003');

-- ANOTA estos números: van en las variables de JMeter.
SELECT e.numero_documento AS documento,
       e.id_estudiante    AS id_estudiante,
       d.id_dispositivo   AS id_dispositivo
  FROM Estudiantes e
  LEFT JOIN Dispositivos_Estudiante d ON d.id_estudiante = e.id_estudiante
 WHERE e.numero_documento LIKE '9000%'
 ORDER BY e.numero_documento;
