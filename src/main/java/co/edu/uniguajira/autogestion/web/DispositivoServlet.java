package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

@WebServlet({"/api/dispositivos", "/api/dispositivo"})
public class DispositivoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        // Leer parámetros en ambos formatos para evitar el HTTP 400
        String idEstudianteParam = request.getParameter("id_estudiante") != null ? 
                request.getParameter("id_estudiante") : request.getParameter("idEstudiante");
                
        String idMarcaParam = request.getParameter("id_marca") != null ? 
                request.getParameter("id_marca") : request.getParameter("idMarca");
                
        String idColorParam = request.getParameter("id_color") != null ? 
                request.getParameter("id_color") : request.getParameter("idColor");

        String alias = request.getParameter("alias");
        String numeroSerie = request.getParameter("numero_serie") != null ? 
                request.getParameter("numero_serie") : request.getParameter("numeroSerie");
        String descripcion = request.getParameter("descripcion");

        if (numeroSerie == null || numeroSerie.isBlank()) {
            numeroSerie = "Desconocido";
        }

        if (descripcion != null && !descripcion.isBlank()) {
            if (alias == null || alias.isBlank()) {
                alias = descripcion.length() > 40 ? descripcion.substring(0, 40) : descripcion;
            }
        }

        int idEstudiante = 0;
        int idMarca = 0;
        int idColor = 0;

        try {
            if (idEstudianteParam != null) idEstudiante = Integer.parseInt(idEstudianteParam.trim());
            if (idMarcaParam != null) idMarca = Integer.parseInt(idMarcaParam.trim());
            if (idColorParam != null) idColor = Integer.parseInt(idColorParam.trim());
        } catch (NumberFormatException e) {
            // Ignorar para activar validacion de BAD_REQUEST si no son enteros
        }

        if (idEstudiante <= 0 || idMarca <= 0 || idColor <= 0) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"error\":\"Debes seleccionar marca y color válidos\"}");
            return;
        }

        try {
            int idDispositivo = dispositivoDAO.registrar(idEstudiante, idMarca, idColor, alias, numeroSerie);
            if (idDispositivo > 0) {
                response.setStatus(HttpServletResponse.SC_OK);
                out.printf("{\"exito\":true,\"id_dispositivo\":%d,\"idDispositivo\":%d}", idDispositivo, idDispositivo);
            } else {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"error\":\"No se pudo registrar el dispositivo\"}");
            }
        } catch (SQLException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.printf("{\"error\":\"Error SQL: %s\"}", e.getMessage().replace("\"", "'"));
        }
    }
}
