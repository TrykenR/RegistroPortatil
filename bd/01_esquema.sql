-- =====================================================================
-- AUTOGESTIÓN DE PORTÁTILES · Universidad de La Guajira
-- Versión PWA Offline-First, backend local expuesto vía túnel Ngrok.
-- Motor: MySQL 8.x / MariaDB 10.6+   |   Normalización: hasta 4FN
-- =====================================================================
--
-- QUÉ CAMBIA RESPECTO A LA VERSIÓN SOLO-ONLINE
-- Cuando el estudiante se registra sin señal, el celular guarda el
-- evento en IndexedDB con SU PROPIA hora, y lo reenvía cuando vuelve la
-- red. Eso significa que, para un registro sincronizado tarde, la hora
-- del suceso y la hora en que el servidor lo recibió NO son la misma
-- instancia de tiempo — y las dos son datos útiles: una es la evidencia
-- de cuándo pasó (según el celular del estudiante), la otra es el dato
-- confiable de auditoría (según el reloj del servidor). Por eso
-- Historial_Accesos separa:
--   fecha_hora_evento         -> cuándo ocurrió, según quien lo registró
--   fecha_hora_sincronizado   -> cuándo llegó de verdad al servidor
-- y guarda de dónde vino con id_origen (catálogo, no texto suelto).
--
-- El resto de la normalización sigue el mismo razonamiento de las
-- versiones anteriores: marca y color en catálogos aparte para no
-- repetir texto ('HP'/'Hp'/'hp'), Dispositivos_Estudiante fusiona
-- dispositivo + dueño porque un portátil nunca cambia de estudiante en
-- este sistema (relación 1:N simple, no hay MVD que resolver ahí), e
-- Historial_Accesos es su propio hecho con clave propia — independiente
-- de a quién pertenece el dispositivo o qué marca es.
-- =====================================================================

DROP DATABASE IF EXISTS autogestion_portatiles;
CREATE DATABASE autogestion_portatiles
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE autogestion_portatiles;

-- ---------------------------------------------------------------------
-- CATÁLOGOS
-- ---------------------------------------------------------------------

