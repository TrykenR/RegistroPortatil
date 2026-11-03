package co.edu.uniguajira.autogestion.modelo;

import java.util.Date;

/**
 * POJO de la tabla Dispositivos_Estudiante.
 */
public class Dispositivo {

    private int idDispositivo;
    private int idEstudiante;
    private int idMarca;
    private int idColor;
    private String alias;
    private String numeroSerie;
    private boolean reportadoHurto;
    private Date fechaReporteHurto;
    private String motivoReporte;
    private String marca;
    private String color;

    public Dispositivo() { }

    public Dispositivo(int idDispositivo, int idEstudiante, int idMarca, int idColor, 
                       String alias, String numeroSerie, boolean reportadoHurto, 
                       Date fechaReporteHurto, String motivoReporte, String marca, String color) {
        this.idDispositivo = idDispositivo;
        this.idEstudiante = idEstudiante;
        this.idMarca = idMarca;
        this.idColor = idColor;
        this.alias = alias;
        this.numeroSerie = numeroSerie;
        this.reportadoHurto = reportadoHurto;
        this.fechaReporteHurto = fechaReporteHurto;
        this.motivoReporte = motivoReporte;
        this.marca = marca;
        this.color = color;
    }

    // Getters y Setters
    public int getIdDispositivo() { return idDispositivo; }
    public void setIdDispositivo(int idDispositivo) { this.idDispositivo = idDispositivo; }

    public int getIdEstudiante() { return idEstudiante; }
    public void setIdEstudiante(int idEstudiante) { this.idEstudiante = idEstudiante; }

    public int getIdMarca() { return idMarca; }
    public void setIdMarca(int idMarca) { this.idMarca = idMarca; }

    public int getIdColor() { return idColor; }
    public void setIdColor(int idColor) { this.idColor = idColor; }

    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }

    public String getNumeroSerie() { return numeroSerie; }
    public void setNumeroSerie(String numeroSerie) { this.numeroSerie = numeroSerie; }

    public boolean isReportadoHurto() { return reportadoHurto; }
    public void setReportadoHurto(boolean reportadoHurto) { this.reportadoHurto = reportadoHurto; }

    public Date getFechaReporteHurto() { return fechaReporteHurto; }
    public void setFechaReporteHurto(Date fechaReporteHurto) { this.fechaReporteHurto = fechaReporteHurto; }

    public String getMotivoReporte() { return motivoReporte; }
    public void setMotivoReporte(String motivoReporte) { this.motivoReporte = motivoReporte; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
