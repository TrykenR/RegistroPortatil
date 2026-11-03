package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.modelo.Estudiante;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

@WebServlet("/api/estudiante")
public class ControladorAutogestionServlet extends HttpServlet {

    private final EstudianteDAO estudianteDAO = new EstudianteDAO();

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
                // Estudiante no registrado previamente (Autogestión: primer ingreso)
                response.setStatus(HttpServletResponse.SC_OK);
                out.print("{\"encontrado\":false}");
            } else {
                // Estudiante encontrado
                response.setStatus(HttpServletResponse.SC_OK);
                out.printf("{\"encontrado\":true,\"id_estudiante\":%d,\"numero_documento\":\"%s\",\"codigo_estudiantil\":\"%s\",\"nombre_completo\":\"%s\",\"acepto_tratamiento_datos\":%b,\"tiene_pin\":%b}",
                        estudiante.getIdEstudiante(),
                        estudiante.getNumeroDocumento() != null ? estudiante.getNumeroDocumento() : "",
                        estudiante.getCodigoEstudiantil() != null ? estudiante.getCodigoEstudiantil() : "",
                        estudiante.getNombreCompleto() != null ? estudiante.getNombreCompleto() : "",
                        estudiante.isAceptoTratamientoDatos(),
                        estudiante.isTienePin());
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
