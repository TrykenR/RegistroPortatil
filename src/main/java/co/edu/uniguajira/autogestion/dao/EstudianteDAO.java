package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.modelo.Estudiante;
import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Acceso a datos de Estudiantes. Compatible con MySQL 8 en Linux/Railway
 * y con todos los servlets del sistema (Autogestión, Consentimiento y PIN).
 */
public class EstudianteDAO {

    /** Intentos fallidos de PIN permitidos antes del bloqueo temporal. */
    public static final int MAX_INTENTOS_PIN = 4;

    /** Minutos que dura el bloqueo temporal del PIN. */
    public static final int MINUTOS_BLOQUEO_PIN = 15;

    /**
     * Busca por número de documento O código estudiantil.
     */
    public Estudiante buscarPorIdentificador(String identificador) throws SQLException {
        String sql =
            "SELECT id_estudiante, numero_documento, codigo_estudiantil, " +
            "       CONCAT(COALESCE(nombres,''), ' ', COALESCE(apellidos,'')) AS nombre_completo, " +
            "       acepto_tratamiento_datos, pin_hash " +
            "  FROM Estudiantes " +
            " WHERE (numero_documento = ? OR codigo_estudiantil = ?) " +
            " LIMIT 1";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            
            ps.setString(1, identificador);
            ps.setString(2, identificador);
            
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String pinHash = rs.getString("pin_hash");
                    boolean tienePin = (pinHash != null && !pinHash.isBlank());

                    return new Estudiante(
                            rs.getInt("id_estudiante"),
                            rs.getString("numero_documento"),
                            rs.getString("codigo_estudiantil"),
                            rs.getString("nombre_completo"),
                            rs.getBoolean("acepto_tratamiento_datos"),
                            tienePin
                    );
                }
            }
        }
        return null;
    }

    public int registrar(String numeroDocumento, String nombres,
                         String apellidos, boolean aceptoTratamiento) throws SQLException {
        return registrar(numeroDocumento, null, nombres, apellidos, aceptoTratamiento);
    }

    public int registrar(String numeroDocumento, String codigoEstudiantil, String nombres,
                         String apellidos, boolean aceptoTratamiento) throws SQLException {
        return registrar(numeroDocumento, codigoEstudiantil, nombres, apellidos, aceptoTratamiento, null);
    }

    public int registrar(String numeroDocumento, String codigoEstudiantil, String nombres,
                         String apellidos, boolean aceptoTratamiento, String pin) throws SQLException {
        String sql = "INSERT INTO Estudiantes " +
                     "(numero_documento, codigo_estudiantil, nombres, apellidos, acepto_tratamiento_datos, fecha_aceptacion_datos, pin_hash) " +
                     "VALUES (?,?,?,?,?,NOW(),?)";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
            
            if (numeroDocumento != null && !numeroDocumento.isBlank()) {
                ps.setString(1, numeroDocumento.trim());
            } else {
                ps.setNull(1, java.sql.Types.VARCHAR);
            }

            if (codigoEstudiantil != null && !codigoEstudiantil.isBlank()) {
                ps.setString(2, codigoEstudiantil.trim());
            } else {
                ps.setNull(2, java.sql.Types.VARCHAR);
            }

            ps.setString(3, nombres);
            ps.setString(4, apellidos);
            ps.setBoolean(5, aceptoTratamiento);
            
            if (pin != null && !pin.isBlank() && pin.matches("\\d{4}")) {
                ps.setString(6, hashearPin(pin.trim()));
            } else {
                ps.setNull(6, java.sql.Types.VARCHAR);
            }
            
            ps.executeUpdate();
            try (ResultSet claves = ps.getGeneratedKeys()) {
                return claves.next() ? claves.getInt(1) : -1;
            }
        }
    }

    /**
     * Requerido por ConsentimientoServlet.java
     */
    public void registrarConsentimiento(int idEstudiante) throws SQLException {
        String sql = "UPDATE Estudiantes " +
                     "   SET acepto_tratamiento_datos = TRUE, fecha_aceptacion_datos = NOW() " +
                     " WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            ps.executeUpdate();
        }
    }

    /**
     * Requerido por PinEstudianteServlet.java
     */
    public boolean configurarPin(int idEstudiante, String pin) throws SQLException {
        if (pin == null || !pin.matches("\\d{4}")) return false;
        String sql = "UPDATE Estudiantes " +
                     "   SET pin_hash = ?, intentos_pin_fallidos = 0, bloqueado_hasta = NULL " +
                     " WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setString(1, hashearPin(pin));
            ps.setInt(2, idEstudiante);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Requerido por PinEstudianteServlet.java
     */
    public enum ResultadoPin {
        CORRECTO,
        INCORRECTO,
        BLOQUEADO,
        NO_TIENE_PIN,
        ESTUDIANTE_NO_EXISTE
    }

    /**
     * Requerido por PinEstudianteServlet.java
     */
    public ResultadoPin verificarPin(int idEstudiante, String pin) throws SQLException {
        String sql = "SELECT pin_hash, intentos_pin_fallidos, bloqueado_hasta " +
                     "  FROM Estudiantes " +
                     " WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return ResultadoPin.ESTUDIANTE_NO_EXISTE;

                String hashBd = rs.getString("pin_hash");
                int intentos = rs.getInt("intentos_pin_fallidos");
                java.sql.Timestamp bloqueadoHasta = rs.getTimestamp("bloqueado_hasta");

                if (bloqueadoHasta != null && bloqueadoHasta.after(new java.sql.Timestamp(System.currentTimeMillis()))) {
                    return ResultadoPin.BLOQUEADO;
                }

                if (hashBd == null || hashBd.isBlank()) {
                    return ResultadoPin.NO_TIENE_PIN;
                }

                String hashIngresado = hashearPin(pin);
                if (hashBd.equals(hashIngresado)) {
                    resetearIntentosPin(idEstudiante);
                    return ResultadoPin.CORRECTO;
                } else {
                    registrarFalloPin(idEstudiante, intentos + 1);
                    return (intentos + 1 >= MAX_INTENTOS_PIN) ? ResultadoPin.BLOQUEADO : ResultadoPin.INCORRECTO;
                }
            }
        }
    }

    private void resetearIntentosPin(int idEstudiante) throws SQLException {
        String sql = "UPDATE Estudiantes SET intentos_pin_fallidos = 0, bloqueado_hasta = NULL WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            ps.executeUpdate();
        }
    }

    private void registrarFalloPin(int idEstudiante, int nuevosIntentos) throws SQLException {
        String sql;
        if (nuevosIntentos >= MAX_INTENTOS_PIN) {
            sql = "UPDATE Estudiantes SET intentos_pin_fallidos = ?, bloqueado_hasta = DATE_ADD(NOW(), INTERVAL "
                    + MINUTOS_BLOQUEO_PIN + " MINUTE) WHERE id_estudiante = ?";
        } else {
            sql = "UPDATE Estudiantes SET intentos_pin_fallidos = ? WHERE id_estudiante = ?";
        }
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, nuevosIntentos);
            ps.setInt(2, idEstudiante);
            ps.executeUpdate();
        }
    }

    /**
     * Cuántos intentos de PIN le quedan al estudiante antes del bloqueo.
     * Se usa para avisarle en pantalla ("te quedan 2 intentos").
     */
    public int intentosRestantesPin(int idEstudiante) throws SQLException {
        String sql = "SELECT intentos_pin_fallidos FROM Estudiantes WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                int fallidos = rs.next() ? rs.getInt(1) : 0;
                return Math.max(0, MAX_INTENTOS_PIN - fallidos);
            }
        }
    }

    /**
     * Minutos que faltan para que se levante el bloqueo del PIN
     * (0 si no está bloqueado). Se calcula con el reloj de MySQL, el mismo
     * que se usó para fijar bloqueado_hasta.
     */
    public int minutosBloqueoRestantes(int idEstudiante) throws SQLException {
        String sql = "SELECT CEIL(TIMESTAMPDIFF(SECOND, NOW(), bloqueado_hasta) / 60) " +
                     "  FROM Estudiantes " +
                     " WHERE id_estudiante = ? AND bloqueado_hasta > NOW()";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Math.max(1, rs.getInt(1)) : 0;
            }
        }
    }

    /** Indica si el estudiante ya configuró un PIN. */
    public boolean tienePin(int idEstudiante) throws SQLException {
        String sql = "SELECT pin_hash FROM Estudiantes WHERE id_estudiante = ?";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return false;
                String hash = rs.getString(1);
                return hash != null && !hash.isBlank();
            }
        }
    }

    public static String hashearPin(String pin) {
        try {
            String salt = "Uniguajira_PinSalt_2026_#";
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest((salt + pin).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error al calcular hash de PIN", e);
        }
    }
}
