/* =====================================================================
   admin.js · Panel de consulta del portero / administrador del servidor
   JavaScript puro, sin dependencias, igual que el resto del proyecto.

   Habla con tres endpoints, todos protegidos por sesión (ver
   FiltroSesionAdmin en el backend) excepto el de login, que es
   justamente el que crea la sesión:

     POST /api/admin/login     (usuario, clave)
     POST /api/admin/logout
     GET  /api/admin/historial (filtros opcionales por query string)

   La sesión la maneja el navegador solo (cookie JSESSIONID de Tomcat);
   este archivo no guarda ni maneja ningún token a mano.
   ===================================================================== */

'use strict';

/* Garantiza desde el primer instante que <html> tenga scroll habilitado.
   styles.css pone html,body { overflow: hidden } para la app de
   estudiantes. El panel admin es una página propia que sí necesita
   scroll vertical; el :has() en admin.css lo cubre en navegadores
   modernos pero este bloque lo garantiza en todos. */
document.documentElement.style.overflow = 'auto';
document.documentElement.style.height = 'auto';

const $ = (selector) => document.querySelector(selector);

// Paginación (punto 5): qué página se está viendo ahora mismo. Se
// reinicia a 1 cada vez que cambian los filtros (una búsqueda nueva
// siempre debería empezar desde el principio de sus propios resultados).
let paginaActual = 1;

// ── Temporizador de sesión y extensión (30 min / aviso a los 5 min) ──────────
const DURACION_SESION_MS = 30 * 60 * 1000;
const AVISO_ANTES_MS     =  5 * 60 * 1000;
let tiempoRestanteMs      = DURACION_SESION_MS;
let intervaloTemporizador = null;

// Mismo motivo que en app.js: el plan gratuito de Ngrok intercepta la
// primera visita de cada navegador con una página de aviso en HTML.
// Sin este encabezado, cualquiera de estos fetch() podría recibir esa
// página en vez del JSON real y romper el .json() de abajo.
const CABECERAS_NGROK = { 'ngrok-skip-browser-warning': 'true' };

function conCabecerasNgrok(opciones) {
    return {
        ...opciones,
        headers: { ...(opciones && opciones.headers), ...CABECERAS_NGROK }
    };
}

/* ---------------------------------------------------------------
   SISTEMA FUERA DE SERVICIO
   Si Tomcat, el computador o el túnel de Ngrok están caídos, no llega
   un JSON de la app sino una página HTML de error (la de Ngrok o la de
   Tomcat). Leerla como JSON mostraba "Unexpected token '<', <!DOCTYPE...".
   Los servlets de la app SIEMPRE contestan con content-type JSON, así
   que cualquier otra cosa significa que quien contestó no fue la app.
   --------------------------------------------------------------- */
const MENSAJE_FUERA_DE_SERVICIO =
    'El sistema está fuera de servicio por ahora. Inténtalo de nuevo más tarde.';

class ErrorFueraDeServicio extends Error {
    constructor() {
        super(MENSAJE_FUERA_DE_SERVICIO);
        this.name = 'ErrorFueraDeServicio';
    }
}

async function leerJson(respuesta) {
    const tipo = (respuesta.headers && respuesta.headers.get('content-type')) || '';
    if ([502, 503, 504].includes(respuesta.status) || !tipo.includes('json')) {
        throw new ErrorFueraDeServicio();
    }
    return respuesta.json();
}

/** Texto para el administrador según qué falló. */
function mensajeDeFalla(error) {
    return error instanceof ErrorFueraDeServicio
        ? error.message
        : 'No se pudo conectar con el servidor.';
}

/* ---------------------------------------------------------------
   Arranque: decide si mostrar el login o el panel
   --------------------------------------------------------------- */
