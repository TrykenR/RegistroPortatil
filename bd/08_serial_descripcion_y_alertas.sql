-- =====================================================================
-- MIGRACIÓN 08: Serial y Alias/Descripción en Historial y Soporte Alertas Resueltas
-- Compatible con MySQL 8.4 en Railway
-- =====================================================================
USE railway;

-- 1. Actualizar Vista_Historial_Accesos para incluir id_dispositivo, numero_serie y alias/descripcion
CREATE OR REPLACE VIEW Vista_Historial_Accesos AS
SELECT  h.id_registro,
        de.id_dispositivo,
        e.numero_documento,
        e.codigo_estudiantil,
        CONCAT(COALESCE(e.nombres,''), ' ', COALESCE(e.apellidos,'')) AS estudiante,
        de.numero_serie,
        de.alias AS descripcion,
        de.reportado_hurto,
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

-- 2. Actualizar Vista_Alertas_Seguridad para filtrar que equipos con hurto activo aparezcan
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
JOIN    Colores c ON c.id_color = de.id_color
WHERE   (a.tipo_alerta <> 'HURTO' OR de.reportado_hurto = TRUE);
