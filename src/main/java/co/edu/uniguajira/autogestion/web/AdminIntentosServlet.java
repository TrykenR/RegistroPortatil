package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.util.ConexionBD;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.StringJoiner;

/**
 * GET /api/admin/intentos
 * Devuelve los últimos 50 intentos de login al panel (punto 9 de las
 * mejoras) — el frontend los pinta para que el administrador note un
 * patrón de intentos fallidos consecutivos. Protegido por
 * FiltroSesionAdmin igual que el resto de /api/admin/*.
 */
@WebServlet("/api/admin/intentos")
public class AdminIntentosServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String sql = "SELECT usuario_intentado, direccion_ip, exitoso, fecha_hora " +
                     "  FROM Intentos_Login_Admin " +
                     " ORDER BY fecha_hora DESC LIMIT 50";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            StringJoiner filas = new StringJoiner(",", "[", "]");
            while (rs.next()) {
                filas.add("{"
                    + JsonUtil.campo("usuario", rs.getString("usuario_intentado")) + ","
                    + JsonUtil.campo("ip", rs.getString("direccion_ip")) + ","
                    + JsonUtil.campo("exitoso", rs.getBoolean("exitoso")) + ","
                    + JsonUtil.campo("fecha", String.valueOf(rs.getTimestamp("fecha_hora")))
                    + "}");
            }

            salida.print("{" + JsonUtil.campo("ok", true) + ",\"intentos\":" + filas + "}");

        } catch (SQLException e) {
            getServletContext().log("Error consultando intentos de login", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudieron consultar los intentos."));
        }
    }
}