async function iniciar() {
    $('#boton-entrar').addEventListener('click', intentarLogin);
    $('#campo-clave').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') intentarLogin();
    });
    $('#boton-salir').addEventListener('click', cerrarSesion);
    $('#boton-vista-estudiante')?.addEventListener('click', irAVistaEstudiante);
    $('#boton-extender-sesion')?.addEventListener('click', extenderSesion);
    $('#boton-cerrar-banner-sesion')?.addEventListener('click', cerrarSesion);

    $('#formulario-filtros').addEventListener('submit', (e) => {
        e.preventDefault();
        paginaActual = 1;
        buscar();
    });
    $('#boton-limpiar').addEventListener('click', limpiarFiltros);
    $('#boton-pagina-anterior').addEventListener('click', () => cambiarPagina(-1));
    $('#boton-pagina-siguiente').addEventListener('click', () => cambiarPagina(1));
    window.addEventListener('pagehide', cerrarSesionAlSalir);
    window.addEventListener('pageshow', alMostrarPagina);

    // Botón nativo Atrás del navegador: cierra sesión en el panel admin
    window.addEventListener('popstate', () => {
        if (!$('#vista-panel').hidden) {
            cerrarSesion();
        }
    });

    // Si ya hay una sesión viva (el navegador manda la cookie sola),
    // /api/admin/historial responde bien y saltamos directo al panel
    // sin pedir usuario/clave de nuevo.
    const haySesion = await probarSesionExistente();
    if (haySesion) {
        await mostrarPanel();
    }
}

async function probarSesionExistente() {
    try {
        const respuesta = await fetch('api/admin/historial?fechaDesde=9999-01-01', conCabecerasNgrok());
        // Solo cuenta como "sesión viva" un 200 de la app. Antes bastaba con
        // "no es 401", y con el servidor caído (404/502 de Ngrok) se mostraba
        // el panel vacío en vez del login.
        return respuesta.ok && (respuesta.headers.get('content-type') || '').includes('json');
    } catch (e) {
        return false;
    }
}

/* ---------------------------------------------------------------
   LOGIN
   --------------------------------------------------------------- */
async function intentarLogin() {
    const boton = $('#boton-entrar');
    const usuario = $('#campo-usuario').value.trim();
    const clave = $('#campo-clave').value;

    if (!usuario || !clave) {
        mostrarError('#error-login', 'Escribe usuario y contraseña.');
        return;
    }

    mostrarError('#error-login', '');
    boton.disabled = true;
    boton.textContent = 'Entrando…';

    try {
        const cuerpo = new URLSearchParams({ usuario, clave });
        const respuesta = await fetch('api/admin/login', conCabecerasNgrok({ method: 'POST', body: cuerpo }));
        const datos = await leerJson(respuesta);

        if (!datos.ok) {
            mostrarError('#error-login', datos.mensaje || 'Usuario o clave incorrectos.');
            return;
        }

        $('#campo-clave').value = '';
        await mostrarPanel();

    } catch (error) {
        mostrarError('#error-login', mensajeDeFalla(error));
    } finally {
        boton.disabled = false;
        boton.textContent = 'Entrar';
    }
}

async function cerrarSesion() {
    detenerTemporizador();
    try {
        await fetch('api/admin/logout', conCabecerasNgrok({ method: 'POST' }));
    } catch (e) { /* si falla la red, igual se limpia la vista local */ }

    volverAlLogin('');
}

async function irAVistaEstudiante() {
    detenerTemporizador();
    try {
        await fetch('api/admin/logout', conCabecerasNgrok({ method: 'POST', keepalive: true }));
    } catch (e) { /* ignorar fallo de red */ }
    window.location.href = 'index.html';
}

