-- =====================================================================
-- 07 · Completar catálogos de marcas y colores
--
-- La app ofrece marcas y colores que no existían en la base de datos
-- (Huawei, "Otra", Rosado, Dorado, Verde, "Otro"). Al no encontrarlos,
-- el equipo se guardaba con el primer valor del catálogo (por ejemplo
-- HP o Negro). Este script los agrega sin tocar los que ya existen.
--
-- "Apple" se guarda como la marca existente MAC y "Plata" como el color
-- existente PLATEADO (lo resuelve app.js), por eso no se agregan aquí.
-- =====================================================================

INSERT IGNORE INTO Marcas (nombre) VALUES
    ('HUAWEI'),
    ('OTRA');

INSERT IGNORE INTO Colores (nombre, codigo_hex) VALUES
    ('ROSADO', '#E3A3B5'),
    ('DORADO', '#CFAE6C'),
    ('VERDE',  '#2E6A4E'),
    ('OTRO',   '#C9C2B7');
