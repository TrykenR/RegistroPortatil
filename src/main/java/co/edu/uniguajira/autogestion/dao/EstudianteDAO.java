package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.modelo.Estudiante;
import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Acceso a datos de Estudiantes. Todas las consultas usan PreparedStatement
 * con parámetros: el documento que llega desde el celular es entrada no
 * confiable y nunca se concatena directo en el SQL.
 */
public class EstudianteDAO {

    /**
     * Busca por número de documento O código estudiantil — el estudiante
     * puede escribir cualquiera de los dos.
     * @return el estudiante, o null si es la primera vez que se presenta.
     */
    public Estudiante buscarPorIdentificador(String identificador) throws SQLException {
        String sql =
            "SELECT id_estudiante, numero_documento, codigo_estudiantil, " +
            "       CONCAT(nombres,' ',apellidos) AS nombre_completo, " +
            "       acepto_tratamiento_datos, " +
            "       (pin_hash IS NOT NULL AND pin_hash <> '') AS tiene_pin " +
            "  FROM Estudiantes " +
            " WHERE activo = TRUE " +
            "   AND (numero_documento = ? OR codigo_estudiantil = ?) " +
            " LIMIT 1";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setString(1, identificador);
            ps.setString(2, identificador);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Estudiante(
                            rs.getInt("id_estudiante"),
                            rs.getString("numero_documento"),
                            rs.getString("codigo_estudiantil"),
                            rs.getString("nombre_completo"),
                            rs.getBoolean("acepto_tratamiento_datos"),
                            rs.getBoolean("tiene_pin"));
                }
            }
        }
        return null;
    }

    /**
     * Alta de autogestión total: si el identificador no existe en la BD,
     * el propio estudiante se registra con su documento y nombre, sin que
     * intervenga un portero. Ver ControladorAutogestionServlet.
     *
     * aceptoTratamiento SIEMPRE debe venir en true al llegar aquí — la
     * validación de que el estudiante marcó la casilla vive en
     * RegistroEstudianteServlet, antes de llamar este método. Aun así,
     * el parámetro se guarda tal cual llega, nunca se asume.
     */
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
                     "VALUES (?,?,?,?,?,?,?)";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql,
                     PreparedStatement.RETURN_GENERATED_KEYS)) {
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
            if (aceptoTratamiento) {
                ps.setTimestamp(6, new java.sql.Timestamp(System.currentTimeMillis()));
            } else {
                ps.setNull(6, java.sql.Types.TIMESTAMP);
            }
            if (pin != null && pin.matches("\\d{4}")) {
                ps.setString(7, hashearPin(pin));
            } else {
                ps.setNull(7, java.sql.Types.VARCHAR);
            }
            ps.executeUpdate();
            try (ResultSet claves = ps.getGeneratedKeys()) {
                return claves.next() ? claves.getInt(1) : -1;
            }
        }
    }

    /**
     * Para un estudiante que YA existía antes de que este consentimiento
     * existiera en el sistema (ver migración 04): registra que ahora sí
     * lo dio, sin tocar ningún otro dato suyo.
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
     * Configura o actualiza el PIN de 4 dígitos del estudiante.
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
     * Resultado de la verificación de PIN
     */
    public enum ResultadoPin {
        CORRECTO,
        INCORRECTO,
        BLOQUEADO,
        NO_TIENE_PIN,
        ESTUDIANTE_NO_EXISTE
    }

    /**
     * Verifica si el PIN es correcto. Aplica bloqueo por 15 minutos tras 4 fallos consecutivos.
     */
    public ResultadoPin verificarPin(int idEstudiante, String pin) throws SQLException {
        String sql = "SELECT pin_hash, intentos_pin_fallidos, bloqueado_hasta " +
                     "  FROM Estudiantes " +
                     " WHERE id_estudiante = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setInt(1, idEstudiante);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return ResultadoPin.ESTUDIANTE_NO_EXISTE;

                String hashBd = rs.getString("pin_hash");
                int intentos = rs.getInt("intentos_pin_fallidos");
                java.sql.Timestamp bloqueadoHasta = rs.getTimestamp("bloqueado_hasta");

                // Verificar si está bloqueado temporalmente
                if (bloqueadoHasta != null && bloqueadoHasta.after(new java.sql.Timestamp(System.currentTimeMillis()))) {
                    return ResultadoPin.BLOQUEADO;
                }

                if (hashBd == null || hashBd.isBlank()) {
                    return ResultadoPin.NO_TIENE_PIN;
                }

                String hashIngresado = hashearPin(pin);
                if (hashBd.equals(hashIngresado)) {
                    // Resetear intentos si acertó
                    resetearIntentosPin(idEstudiante);
                    return ResultadoPin.CORRECTO;
                } else {
                    // Incrementar intentos fallidos
                    registrarFalloPin(idEstudiante, intentos + 1);
                    return (intentos + 1 >= 4) ? ResultadoPin.BLOQUEADO : ResultadoPin.INCORRECTO;
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
        if (nuevosIntentos >= 4) {
            // Bloqueo de 15 minutos
            sql = "UPDATE Estudiantes SET intentos_pin_fallidos = ?, bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_estudiante = ?";
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
     * Hash seguro con SHA-256 + Salt específico para autogestión de portátiles
     */
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
