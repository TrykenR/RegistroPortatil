-- =====================================================================
-- ESQUEMA CONSOLIDADO COMPLETO · AUTOGESTIÓN DE PORTÁTILES UNIGUAJIRA
-- Compatible con MySQL 8.4+ en Railway y entornos locales
-- Incluye Catálogos, Tablas Principales, Seguridad, PIN, Alertas y Vistas
-- =====================================================================

-- 1. TABLAS DE CATÁLOGOS BASE
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

-- 2. TABLA DE ADMINISTRADORES DEL PANEL
CREATE TABLE IF NOT EXISTS Administradores (
    id_administrador  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario           VARCHAR(40)  NOT NULL,
    clave_hash        VARCHAR(100) NOT NULL,
    activo            BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_administrador),
    UNIQUE KEY uk_administrador_usuario (usuario)
) ENGINE=InnoDB;

-- 3. AUDITORÍA DE INTENTOS DE LOGIN
CREATE TABLE IF NOT EXISTS Intentos_Login_Admin (
    id_intento        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_intentado VARCHAR(40) NOT NULL,
    direccion_ip      VARCHAR(45) NOT NULL,
    exitoso           BOOLEAN  NOT NULL,
    fecha_hora        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_intento),
    KEY idx_intento_fecha (fecha_hora),
    KEY idx_intento_ip (direccion_ip, fecha_hora)
) ENGINE=InnoDB;

-- 4. ESTUDIANTES (Con soporte Habeas Data y PIN)
CREATE TABLE IF NOT EXISTS Estudiantes (
    id_estudiante           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_documento        VARCHAR(20) NULL,
    codigo_estudiantil      VARCHAR(20) NULL,
    nombres                 VARCHAR(80) NOT NULL,
    apellidos               VARCHAR(80) NOT NULL,
    acepto_tratamiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_aceptacion_datos  DATETIME NULL,
    pin_hash                VARCHAR(128) NULL,
    tiene_pin               BOOLEAN GENERATED ALWAYS AS (pin_hash IS NOT NULL AND CHAR_LENGTH(pin_hash) > 0) VIRTUAL,
    intentos_pin_fallidos   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    bloqueado_hasta         DATETIME NULL,
    activo                  BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_estudiante),
    UNIQUE KEY uk_estudiante_documento (numero_documento),
    UNIQUE KEY uk_estudiante_codigo (codigo_estudiantil)
) ENGINE=InnoDB;

-- 5. DISPOSITIVOS / PORTÁTILES (Con soporte para reporte de hurto y serie)
CREATE TABLE IF NOT EXISTS Dispositivos_Estudiante (
    id_dispositivo      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_estudiante       INT UNSIGNED NOT NULL,
    id_marca            SMALLINT UNSIGNED NOT NULL,
    id_color            SMALLINT UNSIGNED NOT NULL,
    alias               VARCHAR(40) NULL,
    numero_serie        VARCHAR(50) NULL,
    reportado_hurto     BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_reporte_hurto DATETIME NULL,
    motivo_reporte      VARCHAR(255) NULL,
    activo              BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- 6. HISTORIAL DE ACCESOS
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

-- 7. ALERTAS DE SEGURIDAD
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

-- =====================================================================
-- VISTAS DEL SISTEMA
-- =====================================================================

-- Vista Dispositivos Estudiante
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

-- Vista Historial de Accesos (Panel Admin)
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

-- Vista Alertas de Seguridad (Panel Admin)
CREATE OR REPLACE VIEW Vista_Alertas_Seguridad AS
SELECT  a.id_alerta,
        a.id_dispositivo,
        a.tipo_alerta,
        a.descripcion,
        a.fecha_hora,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(COALESCE(e.nombres,''), ' ', COALESCE(e.apellidos,'')) AS estudiante,
        de.alias,
        de.numero_serie,
        m.nombre AS marca,
        c.nombre AS color
FROM    Alertas_Seguridad a
JOIN    Dispositivos_Estudiante de ON de.id_dispositivo = a.id_dispositivo
JOIN    Estudiantes e ON e.id_estudiante = de.id_estudiante
JOIN    Marcas m  ON m.id_marca = de.id_marca
JOIN    Colores c ON c.id_color = de.id_color;

-- =====================================================================
-- DATOS SEMILLA / INICIALES
-- =====================================================================

INSERT INTO Marcas (id_marca, nombre) VALUES
    (1, 'HP'),
    (2, 'LENOVO'),
    (3, 'ASUS'),
    (4, 'ACER'),
    (5, 'DELL'),
    (6, 'MAC'),
    (7, 'TOSHIBA'),
    (8, 'SAMSUNG')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO Colores (id_color, nombre, codigo_hex) VALUES
    (1, 'NEGRO',    '#1A1A1A'),
    (2, 'GRIS',     '#8A8D91'),
    (3, 'PLATEADO', '#C8CCD0'),
    (4, 'BLANCO',   '#F2F2F2'),
    (5, 'AZUL',     '#1F4E9C'),
    (6, 'ROJO',     '#C84B31')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), codigo_hex = VALUES(codigo_hex);

INSERT INTO Tipos_Movimiento (id_tipo_movimiento, nombre) VALUES
    (1, 'ENTRADA'),
    (2, 'SALIDA')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO Origenes_Registro (id_origen, nombre) VALUES
    (1, 'ONLINE'),
    (2, 'OFFLINE_SINCRONIZADO'),
    (3, 'IMPORTADO_MANUAL')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Administrador por defecto: admin / cambiar123
INSERT IGNORE INTO Administradores (usuario, clave_hash) VALUES
    ('admin', '$2a$10$jmbbxYSV0h2I0.5R7ZKCQewUstt5KIFxmMG/I/nq53mSrgcgFegtu');