/** Oculta el panel, borra de la pantalla los datos que mostraba y muestra el login. */
function volverAlLogin(mensaje) {
    detenerTemporizador();
    // Restaura la restricción de scroll que tenía styles.css originalmente
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    $('#vista-panel').hidden = true;
    $('#vista-login').hidden = false;
    // Los datos de estudiantes no deben quedarse en la página mientras
    // esté "cerrada": se borran de la pantalla, no solo se ocultan.
    $('#cuerpo-tabla').innerHTML = '';
    $('#cuerpo-tabla-intentos').innerHTML = '';
    paginaActual = 1;
    mostrarError('#error-login', mensaje);
}

/* ---------------------------------------------------------------
   CERRAR LA SESIÓN AL SALIR DE LA PÁGINA

   'pagehide' se dispara cuando el administrador navega a otra página
   (por ejemplo, vuelve a la app de estudiantes), cierra la pestaña o
   recarga. En ese momento se avisa al servidor para que destruya la
   sesión, aunque no haya pulsado "Cerrar sesión".

   Se usa fetch con keepalive en vez de un fetch normal: el navegador
   cancela las peticiones normales cuando la página se descarga, pero
   deja terminar las que llevan keepalive. (Se prefiere a sendBeacon
   porque este no permite el encabezado que necesita Ngrok.)

   Consecuencias que conviene saber:
   - Recargar la página también cierra la sesión: hay que volver a
     entrar. Es el precio de que "salir" se detecte de forma fiable.
   - Si hay dos pestañas del panel abiertas, cerrar una cierra la
     sesión de la otra (la cookie de sesión es compartida).
   - No es infalible: si el navegador o el celular se apagan de golpe,
     el aviso no sale. Por eso se mantiene, de respaldo, el cierre
     automático por 30 minutos de inactividad en el servidor.
   --------------------------------------------------------------- */
function cerrarSesionAlSalir() {
    if ($('#vista-panel').hidden) return; // no había sesión iniciada aquí

    try {
        fetch('api/admin/logout', conCabecerasNgrok({ method: 'POST', keepalive: true }));
    } catch (e) {
        if (navigator.sendBeacon) navigator.sendBeacon('api/admin/logout');
    }
}

/**
 * Al volver con "atrás" a esta página, el navegador a veces la restaura
 * tal cual estaba (con la tabla llena) sin volver a cargarla. Como al
 * salir se cerró la sesión, hay que comprobarlo y no dejar a la vista
 * datos de una sesión que ya no existe.
 */
async function alMostrarPagina(evento) {
    if (!evento.persisted) return;
    if (!$('#vista-panel').hidden && !(await probarSesionExistente())) {
        volverAlLogin('Saliste de esta página, así que la sesión se cerró. Entra de nuevo.');
    }
}

