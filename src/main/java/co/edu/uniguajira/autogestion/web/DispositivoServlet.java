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
 * CASO A · agregar un equipo (primero o adicional)
 * POST /api/dispositivos   (idEstudiante, idMarca, idColor, alias)
 *
 * Solo pide marca y color, tal como pide el flujo: nada de serial ni
 * referencia obligatoria en esta versión de autogestión total.
 */
@WebServlet("/api/dispositivos")
public class DispositivoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        try {
            int idEstudiante = Integer.parseInt(peticion.getParameter("idEstudiante"));
            int idMarca      = Integer.parseInt(peticion.getParameter("idMarca"));
            int idColor      = Integer.parseInt(peticion.getParameter("idColor"));
            String alias     = peticion.getParameter("alias");
            String serial    = peticion.getParameter("serial");
            if (serial == null) {
                serial = peticion.getParameter("numeroSerie");
            }

            int idDispositivo = dispositivoDAO.registrar(idEstudiante, idMarca, idColor, alias, serial);

            salida.print("{" + JsonUtil.campo("ok", true) + ","
                    + JsonUtil.campo("idDispositivo", idDispositivo) + "}");

        } catch (NumberFormatException e) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Selecciona marca y color."));
        } catch (Exception e) {
            getServletContext().log("Error registrando dispositivo", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo guardar el equipo."));
        }
    }
}
