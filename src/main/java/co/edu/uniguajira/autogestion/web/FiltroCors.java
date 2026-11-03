package co.edu.uniguajira.autogestion.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * Habilita CORS para todo /api/*.
 *
 * POR QUÉ HACE FALTA: Ngrok expone el backend en una URL pública
 * (https://algo.ngrok-free.app) que es un origen distinto al de donde
 * viva el HTML si el frontend no se sirve desde el mismo Tomcat (por
 * ejemplo, si el estudiante abre la PWA como archivo local, o si queda
 * publicada en otro hosting mientras el backend sigue detrás del túnel).
 * Sin estas cabeceras, el navegador bloquea la respuesta antes de que
 * app.js la vea, aunque el servidor sí haya procesado la petición.
 *
 * Si en el despliegue final frontend y backend terminan sirviéndose
 * desde el mismo origen, este filtro no estorba: simplemente añade
 * cabeceras que el navegador ignora en peticiones same-origin.
 *
 * Nota: en Tomcat 9 o inferior, cambia 'jakarta.servlet' por
 * 'javax.servlet' en este archivo y en el resto de la capa web/.
 */
@WebFilter("/api/*")
public class FiltroCors implements jakarta.servlet.Filter {

    @Override
    public void doFilter(ServletRequest peticion, ServletResponse respuesta, FilterChain cadena)
            throws IOException, ServletException {

        HttpServletRequest solicitudHttp = (HttpServletRequest) peticion;
        HttpServletResponse respuestaHttp = (HttpServletResponse) respuesta;

        // "*" es suficiente para un MVP académico sin cookies de sesión.
        // Si más adelante se agrega login con sesión, esto debe cambiar
        // a una lista blanca de orígenes concretos + Access-Control-Allow-Credentials.
        respuestaHttp.setHeader("Access-Control-Allow-Origin", "*");
        respuestaHttp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        respuestaHttp.setHeader("Access-Control-Allow-Headers", "Content-Type");
        respuestaHttp.setHeader("Access-Control-Max-Age", "3600");

        // El navegador manda un OPTIONS de "preflight" antes del POST real
        // cuando el origen es distinto. Hay que responderlo directamente,
        // sin dejar que llegue al servlet (que no sabe qué hacer con OPTIONS).
        if ("OPTIONS".equalsIgnoreCase(solicitudHttp.getMethod())) {
            respuestaHttp.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        cadena.doFilter(peticion, respuesta);
    }
}
