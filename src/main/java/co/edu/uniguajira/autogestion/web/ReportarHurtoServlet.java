package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * POST /api/dispositivos/hurto
 * Parámetros: idEstudiante, idDispositivo, reportado ("true" | "false"), motivo (opcional)
 *
 * Permite al estudiante activar o desactivar el estado de hurto/extravío
 * sobre sus propios equipos vinculados.
 */
@WebServlet("/api/dispositivos/hurto")
public class ReportarHurtoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        try {
            int idEstudiante  = Integer.parseInt(peticion.getParameter("idEstudiante"));
            int idDispositivo = Integer.parseInt(peticion.getParameter("idDispositivo"));
            boolean reportado = Boolean.parseBoolean(peticion.getParameter("reportado"));
            String motivo     = peticion.getParameter("motivo");

            if (!dispositivoDAO.perteneceAEstudiante(idEstudiante, idDispositivo)) {
                respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
                salida.print(JsonUtil.error("No tienes permisos sobre este dispositivo."));
                return;
            }

            boolean actualizado = dispositivoDAO.actualizarReporteHurto(
                    idDispositivo, idEstudiante, reportado, motivo);

            if (actualizado) {
                if (reportado) {
                    dispositivoDAO.registrarAlertaSeguridad(
                            idDispositivo,
                            "HURTO",
                            "Equipo marcado como HURTADO/EXTRAVIADO por el estudiante. Motivo: "
                            + (motivo != null && !motivo.isBlank() ? motivo : "Sin motivo especificado")
                    );
                } else {
                    dispositivoDAO.registrarAlertaSeguridad(
                            idDispositivo,
                            "RECUPERADO",
                            "Equipo marcado como RECUPERADO por el estudiante."
                    );
                }

                salida.print("{"
                        + JsonUtil.campo("ok", true) + ","
                        + JsonUtil.campo("idDispositivo", idDispositivo) + ","
                        + JsonUtil.campo("reportado", reportado) + ","
                        + JsonUtil.campo("mensaje", reportado ? "Equipo reportado como hurtado/extraviado." : "Reporte de hurto retirado.")
                        + "}");
            } else {
                respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                salida.print(JsonUtil.error("No se encontró el dispositivo especificado."));
            }

        } catch (NumberFormatException e) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Parámetros inválidos."));
        } catch (Exception e) {
            getServletContext().log("Error cambiando estado de hurto", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo actualizar el estado de seguridad."));
        }
    }
}
