package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.modelo.HistorialAcceso;
import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

/**
 * Inserta y consulta Historial_Accesos. Solo crece: nunca se hace
 * UPDATE ni DELETE sobre un evento ya ocurrido.
 *
 * Diferencia clave frente a una versión sin soporte offline: aquí un
 * registro puede llegar minutos u horas después de haber ocurrido
 * (porque el celular lo guardó en IndexedDB sin señal). Por eso el
 * "cuándo pasó" y el "cuándo se guardó en el servidor" son dos columnas
 * separadas — ver el comentario en HistorialAcceso.
 */
public class HistorialAccesoDAO {

    public static final int ENTRADA = 1;
    public static final int SALIDA  = 2;

    /**
     * Minutos mínimos entre movimientos. Se redujo para pruebas/operación ágil
     * para permitir alternar entre ENTRADA y SALIDA con fluidez sin bloquear
     * por 45 minutos.
     */
    //private static final int MINUTOS_MINIMOS_ENTRE_MOVIMIENTOS = 0;

    /**
     * Resultado de mirar el último movimiento de un dispositivo: qué
     * movimiento seguiría en la secuencia normal, y si ya pasó tiempo
     * suficiente para aceptarlo como real.
     */
    public static class ResultadoSiguienteMovimiento {
        public final int movimiento;
        public final boolean permitido;
        public final Long minutosTranscurridos;   // null si es el primer registro del día
        public final boolean requierePin;         // true si es salida antes del tiempo prudente (45 min)

        public ResultadoSiguienteMovimiento(int movimiento, boolean permitido, Long minutosTranscurridos) {
            this(movimiento, permitido, minutosTranscurridos, false);
        }

        public ResultadoSiguienteMovimiento(int movimiento, boolean permitido, Long minutosTranscurridos, boolean requierePin) {
            this.movimiento = movimiento;
            this.permitido = permitido;
            this.minutosTranscurridos = minutosTranscurridos;
            this.requierePin = requierePin;
        }
    }

    /**
     * Guarda el evento. fecha_hora_sincronizado SIEMPRE la pone el motor
     * con NOW(): sin importar si el registro es online u offline, ese
     * campo es la hora real de inserción en el servidor y nunca viaja
     * desde el cliente.
     */
    public long registrar(HistorialAcceso registro) throws SQLException {
        String sql =
            "INSERT INTO Historial_Accesos " +
            "(id_dispositivo, id_tipo_movimiento, id_origen, fecha_hora_evento, fecha_hora_sincronizado) " +
            "VALUES (?,?,?,?,NOW())";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql,
                     PreparedStatement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, registro.getIdDispositivo());
            ps.setInt(2, registro.getIdTipoMovimiento());
            ps.setInt(3, registro.getIdOrigen());
            ps.setTimestamp(4, Timestamp.valueOf(registro.getFechaHoraEvento()));
            ps.executeUpdate();

