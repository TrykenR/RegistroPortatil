package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

@WebServlet("/api/dispositivo/reportar-hurto")
public class ReportarHurtoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String idDispositivoParam = request.getParameter("idDispositivo") != null ? 
                request.getParameter("idDispositivo") : request.getParameter("id_dispositivo");
        String accion = request.getParameter("accion");
        String motivo = request.getParameter("motivo");

        if (idDispositivoParam == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"exito\":false,\"error\":\"idDispositivo requerido\"}");
            return;
        }

        try {
            int idDispositivo = Integer.parseInt(idDispositivoParam.trim());

            if ("cancelar".equalsIgnoreCase(accion) || "levantar".equalsIgnoreCase(accion)) {
                boolean cancelado = dispositivoDAO.levantarReporteHurto(idDispositivo);
                if (cancelado) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    out.print("{\"exito\":true,\"mensaje\":\"Reporte de hurto cancelado\"}");
                } else {
                    response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    out.print("{\"exito\":false,\"error\":\"No se pudo cancelar el reporte\"}");
                }
                return;
            }

            boolean registrado = dispositivoDAO.registrarAlertaSeguridad(idDispositivo, "HURTO", 
                    motivo != null ? motivo.trim() : "Reporte de hurto activado por estudiante");

            if (registrado) {
                response.setStatus(HttpServletResponse.SC_OK);
                out.print("{\"exito\":true}");
            } else {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"exito\":false,\"error\":\"No se pudo registrar la alerta\"}");
            }
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"exito\":false,\"error\":\"idDispositivo debe ser numérico\"}");
        } catch (SQLException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.printf("{\"exito\":false,\"error\":\"Error SQL: %s\"}", e.getMessage().replace("\"", "'"));
        }
    }
}
