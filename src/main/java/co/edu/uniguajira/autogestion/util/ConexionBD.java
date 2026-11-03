package co.edu.uniguajira.autogestion.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Punto único de conexión a MySQL/MariaDB. Todo el DAO pide sus
 * conexiones aquí, así que cambiar servidor o clave es un solo archivo.
 *
 * ESCENARIO NGROK: Ngrok solo expone el puerto de Tomcat (donde vive
 * este backend) hacia internet; MySQL sigue viviendo en localhost y
 * nunca se toca directo desde afuera. Por eso SERVIDOR sigue siendo
 * localhost/127.0.0.1 aunque el estudiante entre por una URL pública de
 * ngrok-free.app — Ngrok reenvía la petición HTTP a este mismo Tomcat,
 * que es quien de verdad habla con MySQL.
 *
 * Para producción conviene un pool (HikariCP o el DataSource de Tomcat
 * vía JNDI); DriverManager basta para el MVP.
 */
public class ConexionBD {

    private static final String SERVIDOR = "127.0.0.1";
    private static final String PUERTO   = "3307";
    private static final String BD       = "autogestion_portatiles";

    private static final String URL =
            "jdbc:mysql://" + SERVIDOR + ":" + PUERTO + "/" + BD
            + "?useSSL=false"
            // MySQL 8 usa por defecto el método de autenticación
            // 'caching_sha2_password', que necesita poder pedirle al
            // servidor su clave pública para cifrar la contraseña en la
            // conexión inicial. Sin SSL, el driver JDBC de Java bloquea
            // esa petición por seguridad a menos que se le permita
            // explícitamente con esta bandera. El cliente de línea de
            // comandos 'mysql' no tiene esta restricción, por eso
            // conectaba bien desde la terminal mientras la aplicación
            // Java fallaba con "Public Key Retrieval is not allowed".
            + "&allowPublicKeyRetrieval=true"
            + "&serverTimezone=America/Bogota"
            + "&characterEncoding=UTF-8";

    private static final String USUARIO = "app_autogestion";
    private static final String CLAVE   = "cambiar_esta_clave";

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");   // mysql-connector-j
        } catch (ClassNotFoundException e) {
            throw new ExceptionInInitializerError(
                    "No se encontró el driver JDBC de MySQL: " + e.getMessage());
        }
    }

    private ConexionBD() { }

    public static Connection obtenerConexion() throws SQLException {
        return DriverManager.getConnection(URL, USUARIO, CLAVE);
    }
}
