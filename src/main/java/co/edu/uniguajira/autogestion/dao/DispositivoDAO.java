package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class DispositivoDAO {

    /**
     * Obtiene los dispositivos de un estudiante.
     */
    public List<Dispositivo> buscarPorEstudiante(int idEstudiante) throws SQLException {
        List<Dispositivo> lista = new ArrayList<>();
        String sql = "SELECT d.id_dispositivo, d.id_estudiante, d.id_marca, d.id_color, d.alias, d.numero_serie, " +
                     "       d.reportado_hurto, d.fecha_reporte_hurto, d.motivo_reporte, " +
                     "       m.nombre AS marca_nombre, c.nombre AS color_nombre " +
                     "  FROM Dispositivos_Estudiante d " +
                     "  JOIN Marcas m ON d.id_marca = m.id_marca " +
                     "  JOIN Colores c ON d.id_color = c.id_color " +
                     " WHERE d.id_estudiante = ? AND d.activo = TRUE";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(mapearDispositivo(rs));
                }
            }
        }
        return lista;
    }

    /**
     * Busca un dispositivo por su ID primario.
     */
    public Dispositivo buscarPorId(int idDispositivo) throws SQLException {
        String sql = "SELECT d.id_dispositivo, d.id_estudiante, d.id_marca, d.id_color, d.alias, d.numero_serie, " +
                     "       d.reportado_hurto, d.fecha_reporte_hurto, d.motivo_reporte, " +
                     "       m.nombre AS marca_nombre, c.nombre AS color_nombre " +
                     "  FROM Dispositivos_Estudiante d " +
                     "  JOIN Marcas m ON d.id_marca = m.id_marca " +
                     "  JOIN Colores c ON d.id_color = c.id_color " +
                     " WHERE d.id_dispositivo = ? AND d.activo = TRUE";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapearDispositivo(rs);
                }
            }
        }
        return null;
    }

    /**
     * Verifica si un dispositivo pertenece a determinado estudiante.
     */
    public boolean perteneceAEstudiante(int idDispositivo, int idEstudiante) throws SQLException {
        String sql = "SELECT COUNT(*) FROM Dispositivos_Estudiante WHERE id_dispositivo = ? AND id_estudiante = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            ps.setInt(2, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    /**
     * Registra un nuevo dispositivo.
     */
    public int registrar(int idEstudiante, int idMarca, int idColor, String alias, String numeroSerie) throws SQLException {
        String sql = "INSERT INTO Dispositivos_Estudiante (id_estudiante, id_marca, id_color, alias, numero_serie) " +
                     "VALUES (?, ?, ?, ?, ?)";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, idEstudiante);
            ps.setInt(2, idMarca);
            ps.setInt(3, idColor);
            
            if (alias != null && !alias.isBlank()) {
                ps.setString(4, alias.trim());
            } else {
                ps.setNull(4, java.sql.Types.VARCHAR);
            }

            if (numeroSerie != null && !numeroSerie.isBlank()) {
                ps.setString(5, numeroSerie.trim());
            } else {
                ps.setNull(5, java.sql.Types.VARCHAR);
            }

            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                return rs.next() ? rs.getInt(1) : -1;
            }
        }
    }

    /**
     * Registra una alerta de seguridad (por ejemplo: HURTO o DISCREPANCIA_SALIDA)
     * y, si es HURTO, marca directamente el equipo como reportado_hurto = TRUE.
     */
    public boolean registrarAlertaSeguridad(int idDispositivo, String tipoAlerta, String descripcion) throws SQLException {
        String sqlAlerta = "INSERT INTO Alertas_Seguridad (id_dispositivo, tipo_alerta, descripcion) VALUES (?, ?, ?)";
        String sqlHurto = "UPDATE Dispositivos_Estudiante SET reportado_hurto = TRUE, fecha_reporte_hurto = NOW(), motivo_reporte = ? WHERE id_dispositivo = ?";
        
        try (Connection cn = ConexionBD.obtenerConexion()) {
            cn.setAutoCommit(false);
            try (PreparedStatement ps = cn.prepareStatement(sqlAlerta)) {
                ps.setInt(1, idDispositivo);
                ps.setString(2, tipoAlerta);
                ps.setString(3, descripcion);
                ps.executeUpdate();
            }
            if ("HURTO".equalsIgnoreCase(tipoAlerta)) {
                try (PreparedStatement ps2 = cn.prepareStatement(sqlHurto)) {
                    ps2.setString(1, descripcion);
                    ps2.setInt(2, idDispositivo);
                    ps2.executeUpdate();
                }
            }
            cn.commit();
            return true;
        } catch (SQLException e) {
            throw e;
        }
    }

    /**
     * Cambia marca, color y apodo de un equipo. El historial no se toca:
     * los registros pasados siguen apuntando al mismo id_dispositivo.
     */
    public boolean actualizar(int idDispositivo, int idMarca, int idColor, String alias) throws SQLException {
        String sql = "UPDATE Dispositivos_Estudiante " +
                     "   SET id_marca = ?, id_color = ?, alias = ? " +
                     " WHERE id_dispositivo = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idMarca);
            ps.setInt(2, idColor);
            if (alias != null && !alias.isBlank()) {
                ps.setString(3, alias.trim());
            } else {
                ps.setNull(3, java.sql.Types.VARCHAR);
            }
            ps.setInt(4, idDispositivo);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * "Elimina" un equipo para el estudiante: se marca como inactivo para
     * que deje de aparecer, pero se conserva para no romper el historial
     * de entradas y salidas ni las alertas de seguridad.
     */
    public boolean desactivar(int idDispositivo) throws SQLException {
        String sql = "UPDATE Dispositivos_Estudiante SET activo = FALSE WHERE id_dispositivo = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Cancela o levanta el reporte de hurto de un equipo (equipo recuperado o reporte erróneo).
     */
    public boolean levantarReporteHurto(int idDispositivo) throws SQLException {
        String sql = "UPDATE Dispositivos_Estudiante SET reportado_hurto = FALSE, fecha_reporte_hurto = NULL, motivo_reporte = NULL WHERE id_dispositivo = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idDispositivo);
            return ps.executeUpdate() > 0;
        }
    }

    private Dispositivo mapearDispositivo(ResultSet rs) throws SQLException {
        Dispositivo d = new Dispositivo();
        d.setIdDispositivo(rs.getInt("id_dispositivo"));
        d.setIdEstudiante(rs.getInt("id_estudiante"));
        d.setIdMarca(rs.getInt("id_marca"));
        d.setIdColor(rs.getInt("id_color"));
        d.setAlias(rs.getString("alias"));
        d.setNumeroSerie(rs.getString("numero_serie"));
        d.setReportadoHurto(rs.getBoolean("reportado_hurto"));
        d.setFechaReporteHurto(rs.getTimestamp("fecha_reporte_hurto"));
        d.setMotivoReporte(rs.getString("motivo_reporte"));
        d.setMarca(rs.getString("marca_nombre"));
        d.setColor(rs.getString("color_nombre"));
        return d;
    }
}
