package co.edu.uniguajira.autogestion.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Obtener la IP real del visitante cuando el tráfico pasa por un túnel
 * como Ngrok.
 *
 * request.getRemoteAddr() por sí solo NO sirve aquí: Ngrok recibe la
 * petición del celular en internet y la reenvía a Tomcat como una
 * conexión local (127.0.0.1 o ::1). Si se usara solo getRemoteAddr(),
 * TODOS los estudiantes se verían como la misma IP, y el límite de
 * peticiones bloquearía a todo el mundo a la vez.
 *
 * Ngrok agrega el encabezado X-Forwarded-For con la IP real de quien
 * hizo la petición. PERO ese encabezado también lo puede escribir el
 * propio visitante, y por eso hay dos reglas de seguridad:
 *
 *  1. Solo se confía en él si la conexión viene del propio computador
 *     (el agente de Ngrok). Si alguien se conecta directo por la red
 *     local mandando un X-Forwarded-For inventado, se ignora y se usa
 *     la IP real de su conexión.
 *
 *  2. Si trae varias IPs separadas por comas, se toma la ÚLTIMA, no la
 *     primera. Un proxy confiable agrega al FINAL de la lista la IP que
 *     él mismo vio; las de la izquierda las pudo escribir cualquiera.
 *     Tomar la primera permitiría a un atacante evadir el límite de
 *     intentos de login mandando una IP distinta en cada petición.
 */
public final class UtilRed {

    private UtilRed() { }

    public static String obtenerIpCliente(HttpServletRequest peticion) {
        String ipConexion = peticion.getRemoteAddr();

        if (esLocal(ipConexion)) {
            String reenviada = peticion.getHeader("X-Forwarded-For");
            if (reenviada != null && !reenviada.isBlank()) {
                String[] partes = reenviada.split(",");
                return partes[partes.length - 1].trim();
            }
        }
        return ipConexion;
    }

    private static boolean esLocal(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }
}
