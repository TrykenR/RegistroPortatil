-- =====================================================================
-- AUTOGESTIÓN DE PORTÁTILES · Universidad de La Guajira
-- Versión compatible con MySQL en Railway
-- =====================================================================

-- CATÁLOGOS
CREATE TABLE IF NOT EXISTS Marcas (
    id_marca SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre   VARCHAR(40) NOT NULL,
    PRIMARY KEY (id_marca),
    UNIQUE KEY uk_marca_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Colores (
    id_color   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre     VARCHAR(30) NOT NULL,
    codigo_hex CHAR(7)     NOT NULL,
    PRIMARY KEY (id_color),
    UNIQUE KEY uk_color_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Tipos_Movimiento (
    id_tipo_movimiento TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre              VARCHAR(20) NOT NULL,
    PRIMARY KEY (id_tipo_movimiento),
    UNIQUE KEY uk_tipo_movimiento_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Origenes_Registro (
    id_origen SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre    VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_origen),
    UNIQUE KEY uk_origen_nombre (nombre)
) ENGINE=InnoDB;

-- ENTIDADES PRINCIPALES
CREATE TABLE IF NOT EXISTS Estudiantes (
    id_estudiante      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_documento   VARCHAR(20) NOT NULL,
    codigo_estudiantil VARCHAR(20) NULL,
    nombres            VARCHAR(80) NOT NULL,
    apellidos          VARCHAR(80) NOT NULL,
    activo             BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_estudiante),
    UNIQUE KEY uk_estudiante_documento (numero_documento),
    UNIQUE KEY uk_estudiante_codigo (codigo_estudiantil)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Dispositivos_Estudiante (
    id_dispositivo INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_estudiante  INT UNSIGNED NOT NULL,
    id_marca       SMALLINT UNSIGNED NOT NULL,
    id_color       SMALLINT UNSIGNED NOT NULL,
    alias          VARCHAR(40) NULL,
    activo         BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_dispositivo),
    KEY idx_dispositivo_estudiante (id_estudiante),
    CONSTRAINT fk_dispositivo_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES Estudiantes (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_dispositivo_marca FOREIGN KEY (id_marca)
        REFERENCES Marcas (id_marca),
    CONSTRAINT fk_dispositivo_color FOREIGN KEY (id_color)
        REFERENCES Colores (id_color)
) ENGINE=InnoDB;

-- HISTORIAL
CREATE TABLE IF NOT EXISTS Historial_Accesos (
    id_registro              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_dispositivo           INT UNSIGNED NOT NULL,
    id_tipo_movimiento       TINYINT UNSIGNED NOT NULL,
    id_origen                SMALLINT UNSIGNED NOT NULL,
    fecha_hora_evento        DATETIME NOT NULL,
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
