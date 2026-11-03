package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.DispositivoDAO;
import co.edu.uniguajira.autogestion.dao.HistorialAccesoDAO;
import co.edu.uniguajira.autogestion.modelo.Dispositivo;
import co.edu.uniguajira.autogestion.modelo.HistorialAcceso;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * POST /api/accesos
 * Parámetros: idEstudiante, idDispositivo, y opcionalmente
 * fechaEventoCliente (ISO-8601, ej. "2026-09-18T14:32:10").
 *
 * ESTE ENDPOINT ES EL MISMO PARA ONLINE Y PARA LA SINCRONIZACIÓN OFFLINE.
 * app.js lo llama igual en los dos casos; la única diferencia es si
 * manda fechaEventoCliente o no:
 *
 *   - Sin fechaEventoCliente  -> vino con red en el momento. El servidor
 *     usa su propio NOW() como fecha_hora_evento y marca origen ONLINE.
 *   - Con fechaEventoCliente  -> el celular lo guardó offline y lo está
 *     reenviando ahora (por el Service Worker, en segundo plano, cuando
 *     detecta que volvió la conexión). El servidor respeta esa fecha
 *     como fecha_hora_evento y marca origen OFFLINE_SINCRONIZADO, pero
 *     fecha_hora_sincronizado sigue siendo SIEMPRE su propio NOW().
 *
 * Nunca se confía ciegamente en la fecha del cliente para nada que
 * requiera certeza absoluta (por eso existe fecha_hora_sincronizado);
 * pero para "cuándo pasó" es la mejor información disponible.
 *
 * REGLA DE LOS 45 MINUTOS: además del antirrebote de 90 segundos (que
 * evita el doble toque inmediato), aquí se exige que pasen al menos 45
 * minutos desde el último registro de un dispositivo antes de aceptar
 * un cambio de sentido (de ENTRADA a SALIDA o viceversa). Si alguien
 * toca de nuevo antes de eso, se asume que fue sin querer — un escaneo
 * accidental o un segundo toque por confusión — y se le confirma el
 * ÚLTIMO estado real, sin crear una fila nueva en el historial.
 *
 * Esto tiene un costo consciente: un estudiante que de verdad entra y
 * sale en menos de 45 minutos (por ejemplo, olvidó algo en el carro) no
 * podrá registrar esa salida real por este medio, y tendría que resolverlo
 * con el portero. Es la contrapartida de proteger la bitácora contra
 * ruido accidental, y el número (45) es ajustable según lo que decida
 * la universidad.
 */
@WebServlet("/api/accesos")
public class RegistroAccesoServlet extends HttpServlet {

