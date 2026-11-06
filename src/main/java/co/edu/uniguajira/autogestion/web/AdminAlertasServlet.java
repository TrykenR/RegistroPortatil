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
                    + JsonUtil.campo("idDispositivo", rs.getInt("id_dispositivo")) + ","
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

    /**
     * POST /api/admin/alertas
     * Parámetros: accion ("reportar_hurto" | "desactivar_equipo"), idDispositivo, motivo
     */
    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {
        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String accion = peticion.getParameter("accion");
        String idDispStr = peticion.getParameter("idDispositivo");
        String motivo = peticion.getParameter("motivo");

        if (idDispStr == null || !idDispStr.matches("\\d+")) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("idDispositivo inválido"));
            return;
        }

        int idDispositivo = Integer.parseInt(idDispStr);
        co.edu.uniguajira.autogestion.dao.DispositivoDAO dao = new co.edu.uniguajira.autogestion.dao.DispositivoDAO();

        try {
            if ("reportar_hurto".equalsIgnoreCase(accion)) {
                boolean exito = dao.registrarAlertaSeguridad(idDispositivo, "HURTO",
                        motivo != null && !motivo.isBlank() ? motivo.trim() : "Reporte de hurto generado por administración / portería");
                if (exito) {
                    salida.print("{\"ok\":true,\"mensaje\":\"Equipo reportado como hurtado exitosamente.\"}");
                } else {
                    respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    salida.print(JsonUtil.error("No se pudo registrar el reporte de hurto."));
                }
                return;
            }

            if ("desactivar_equipo".equalsIgnoreCase(accion)) {
                boolean exito = dao.desactivar(idDispositivo);
                if (exito) {
                    salida.print("{\"ok\":true,\"mensaje\":\"Equipo desactivado del sistema.\"}");
                } else {
                    respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    salida.print(JsonUtil.error("No se pudo desactivar el equipo."));
                }
                return;
            }

            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Acción inválida."));

        } catch (SQLException e) {
            getServletContext().log("Error en acción de alerta/seguridad", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("Error SQL al procesar: " + e.getMessage()));
        }
    }
}