async function mostrarPanel() {
    /* Garantiza que <html> también tenga scroll aunque styles.css lo bloquee.
       :has() en admin.css ya lo hace para navegadores modernos; esto cubre
       el resto (Firefox < 121, Chrome < 105, etc.). */
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';

    $('#vista-login').hidden = true;
    $('#vista-panel').hidden = false;
    history.pushState({ panelAdmin: true }, '', window.location.pathname);

    // Actualizar fecha en el encabezado
    const lblFecha = $('#dash-fecha-actual');
    if (lblFecha) {
        lblFecha.textContent = new Date().toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
    }

    iniciarTemporizador();

    // Scroll suave hacia los filtros y tabla para mostrar claramente el contenido
    setTimeout(() => {
        const elementoFiltros = $('#formulario-filtros') || $('.dash-card');
        if (elementoFiltros) {
            elementoFiltros.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 150);

    try {
        await cargarCatalogosFiltro();
    } catch (e) {
        console.warn('Error al cargar catálogos:', e);
    }

    try {
        await buscar();
    } catch (e) {
        console.warn('Error al buscar:', e);
    }

    try {
        await cargarIntentos();
    } catch (e) {
        console.warn('Error al cargar intentos:', e);
    }
}

/* ---------------------------------------------------------------
   TEMPORIZADOR Y EXTENSIÓN DE SESIÓN
   --------------------------------------------------------------- */
function iniciarTemporizador() {
    tiempoRestanteMs = DURACION_SESION_MS;
    actualizarVistaTemporizador();
    const banner = $('#banner-sesion-expira');
    if (banner) banner.hidden = true;

    if (intervaloTemporizador) clearInterval(intervaloTemporizador);
    intervaloTemporizador = setInterval(tickTemporizador, 1000);
}

function detenerTemporizador() {
    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
        intervaloTemporizador = null;
    }
    const banner = $('#banner-sesion-expira');
    if (banner) banner.hidden = true;
}

function tickTemporizador() {
    tiempoRestanteMs -= 1000;
    actualizarVistaTemporizador();

    const banner = $('#banner-sesion-expira');
    if (tiempoRestanteMs <= AVISO_ANTES_MS && tiempoRestanteMs > 0) {
        if (banner && banner.hidden) {
            banner.hidden = false;
        }
    }

    if (tiempoRestanteMs <= 0) {
        detenerTemporizador();
        cerrarSesion();
    }
}

function actualizarVistaTemporizador() {
    const totalSeg = Math.max(0, Math.floor(tiempoRestanteMs / 1000));
    const mm = Math.floor(totalSeg / 60);
    const ss = totalSeg % 60;
    const texto = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    const labelHeader = $('#temporizador-sesion');
    if (labelHeader) labelHeader.textContent = texto;

    const labelBanner = $('#banner-cuenta-regresiva');
    if (labelBanner) labelBanner.textContent = texto;
}

async function extenderSesion() {
    const boton = $('#boton-extender-sesion');
    if (boton) {
        boton.disabled = true;
        boton.textContent = 'Extendiendo…';
    }

    try {
        const res = await fetch('api/admin/historial?fechaDesde=9999-01-01', conCabecerasNgrok());
        if (res.status === 401) {
            cerrarSesion();
            return;
        }
        tiempoRestanteMs = DURACION_SESION_MS;
        actualizarVistaTemporizador();
        const banner = $('#banner-sesion-expira');
        if (banner) banner.hidden = true;
    } catch (e) {
        // Red
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Extender 30 min';
        }
    }
}

/* ---------------------------------------------------------------
   Catálogos para los selectores de Marca y Color
   Reutiliza el mismo endpoint público que usa la app del estudiante
   (/api/catalogos no requiere sesión — solo lista marcas y colores,
   no expone nada sensible).
   --------------------------------------------------------------- */
async function cargarCatalogosFiltro() {
    try {
        const respuesta = await fetch('api/catalogos', conCabecerasNgrok());
        const datos = await respuesta.json();
        if (!datos.ok) return;

        llenarSelectorFiltro('#filtro-marca', datos.marcas);
        llenarSelectorFiltro('#filtro-color', datos.colores);
    } catch (e) {
        // Si falla, los selectores se quedan solo con "Todas/Todos" —
        // el panel sigue siendo usable, solo sin ese filtro específico.
    }
}

function llenarSelectorFiltro(selector, items) {
    const elemento = $(selector);
    items.forEach((item) => {
        const opcion = document.createElement('option');
        opcion.value = item.nombre;
        opcion.textContent = item.nombre;
        elemento.appendChild(opcion);
    });
}

/* ---------------------------------------------------------------
   BÚSQUEDA
   --------------------------------------------------------------- */
