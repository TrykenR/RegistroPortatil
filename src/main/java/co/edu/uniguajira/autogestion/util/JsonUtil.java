package co.edu.uniguajira.autogestion.util;

/**
 * Serializador JSON mínimo, sin librerías externas, para mantener el
 * MVP sin dependencias que instalar en NetBeans/IntelliJ.
 */
public final class JsonUtil {

    private JsonUtil() { }

    public static String escapar(String texto) {
        if (texto == null) return null;
        StringBuilder sb = new StringBuilder();
        for (char c : texto.toCharArray()) {
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    public static String campo(String clave, String valor) {
        return "\"" + escapar(clave) + "\":"
                + (valor == null ? "null" : "\"" + escapar(valor) + "\"");
    }

    public static String campo(String clave, long valor) {
        return "\"" + escapar(clave) + "\":" + valor;
    }

    public static String campo(String clave, boolean valor) {
        return "\"" + escapar(clave) + "\":" + valor;
    }

    public static String error(String mensaje) {
        return "{" + campo("ok", false) + "," + campo("mensaje", mensaje) + "}";
    }
}
