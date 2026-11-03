-- =====================================================================
-- MIGRACIÓN: intentos de login (punto 9), consentimiento Habeas Data
-- (punto 13). Ejecutar UNA vez sobre la base que ya tienes, sin
-- necesidad de borrar nada.
-- =====================================================================
USE autogestion_portatiles;

-- ---------------------------------------------------------------------
-- PUNTO 9: bitácora de intentos de inicio de sesión del panel admin.
-- Se registra TODO intento, exitoso o no — un patrón de solo-fallidos
-- también sirve de evidencia si alguien reporta un olvido de clave
-- legítimo en vez de un ataque.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Intentos_Login_Admin (
    id_intento     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_intentado VARCHAR(40) NOT NULL,
    direccion_ip   VARCHAR(45) NOT NULL,   -- 45 = largo máximo de una IPv6
    exitoso        BOOLEAN  NOT NULL,
    fecha_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_intento),
    KEY idx_intento_fecha (fecha_hora),
    KEY idx_intento_ip (direccion_ip, fecha_hora)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PUNTO 13: consentimiento de tratamiento de datos (Ley 1581 de 2012,
-- Colombia — Habeas Data). No es una tabla aparte porque el
-- consentimiento es un atributo del estudiante mismo, no un hecho con
-- vida propia: no depende de nada más que de esa persona.
-- ---------------------------------------------------------------------
-- "ADD COLUMN IF NOT EXISTS" solo existe en MariaDB; MySQL 8 lo rechaza
-- con error de sintaxis. Esta forma (revisar primero si la columna ya
-- está, y solo entonces agregarla) funciona igual en los dos motores y
-- permite correr el script más de una vez sin que falle.
SET @columna_existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Estudiantes'
       AND COLUMN_NAME = 'acepto_tratamiento_datos');

SET @instruccion := IF(@columna_existe = 0,
    'ALTER TABLE Estudiantes
        ADD COLUMN acepto_tratamiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN fecha_aceptacion_datos DATETIME NULL',
    'SELECT ''La columna de consentimiento ya existe, no se toca nada'' AS aviso');

PREPARE ejecutar FROM @instruccion;
EXECUTE ejecutar;
DEALLOCATE PREPARE ejecutar;

-- A los estudiantes que ya estaban registrados ANTES de esta migración
-- nunca se les preguntó — se marcan como pendientes (FALSE) en vez de
-- asumir un consentimiento que jamás dieron. La app debe pedírselo la
-- próxima vez que se identifiquen (ver ControladorAutogestionServlet).

SELECT 'Migración de seguridad y privacidad aplicada correctamente' AS resultado;
