-- =====================================================================
-- MIGRACIÓN 05: Protección con PIN de 4 dígitos para estudiantes
-- =====================================================================
USE autogestion_portatiles;

-- 1. Columna para hash seguro del PIN (SHA-256 con salt o BCrypt)
SET @col_pin_existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Estudiantes'
       AND COLUMN_NAME = 'pin_hash');

SET @instruccion_pin := IF(@col_pin_existe = 0,
    'ALTER TABLE Estudiantes
        ADD COLUMN pin_hash VARCHAR(128) NULL AFTER acepto_tratamiento_datos,
        ADD COLUMN intentos_pin_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER pin_hash,
        ADD COLUMN bloqueado_hasta DATETIME NULL AFTER intentos_pin_fallidos',
    'SELECT ''Las columnas de PIN ya existen en Estudiantes'' AS aviso');

PREPARE stmt_pin FROM @instruccion_pin;
EXECUTE stmt_pin;
DEALLOCATE PREPARE stmt_pin;
