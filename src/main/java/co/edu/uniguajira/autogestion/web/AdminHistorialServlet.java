package co.edu.uniguajira.autogestion.web;

import co.edu.uniguajira.autogestion.util.ConexionBD;
import co.edu.uniguajira.autogestion.util.JsonUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

/**
 * GET /api/admin/historial
 * Parámetros, TODOS opcionales — el que no venga simplemente no filtra:
 *   documento    -> busca por número de documento O código estudiantil
 *                   (coincidencia parcial, el buscador que pediste)
 *   marca, color, movimiento, origen -> coincidencia exacta contra los
 *                   catálogos (los mismos valores que devuelve /api/catalogos)
 *   fechaDesde, fechaHasta -> formato yyyy-MM-dd, filtran por
 *                   fecha_hora_evento (cuándo pasó, no cuándo se guardó)
 *   pagina       -> número de página, empezando en 1 (por defecto 1)
 *
 * Protegido por FiltroSesionAdmin: solo responde si ya hay sesión
 * iniciada por AdminLoginServlet.
 *
 * PAGINACIÓN (punto 5 de las mejoras): antes esto devolvía como mucho
 * 300 filas y ya — con meses de historial real eso se queda corto y,
 * peor, silencioso (el administrador no tenía forma de saber que había
 * más resultados sin verlos). Ahora se hacen DOS consultas: una cuenta
 * cuántas filas cumplen los filtros en total (totalRegistros), y otra
 * trae solo la página pedida con LIMIT/OFFSET. El frontend arma los
 * botones "Anterior/Siguiente" con ese total.
 *
 * SEGURIDAD: aunque los filtros son dinámicos (no siempre son los
 * mismos), el SQL NUNCA se arma concatenando el valor del filtro. Cada
 * pedazo de condición usa '?' y el valor real se agrega como parámetro
 * de PreparedStatement más abajo — la parte dinámica es solo CUÁLES
 * condiciones entran, no CÓMO entran.
 */
@WebServlet("/api/admin/historial")
public class AdminHistorialServlet extends HttpServlet {

    private static final int FILAS_POR_PAGINA = 25;
    private static final int FILAS_MAXIMAS_EXPORTACION = 10000;

    @Override
    protected void doGet(HttpServletRequest peticion, HttpServletResponse respuesta)
            throws IOException {

        respuesta.setContentType("application/json;charset=UTF-8");
        PrintWriter salida = respuesta.getWriter();

        StringBuilder condiciones = new StringBuilder(" WHERE 1=1");
        List<Object> parametros = new ArrayList<>();

        agregarFiltroDocumento(condiciones, parametros, peticion.getParameter("documento"));
        agregarFiltroExacto(condiciones, parametros, "marca", peticion.getParameter("marca"));
        agregarFiltroExacto(condiciones, parametros, "color", peticion.getParameter("color"));
        agregarFiltroExacto(condiciones, parametros, "movimiento", peticion.getParameter("movimiento"));
        agregarFiltroExacto(condiciones, parametros, "origen", peticion.getParameter("origen"));

        String fechaDesde = peticion.getParameter("fechaDesde");
        if (fechaDesde != null && !fechaDesde.isBlank()) {
            condiciones.append(" AND fecha_hora_evento >= ?");
            parametros.add(fechaDesde + " 00:00:00");
        }
        String fechaHasta = peticion.getParameter("fechaHasta");
        if (fechaHasta != null && !fechaHasta.isBlank()) {
            condiciones.append(" AND fecha_hora_evento <= ?");
            parametros.add(fechaHasta + " 23:59:59");
        }

        int pagina = 1;
        try {
            pagina = Math.max(1, Integer.parseInt(peticion.getParameter("pagina")));
        } catch (NumberFormatException ignorado) {
            // Si no viene o viene mal, se asume página 1 — no es un error
            // del usuario lo bastante grave como para rechazar la petición.
        }
        boolean exportar = "true".equalsIgnoreCase(peticion.getParameter("exportar"));
        int filasPorPagina = exportar ? FILAS_MAXIMAS_EXPORTACION : FILAS_POR_PAGINA;
        if (exportar) pagina = 1;
        int desplazamiento = (pagina - 1) * filasPorPagina;

        try (Connection cn = ConexionBD.obtenerConexion()) {

            long totalRegistros = contarTotal(cn, condiciones.toString(), parametros);

            String sqlPagina =
                "SELECT id_registro, numero_documento, codigo_estudiantil, estudiante, " +
                "       marca, color, movimiento, origen, " +
                "       fecha_hora_evento, fecha_hora_sincronizado, segundos_de_retraso " +
                "  FROM Vista_Historial_Accesos" + condiciones +
                " ORDER BY fecha_hora_evento DESC LIMIT ? OFFSET ?";

            StringJoiner filas = new StringJoiner(",", "[", "]");
            try (PreparedStatement ps = cn.prepareStatement(sqlPagina)) {
                int i = 1;
                for (Object valor : parametros) ps.setObject(i++, valor);
                ps.setInt(i++, filasPorPagina);
                ps.setInt(i, desplazamiento);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String doc = rs.getString("numero_documento");
                        String cod = rs.getString("codigo_estudiantil");

                        // Auto-clasificación si en BD quedó cruzado (ej. código que empieza con 0 guardado en doc)
                        if (doc != null && doc.trim().startsWith("0") && (cod == null || cod.isBlank())) {
                            cod = doc;
                            doc = null;
                        } else if (cod != null && !cod.trim().startsWith("0") && (doc == null || doc.isBlank())) {
                            doc = cod;
                            cod = null;
                        }

                        filas.add("{"
                            + JsonUtil.campo("id", rs.getLong("id_registro")) + ","
                            + JsonUtil.campo("documento", doc) + ","
                            + JsonUtil.campo("codigo", cod) + ","
                            + JsonUtil.campo("estudiante", rs.getString("estudiante")) + ","
                            + JsonUtil.campo("marca", rs.getString("marca")) + ","
                            + JsonUtil.campo("color", rs.getString("color")) + ","
                            + JsonUtil.campo("movimiento", rs.getString("movimiento")) + ","
                            + JsonUtil.campo("origen", rs.getString("origen")) + ","
                            + JsonUtil.campo("fechaEvento", String.valueOf(rs.getTimestamp("fecha_hora_evento"))) + ","
                            + JsonUtil.campo("fechaSincronizado", String.valueOf(rs.getTimestamp("fecha_hora_sincronizado"))) + ","
                            + JsonUtil.campo("segundosRetraso", rs.getLong("segundos_de_retraso"))
                            + "}");
                    }
                }
            }

