-- =====================================================================
-- MIGRACIÓN 03B: Panel de Administración
-- Compatible con MySQL 8.4 en Railway
-- =====================================================================
USE railway;

CREATE TABLE IF NOT EXISTS Administradores (
    id_administrador SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario           VARCHAR(40)  NOT NULL,
    clave_hash        VARCHAR(100) NOT NULL,
    activo            BOOLEAN  NOT NULL DEFAULT TRUE,
    creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_administrador),
    UNIQUE KEY uk_administrador_usuario (usuario)
) ENGINE=InnoDB;

INSERT IGNORE INTO Administradores (usuario, clave_hash) VALUES
    ('admin', '$2a$10$jmbbxYSV0h2I0.5R7ZKCQewUstt5KIFxmMG/I/nq53mSrgcgFegtu');

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

SELECT 'Migración del panel de administración aplicada' AS resultado;
