package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.modelo.Estudiante;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/estudiante")
public class ControladorAutogestionServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();
    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String identificador = request.getParameter("identificador");
        if (identificador == null || identificador.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"error\":\"Identificador no proporcionado\"}");
            return;
        }

        try {
            Estudiante estudiante = estudianteDAO.buscarPorIdentificador(identificador.trim());
            
            if (estudiante == null) {
                // Estudiante NO existe en la BD -> Retornar estado NUEVO explícito
                response.setStatus(HttpServletResponse.SC_OK);
                out.print("{\"encontrado\":false,\"estado\":\"NUEVO\"}");
            } else {
                // Cargar dispositivos del estudiante
                List<Dispositivo> dispositivos = dispositivoDAO.buscarPorEstudiante(estudiante.getIdEstudiante());
                String estadoFlujo = dispositivos.isEmpty() ? "SIN_EQUIPOS" : "FRECUENTE";

                StringBuilder dispJson = new StringBuilder("[");
                for (int i = 0; i < dispositivos.size(); i++) {
                    Dispositivo d = dispositivos.get(i);
                    dispJson.append(String.format(
                        "{\"id\":%d,\"id_dispositivo\":%d,\"marca\":\"%s\",\"color\":\"%s\",\"alias\":\"%s\"}",
                        d.getIdDispositivo(), d.getIdDispositivo(),
                        d.getMarca() != null ? d.getMarca() : "",
                        d.getColor() != null ? d.getColor() : "",
                        d.getAlias() != null ? d.getAlias().replace("\"", "'") : ""
                    ));
                    if (i < dispositivos.size() - 1) dispJson.append(",");
                }
                dispJson.append("]");

                response.setStatus(HttpServletResponse.SC_OK);
                out.printf("{\"encontrado\":true,\"estado\":\"%s\",\"idEstudiante\":%d,\"id_estudiante\":%d,\"nombre\":\"%s\",\"nombre_completo\":\"%s\",\"consentimiento\":%b,\"acepto_tratamiento_datos\":%b,\"tienePin\":%b,\"tiene_pin\":%b,\"dispositivos\":%s}",
                        estadoFlujo,
                        estudiante.getIdEstudiante(), estudiante.getIdEstudiante(),
                        estudiante.getNombreCompleto() != null ? estudiante.getNombreCompleto() : "",
                        estudiante.getNombreCompleto() != null ? estudiante.getNombreCompleto() : "",
                        estudiante.isAceptoTratamientoDatos(), estudiante.isAceptoTratamientoDatos(),
                        estudiante.isTienePin(), estudiante.isTienePin(),
                        dispJson.toString());
            }
        } catch (SQLException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.printf("{\"error\":\"Error en base de datos: %s\"}", e.getMessage().replace("\"", "'"));
        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.printf("{\"error\":\"Error interno: %s\"}", e.getMessage().replace("\"", "'"));
        }
    }
}
