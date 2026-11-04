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
 * CASO A · primer contacto total (identificador no existía en Estudiantes)
 * POST /api/estudiante/nuevo   (numeroDocumento, nombres, apellidos, aceptoTratamiento)
 *
 * Autogestión real: nadie de portería valida esta alta. El costo de ese
 * ahorro es que el "nombre" queda tal como lo escribió el estudiante —
 * si la universidad ya tiene un sistema académico, este método se
 * reemplaza por una consulta a ese sistema en vez de un INSERT ciego.
 *
 * aceptoTratamiento es obligatorio (Ley 1581 de 2012, Habeas Data):
 * sin la casilla marcada en el frontend, este servlet ni siquiera
 * intenta crear el estudiante — no existe un registro "a medias" sin
 * consentimiento.
 */
@WebServlet("/api/estudiante/nuevo")
public class RegistroEstudianteServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String numeroDocumento = peticion.getParameter("numeroDocumento");
        String codigoEstudiantil = peticion.getParameter("codigoEstudiantil");

        // Si llegó un solo identificador en numeroDocumento pero empieza con '0',
        // o si llegó en codigoEstudiantil pero NO empieza con '0', se clasifica automáticamente.
        if (numeroDocumento != null && !numeroDocumento.isBlank() && (codigoEstudiantil == null || codigoEstudiantil.isBlank())) {
            if (numeroDocumento.trim().startsWith("0")) {
                codigoEstudiantil = numeroDocumento.trim();
                numeroDocumento = null;
            }
        } else if (codigoEstudiantil != null && !codigoEstudiantil.isBlank() && (numeroDocumento == null || numeroDocumento.isBlank())) {
            if (!codigoEstudiantil.trim().startsWith("0")) {
                numeroDocumento = codigoEstudiantil.trim();
                codigoEstudiantil = null;
            }
        }
        String nombres   = peticion.getParameter("nombres");
        String apellidos = peticion.getParameter("apellidos");
        String pin       = peticion.getParameter("pin");
        boolean aceptoTratamiento = "true".equals(peticion.getParameter("aceptoTratamiento"));

        boolean tieneDocumento = numeroDocumento != null && !numeroDocumento.isBlank();
        boolean tieneCodigo = codigoEstudiantil != null && !codigoEstudiantil.isBlank();

        if ((!tieneDocumento && !tieneCodigo)
                || (tieneDocumento && !numeroDocumento.matches("\\d{5,10}"))
                || (tieneCodigo && !codigoEstudiantil.matches("\\w{5,20}"))
                || nombres == null || nombres.isBlank()
                || apellidos == null || apellidos.isBlank()) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Ingresa un documento o código válido, y tus nombres completos."));
            return;
        }

        if (!aceptoTratamiento) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Debes aceptar el tratamiento de tus datos para continuar."));
            return;
        }

        if (pin != null && !pin.isBlank() && !pin.matches("\\d{4}")) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("El PIN debe tener exactamente 4 dígitos numéricos."));
            return;
        }

        try {
            int idEstudiante = estudianteDAO.registrar(
                    tieneDocumento ? numeroDocumento.trim() : null,
                    tieneCodigo ? codigoEstudiantil.trim() : null,
                    nombres.trim(), apellidos.trim(), true,
                    (pin != null && !pin.isBlank()) ? pin.trim() : null);
            salida.print("{" + JsonUtil.campo("ok", true) + ","
                    + JsonUtil.campo("idEstudiante", idEstudiante) + "}");

        } catch (java.sql.SQLIntegrityConstraintViolationException e) {
            String msg = (e.getMessage() != null) ? e.getMessage().toLowerCase() : "";
            respuesta.setStatus(HttpServletResponse.SC_CONFLICT);
            if (msg.contains("null") || msg.contains("cannot be null")) {
                salida.print(JsonUtil.error("Error en la estructura de datos: campo obligatorio vacío en base de datos."));
            } else {
                salida.print(JsonUtil.error("Ese documento o código ya está registrado en el sistema."));
            }
        } catch (Exception e) {
            getServletContext().log("Error registrando estudiante", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo completar el registro."));
        }
    }
}
