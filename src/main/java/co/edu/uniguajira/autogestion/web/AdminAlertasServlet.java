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
 * GET /api/admin/alertas
 * Devuelve las últimas 100 alertas e incidentes de seguridad (hurto, intentos de salida sin entrada).
 * Protegido por FiltroSesionAdmin.
 */
@WebServlet("/api/admin/alertas")
public class AdminAlertasServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String sql =
            "SELECT id_alerta, id_dispositivo, tipo_alerta, descripcion, fecha_hora, " +
            "       numero_documento, codigo_estudiantil, estudiante, numero_serie, marca, color " +
            "  FROM Vista_Alertas_Seguridad " +
            " ORDER BY fecha_hora DESC LIMIT 100";

        try (Connection cn = ConexionBD.obtenerConexion();
             PreparedStatement ps = cn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            StringJoiner filas = new StringJoiner(",", "[", "]");
            while (rs.next()) {
                filas.add("{"
                    + JsonUtil.campo("idAlerta", rs.getLong("id_alerta")) + ","
                    + JsonUtil.campo("tipoAlerta", rs.getString("tipo_alerta")) + ","
                    + JsonUtil.campo("descripcion", rs.getString("descripcion")) + ","
                    + JsonUtil.campo("fecha", String.valueOf(rs.getTimestamp("fecha_hora"))) + ","
                    + JsonUtil.campo("documento", rs.getString("numero_documento")) + ","
                    + JsonUtil.campo("codigo", rs.getString("codigo_estudiantil")) + ","
                    + JsonUtil.campo("estudiante", rs.getString("estudiante")) + ","
                    + JsonUtil.campo("serial", rs.getString("numero_serie") != null ? rs.getString("numero_serie") : "S/N") + ","
                    + JsonUtil.campo("marca", rs.getString("marca")) + ","
                    + JsonUtil.campo("color", rs.getString("color"))
                    + "}");
            }

            salida.print("{" + JsonUtil.campo("ok", true) + ",\"alertas\":" + filas + "}");

        } catch (SQLException e) {
            getServletContext().log("Error consultando alertas de seguridad", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudieron consultar las alertas de seguridad."));
        }
    }
}
