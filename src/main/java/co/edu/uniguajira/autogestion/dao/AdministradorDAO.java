package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Acceso a datos de Administradores (el panel de consulta del portero).
 * Solo expone lo mínimo: buscar el hash guardado para un usuario, para
 * que AdminLoginServlet lo compare con BCrypt. Nunca se lee ni se
 * expone la clave en texto plano — no existe, solo el hash.
 */
public class AdministradorDAO {

    /** @return el hash BCrypt guardado, o null si el usuario no existe o está inactivo. */
    public String buscarHashPorUsuario(String usuario) throws SQLException {
        String sql = "SELECT clave_hash FROM Administradores WHERE usuario = ? AND activo = TRUE";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setString(1, usuario);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("clave_hash") : null;
            }
        }
    }
}
