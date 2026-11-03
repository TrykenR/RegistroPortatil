package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de Dispositivos_Estudiante.
 * Aquí vive la lógica de "¿es Caso A (nuevo) o Caso B (frecuente)?": el
 * controlador solo pregunta si la lista viene vacía o no.
 */
public class DispositivoDAO {

    /** Los equipos vinculados a un estudiante, leídos de la vista ya resuelta. */
    public List<Dispositivo> listarPorEstudiante(int idEstudiante) throws SQLException {
        String sql =
            "SELECT id_dispositivo, marca, color, codigo_hex, alias, numero_serie, " +
            "       reportado_hurto, fecha_reporte_hurto, motivo_reporte " +
            "  FROM Vista_Dispositivos_Estudiante " +
            " WHERE id_estudiante = ? " +
            " ORDER BY marca, color";

        List<Dispositivo> lista = new ArrayList<>();
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Dispositivo d = new Dispositivo();
                    d.setIdDispositivo(rs.getInt("id_dispositivo"));
                    d.setMarca(rs.getString("marca"));
                    d.setColor(rs.getString("color"));
                    d.setCodigoHex(rs.getString("codigo_hex"));
                    d.setAlias(rs.getString("alias"));
                    d.setNumeroSerie(rs.getString("numero_serie"));
                    d.setReportadoHurto(rs.getBoolean("reportado_hurto"));
                    d.setFechaReporteHurto(rs.getString("fecha_reporte_hurto"));
                    d.setMotivoReporte(rs.getString("motivo_reporte"));
                    lista.add(d);
                }
            }
        }
        return lista;
    }

    /** Caso A: registra el equipo nuevo, ya vinculado a su dueño (con o sin serial). */
    public int registrar(int idEstudiante, int idMarca, int idColor,
                         String alias) throws SQLException {
        return registrar(idEstudiante, idMarca, idColor, alias, null);
    }

    public int registrar(int idEstudiante, int idMarca, int idColor,
                         String alias, String numeroSerie) throws SQLException {
        String sql = "INSERT INTO Dispositivos_Estudiante " +
                     "(id_estudiante, id_marca, id_color, alias, numero_serie) VALUES (?,?,?,?,?)";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql,
                     PreparedStatement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, idEstudiante);
            ps.setInt(2, idMarca);
            ps.setInt(3, idColor);
            ps.setString(4, alias);
            ps.setString(5, (numeroSerie != null && !numeroSerie.isBlank()) ? numeroSerie.trim() : null);
            ps.executeUpdate();
            try (ResultSet claves = ps.getGeneratedKeys()) {
                return claves.next() ? claves.getInt(1) : -1;
            }
        }
    }

    /**
     * Verifica que el dispositivo sea del estudiante que dice ser.
     * Sin esto, cualquiera podría mandar por POST el id de un equipo ajeno
     * y aparecer con el check verde de otra persona.
     */
    public boolean perteneceAEstudiante(int idEstudiante, int idDispositivo) throws SQLException {
        String sql = "SELECT 1 FROM Dispositivos_Estudiante " +
                     " WHERE id_estudiante = ? AND id_dispositivo = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            ps.setInt(2, idDispositivo);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    /** Lee un dispositivo puntual para pintar el check gigante o evaluar alertas. */
    public Dispositivo buscarPorId(int idDispositivo) throws SQLException {
        String sql =
            "SELECT de.id_dispositivo, m.nombre AS marca, c.nombre AS color, c.codigo_hex, " +
            "       de.alias, de.numero_serie, de.reportado_hurto, de.fecha_reporte_hurto, de.motivo_reporte " +
            "  FROM Dispositivos_Estudiante de " +
            "  JOIN Marcas m  ON m.id_marca  = de.id_marca " +
            "  JOIN Colores c ON c.id_color = de.id_color " +
            " WHERE de.id_dispositivo = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Dispositivo d = new Dispositivo();
                    d.setIdDispositivo(rs.getInt("id_dispositivo"));
                    d.setMarca(rs.getString("marca"));
                    d.setColor(rs.getString("color"));
                    d.setCodigoHex(rs.getString("codigo_hex"));
                    d.setAlias(rs.getString("alias"));
                    d.setNumeroSerie(rs.getString("numero_serie"));
                    d.setReportadoHurto(rs.getBoolean("reportado_hurto"));
                    d.setFechaReporteHurto(rs.getString("fecha_reporte_hurto"));
                    d.setMotivoReporte(rs.getString("motivo_reporte"));
                    return d;
                }
            }
        }
        return null;
    }

    /**
     * Cambia el estado de hurto/extravío de un dispositivo.
     * Solo el propio estudiante dueño puede reportarlo o desmarcarlo.
     */
    public boolean actualizarReporteHurto(int idDispositivo, int idEstudiante,
                                          boolean reportado, String motivo) throws SQLException {
        String sql =
            "UPDATE Dispositivos_Estudiante " +
            "   SET reportado_hurto = ?, " +
            "       fecha_reporte_hurto = (CASE WHEN ? = TRUE THEN NOW() ELSE NULL END), " +
            "       motivo_reporte = ? " +
            " WHERE id_dispositivo = ? AND id_estudiante = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setBoolean(1, reportado);
            ps.setBoolean(2, reportado);
            ps.setString(3, (reportado && motivo != null) ? motivo.trim() : null);
            ps.setInt(4, idDispositivo);
            ps.setInt(5, idEstudiante);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Registra un incidente de seguridad para auditoría de vigilancia.
     */
    public void registrarAlertaSeguridad(int idDispositivo, String tipoAlerta, String descripcion) {
        String sql = "INSERT INTO Alertas_Seguridad (id_dispositivo, tipo_alerta, descripcion, fecha_hora) " +
                     "VALUES (?, ?, ?, NOW())";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            ps.setString(2, tipoAlerta);
            ps.setString(3, descripcion);
            ps.executeUpdate();
        } catch (SQLException e) {
            // No frenar la respuesta al cliente si falla el log de auditoría
            e.printStackTrace();
        }
    }
}