async function buscar() {
    mostrarError('#error-panel', '');
    $('#resumen-resultados').textContent = 'Buscando…';

    const parametros = new URLSearchParams();
    agregarSiTieneValor(parametros, 'documento', $('#filtro-documento').value.trim());
    agregarSiTieneValor(parametros, 'marca', $('#filtro-marca').value);
    agregarSiTieneValor(parametros, 'color', $('#filtro-color').value);
    agregarSiTieneValor(parametros, 'movimiento', $('#filtro-movimiento').value);
    agregarSiTieneValor(parametros, 'origen', $('#filtro-origen').value);
    agregarSiTieneValor(parametros, 'fechaDesde', $('#filtro-desde').value);
    agregarSiTieneValor(parametros, 'fechaHasta', $('#filtro-hasta').value);
    parametros.set('pagina', paginaActual);

    try {
        const respuesta = await fetch('api/admin/historial?' + parametros.toString(), conCabecerasNgrok());

        if (respuesta.status === 401) {
            // La sesión venció (30 minutos de inactividad) o nunca existió.
            volverAlLogin('Tu sesión expiró. Entra de nuevo.');
            return;
        }

        const datos = await leerJson(respuesta);
        if (!datos.ok) {
            mostrarError('#error-panel', datos.mensaje || 'No se pudo consultar.');
            $('#resumen-resultados').textContent = '';
            return;
        }

        pintarResultados(datos.registros, datos.totalRegistros);
        actualizarControlesPaginacion(datos.pagina, datos.totalPaginas);
        actualizarKpiStats(datos.registros);

        // Renueva el reloj al interactuar con éxito
        tiempoRestanteMs = DURACION_SESION_MS;
        actualizarVistaTemporizador();
        const banner = $('#banner-sesion-expira');
        if (banner) banner.hidden = true;

    } catch (error) {
        mostrarError('#error-panel', mensajeDeFalla(error));
        $('#resumen-resultados').textContent = '';
    }
}

/** Cambia de página (delta: -1 anterior, +1 siguiente) y vuelve a buscar. */
function cambiarPagina(delta) {
    paginaActual = Math.max(1, paginaActual + delta);
    buscar();
}

function actualizarControlesPaginacion(pagina, totalPaginas) {
    const nav = $('#paginacion');
    if (totalPaginas <= 1) {
        nav.hidden = true;
        return;
    }
    nav.hidden = false;
    $('#texto-pagina-actual').textContent = `Página ${pagina} de ${totalPaginas}`;
    $('#boton-pagina-anterior').disabled = pagina <= 1;
    $('#boton-pagina-siguiente').disabled = pagina >= totalPaginas;
}

function agregarSiTieneValor(parametros, clave, valor) {
    if (valor) parametros.set(clave, valor);
}

function limpiarFiltros() {
    $('#formulario-filtros').reset();
    paginaActual = 1;
    buscar();
}

/* ---------------------------------------------------------------
   INTENTOS DE LOGIN (punto 9)
   --------------------------------------------------------------- */
async function cargarIntentos() {
    try {
        const respuesta = await fetch('api/admin/intentos', conCabecerasNgrok());
        if (respuesta.status === 401) return; // ya se maneja al buscar()

        const datos = await respuesta.json();
        if (!datos.ok) return;

        pintarIntentos(datos.intentos);
    } catch (error) {
        // No es crítico: el panel principal sigue siendo usable sin esto.
    }
}

function pintarIntentos(intentos) {
    const cuerpo = $('#cuerpo-tabla-intentos');
    cuerpo.innerHTML = '';

    if (intentos.length === 0) {
        const fila = document.createElement('tr');
        const celda = document.createElement('td');
        celda.colSpan = 4;
        celda.className = 'sin-resultados';
        celda.textContent = 'Todavía no hay intentos registrados.';
        fila.appendChild(celda);
        cuerpo.appendChild(fila);
        return;
    }

    intentos.forEach((intento) => {
        const fila = document.createElement('tr');
        fila.appendChild(celda(formatearFecha(intento.fecha)));
        fila.appendChild(celda(intento.usuario));
        fila.appendChild(celda(intento.ip));

        const celdaResultado = document.createElement('td');
        const chip = document.createElement('span');
        chip.className = 'chip-resultado ' + (intento.exitoso ? 'exitoso' : 'fallido');
        chip.textContent = intento.exitoso ? 'Exitoso' : 'Fallido';
        celdaResultado.appendChild(chip);
        fila.appendChild(celdaResultado);

        cuerpo.appendChild(fila);
    });
}

