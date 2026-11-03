package co.edu.uniguajira.autogestion.dao;

import co.edu.uniguajira.autogestion.util.ConexionBD;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/**
 * Bitácora de intentos de inicio de sesión al panel de administración
 * (punto 9 de las mejoras). Se guarda TODO intento — exitoso o no —
 * porque un patrón de solo-fallidos consecutivos es la señal de un
 * posible ataque de fuerza bruta, y verlo requiere tener también los
 * intentos que sí funcionaron como punto de referencia.
 */
public class IntentoLoginDAO {

    public void registrar(String usuarioIntentado, String direccionIp, boolean exitoso)
            throws SQLException {
        String sql = "INSERT INTO Intentos_Login_Admin (usuario_intentado, direccion_ip, exitoso) " +
                     "VALUES (?,?,?)";
        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql)) {
            ps.setString(1, usuarioIntentado);
            ps.setString(2, direccionIp);
            ps.setBoolean(3, exitoso);
            ps.executeUpdate();
        }
    }
}
