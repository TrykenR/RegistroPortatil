package co.edu.uniguajira.autogestion.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConexionBD {

    // Si Railway define las variables de entorno, las usa; de lo contrario usa localhost
    private static final String HOST = System.getenv("MYSQLHOST") != null ? System.getenv("MYSQLHOST") : "localhost";
    private static final String PUERTO = System.getenv("MYSQLPORT") != null ? System.getenv("MYSQLPORT") : "3306";
    private static final String BD = System.getenv("MYSQLDATABASE") != null ? System.getenv("MYSQLDATABASE") : "autogestion_portatiles";
    private static final String USUARIO = System.getenv("MYSQLUSER") != null ? System.getenv("MYSQLUSER") : "root";
    private static final String CLAVE = System.getenv("MYSQLPASSWORD") != null ? System.getenv("MYSQLPASSWORD") : "";

    static {
        try {
            // Cargar driver de MySQL
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("Error al cargar el driver de MySQL: " + e.getMessage());
        }
    }

    public static Connection obtenerConexion() throws SQLException {
        String url = String.format(
            "jdbc:mysql://%s:%s/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Bogota",
            HOST, PUERTO, BD
        );
        return DriverManager.getConnection(url, USUARIO, CLAVE);
    }
}
