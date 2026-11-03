-- =====================================================================
-- MIGRACIÓN 04: Intentos de login y Consentimiento Habeas Data
-- Compatible con MySQL 8.4 en Railway
-- =====================================================================
USE railway;

CREATE TABLE IF NOT EXISTS Intentos_Login_Admin (
    id_intento     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_intentado VARCHAR(40) NOT NULL,
    direccion_ip   VARCHAR(45) NOT NULL,
    exitoso        BOOLEAN  NOT NULL,
    fecha_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_intento),
    KEY idx_intento_fecha (fecha_hora),
    KEY idx_intento_ip (direccion_ip, fecha_hora)
) ENGINE=InnoDB;

SET @columna_existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Estudiantes'
       AND COLUMN_NAME = 'acepto_tratamiento_datos');

SET @instruccion := IF(@columna_existe = 0,
    'ALTER TABLE Estudiantes
        ADD COLUMN acepto_tratamiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN fecha_aceptacion_datos DATETIME NULL',
    'SELECT ''La columna de consentimiento ya existe'' AS aviso');

PREPARE ejecutar FROM @instruccion;
EXECUTE ejecutar;
DEALLOCATE PREPARE ejecutar;

SELECT 'Migración de seguridad y privacidad aplicada' AS resultado;
