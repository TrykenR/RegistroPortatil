-- =====================================================================
-- Datos de catálogo + juego de prueba
-- Ejecutar DESPUÉS de 01_esquema.sql
-- =====================================================================
USE autogestion_portatiles;

INSERT INTO Marcas (nombre) VALUES
    ('HP'), ('LENOVO'), ('ASUS'), ('ACER'), ('DELL'), ('MAC'), ('SAMSUNG'), ('OTRA');

INSERT INTO Colores (nombre, codigo_hex) VALUES
    ('NEGRO',    '#1A1A1A'),
    ('GRIS',     '#8A8D91'),
    ('PLATEADO', '#C8CCD0'),
    ('BLANCO',   '#F2F2F2'),
    ('AZUL',     '#1F4E9C'),
    ('ROJO',     '#B3261E'),
    ('DORADO',   '#C8A24B');

INSERT INTO Tipos_Movimiento (nombre) VALUES ('ENTRADA'), ('SALIDA');

INSERT INTO Origenes_Registro (nombre) VALUES ('ONLINE'), ('OFFLINE_SINCRONIZADO');

-- Administrador por defecto del panel de consulta. Usuario: admin
-- Clave: cambiar123 — CÁMBIALA antes de usar esto en producción real.
-- El hash de abajo corresponde exactamente a 'cambiar123'.
INSERT INTO Administradores (usuario, clave_hash) VALUES
    ('admin', '$2a$10$jmbbxYSV0h2I0.5R7ZKCQewUstt5KIFxmMG/I/nq53mSrgcgFegtu');

-- Estudiante de prueba con dos equipos vinculados
INSERT INTO Estudiantes (numero_documento, codigo_estudiantil, nombres, apellidos)
VALUES ('1007654321', '2019115034', 'Andrés Camilo', 'Gómez Daza');

INSERT INTO Dispositivos_Estudiante (id_estudiante, id_marca, id_color, alias, numero_serie) VALUES
    (1, 2, 1, 'El de la U', 'LNV-83921-X'),      -- LENOVO NEGRO
    (1, 1, 2, 'El de la casa', 'HP-55410-COL');   -- HP GRIS

-- Un acceso histórico ONLINE normal
INSERT INTO Historial_Accesos
    (id_dispositivo, id_tipo_movimiento, id_origen, fecha_hora_evento, fecha_hora_sincronizado)
VALUES (1, 1, 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY);

-- Un acceso de ejemplo que se guardó offline y sincronizó 6 minutos después
INSERT INTO Historial_Accesos
    (id_dispositivo, id_tipo_movimiento, id_origen, fecha_hora_evento, fecha_hora_sincronizado)
VALUES (2, 1, 2, NOW() - INTERVAL 1 HOUR, (NOW() - INTERVAL 1 HOUR) + INTERVAL 6 MINUTE);

-- Verificación rápida
SELECT * FROM Vista_Dispositivos_Estudiante WHERE numero_documento = '1007654321';
SELECT * FROM Vista_Historial_Accesos ORDER BY fecha_hora_evento DESC;
