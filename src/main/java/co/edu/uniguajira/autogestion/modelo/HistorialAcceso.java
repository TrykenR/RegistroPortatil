package co.edu.uniguajira.autogestion.modelo;

import java.time.LocalDateTime;

/**
 * Evento de acceso, ahora con soporte para llegar tarde (offline-first).
 *
 * fechaHoraEvento  : cuándo pasó de verdad, según quien lo registró.
 *                    Si vino online, la pone el servidor con NOW().
 *                    Si vino de la cola offline del celular, la manda el
 *                    cliente (ISO-8601) y aquí SOLO se usa para saber
 *                    cuándo ocurrió — nunca se trata como dato 100%
 *                    verificado, porque depende del reloj del celular.
 * fechaHoraSincronizado : cuándo llegó de verdad al servidor. Esta SIEMPRE
 *                    la pone el motor (NOW()), nunca el cliente — es el
 *                    dato de auditoría confiable.
 */
public class HistorialAcceso {

    public static final int ORIGEN_ONLINE = 1;
    public static final int ORIGEN_OFFLINE_SINCRONIZADO = 2;

    private long idRegistro;
    private int idDispositivo;
    private int idTipoMovimiento;
    private int idOrigen;
    private LocalDateTime fechaHoraEvento;
    private LocalDateTime fechaHoraSincronizado;

    public HistorialAcceso() { }

    public long getIdRegistro()       { return idRegistro; }
    public void setIdRegistro(long v) { this.idRegistro = v; }

    public int getIdDispositivo()       { return idDispositivo; }
    public void setIdDispositivo(int v) { this.idDispositivo = v; }

    public int getIdTipoMovimiento()       { return idTipoMovimiento; }
    public void setIdTipoMovimiento(int v) { this.idTipoMovimiento = v; }

    public int getIdOrigen()       { return idOrigen; }
    public void setIdOrigen(int v) { this.idOrigen = v; }

    public LocalDateTime getFechaHoraEvento()       { return fechaHoraEvento; }
    public void setFechaHoraEvento(LocalDateTime v) { this.fechaHoraEvento = v; }

    public LocalDateTime getFechaHoraSincronizado()       { return fechaHoraSincronizado; }
    public void setFechaHoraSincronizado(LocalDateTime v) { this.fechaHoraSincronizado = v; }
}
