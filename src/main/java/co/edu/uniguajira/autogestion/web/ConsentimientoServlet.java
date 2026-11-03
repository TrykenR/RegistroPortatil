package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * POST /api/estudiante/consentimiento   (idEstudiante)
 *
 * Para un estudiante que YA existía en el sistema antes de que este
 * consentimiento se agregara (ver migración 04_migracion_seguridad_privacidad.sql):
 * ControladorAutogestionServlet le habrá dicho al frontend
 * "consentimiento": false, y app.js muestra una pantalla pidiéndoselo
 * antes de dejarlo seguir. Este endpoint es el que registra que ya lo dio.
 *
 * No exige nada más que el idEstudiante — no vuelve a pedir documento
 * ni nombre, porque esa persona ya está identificada en este mismo flujo.
 */
@WebServlet("/api/estudiante/consentimiento")
public class ConsentimientoServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        try {
            int idEstudiante = Integer.parseInt(peticion.getParameter("idEstudiante"));
            estudianteDAO.registrarConsentimiento(idEstudiante);
            salida.print("{" + JsonUtil.campo("ok", true) + "}");

        } catch (NumberFormatException e) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Falta el identificador del estudiante."));
        } catch (Exception e) {
            getServletContext().log("Error registrando consentimiento", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo guardar tu aceptación. Inténtalo de nuevo."));
        }
    }
}
