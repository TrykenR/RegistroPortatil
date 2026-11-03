package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * Protege /api/admin/* exigiendo una sesión ya autenticada, EXCEPTO
 * el propio endpoint de login (que es justamente el que crea esa
 * sesión) y el de logout (que debe poder cerrarla aunque, por lo que
 * sea, ya se haya vencido).
 *
 * Este es el único punto del backend con control de acceso por
 * contraseña — todo el resto de /api/* es deliberadamente abierto,
 * porque el flujo del estudiante es autogestión sin clave. Ver el
 * comentario de AdminLoginServlet para la justificación completa.
 */
@WebFilter("/api/admin/*")
public class FiltroSesionAdmin implements jakarta.servlet.Filter {

    @Override
    public void doFilter(ServletRequest peticion, ServletResponse respuesta, FilterChain cadena)
            throws IOException, ServletException {

        HttpServletRequest solicitudHttp = (HttpServletRequest) peticion;
        HttpServletResponse respuestaHttp = (HttpServletResponse) respuesta;

        String ruta = solicitudHttp.getServletPath();
        boolean esRutaPublica = ruta.endsWith("/login") || ruta.endsWith("/logout");

        if (esRutaPublica) {
            cadena.doFilter(peticion, respuesta);
            return;
        }

        HttpSession sesion = solicitudHttp.getSession(false);
        boolean autenticado = sesion != null && sesion.getAttribute("administradorAutenticado") != null;

        if (!autenticado) {
            respuestaHttp.setContentType("application/json;charset=UTF-8");
            respuestaHttp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            respuestaHttp.getWriter().print(JsonUtil.error("Sesión no válida. Inicia sesión de nuevo."));
            return;
        }

        cadena.doFilter(peticion, respuesta);
    }
}
