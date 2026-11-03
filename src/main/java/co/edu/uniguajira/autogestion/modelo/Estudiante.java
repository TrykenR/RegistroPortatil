package co.edu.uniguajira.autogestion.modelo;

/**
 * POJO de la tabla Estudiantes. No conoce SQL ni HTTP: el DAO lo llena,
 * el servlet lo serializa.
 */
public class Estudiante {

    private int idEstudiante;
    private String numeroDocumento;
    private String codigoEstudiantil;
    private String nombreCompleto;
    // Habeas Data (Ley 1581 de 2012): si aún no ha dado su consentimiento,
    // el flujo debe pedírselo antes de dejarlo avanzar.
    private boolean aceptoTratamientoDatos;
    private boolean tienePin;

    public Estudiante() { }

    public Estudiante(int idEstudiante, String numeroDocumento,
                      String codigoEstudiantil, String nombreCompleto,
                      boolean aceptoTratamientoDatos) {
        this(idEstudiante, numeroDocumento, codigoEstudiantil, nombreCompleto, aceptoTratamientoDatos, false);
    }

    public Estudiante(int idEstudiante, String numeroDocumento,
                      String codigoEstudiantil, String nombreCompleto,
                      boolean aceptoTratamientoDatos, boolean tienePin) {
        this.idEstudiante      = idEstudiante;
        this.numeroDocumento   = numeroDocumento;
        this.codigoEstudiantil = codigoEstudiantil;
        this.nombreCompleto    = nombreCompleto;
        this.aceptoTratamientoDatos = aceptoTratamientoDatos;
        this.tienePin          = tienePin;
    }

    public int getIdEstudiante()       { return idEstudiante; }
    public void setIdEstudiante(int v) { this.idEstudiante = v; }

    public String getNumeroDocumento()       { return numeroDocumento; }
    public void setNumeroDocumento(String v) { this.numeroDocumento = v; }

    public String getCodigoEstudiantil()       { return codigoEstudiantil; }
    public void setCodigoEstudiantil(String v) { this.codigoEstudiantil = v; }

    public String getNombreCompleto()       { return nombreCompleto; }
    public void setNombreCompleto(String v) { this.nombreCompleto = v; }

    public boolean isAceptoTratamientoDatos()       { return aceptoTratamientoDatos; }
    public void setAceptoTratamientoDatos(boolean v) { this.aceptoTratamientoDatos = v; }

    public boolean isTienePin()       { return tienePin; }
    public void setTienePin(boolean v) { this.tienePin = v; }
}
