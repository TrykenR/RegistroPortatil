package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.dao.AdministradorDAO;
import co.edu.uniguajira.autogestion.dao.IntentoLoginDAO;
import co.edu.uniguajira.autogestion.util.JsonUtil;
import co.edu.uniguajira.autogestion.util.UtilRed;
import org.mindrot.jbcrypt.BCrypt;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * POST /api/admin/login   (usuario, clave)
 *
 * Único punto de entrada al panel de consulta. Si la clave coincide con
 * el hash guardado, se crea una HttpSession — el resto de los endpoints
 * de /api/admin/* la exigen (ver FiltroSesionAdmin). Esta es la única
 * parte de todo el sistema que usa autenticación real con contraseña;
 * el resto de la app (el flujo del estudiante) es deliberadamente
 * autogestión sin clave, como pide el proyecto.
 *
 * La clave nunca se compara como texto: BCrypt.checkpw hace la
 * comparación contra el hash sin que la clave en texto plano quede
 * expuesta en ningún log ni en la base de datos.
 *
 * TODO intento se registra en Intentos_Login_Admin (punto 9 de las
 * mejoras) — exitoso o no, para que el panel pueda mostrar un patrón
 * de intentos fallidos si alguien está probando adivinar la clave.
 * FiltroLimiteIntentos, aparte, corta en seco tras 5 intentos en 15
 * minutos desde la misma IP — esta bitácora es evidencia, no la
 * defensa en sí misma.
 */
@WebServlet("/api/admin/login")
public class AdminLoginServlet extends HttpServlet {

    private final AdministradorDAO administradorDAO = new AdministradorDAO();
    private final IntentoLoginDAO intentoLoginDAO = new IntentoLoginDAO();

    @Override
    protected void doPost(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        String usuario = peticion.getParameter("usuario");
        String clave = peticion.getParameter("clave");
        String ip = UtilRed.obtenerIpCliente(peticion);

        if (usuario == null || usuario.isBlank() || clave == null || clave.isBlank()) {
            respuesta.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            salida.print(JsonUtil.error("Escribe usuario y clave."));
            return;
        }

        try {
            String hashGuardado = administradorDAO.buscarHashPorUsuario(usuario);
            boolean exitoso = hashGuardado != null && BCrypt.checkpw(clave, hashGuardado);

            // Se registra ANTES de responder: si algo falla más abajo, el
            // intento ya quedó en la bitácora — más vale un registro de
            // más que perder evidencia de un ataque en curso.
            intentoLoginDAO.registrar(usuario, ip, exitoso);

            // Mismo mensaje de error sin importar si falló el usuario o la
            // clave: decir "usuario no existe" le regala información gratis
            // a quien esté probando usuarios al azar.
            if (!exitoso) {
                respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                salida.print(JsonUtil.error("Usuario o clave incorrectos."));
                return;
            }

            HttpSession sesion = peticion.getSession(true);
            sesion.setAttribute("administradorAutenticado", usuario);
            // 30 minutos de inactividad y la sesión expira sola.
            sesion.setMaxInactiveInterval(30 * 60);

            salida.print("{" + JsonUtil.campo("ok", true) + "}");

        } catch (Exception e) {
            getServletContext().log("Error en login de administrador", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo iniciar sesión. Inténtalo de nuevo."));
        }
    }
}