/* ---------------------------------------------------------------
   TABLA DE RESULTADOS
   --------------------------------------------------------------- */
function pintarResultados(registros, totalRegistros) {
    const cuerpo = $('#cuerpo-tabla');
    cuerpo.innerHTML = '';

    $('#resumen-resultados').textContent = totalRegistros === 1
        ? '1 registro encontrado.'
        : `${totalRegistros} registros encontrados.`;

    if (registros.length === 0) {
        const fila = document.createElement('tr');
        const celda = document.createElement('td');
        celda.colSpan = 7;
        celda.className = 'sin-resultados';
        celda.textContent = 'No hay registros que coincidan con estos filtros.';
        fila.appendChild(celda);
        cuerpo.appendChild(fila);
        return;
    }

    registros.forEach((registro) => {
        const fila = document.createElement('tr');

        fila.appendChild(celda(formatearFecha(registro.fechaEvento)));
        fila.appendChild(celda(registro.movimiento));
        fila.appendChild(celda(registro.estudiante));
        fila.appendChild(celda(registro.documento || '—'));
        fila.appendChild(celda(registro.codigo || '—'));
        fila.appendChild(celda(registro.marca + ' · ' + registro.color));

        const celdaOrigen = document.createElement('td');
        const chip = document.createElement('span');
        const esOffline = registro.origen === 'OFFLINE_SINCRONIZADO';
        chip.className = 'chip-origen ' + (esOffline ? 'offline' : 'online');
        chip.textContent = esOffline
            ? `Offline (+${registro.segundosRetraso}s)`
            : 'En línea';
        celdaOrigen.appendChild(chip);
        fila.appendChild(celdaOrigen);

        cuerpo.appendChild(fila);
    });
}

/* ---------------------------------------------------------------
   ACTUALIZACIÓN DE KPIs / STATS (estilo AdminDashboard.tsx)
   --------------------------------------------------------------- */
function actualizarKpiStats(registros) {
    if (!Array.isArray(registros)) return;

    let entradas = 0;
    let salidas = 0;
    let offline = 0;
    const equiposAdentro = new Set();

    registros.forEach(r => {
        if (r.movimiento === 'ENTRADA') {
            entradas++;
            equiposAdentro.add(r.documento + '-' + r.marca);
        } else if (r.movimiento === 'SALIDA') {
            salidas++;
            equiposAdentro.delete(r.documento + '-' + r.marca);
        }
        if (r.origen === 'OFFLINE_SINCRONIZADO') {
            offline++;
        }
    });

    const elEntradas = $('#kpi-entradas');
    if (elEntradas) elEntradas.textContent = entradas;

    const elSalidas = $('#kpi-salidas');
    if (elSalidas) elSalidas.textContent = salidas;

    const elAdentro = $('#kpi-adentro');
    if (elAdentro) elAdentro.textContent = Math.max(0, entradas - salidas);

    const elOffline = $('#kpi-offline');
    if (elOffline) elOffline.textContent = offline;

    const btnLimpiar = $('#boton-limpiar');
    if (btnLimpiar) {
        const hayFiltros = $('#filtro-documento').value ||
                           $('#filtro-marca').value ||
                           $('#filtro-color').value ||
                           $('#filtro-movimiento').value ||
                           $('#filtro-origen').value ||
                           $('#filtro-desde').value ||
                           $('#filtro-hasta').value;
        btnLimpiar.hidden = !hayFiltros;
    }
}

function celda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '—';
    const fecha = new Date(fechaIso.replace(' ', 'T'));
    return fecha.toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function mostrarError(idElemento, mensaje) {
    const elemento = $(idElemento);
    elemento.textContent = mensaje;
    elemento.hidden = !mensaje;
}

document.addEventListener('DOMContentLoaded', iniciar);