CREATE TABLE Marcas (
    id_marca SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre   VARCHAR(40) NOT NULL,
    PRIMARY KEY (id_marca),
    UNIQUE KEY uk_marca_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE Colores (
    id_color   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre     VARCHAR(30) NOT NULL,
    codigo_hex CHAR(7)     NOT NULL,
    PRIMARY KEY (id_color),
    UNIQUE KEY uk_color_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE Tipos_Movimiento (
    id_tipo_movimiento TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre              VARCHAR(20) NOT NULL,     -- ENTRADA, SALIDA
    PRIMARY KEY (id_tipo_movimiento),
    UNIQUE KEY uk_tipo_movimiento_nombre (nombre)
) ENGINE=InnoDB;

-- Nuevo en esta versión: de dónde vino el registro. Tabla y no un
-- booleano "es_offline" porque mañana puede aparecer un tercer origen
-- (ej. "IMPORTADO_MANUAL" para contingencias) sin tocar la estructura.
CREATE TABLE Origenes_Registro (
    id_origen SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre    VARCHAR(30) NOT NULL,     -- ONLINE, OFFLINE_SINCRONIZADO
    PRIMARY KEY (id_origen),
    UNIQUE KEY uk_origen_nombre (nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ENTIDADES PRINCIPALES
-- ---------------------------------------------------------------------

CREATE TABLE Estudiantes (
    id_estudiante      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_documento   VARCHAR(20) NULL,
    codigo_estudiantil VARCHAR(20) NULL,
    nombres            VARCHAR(80) NOT NULL,
    apellidos          VARCHAR(80) NOT NULL,
    -- Habeas Data (Ley 1581 de 2012, Colombia): el estudiante debe
    -- aceptar el tratamiento de sus datos antes de que el sistema
    -- guarde nada suyo. Se registra CUÁNDO lo aceptó, no solo QUE lo
    -- aceptó, porque una política de privacidad puede cambiar y ese
    -- consentimiento quedaría desactualizado.
    acepto_tratamiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_aceptacion_datos   DATETIME NULL,
    activo             BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_estudiante),
    UNIQUE KEY uk_estudiante_documento (numero_documento),
    UNIQUE KEY uk_estudiante_codigo (codigo_estudiantil)
) ENGINE=InnoDB;

CREATE TABLE Dispositivos_Estudiante (
    id_dispositivo        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_estudiante         INT UNSIGNED NOT NULL,
    id_marca              SMALLINT UNSIGNED NOT NULL,
    id_color              SMALLINT UNSIGNED NOT NULL,
    alias                 VARCHAR(40)  NULL,
    numero_serie          VARCHAR(50)  NULL,
    reportado_hurto       BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_reporte_hurto   DATETIME     NULL,
    motivo_reporte        VARCHAR(255) NULL,
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_dispositivo),
    KEY idx_dispositivo_estudiante (id_estudiante),
    KEY idx_dispositivo_serie (numero_serie),
    CONSTRAINT fk_dispositivo_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES Estudiantes (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_dispositivo_marca FOREIGN KEY (id_marca)
        REFERENCES Marcas (id_marca),
    CONSTRAINT fk_dispositivo_color FOREIGN KEY (id_color)
        REFERENCES Colores (id_color)
) ENGINE=InnoDB;

-- Bitácora de incidentes y alertas de seguridad (hurto, intentos de salida sin entrada)
CREATE TABLE Alertas_Seguridad (
    id_alerta         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_dispositivo    INT UNSIGNED NOT NULL,
    tipo_alerta       VARCHAR(30) NOT NULL, -- HURTO, DISCREPANCIA_SALIDA
    descripcion       VARCHAR(255) NOT NULL,
    fecha_hora        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_alerta),
    KEY idx_alerta_fecha (fecha_hora),
    CONSTRAINT fk_alerta_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES Dispositivos_Estudiante (id_dispositivo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ADMINISTRADORES (panel de consulta del portero / quien opera el servidor)
-- ---------------------------------------------------------------------
-- Tabla y no una clave fija en el código Java, por la misma razón que
-- todo lo demás en este esquema: cambiar la contraseña o agregar un
-- segundo administrador el día de mañana no debe exigir recompilar
-- nada. La clave nunca se guarda en texto plano — solo su hash BCrypt.
CREATE TABLE Administradores (
    id_administrador SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario           VARCHAR(40)  NOT NULL,
    clave_hash        VARCHAR(100) NOT NULL,
    activo            BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_administrador),
    UNIQUE KEY uk_administrador_usuario (usuario)
) ENGINE=InnoDB;

-- Bitácora de intentos de inicio de sesión al panel (punto 9 de las
-- mejoras): se registra todo intento, exitoso o no, para poder
-- detectar patrones de fuerza bruta contra la clave del administrador.
CREATE TABLE Intentos_Login_Admin (
    id_intento        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_intentado VARCHAR(40) NOT NULL,
    direccion_ip      VARCHAR(45) NOT NULL,
    exitoso           BOOLEAN  NOT NULL,
    fecha_hora        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_intento),
    KEY idx_intento_fecha (fecha_hora),
    KEY idx_intento_ip (direccion_ip, fecha_hora)
) ENGINE=InnoDB;


CREATE TABLE Historial_Accesos (
    id_registro              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_dispositivo           INT UNSIGNED NOT NULL,
    id_tipo_movimiento       TINYINT UNSIGNED NOT NULL,
    id_origen                SMALLINT UNSIGNED NOT NULL,
    -- Cuándo ocurrió según quien lo registró (celular offline o NOW()
    -- del servidor si fue online: en ese caso son el mismo instante).
    fecha_hora_evento        DATETIME NOT NULL,
    -- Cuándo llegó de verdad al servidor. Siempre confiable, siempre
    -- puesta por el motor, nunca por el cliente.
    fecha_hora_sincronizado  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_registro),
    KEY idx_historial_evento (fecha_hora_evento),
    KEY idx_historial_dispositivo (id_dispositivo, fecha_hora_evento),
    CONSTRAINT fk_historial_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES Dispositivos_Estudiante (id_dispositivo),
    CONSTRAINT fk_historial_movimiento FOREIGN KEY (id_tipo_movimiento)
        REFERENCES Tipos_Movimiento (id_tipo_movimiento),
    CONSTRAINT fk_historial_origen FOREIGN KEY (id_origen)
        REFERENCES Origenes_Registro (id_origen)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VISTAS: cara plana para el backend, sin romper la normalización.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW Vista_Dispositivos_Estudiante AS
SELECT  e.id_estudiante,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(e.nombres, ' ', e.apellidos) AS nombre_completo,
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

-- Vista para el panel de monitoreo y seguridad
CREATE OR REPLACE VIEW Vista_Alertas_Seguridad AS
SELECT  a.id_alerta,
        a.id_dispositivo,
        a.tipo_alerta,
        a.descripcion,
        a.fecha_hora,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(e.nombres, ' ', e.apellidos) AS estudiante,
        de.numero_serie,
        m.nombre AS marca,
        c.nombre AS color
FROM    Alertas_Seguridad a
JOIN    Dispositivos_Estudiante de ON de.id_dispositivo = a.id_dispositivo
JOIN    Estudiantes e ON e.id_estudiante = de.id_estudiante
JOIN    Marcas m ON m.id_marca = de.id_marca
JOIN    Colores c ON c.id_color = de.id_color;

-- Útil para auditar cuántos accesos llegaron tarde por haberse guardado
-- offline, y cuánto tiempo tardaron en sincronizar.
CREATE OR REPLACE VIEW Vista_Historial_Accesos AS
SELECT  h.id_registro,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(e.nombres, ' ', e.apellidos) AS estudiante,
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

-- ---------------------------------------------------------------------
-- USUARIO DE APLICACIÓN (privilegio mínimo, sin permisos de DDL)
-- ---------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'app_autogestion'@'%' IDENTIFIED BY 'cambiar_esta_clave';
GRANT SELECT, INSERT, UPDATE ON autogestion_portatiles.* TO 'app_autogestion'@'%';
FLUSH PRIVILEGES;