            long totalPaginas = Math.max(1, (long) Math.ceil(totalRegistros / (double) filasPorPagina));

            salida.print("{"
                + JsonUtil.campo("ok", true) + ","
                + JsonUtil.campo("pagina", pagina) + ","
                + JsonUtil.campo("totalPaginas", totalPaginas) + ","
                + JsonUtil.campo("totalRegistros", totalRegistros) + ","
                + "\"registros\":" + filas + "}");

        } catch (SQLException e) {
            getServletContext().log("Error consultando historial (admin)", e);
            respuesta.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            salida.print(JsonUtil.error("No se pudo consultar el historial."));
        }
    }

    /** Cuenta cuántas filas cumplen los mismos filtros, sin traerlas todas. */
    private long contarTotal(Connection cn, String condiciones, List<Object> parametros)
            throws SQLException {
        String sql = "SELECT COUNT(*) FROM Vista_Historial_Accesos" + condiciones;
        try (PreparedStatement ps = cn.prepareStatement(sql)) {
            for (int i = 0; i < parametros.size(); i++) {
                ps.setObject(i + 1, parametros.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0L;
            }
        }
    }

    /** Agrega "AND columna = ?" solo si el valor vino en la petición. */
    private void agregarFiltroExacto(StringBuilder sql, List<Object> parametros,
                                     String columna, String valor) {
        if (valor != null && !valor.isBlank()) {
            sql.append(" AND ").append(columna).append(" = ?");
            parametros.add(valor);
        }
    }

    /**
     * Busca por número de documento, código estudiantil o nombre del
     * estudiante (coincidencia parcial). Escapa % y _ que el usuario pudiera escribir a mano,
     * para que no se interpreten como comodines de LIKE.
     */
    private void agregarFiltroDocumento(StringBuilder sql, List<Object> parametros, String valor) {
        if (valor == null || valor.isBlank()) return;

        String escapado = valor.replace("%", "\\%").replace("_", "\\_");
        String patron = "%" + escapado + "%";

        sql.append(" AND (numero_documento LIKE ? OR codigo_estudiantil LIKE ? OR estudiante LIKE ?)");
        parametros.add(patron);
        parametros.add(patron);
        parametros.add(patron);
    }
}
