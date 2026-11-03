-- =====================================================================
-- MIGRACIÓN 03: Módulo de Seguridad, Reporte de Hurto y Alertas
-- Compatible con MySQL 8.4 en Railway
-- =====================================================================
USE railway;

-- 1. Agregar columnas a Dispositivos_Estudiante
SET @col_serie_existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Dispositivos_Estudiante'
       AND COLUMN_NAME = 'numero_serie');

SET @instruccion_serie := IF(@col_serie_existe = 0,
    'ALTER TABLE Dispositivos_Estudiante
        ADD COLUMN numero_serie        VARCHAR(50)  NULL AFTER alias,
        ADD COLUMN reportado_hurto     BOOLEAN      NOT NULL DEFAULT FALSE AFTER numero_serie,
        ADD COLUMN fecha_reporte_hurto DATETIME     NULL AFTER reportado_hurto,
        ADD COLUMN motivo_reporte      VARCHAR(255) NULL AFTER fecha_reporte_hurto,
        ADD INDEX idx_dispositivo_serie (numero_serie)',
    'SELECT ''Las columnas de hurto ya existen'' AS aviso');

PREPARE stmt_serie FROM @instruccion_serie;
EXECUTE stmt_serie;
DEALLOCATE PREPARE stmt_serie;

-- 2. Crear tabla de Alertas de Seguridad
CREATE TABLE IF NOT EXISTS Alertas_Seguridad (
    id_alerta         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_dispositivo    INT UNSIGNED NOT NULL,
    tipo_alerta       VARCHAR(30) NOT NULL, -- 'HURTO', 'DISCREPANCIA_SALIDA'
    descripcion       VARCHAR(255) NOT NULL,
    fecha_hora        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_alerta),
    KEY idx_alerta_fecha (fecha_hora),
    CONSTRAINT fk_alerta_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES Dispositivos_Estudiante (id_dispositivo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Vista de dispositivos con campos de seguridad
CREATE OR REPLACE VIEW Vista_Dispositivos_Estudiante AS
SELECT  e.id_estudiante,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(COALESCE(e.nombres,''), ' ', COALESCE(e.apellidos,'')) AS nombre_completo,
        de.id_dispositivo,
        de.numero_serie,
        m.nombre  AS marca,
        c.nombre  AS color,
        c.codigo_hex,
        de.alias,
        de.reportado_hurto,
        de.fecha_reporte_hurto,
        de.motivo_reporte
FROM    Estudiantes e
JOIN    Dispositivos_Estudiante de ON de.id_estudiante = e.id_estudiante
JOIN    Marcas  m ON m.id_marca = de.id_marca
JOIN    Colores c ON c.id_color = de.id_color
WHERE   e.activo = TRUE AND de.activo = TRUE;

-- 4. Vista de auditoría para el panel
CREATE OR REPLACE VIEW Vista_Alertas_Seguridad AS
SELECT  a.id_alerta,
        a.id_dispositivo,
        a.tipo_alerta,
        a.descripcion,
        a.fecha_hora,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(COALESCE(e.nombres,''), ' ', COALESCE(e.apellidos,'')) AS estudiante,
        de.numero_serie,
        m.nombre AS marca,
        c.nombre AS color
FROM    Alertas_Seguridad a
JOIN    Dispositivos_Estudiante de ON de.id_dispositivo = a.id_dispositivo
JOIN    Estudiantes e ON e.id_estudiante = de.id_estudiante
JOIN    Marcas m ON m.id_marca = de.id_marca
JOIN    Colores c ON c.id_color = de.id_color;
