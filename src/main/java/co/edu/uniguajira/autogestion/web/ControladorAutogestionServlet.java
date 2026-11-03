package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.modelo.Estudiante;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.StringJoiner;

/**
 * PASOS 2 y 3 DEL FLUJO — el corazón de la "lógica condicional".
 * GET /api/estudiante?identificador=1007654321
 *
 * Este único endpoint responde uno de tres estados, y app.js decide qué
 * pantalla mostrar según cuál llegó:
 *
 *   "NUEVO"      -> el identificador no existe en Estudiantes.
 *                   Frontend pide nombres/apellidos + el primer equipo.
 *   "SIN_EQUIPOS"-> el estudiante existe pero Dispositivos_Estudiante
 *                   está vacío. Frontend salta directo al formulario
 *                   de equipo nuevo (Caso A), sin pedir datos personales.
 *   "FRECUENTE"  -> tiene equipos vinculados. Frontend pinta los botones
 *                   grandes (Caso B).
 *
 * Nota: en Tomcat 9 o inferior, cambia los imports 'jakarta.servlet' por
 * 'javax.servlet'.
 */
@WebServlet("/api/estudiante")
public class ControladorAutogestionServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();
    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String identificador = peticion.getParameter("identificador");
        // Documento o código estudiantil (entre 5 y 15 dígitos)
        if (identificador == null || !identificador.matches("\\d{5,15}")) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Escribe un documento o código válido (solo números)."));
            return;
        }

        try {
            Estudiante estudiante = estudianteDAO.buscarPorIdentificador(identificador);

            // --- CASO A: primer contacto con el sistema -------------------
            if (estudiante == null) {
                salida.print("{"
                        + JsonUtil.campo("ok", true) + ","
                        + JsonUtil.campo("estado", "NUEVO") + ","
                        + JsonUtil.campo("identificador", identificador) + "}");
                return;
            }

            List<Dispositivo> dispositivos =
                    dispositivoDAO.listarPorEstudiante(estudiante.getIdEstudiante());

            // --- Estudiante ya existe, pero sin equipos: también Caso A ----
            if (dispositivos.isEmpty()) {
                salida.print("{"
                        + JsonUtil.campo("ok", true) + ","
                        + JsonUtil.campo("estado", "SIN_EQUIPOS") + ","
                        + JsonUtil.campo("idEstudiante", estudiante.getIdEstudiante()) + ","
                        + JsonUtil.campo("nombre", estudiante.getNombreCompleto()) + ","
                        + JsonUtil.campo("consentimiento", estudiante.isAceptoTratamientoDatos()) + ","
                        + JsonUtil.campo("tienePin", estudiante.isTienePin()) + "}");
                return;
            }

            // --- CASO B: usuario frecuente ---------------------------------
            StringJoiner arreglo = new StringJoiner(",", "[", "]");
            for (Dispositivo d : dispositivos) {
                arreglo.add("{"
                        + JsonUtil.campo("id", d.getIdDispositivo()) + ","
                        + JsonUtil.campo("marca", d.getMarca()) + ","
                        + JsonUtil.campo("color", d.getColor()) + ","
                        + JsonUtil.campo("hex", d.getCodigoHex()) + ","
                        + JsonUtil.campo("alias", d.getAlias()) + ","
                        + JsonUtil.campo("serial", d.getNumeroSerie() != null ? d.getNumeroSerie() : "") + ","
                        + JsonUtil.campo("reportadoHurto", d.isReportadoHurto()) + ","
                        + JsonUtil.campo("motivoReporte", d.getMotivoReporte() != null ? d.getMotivoReporte() : "") + ","
                        + JsonUtil.campo("fechaReporte", d.getFechaReporteHurto() != null ? d.getFechaReporteHurto() : "") + "}");
            }

            salida.print("{"
                    + JsonUtil.campo("ok", true) + ","
                    + JsonUtil.campo("estado", "FRECUENTE") + ","
                    + JsonUtil.campo("idEstudiante", estudiante.getIdEstudiante()) + ","
                    + JsonUtil.campo("nombre", estudiante.getNombreCompleto()) + ","
                    + JsonUtil.campo("consentimiento", estudiante.isAceptoTratamientoDatos()) + ","
                    + JsonUtil.campo("tienePin", estudiante.isTienePin()) + ","
                    + "\"dispositivos\":" + arreglo + "}");

        } catch (Exception e) {
            getServletContext().log("Error resolviendo estudiante", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo consultar. Inténtalo de nuevo."));
        }
    }
}
