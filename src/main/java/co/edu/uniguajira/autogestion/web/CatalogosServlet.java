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
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.StringJoiner;

/**
 * GET /api/catalogos
 * Entrega Marcas y Colores para llenar los selectores del formulario de
 * equipo nuevo. app.js cachea la respuesta en localStorage.
 */
@WebServlet("/api/catalogos")
public class CatalogosServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        try (Connection cn = ConexionBD.obtenerConexion();
             Statement st = cn.createStatement()) {

            StringJoiner marcas = new StringJoiner(",", "[", "]");
            try (ResultSet rs = st.executeQuery("SELECT id_marca, nombre FROM Marcas ORDER BY nombre")) {
                while (rs.next()) {
                    marcas.add("{" + JsonUtil.campo("id", rs.getInt(1)) + ","
                            + JsonUtil.campo("nombre", rs.getString(2)) + "}");
                }
            }

            StringJoiner colores = new StringJoiner(",", "[", "]");
            try (ResultSet rs = st.executeQuery(
                    "SELECT id_color, nombre, codigo_hex FROM Colores ORDER BY nombre")) {
                while (rs.next()) {
                    colores.add("{" + JsonUtil.campo("id", rs.getInt(1)) + ","
                            + JsonUtil.campo("nombre", rs.getString(2)) + ","
                            + JsonUtil.campo("hex", rs.getString(3)) + "}");
                }
            }

            salida.print("{" + JsonUtil.campo("ok", true) + ","
                    + "\"marcas\":" + marcas + ","
                    + "\"colores\":" + colores + "}");

        } catch (Exception e) {
            getServletContext().log("Error leyendo catálogos", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudieron cargar marcas y colores."));
        }
    }
}