    private final DispositivoDAO dispositivoDAO = new DispositivoDAO();
    private final HistorialAccesoDAO historialDAO = new HistorialAccesoDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        try {
            int idEstudiante  = Integer.parseInt(peticion.getParameter("idEstudiante"));
            int idDispositivo = Integer.parseInt(peticion.getParameter("idDispositivo"));
            String fechaEventoCliente = peticion.getParameter("fechaEventoCliente");
            String sentido = peticion.getParameter("sentido"); // "ENTRADA" o "SALIDA" (opcional)

            if (!dispositivoDAO.perteneceAEstudiante(idEstudiante, idDispositivo)) {
                respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
                salida.print(JsonUtil.error("Ese equipo no está vinculado a tu documento."));
                return;
            }

            Dispositivo d = dispositivoDAO.buscarPorId(idDispositivo);
            if (d == null) {
                respuesta.setStatus(HttpServletResponse.SC_NOT_FOUND);
                salida.print(JsonUtil.error("Equipo no encontrado."));
                return;
            }

            // =================================================================
            // REGLAS DE SEGURIDAD Y ALERTAS EN TIEMPO REAL
            // =================================================================

            // 1. Alerta por reporte de hurto o extravío activo
            if (d.isReportadoHurto()) {
                dispositivoDAO.registrarAlertaSeguridad(
                        idDispositivo,
                        "HURTO",
                        "¡INTENTO DE REGISTRO CON EQUIPO REPORTADO HURTADO/EXTRAVIADO! Estudiante ID: " + idEstudiante
                );
                salida.print(respuestaAlerta(d, "HURTO", "¡EQUIPO REPORTADO HURTADO!",
                        "Este portátil tiene un reporte activo de hurto o pérdida. Detenga el paso y verifique."));
                return;
            }

            // 2. Alerta por discrepancia: Salida sin entrada previa registrada hoy
            if (sentido != null && sentido.equalsIgnoreCase("SALIDA")) {
                int ultimoMov = historialDAO.obtenerUltimoMovimientoHoy(idDispositivo);
                if (ultimoMov != HistorialAccesoDAO.ENTRADA) {
                    dispositivoDAO.registrarAlertaSeguridad(
                            idDispositivo,
                            "DISCREPANCIA_SALIDA",
                            "Intento de salida sin entrada registrada hoy en el campus. Estudiante ID: " + idEstudiante
                    );
                    salida.print(respuestaAlerta(d, "DISCREPANCIA_SALIDA", "¡DISCREPANCIA: SALIDA IRREGULAR!",
                            "Este equipo no registra entrada el día de hoy en ninguna portería."));
                    return;
                }
            }

            if (historialDAO.existeRegistroReciente(idDispositivo)) {
                salida.print(respuestaConfirmacion(d, "REGISTRADO"));
                return;
            }

            LocalDateTime fechaEvento;
            int idOrigen;
            try {
                if (fechaEventoCliente != null && !fechaEventoCliente.isBlank()) {
                    fechaEvento = LocalDateTime.parse(fechaEventoCliente, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    idOrigen = HistorialAcceso.ORIGEN_OFFLINE_SINCRONIZADO;
                } else {
                    fechaEvento = LocalDateTime.now();
                    idOrigen = HistorialAcceso.ORIGEN_ONLINE;
                }
            } catch (java.time.format.DateTimeParseException e) {
                // Si el celular mandó una fecha rara, no se rechaza el registro:
                // se guarda igual con la hora del servidor, marcado como online.
                fechaEvento = LocalDateTime.now();
                idOrigen = HistorialAcceso.ORIGEN_ONLINE;
            }

            int movimientoFinal;
            if (sentido != null && sentido.equalsIgnoreCase("ENTRADA")) {
                movimientoFinal = HistorialAccesoDAO.ENTRADA;
            } else if (sentido != null && sentido.equalsIgnoreCase("SALIDA")) {
                movimientoFinal = HistorialAccesoDAO.SALIDA;
            } else {
                HistorialAccesoDAO.ResultadoSiguienteMovimiento resultado =
                        historialDAO.calcularSiguienteMovimiento(idDispositivo, fechaEvento);

                if (!resultado.permitido) {
                    String ultimaEtiqueta = (resultado.movimiento == HistorialAccesoDAO.SALIDA)
                            ? "ENTRADA" : "SALIDA";
                    salida.print(respuestaConfirmacion(d, ultimaEtiqueta));
                    return;
                }
                movimientoFinal = resultado.movimiento;
            }

            HistorialAcceso registro = new HistorialAcceso();
            registro.setIdDispositivo(idDispositivo);
            registro.setIdTipoMovimiento(movimientoFinal);
            registro.setIdOrigen(idOrigen);
            registro.setFechaHoraEvento(fechaEvento);
            historialDAO.registrar(registro);

            String etiquetaMovimiento =
                    (movimientoFinal == HistorialAccesoDAO.ENTRADA) ? "ENTRADA" : "SALIDA";

            salida.print(respuestaConfirmacion(d, etiquetaMovimiento));

        } catch (NumberFormatException e) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Faltan datos del registro."));
        } catch (Exception e) {
            getServletContext().log("Error registrando acceso", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo registrar. Inténtalo de nuevo."));
        }
    }

    private String respuestaAlerta(Dispositivo d, String tipoAlerta, String titulo, String mensaje) {
        String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));
        return "{"
                + JsonUtil.campo("ok", false) + ","
                + JsonUtil.campo("alerta", true) + ","
                + JsonUtil.campo("tipoAlerta", tipoAlerta) + ","
                + JsonUtil.campo("titulo", titulo) + ","
                + JsonUtil.campo("mensaje", mensaje) + ","
                + JsonUtil.campo("marca", d.getMarca()) + ","
                + JsonUtil.campo("color", d.getColor()) + ","
                + JsonUtil.campo("serial", d.getNumeroSerie() != null ? d.getNumeroSerie() : "SIN SERIAL") + ","
                + JsonUtil.campo("hora", hora)
                + "}";
    }

    private String respuestaConfirmacion(Dispositivo d, String movimiento) {
        String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));
        return "{"
                + JsonUtil.campo("ok", true) + ","
                + JsonUtil.campo("alerta", false) + ","
                + JsonUtil.campo("marca", d.getMarca()) + ","
                + JsonUtil.campo("color", d.getColor()) + ","
                + JsonUtil.campo("hex", d.getCodigoHex()) + ","
                + JsonUtil.campo("serial", d.getNumeroSerie() != null ? d.getNumeroSerie() : "") + ","
                + JsonUtil.campo("movimiento", movimiento) + ","
                + JsonUtil.campo("hora", hora)
                + "}";
    }
}
