package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.util.JsonUtil;
import co.edu.uniguajira.autogestion.util.UtilRed;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Límite de peticiones por IP (punto 8 de las mejoras).
 *
 * Protege dos rutas con ventanas distintas, porque el riesgo de cada
 * una es distinto:
 *
 *   /api/estudiante   -> alguien podría escribir un script que pruebe
 *                        miles de documentos seguidos, buscando
 *                        cuáles existen (reconocimiento antes de
 *                        suplantar a alguien). Límite generoso: un
 *                        estudiante real nunca necesita más de un
 *                        puñado de intentos por minuto.
 *
 *   /api/admin/login   -> fuerza bruta contra la clave del panel.
 *                        Límite mucho más estricto: nadie que sepa su
 *                        propia clave necesita más de unos pocos
 *                        intentos en un rato.
 *
 * IMPLEMENTACIÓN: memoria del proceso (ConcurrentHashMap), no base de
 * datos — esto necesita responder en microsegundos en cada petición, y
 * no hace falta que sobreviva un reinicio de Tomcat. Si el proyecto
 * algún día corre en varios servidores a la vez, esto tendría que
 * pasar a algo compartido (Redis, por ejemplo) — para un solo servidor
 * en un solo Tomcat, esto es suficiente y no agrega infraestructura.
 */
@WebFilter(urlPatterns = { "/api/estudiante", "/api/admin/login" })
public class FiltroLimiteIntentos implements jakarta.servlet.Filter {

    private static final int MAX_ESTUDIANTE_POR_MINUTO = 20;
    private static final int MAX_LOGIN_ADMIN_POR_VENTANA = 5;
    private static final long VENTANA_LOGIN_ADMIN_MS = 15 * 60 * 1000L; // 15 minutos
    private static final long VENTANA_ESTUDIANTE_MS = 60 * 1000L;       // 1 minuto

    // clave = "ruta|ip", valor = marcas de tiempo de los intentos recientes
    private final Map<String, Deque<Long>> intentos = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest peticion, ServletResponse respuesta, FilterChain cadena)
            throws IOException, ServletException {

        HttpServletRequest solicitudHttp = (HttpServletRequest) peticion;
        HttpServletResponse respuestaHttp = (HttpServletResponse) respuesta;

        String ruta = solicitudHttp.getServletPath();
        String ip = UtilRed.obtenerIpCliente(solicitudHttp);

        boolean esLoginAdmin = ruta.endsWith("/admin/login");
        int limite = esLoginAdmin ? MAX_LOGIN_ADMIN_POR_VENTANA : MAX_ESTUDIANTE_POR_MINUTO;
        long ventanaMs = esLoginAdmin ? VENTANA_LOGIN_ADMIN_MS : VENTANA_ESTUDIANTE_MS;

        String clave = ruta + "|" + ip;
        long ahora = System.currentTimeMillis();

        Deque<Long> marcas = intentos.computeIfAbsent(clave, k -> new ArrayDeque<>());

        synchronized (marcas) {
            // Descarta las marcas que ya salieron de la ventana de tiempo.
            while (!marcas.isEmpty() && ahora - marcas.peekFirst() > ventanaMs) {
                marcas.pollFirst();
            }

            if (marcas.size() >= limite) {
                respuestaHttp.setContentType("application/json;charset=UTF-8");
                respuestaHttp.setStatus(429); // Too Many Requests
                respuestaHttp.getWriter().print(
                        JsonUtil.error("Demasiados intentos. Espera un momento y vuelve a intentar."));
                return;
            }

            marcas.addLast(ahora);
        }

        cadena.doFilter(peticion, respuesta);
    }
}
