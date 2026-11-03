package co.edu.uniguajira.autogestion.modelo;

/**
 * Dispositivo ya resuelto (marca y color como texto) para pintar en el
 * frontend. En la base de datos viven como FK a Marcas y Colores (3FN);
 * este objeto es la lectura cómoda que entrega la vista
 * Vista_Dispositivos_Estudiante.
 */
public class Dispositivo {

    private int idDispositivo;
    private String marca;
    private String color;
    private String codigoHex;
    private String alias;
    private String numeroSerie;
    private boolean reportadoHurto;
    private String fechaReporteHurto;
    private String motivoReporte;

    public Dispositivo() { }

    public int getIdDispositivo()       { return idDispositivo; }
    public void setIdDispositivo(int v) { this.idDispositivo = v; }

    public String getMarca()       { return marca; }
    public void setMarca(String v) { this.marca = v; }

    public String getColor()       { return color; }
    public void setColor(String v) { this.color = v; }

    public String getCodigoHex()       { return codigoHex; }
    public void setCodigoHex(String v) { this.codigoHex = v; }

    public String getAlias()       { return alias; }
    public void setAlias(String v) { this.alias = v; }

    public String getNumeroSerie()       { return numeroSerie; }
    public void setNumeroSerie(String v) { this.numeroSerie = v; }

    public boolean isReportadoHurto()          { return reportadoHurto; }
    public void setReportadoHurto(boolean v)   { this.reportadoHurto = v; }

    public String getFechaReporteHurto()       { return fechaReporteHurto; }
    public void setFechaReporteHurto(String v) { this.fechaReporteHurto = v; }

    public String getMotivoReporte()           { return motivoReporte; }
    public void setMotivoReporte(String v)     { this.motivoReporte = v; }

    /** Texto del check gigante: "ASUS - GRIS" */
    public String getEtiquetaVisual() {
        return marca + " - " + color;
    }
}
