package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.EstudianteDAO;
import co.edu.uniguajira.autogestion.util.JsonUtil;

/**
 * Respuestas JSON comunes cuando un PIN falla. Las usan todos los
 * endpoints que piden PIN (verificación, salida temprana y gestión de
 * equipos), para que el frontend reciba siempre los mismos campos:
 *
 *   errorPin          true en ambos casos
 *   intentosRestantes cuántos intentos quedan antes del bloqueo
 *   bloqueado         true cuando ya no se puede intentar
 *   minutosRestantes  minutos que faltan para desbloquear
 */
final class RespuestaPin {

    private RespuestaPin() { }

    static String incorrecto(int intentosRestantes) {
        String mensaje = intentosRestantes == 1
                ? "PIN incorrecto. Te queda 1 intento."
                : "PIN incorrecto. Te quedan " + intentosRestantes + " intentos.";
        return "{" + JsonUtil.campo("ok", false) + ","
                + JsonUtil.campo("valido", false) + ","
                + JsonUtil.campo("errorPin", true) + ","
                + JsonUtil.campo("intentosRestantes", intentosRestantes) + ","
                + JsonUtil.campo("intentosMaximos", EstudianteDAO.MAX_INTENTOS_PIN) + ","
                + JsonUtil.campo("error", mensaje) + ","
                + JsonUtil.campo("mensaje", mensaje) + "}";
    }

    static String bloqueado(int minutosRestantes) {
        int minutos = minutosRestantes > 0 ? minutosRestantes : EstudianteDAO.MINUTOS_BLOQUEO_PIN;
        String mensaje = "Demasiados intentos fallidos. Tu PIN quedó bloqueado por "
                + minutos + (minutos == 1 ? " minuto." : " minutos.");
        return "{" + JsonUtil.campo("ok", false) + ","
                + JsonUtil.campo("valido", false) + ","
                + JsonUtil.campo("errorPin", true) + ","
                + JsonUtil.campo("bloqueado", true) + ","
                + JsonUtil.campo("intentosRestantes", 0) + ","
                + JsonUtil.campo("minutosRestantes", minutos) + ","
                + JsonUtil.campo("error", mensaje) + ","
                + JsonUtil.campo("mensaje", mensaje) + "}";
    }
}
