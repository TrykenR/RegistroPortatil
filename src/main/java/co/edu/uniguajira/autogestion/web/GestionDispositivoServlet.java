package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.dao.EstudianteDAO.ResultadoPin;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

/**
 * Edición y eliminación de equipos desde la app del estudiante.
 *
 *   POST /api/dispositivo/editar    idEstudiante, idDispositivo, pin, idMarca, idColor, alias
 *   POST /api/dispositivo/eliminar  idEstudiante, idDispositivo, pin
 *
 * Seguridad: el equipo tiene que pertenecer al estudiante y, si el
 * estudiante tiene PIN, el PIN tiene que ser correcto (cuenta como un
 * intento más para el bloqueo). Eliminar es un borrado lógico
 * (activo = FALSE) para conservar el historial y las alertas.
 */
@WebServlet({"/api/dispositivo/editar", "/api/dispositivo/eliminar"})
public class GestionDispositivoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();
    private final EstudianteDAO estudianteDAO = new EstudianteDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta) throws IOException {
        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        boolean esEliminar = peticion.getServletPath().endsWith("/eliminar");
        int idEstudiante = entero(peticion, "idEstudiante", "id_estudiante");
        int idDispositivo = entero(peticion, "idDispositivo", "id_dispositivo");
        String pin = peticion.getParameter("pin");

        if (idEstudiante <= 0 || idDispositivo <= 0) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Parámetros incompletos."));
            return;
        }

        try {
            if (!dispositivoDAO.perteneceAEstudiante(idDispositivo, idEstudiante)) {
                respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
                salida.print(JsonUtil.error("El equipo no pertenece a este estudiante."));
                return;
            }

            if (!pinAutorizado(idEstudiante, pin, respuesta, salida)) return;

            if (esEliminar) {
                if (dispositivoDAO.desactivar(idDispositivo)) {
                    salida.print("{" + JsonUtil.campo("ok", true) + ","
                            + JsonUtil.campo("mensaje", "Equipo eliminado.") + "}");
                } else {
                    respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    salida.print(JsonUtil.error("El equipo ya no existe."));
                }
                return;
            }

            int idMarca = entero(peticion, "idMarca", "id_marca");
            int idColor = entero(peticion, "idColor", "id_color");
            if (idMarca <= 0 || idColor <= 0) {
                respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                salida.print(JsonUtil.error("Debes seleccionar marca y color válidos."));
                return;
            }

            String alias = peticion.getParameter("alias");
            if (alias != null && alias.trim().length() > 24) alias = alias.trim().substring(0, 24);

            if (dispositivoDAO.actualizar(idDispositivo, idMarca, idColor, alias)) {
                salida.print("{" + JsonUtil.campo("ok", true) + ","
                        + JsonUtil.campo("mensaje", "Cambios guardados.") + "}");
            } else {
                respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                salida.print(JsonUtil.error("El equipo ya no existe."));
            }

        } catch (SQLException e) {
            getServletContext().log("Error en GestionDispositivoServlet", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo actualizar el equipo."));
        }
    }

    /** Escribe la respuesta de error y devuelve false si el PIN no autoriza la operación. */
    private boolean pinAutorizado(int idEstudiante, String pin, HttpServletResponse respuesta, PrintWriter salida)
            throws SQLException {
        boolean vieneVacio = pin == null || pin.isBlank();

        if (vieneVacio) {
            if (!estudianteDAO.tienePin(idEstudiante)) return true;
            respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            salida.print("{" + JsonUtil.campo("ok", false) + ","
                    + JsonUtil.campo("requierePin", true) + ","
                    + JsonUtil.campo("mensaje", "Ingresa tu PIN para continuar.") + "}");
            return false;
        }

        ResultadoPin resultado = estudianteDAO.verificarPin(idEstudiante, pin.trim());
        switch (resultado) {
            case CORRECTO:
            case NO_TIENE_PIN:
                return true;
            case BLOQUEADO:
                respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
                salida.print(RespuestaPin.bloqueado(estudianteDAO.minutosBloqueoRestantes(idEstudiante)));
                return false;
            case INCORRECTO:
                respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                salida.print(RespuestaPin.incorrecto(estudianteDAO.intentosRestantesPin(idEstudiante)));
                return false;
            default:
                respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                salida.print(JsonUtil.error("Estudiante no encontrado."));
                return false;
        }
    }

    private static int entero(HttpServletRequest peticion, String nombre, String alternativo) {
        String valor = peticion.getParameter(nombre);
        if (valor == null) valor = peticion.getParameter(alternativo);
        if (valor == null) return 0;
        try {
            return Integer.parseInt(valor.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