            try (ResultSet claves = ps.getGeneratedKeys()) {
                return claves.next() ? claves.getLong(1) : -1L;
            }
        }
    }

    /**
     * Alterna ENTRADA/SALIDA mirando el último registro del día para ese
     * dispositivo, ordenado por cuándo OCURRIÓ (no por cuándo se guardó),
     * para que un registro offline que llega tarde se acomode en el
     * lugar correcto de la secuencia y no desordene el conteo del día.
     *
     * Además calcula si ya pasó el mínimo de MINUTOS_MINIMOS_ENTRE_MOVIMIENTOS
     * desde ese último registro. Si no pasó, 'permitido' viene en false y
     * el servlet debe rechazar el cambio en vez de insertar uno nuevo.
     */
    /**
     * Alterna ENTRADA/SALIDA mirando el último registro del día para ese
     * dispositivo, ordenado por cuándo OCURRIÓ (no por cuándo se guardó),
     * para que un registro offline que llega tarde se acomode en el
     * lugar correcto de la secuencia y no desordene el conteo del día.
     *
     * fechaEventoNuevo es la hora del toque que se está procesando ahora
     * (puede ser NOW() si vino online, o una hora pasada si vino de la
     * cola offline). Los 45 minutos se comparan contra ESA hora, no
     * contra el reloj actual del servidor — si se comparara contra NOW(),
     * un registro offline que tarda una hora en sincronizar parecería
     * "muy separado" del anterior aunque en la realidad hayan pasado
     * solo 2 minutos entre el toque de entrada y el de salida.
     */
    public ResultadoSiguienteMovimiento calcularSiguienteMovimiento(
            int idDispositivo, java.time.LocalDateTime fechaEventoNuevo) throws SQLException {

        // Se usa DATE(?) con la fecha del evento para evitar desfases de zona horaria entre servidor y cliente
        String sql = "SELECT id_tipo_movimiento, fecha_hora_evento " +
                     "  FROM Historial_Accesos " +
                     " WHERE id_dispositivo = ? AND DATE(fecha_hora_evento) = DATE(?) " +
                     " ORDER BY fecha_hora_evento DESC, id_registro DESC LIMIT 1";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            java.time.LocalDateTime ahoraBogota = java.time.LocalDateTime.now(java.time.ZoneId.of("America/Bogota"));
            ps.setTimestamp(2, java.sql.Timestamp.valueOf(fechaEventoNuevo != null ? fechaEventoNuevo : ahoraBogota));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int ultimoMovimiento = rs.getInt("id_tipo_movimiento");
                    java.time.LocalDateTime ultimaFecha = rs.getTimestamp("fecha_hora_evento").toLocalDateTime();
                    long segundos = java.time.Duration.between(ultimaFecha, fechaEventoNuevo != null ? fechaEventoNuevo : ahoraBogota).getSeconds();
                    
                    // Si el toque ocurre en menos de 5 segundos se marca no permitido (antirrebote)
                    if (segundos < 5 && segundos >= 0) {
                        return new ResultadoSiguienteMovimiento(ultimoMovimiento, false, 0L);
                    }

                    int siguiente = (ultimoMovimiento == ENTRADA) ? SALIDA : ENTRADA;
                    long minutos = segundos / 60;
                    // Si el siguiente movimiento es SALIDA y han pasado menos de 45 minutos desde la ENTRADA,
                    // se requiere confirmación con PIN del estudiante por seguridad
                    boolean salidaTemprana = (siguiente == SALIDA && minutos < 45);

                    return new ResultadoSiguienteMovimiento(siguiente, true, minutos, salidaTemprana);
                }
            }
        }
        // Primer registro del día para este dispositivo: siempre es ENTRADA y siempre se permite.
        return new ResultadoSiguienteMovimiento(ENTRADA, true, null);
    }

    /**
     * Obtiene el último tipo de movimiento registrado hoy para el dispositivo (0 si no hay registros hoy).
     * Usa DATE(NOW()) con la zona horaria de la sesión (-05:00) para sincronía total con Colombia.
     */
    public int obtenerUltimoMovimientoHoy(int idDispositivo) throws SQLException {
        String sql = "SELECT id_tipo_movimiento FROM Historial_Accesos " +
                     " WHERE id_dispositivo = ? AND DATE(fecha_hora_evento) = DATE(NOW()) " +
                     " ORDER BY fecha_hora_evento DESC, id_registro DESC LIMIT 1";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt("id_tipo_movimiento") : 0;
            }
        }
    }

    /**
     * Antirrebote: evita duplicar el registro si el estudiante toca dos
     * veces, o si el Service Worker reintenta un envío que en realidad
     * ya había llegado (reintentos de background sync no son exactamente
     * una vez — esto cubre ese caso también).
     */
    public boolean existeRegistroReciente(int idDispositivo) throws SQLException {
        String sql = "SELECT 1 FROM Historial_Accesos " +
                     " WHERE id_dispositivo = ? " +
                     "   AND fecha_hora_sincronizado > (NOW() - INTERVAL 5 SECOND) LIMIT 1";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}
