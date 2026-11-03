-- =====================================================================
-- AUTOGESTIÓN DE PORTÁTILES · Universidad de La Guajira
-- Datos iniciales y catálogos semilla para la base de datos
-- Compatible con MySQL 8.4+ en Railway y entornos locales
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CATÁLOGO DE MARCAS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 2. CATÁLOGO DE COLORES
-- ---------------------------------------------------------------------
INSERT INTO Colores (id_color, nombre, codigo_hex) VALUES
    (1, 'NEGRO',    '#1A1A1A'),
    (2, 'GRIS',     '#8A8D91'),
    (3, 'PLATEADO', '#C8CCD0'),
    (4, 'BLANCO',   '#F2F2F2'),
    (5, 'AZUL',     '#1F4E9C'),
    (6, 'ROJO',     '#C84B31')
ON DUPLICATE KEY UPDATE 
    nombre = VALUES(nombre),
    codigo_hex = VALUES(codigo_hex);

-- ---------------------------------------------------------------------
-- 3. CATÁLOGO DE TIPOS DE MOVIMIENTO
-- ---------------------------------------------------------------------
INSERT INTO Tipos_Movimiento (id_tipo_movimiento, nombre) VALUES
    (1, 'ENTRADA'),
    (2, 'SALIDA')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- ---------------------------------------------------------------------
-- 4. CATÁLOGO DE ORÍGENES DE REGISTRO
-- ---------------------------------------------------------------------
INSERT INTO Origenes_Registro (id_origen, nombre) VALUES
    (1, 'ONLINE'),
    (2, 'OFFLINE_SINCRONIZADO'),
    (3, 'IMPORTADO_MANUAL')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
