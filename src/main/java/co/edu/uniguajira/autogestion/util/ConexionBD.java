package co.edu.uniguajira.autogestion.util;

import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConexionBD {

    static {
        try {
            // Cargar driver de MySQL
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("Error al cargar el driver de MySQL: " + e.getMessage());
        }
    }

    public static Connection obtenerConexion() throws SQLException {
        // 1. Prioridad: URI completa de Railway (MYSQL_URL, MYSQL_PRIVATE_URL o DATABASE_URL)
        String mysqlUrl = System.getenv("MYSQL_URL");
        if (mysqlUrl == null || mysqlUrl.isBlank()) {
            mysqlUrl = System.getenv("MYSQL_PRIVATE_URL");
        }
        if (mysqlUrl == null || mysqlUrl.isBlank()) {
            mysqlUrl = System.getenv("DATABASE_URL");
        }

        if (mysqlUrl != null && !mysqlUrl.isBlank()) {
            try {
                // Soporta formatos mysql://user:pass@host:port/dbname
                URI uri = new URI(mysqlUrl.replace("mysql://", "http://"));
                String host = uri.getHost();
                int puerto = uri.getPort() != -1 ? uri.getPort() : 3306;
                String path = uri.getPath();
                String bd = (path != null && path.length() > 1) ? path.substring(1) : "railway";
                
                String usuario = "";
                String clave = "";
                if (uri.getUserInfo() != null) {
                    String[] partes = uri.getUserInfo().split(":", 2);
                    usuario = partes[0];
                    clave = partes.length > 1 ? partes[1] : "";
                }

                String urlJdbc = String.format(
                    "jdbc:mysql://%s:%d/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Bogota&sessionVariables=time_zone='-05:00'",
                    host, puerto, bd
                );
                return DriverManager.getConnection(urlJdbc, usuario, clave);
            } catch (Exception e) {
                System.err.println("Aviso: No se pudo parsear URI de BD (" + e.getMessage() + "), probando variables individuales...");
            }
        }

        // 2. Respaldo: Variables de entorno individuales de Railway o localhost por defecto
        String host = System.getenv("MYSQLHOST") != null ? System.getenv("MYSQLHOST") : "localhost";
        String puerto = System.getenv("MYSQLPORT") != null ? System.getenv("MYSQLPORT") : "3306";
        String bd = System.getenv("MYSQLDATABASE") != null ? System.getenv("MYSQLDATABASE") : "autogestion_portatiles";
        String usuario = System.getenv("MYSQLUSER") != null ? System.getenv("MYSQLUSER") : "root";
        String clave = System.getenv("MYSQLPASSWORD") != null ? System.getenv("MYSQLPASSWORD") : "";

        String url = String.format(
            "jdbc:mysql://%s:%s/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Bogota&sessionVariables=time_zone='-05:00'",
            host, puerto, bd
        );
        return DriverManager.getConnection(url, usuario, clave);
    }
}
