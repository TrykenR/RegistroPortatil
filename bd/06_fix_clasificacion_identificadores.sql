-- =====================================================================
-- SCRIPT DE MIGRACIÓN Y REGULARIZACIÓN DE IDENTIFICADORES EN RAILWAY
-- Ejecutar en la consola Query de MySQL en Railway
-- =====================================================================

USE railway;

-- 1. Permitir que numero_documento sea NULL (para estudiantes que sólo registran código)
ALTER TABLE Estudiantes MODIFY COLUMN numero_documento VARCHAR(20) NULL;

-- 2. Permitir que codigo_estudiantil sea NULL (para estudiantes que sólo registran cédula)
ALTER TABLE Estudiantes MODIFY COLUMN codigo_estudiantil VARCHAR(20) NULL;

-- 3. Mover a codigo_estudiantil aquellos identificadores que comienzan por '0' y quedaron en numero_documento
UPDATE Estudiantes 
SET codigo_estudiantil = numero_documento,
    numero_documento = NULL
WHERE numero_documento LIKE '0%' 
  AND (codigo_estudiantil IS NULL OR codigo_estudiantil = '');

-- 4. Asegurar que si un código no empieza por '0' y no tiene documento, pase a numero_documento
UPDATE Estudiantes 
SET numero_documento = codigo_estudiantil,
    codigo_estudiantil = NULL
WHERE codigo_estudiantil NOT LIKE '0%' 
  AND (numero_documento IS NULL OR numero_documento = '');

-- 5. Agregar columna generada virtual 'tiene_pin' para compatibilidad total con queries directos (MySQL 8 defensivo)
SET @col_existe := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Estudiantes' 
      AND COLUMN_NAME = 'tiene_pin'
);

SET @sql_tiene_pin := IF(@col_existe = 0,
    'ALTER TABLE Estudiantes ADD COLUMN tiene_pin BOOLEAN GENERATED ALWAYS AS (pin_hash IS NOT NULL AND CHAR_LENGTH(pin_hash) > 0) VIRTUAL;',
    'SELECT "Columna tiene_pin ya existe" AS aviso;'
);

PREPARE stmt_tiene_pin FROM @sql_tiene_pin;
EXECUTE stmt_tiene_pin;
DEALLOCATE PREPARE stmt_tiene_pin;

-- 6. Recrear Vista_Historial_Accesos para asegurar consistencia
CREATE OR REPLACE VIEW Vista_Historial_Accesos AS
SELECT  h.id_registro,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(COALESCE(e.nombres,''), ' ', COALESCE(e.apellidos,'')) AS estudiante,
        m.nombre AS marca,
        c.nombre AS color,
        tm.nombre AS movimiento,
        o.nombre  AS origen,
        h.fecha_hora_evento,
        h.fecha_hora_sincronizado,
        TIMESTAMPDIFF(SECOND, h.fecha_hora_evento, h.fecha_hora_sincronizado) AS segundos_de_retraso
FROM    Historial_Accesos h
JOIN    Dispositivos_Estudiante de ON de.id_dispositivo = h.id_dispositivo
JOIN    Estudiantes e ON e.id_estudiante = de.id_estudiante
JOIN    Marcas m  ON m.id_marca = de.id_marca
JOIN    Colores c ON c.id_color = de.id_color
JOIN    Tipos_Movimiento tm ON tm.id_tipo_movimiento = h.id_tipo_movimiento
JOIN    Origenes_Registro o ON o.id_origen = h.id_origen;
