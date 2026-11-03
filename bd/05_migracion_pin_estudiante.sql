-- =====================================================================
-- MIGRACIÓN 05: Protección con PIN para estudiantes
-- Compatible con MySQL 8.4 en Railway
-- =====================================================================
USE railway;

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
    'SELECT ''Las columnas de PIN ya existen'' AS aviso');

PREPARE stmt_pin FROM @instruccion_pin;
EXECUTE stmt_pin;
DEALLOCATE PREPARE stmt_pin;

SELECT 'Migración de PIN aplicada' AS resultado;
