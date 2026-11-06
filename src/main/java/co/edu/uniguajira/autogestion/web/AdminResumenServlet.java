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
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.StringJoiner;

/**
 * GET /api/admin/resumen?fecha=yyyy-MM-dd (por defecto, hoy)
 *
 * Totales del día para las tarjetas del panel, independientes de los
 * filtros y de la página que se esté viendo en el historial:
 *   entradas, salidas, offline, adentro (equipos cuyo último movimiento
 *   del día es ENTRADA) y porHora: 24 filas { hora, entradas, salidas }.
 *
 * Protegido por FiltroSesionAdmin (/api/admin/*).
 */
@WebServlet("/api/admin/resumen")
public class AdminResumenServlet extends HttpServlet {

    private static final int ID_ENTRADA = 1;

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta) throws IOException {
        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        LocalDate fecha = LocalDate.now();
        String fechaParam = peticion.getParameter("fecha");
        if (fechaParam != null && !fechaParam.isBlank()) {
            try {
                fecha = LocalDate.parse(fechaParam.trim());
            } catch (DateTimeParseException e) {
                respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                salida.print(JsonUtil.error("La fecha debe tener el formato yyyy-MM-dd."));
                return;
            }
        }

        long[] entradasPorHora = new long[24];
        long[] salidasPorHora = new long[24];
        long entradas = 0;
        long salidas = 0;
        long offline = 0;
        long adentro = 0;

        String sqlHoras =
            "SELECT HOUR(fecha_hora_evento) AS hora, movimiento, origen, COUNT(*) AS total " +
            "  FROM Vista_Historial_Accesos " +
            " WHERE DATE(fecha_hora_evento) = ? " +
            " GROUP BY HOUR(fecha_hora_evento), movimiento, origen";

        String sqlAdentro =
            "SELECT COUNT(*) FROM ( " +
            "  SELECT h.id_dispositivo, " +
            "         SUBSTRING_INDEX(GROUP_CONCAT(h.id_tipo_movimiento " +
            "             ORDER BY h.fecha_hora_evento DESC, h.id_registro DESC), ',', 1) AS ultimo " +
            "    FROM Historial_Accesos h " +
            "   WHERE DATE(h.fecha_hora_evento) = ? " +
            "   GROUP BY h.id_dispositivo " +
            ") t WHERE t.ultimo = ?";

        try (Connection cn = ConexionBD.obtenerConexion()) {
            try (PreparedStatement ps = cn.prepareStatement(sqlHoras)) {
                ps.setString(1, fecha.toString());
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        int hora = rs.getInt("hora");
                        long total = rs.getLong("total");
                        String movimiento = rs.getString("movimiento");
                        if ("ENTRADA".equalsIgnoreCase(movimiento)) {
                            entradas += total;
                            if (hora >= 0 && hora < 24) entradasPorHora[hora] += total;
                        } else if ("SALIDA".equalsIgnoreCase(movimiento)) {
                            salidas += total;
                            if (hora >= 0 && hora < 24) salidasPorHora[hora] += total;
                        }
                        if ("OFFLINE_SINCRONIZADO".equalsIgnoreCase(rs.getString("origen"))) {
                            offline += total;
                        }
                    }
                }
            }

            try (PreparedStatement ps = cn.prepareStatement(sqlAdentro)) {
                ps.setString(1, fecha.toString());
                ps.setString(2, String.valueOf(ID_ENTRADA));
                try (ResultSet rs = ps.executeQuery()) {
                    adentro = rs.next() ? rs.getLong(1) : 0;
                }
            }

            StringJoiner horas = new StringJoiner(",", "[", "]");
            for (int h = 0; h < 24; h++) {
                horas.add("{" + JsonUtil.campo("hora", h) + ","
                        + JsonUtil.campo("entradas", entradasPorHora[h]) + ","
                        + JsonUtil.campo("salidas", salidasPorHora[h]) + "}");
            }

            salida.print("{"
                    + JsonUtil.campo("ok", true) + ","
                    + JsonUtil.campo("fecha", fecha.toString()) + ","
                    + JsonUtil.campo("entradas", entradas) + ","
                    + JsonUtil.campo("salidas", salidas) + ","
                    + JsonUtil.campo("offline", offline) + ","
                    + JsonUtil.campo("adentro", adentro) + ","
                    + "\"porHora\":" + horas + "}");

        } catch (SQLException e) {
            getServletContext().log("Error consultando el resumen del día", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo consultar el resumen del día."));
        }
    }
}
