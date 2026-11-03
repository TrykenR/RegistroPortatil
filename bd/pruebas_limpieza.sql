-- =====================================================================
-- LIMPIEZA de los datos de prueba (todo lo que empiece por 9000)
--   mysql -u root -p -P 3307 < pruebas_limpieza.sql
--
-- Hay que ejecutarlo como ROOT: el usuario app_autogestion no tiene
-- permiso DELETE a propósito. El orden importa: primero el historial,
-- luego los equipos y al final los estudiantes.
-- =====================================================================
USE autogestion_portatiles;

DELETE h FROM Historial_Accesos h
  JOIN Dispositivos_Estudiante d ON d.id_dispositivo = h.id_dispositivo
  JOIN Estudiantes e             ON e.id_estudiante  = d.id_estudiante
 WHERE e.numero_documento LIKE '9000%';

DELETE d FROM Dispositivos_Estudiante d
  JOIN Estudiantes e ON e.id_estudiante = d.id_estudiante
 WHERE e.numero_documento LIKE '9000%';

DELETE FROM Estudiantes WHERE numero_documento LIKE '9000%';

-- OPCIONAL: borrar los intentos de login que generó JMeter (vienen de tu
-- propio computador). Hazlo solo DESPUÉS de tomar la captura de evidencia.
-- DELETE FROM Intentos_Login_Admin
--  WHERE direccion_ip IN ('127.0.0.1', '::1', '0:0:0:0:0:0:0:1');

SELECT 'Datos de prueba eliminados' AS resultado,
       (SELECT COUNT(*) FROM Estudiantes) AS estudiantes_que_quedan;
