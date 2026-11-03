package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.dao.EstudianteDAO.ResultadoPin;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * Endpoint de gestión y validación de PIN del estudiante.
 * POST /api/estudiante/pin
 *
 * Parametros:
 *   - accion: "verificar" | "configurar"
 *   - idEstudiante: id del estudiante
 *   - pin: PIN de 4 dígitos
 */
@WebServlet("/api/estudiante/pin")
public class PinEstudianteServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String accion = peticion.getParameter("accion");
        String idEstudianteStr = peticion.getParameter("idEstudiante");
        String pin = peticion.getParameter("pin");

        if (idEstudianteStr == null || !idEstudianteStr.matches("\\d+")) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Identificador de estudiante inválido."));
            return;
        }

        int idEstudiante = Integer.parseInt(idEstudianteStr);

        if (pin == null || !pin.matches("\\d{4}")) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("El PIN debe tener exactamente 4 dígitos numéricos."));
            return;
        }

        try {
            if ("configurar".equalsIgnoreCase(accion)) {
                boolean configurado = estudianteDAO.configurarPin(idEstudiante, pin.trim());
                if (configurado) {
                    salida.print("{" + JsonUtil.campo("ok", true) + ","
                            + JsonUtil.campo("mensaje", "PIN configurado exitosamente.") + "}");
                } else {
                    respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    salida.print(JsonUtil.error("No se pudo configurar el PIN."));
                }
                return;
            }

            if ("verificar".equalsIgnoreCase(accion)) {
                ResultadoPin resultado = estudianteDAO.verificarPin(idEstudiante, pin.trim());

                switch (resultado) {
                    case CORRECTO:
                        salida.print("{" + JsonUtil.campo("ok", true) + ","
                                + JsonUtil.campo("valido", true) + "}");
                        break;
                    case INCORRECTO:
                        respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        salida.print("{" + JsonUtil.campo("ok", false) + ","
                                + JsonUtil.campo("valido", false) + ","
                                + JsonUtil.campo("error", "PIN incorrecto. Inténtalo de nuevo.") + "}");
                        break;
                    case BLOQUEADO:
                        respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        salida.print("{" + JsonUtil.campo("ok", false) + ","
                                + JsonUtil.campo("bloqueado", true) + ","
                                + JsonUtil.campo("error", "Demasiados intentos fallidos. Bloqueado temporalmente por 15 minutos.") + "}");
                        break;
                    case NO_TIENE_PIN:
                        salida.print("{" + JsonUtil.campo("ok", true) + ","
                                + JsonUtil.campo("requiereConfigurar", true) + "}");
                        break;
                    case ESTUDIANTE_NO_EXISTE:
                    default:
                        respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        salida.print(JsonUtil.error("Estudiante no encontrado."));
                        break;
                }
                return;
            }

            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Acción no válida."));

        } catch (Exception e) {
            getServletContext().log("Error en PinEstudianteServlet", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("Error al procesar la solicitud de PIN."));
        }
    }
}
