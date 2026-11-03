package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.dao.HistorialAccesoDAO;
import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.modelo.HistorialAcceso;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@WebServlet({"/api/accesos", "/api/acceso"})
public class RegistroAccesoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();
    private final HistorialAccesoDAO historialAccesoDAO = new HistorialAccesoDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String idEstudianteParam = request.getParameter("idEstudiante") != null ? 
                request.getParameter("idEstudiante") : request.getParameter("id_estudiante");
                
        String idDispositivoParam = request.getParameter("idDispositivo") != null ? 
                request.getParameter("idDispositivo") : request.getParameter("id_dispositivo");

        String fechaEventoParam = request.getParameter("fechaEvento");

        if (idEstudianteParam == null || idDispositivoParam == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"ok\":false,\"mensaje\":\"Parámetros incompletos\"}");
            return;
        }

        try {
            int idEstudiante = Integer.parseInt(idEstudianteParam.trim());
            int idDispositivo = Integer.parseInt(idDispositivoParam.trim());

            // 1. Validar propiedad del equipo
            if (!dispositivoDAO.perteneceAEstudiante(idDispositivo, idEstudiante)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                out.print("{\"ok\":false,\"mensaje\":\"El equipo no pertenece a este estudiante\"}");
                return;
            }

            // 2. Obtener datos del dispositivo
            Dispositivo dispositivo = dispositivoDAO.buscarPorId(idDispositivo);
            if (dispositivo == null) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                out.print("{\"ok\":false,\"mensaje\":\"Dispositivo no encontrado\"}");
                return;
            }

            // 3. Validar si está reportado como hurtado
            if (dispositivo.isReportadoHurto()) {
                dispositivoDAO.registrarAlertaSeguridad(idDispositivo, "HURTO", "Intento de ingreso con equipo reportado como hurtado");
                response.setStatus(HttpServletResponse.SC_OK);
                out.printf("{\"ok\":true,\"alerta\":true,\"titulo\":\"ALERTA DE SEGURIDAD\",\"marca\":\"%s\",\"color\":\"%s\",\"hora\":\"%s\"}",
                        dispositivo.getMarca(), dispositivo.getColor(), formatHoraActual());
                return;
            }

            // 4. Determinar fecha del evento (soporta offline si viene en la petición)
            LocalDateTime fechaEvento = fechaEventoParam != null && !fechaEventoParam.isBlank() ?
                    LocalDateTime.parse(fechaEventoParam.replace(" ", "T")) : LocalDateTime.now();

            // 5. Antirrebote
            if (historialAccesoDAO.existeRegistroReciente(idDispositivo)) {
                response.setStatus(HttpServletResponse.SC_OK);
                out.printf("{\"ok\":true,\"movimiento\":\"REGISTRADO\",\"marca\":\"%s\",\"color\":\"%s\",\"hora\":\"%s\",\"mensaje\":\"Registro duplicado evitado por antirrebote\"}",
                        dispositivo.getMarca(), dispositivo.getColor(), formatHoraActual());
                return;
            }

            // 6. Calcular siguiente movimiento (Entrada / Salida inteligente)
            HistorialAccesoDAO.ResultadoSiguienteMovimiento sig = 
                    historialAccesoDAO.calcularSiguienteMovimiento(idDispositivo, fechaEvento);

            if (!sig.permitido) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                out.printf("{\"ok\":false,\"mensaje\":\"Debes esperar un momento antes de registrar otro movimiento.\"}", sig.minutosTranscurridos);
                return;
            }

            // 7. Registrar usando el POJO HistorialAcceso
            HistorialAcceso historial = new HistorialAcceso();
            historial.setIdDispositivo(idDispositivo);
            historial.setIdTipoMovimiento(sig.movimiento); // 1 = ENTRADA, 2 = SALIDA
            historial.setIdOrigen(1); // 1 = Autogestión PWA
            historial.setFechaHoraEvento(fechaEvento);

            historialAccesoDAO.registrar(historial);

            String tipoTexto = (sig.movimiento == HistorialAccesoDAO.ENTRADA) ? "ENTRADA" : "SALIDA";

            response.setStatus(HttpServletResponse.SC_OK);
            out.printf("{\"ok\":true,\"movimiento\":\"%s\",\"marca\":\"%s\",\"color\":\"%s\",\"hora\":\"%s\"}",
                    tipoTexto, dispositivo.getMarca(), dispositivo.getColor(), formatHoraActual());

        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"ok\":false,\"mensaje\":\"Identificadores no válidos\"}");
        } catch (SQLException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.printf("{\"ok\":false,\"mensaje\":\"Error SQL: %s\"}", e.getMessage().replace("\"", "'"));
        }
    }

    private String formatHoraActual() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a", java.util.Locale.of("es", "CO")));
    }
}
