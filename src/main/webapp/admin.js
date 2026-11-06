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

// ── Monitoreo en tiempo real de nuevos registros y alertas (polling liviano cada 15s) ──
let ultimoIdVisto = 0;
let contadorNovedades = 0;
let ultimoIdAlertaVisto = 0;
let contadorNovedadesAlertas = 0;
let intervaloMonitoreo = null;

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
    $('#btn-recarga-automatica')?.addEventListener('click', () => {
        resetearNovedades();
        buscar();
        cargarResumen();
        cargarAlertas();
        cargarIntentos();
    });

    $('#formulario-filtros').addEventListener('submit', (e) => {
        e.preventDefault();
        paginaActual = 1;
        buscar();
    });
    $('#boton-limpiar').addEventListener('click', limpiarFiltros);
    $('#boton-exportar').addEventListener('click', exportarCsv);
    $('#boton-actualizar-alertas').addEventListener('click', () => {
        resetearNovedadesAlertas();
        cargarAlertas();
        cargarResumen();
    });
    $('#boton-ver-todas-alertas').addEventListener('click', () => {
        alertasExpandidas = !alertasExpandidas;
        pintarAlertas(ultimasAlertas);
    });
    document.querySelectorAll('.chip-rango').forEach((chip) => {
        chip.addEventListener('click', () => aplicarRangoRapido(chip.dataset.rango));
    });
    ['#filtro-desde', '#filtro-hasta'].forEach((selector) => {
        // Cambiar una fecha a mano deja de ser un atajo ("Hoy", "Ayer"...)
        $(selector).addEventListener('input', () => {
            rangoActivo = '';
            actualizarChipsRango();
        });
    });
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

    // Inicializar control de tema en admin
    iniciarControlTemaAdmin();

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
    detenerMonitoreoTiempoReal();
    resetearNovedades();
    resetearNovedadesAlertas();
    // Restaura la restricción de scroll que tenía styles.css originalmente
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    $('#vista-panel').hidden = true;
    $('#vista-login').hidden = false;
    // Los datos de estudiantes no deben quedarse en la página mientras
    // esté "cerrada": se borran de la pantalla, no solo se ocultan.
    $('#cuerpo-tabla').innerHTML = '';
    $('#cuerpo-tabla-intentos').innerHTML = '';
    $('#lista-alertas').innerHTML = '';
    ultimasAlertas = [];
    ['#grafica-entradas', '#grafica-salidas'].forEach((selector) => { $(selector).innerHTML = ''; });
    ['#kpi-entradas', '#kpi-salidas', '#kpi-adentro', '#kpi-offline'].forEach((selector) => { $(selector).textContent = '0'; });
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

    // Los selectores ya tienen sus opciones: se pueden restaurar los filtros guardados
    restaurarFiltros();

    try {
        await buscar();
    } catch (e) {
        console.warn('Error al buscar:', e);
    }

    cargarResumen();
    cargarAlertas();

    try {
        await cargarIntentos();
    } catch (e) {
        console.warn('Error al cargar intentos:', e);
    }

    iniciarMonitoreoTiempoReal();
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
   MONITOREO EN TIEMPO REAL (POLLING LIVIANO CADA 15s)
   --------------------------------------------------------------- */
function iniciarMonitoreoTiempoReal() {
    detenerMonitoreoTiempoReal();
    intervaloMonitoreo = setInterval(verificarNovedadesTiempoReal, 15000);
}

function detenerMonitoreoTiempoReal() {
    if (intervaloMonitoreo) {
        clearInterval(intervaloMonitoreo);
        intervaloMonitoreo = null;
    }
}

async function verificarNovedadesTiempoReal() {
    if ($('#vista-panel').hidden) return;
    try {
        // 1. Verificar registros de historial nuevos
        const resHistorial = await fetch('api/admin/historial?pagina=1', conCabecerasNgrok());
        if (resHistorial.ok) {
            const datosH = await resHistorial.json();
            if (datosH.ok && datosH.registros && datosH.registros.length) {
                const maxIdServidor = Number(datosH.registros[0].id) || 0;
                if (ultimoIdVisto > 0 && maxIdServidor > ultimoIdVisto) {
                    const nuevos = datosH.registros.filter((r) => Number(r.id) > ultimoIdVisto).length;
                    contadorNovedades += nuevos;
                    ultimoIdVisto = maxIdServidor;
                    actualizarBadgeNovedades();
                } else if (ultimoIdVisto === 0) {
                    ultimoIdVisto = maxIdServidor;
                }
            }
        }

        // 2. Verificar alertas de seguridad nuevas (ej. reporte de hurto)
        const resAlertas = await fetch('api/admin/alertas', conCabecerasNgrok());
        if (resAlertas.ok) {
            const datosA = await resAlertas.json();
            if (datosA.ok && Array.isArray(datosA.alertas)) {
                const maxIdAlertaServidor = datosA.alertas.reduce((max, a) => Math.max(max, Number(a.idAlerta) || 0), 0);
                if (ultimoIdAlertaVisto > 0 && maxIdAlertaServidor > ultimoIdAlertaVisto) {
                    const nuevasAlertas = datosA.alertas.filter((a) => Number(a.idAlerta) > ultimoIdAlertaVisto).length;
                    contadorNovedadesAlertas += nuevasAlertas;
                    ultimoIdAlertaVisto = maxIdAlertaServidor;
                    actualizarBadgeNovedadesAlertas();
                } else if (ultimoIdAlertaVisto === 0) {
                    ultimoIdAlertaVisto = maxIdAlertaServidor;
                }
            }
        }
    } catch (e) {
        // Ignorar fallas temporales de red en el polling
    }
}

function actualizarBadgeNovedades() {
    const btn = $('#btn-recarga-automatica');
    const badge = $('#badge-novedades');
    if (!btn || !badge) return;

    if (contadorNovedades > 0) {
        btn.classList.add('tiene-novedades');
        badge.hidden = false;
        badge.textContent = contadorNovedades > 99 ? '99+' : String(contadorNovedades);
    } else {
        btn.classList.remove('tiene-novedades');
        badge.hidden = true;
        badge.textContent = '0';
    }
}

function resetearNovedades() {
    contadorNovedades = 0;
    actualizarBadgeNovedades();
}

function actualizarBadgeNovedadesAlertas() {
    const btn = $('#boton-actualizar-alertas');
    const badge = $('#badge-novedades-alertas');
    if (!btn) return;

    if (contadorNovedadesAlertas > 0) {
        btn.classList.add('tiene-novedades');
        if (badge) {
            badge.hidden = false;
            badge.textContent = contadorNovedadesAlertas > 99 ? '99+' : String(contadorNovedadesAlertas);
        }
    } else {
        btn.classList.remove('tiene-novedades');
        if (badge) {
            badge.hidden = true;
            badge.textContent = '0';
        }
    }
}

function resetearNovedadesAlertas() {
    contadorNovedadesAlertas = 0;
    actualizarBadgeNovedadesAlertas();
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

    const parametros = parametrosDeFiltro();
    parametros.set('pagina', paginaActual);
    guardarFiltros();
    actualizarChipsRango();

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
        actualizarBotonLimpiar();
        // Si el servidor no tiene /api/admin/resumen, las tarjetas se calculan con esta página
        if (!resumenDisponible) actualizarKpiStats(datos.registros);

        // Actualizar último ID visto en la primera página
        if (paginaActual === 1 && datos.registros && datos.registros.length > 0) {
            const idPrimero = Number(datos.registros[0].id) || 0;
            if (idPrimero > ultimoIdVisto) {
                ultimoIdVisto = idPrimero;
            }
        }

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
    rangoActivo = '';
    try { localStorage.removeItem(CLAVE_FILTROS); } catch (e) { /* ignorar */ }
    paginaActual = 1;
    buscar();
}

/** Filtros del formulario como parámetros de /api/admin/historial. */
function parametrosDeFiltro() {
    const parametros = new URLSearchParams();
    agregarSiTieneValor(parametros, 'documento', $('#filtro-documento').value.trim());
    agregarSiTieneValor(parametros, 'marca', $('#filtro-marca').value);
    agregarSiTieneValor(parametros, 'color', $('#filtro-color').value);
    agregarSiTieneValor(parametros, 'movimiento', $('#filtro-movimiento').value);
    agregarSiTieneValor(parametros, 'origen', $('#filtro-origen').value);
    agregarSiTieneValor(parametros, 'fechaDesde', $('#filtro-desde').value);
    agregarSiTieneValor(parametros, 'fechaHasta', $('#filtro-hasta').value);
    return parametros;
}

function actualizarBotonLimpiar() {
    const hayFiltros = ['#filtro-documento', '#filtro-marca', '#filtro-color', '#filtro-movimiento',
        '#filtro-origen', '#filtro-desde', '#filtro-hasta'].some((selector) => $(selector).value);
    $('#boton-limpiar').hidden = !hayFiltros;
}

/* ---------------------------------------------------------------
   FILTROS RECORDADOS Y ATAJOS DE FECHA
   Se recuerdan en este navegador marca, color, movimiento, origen y
   fechas. La búsqueda por nombre o documento NO se guarda, para no
   dejar datos personales en un computador compartido de portería.
   --------------------------------------------------------------- */
const CLAVE_FILTROS = 'panel_filtros_v1';
const CAMPOS_RECORDADOS = {
    marca: '#filtro-marca',
    color: '#filtro-color',
    movimiento: '#filtro-movimiento',
    origen: '#filtro-origen',
    desde: '#filtro-desde',
    hasta: '#filtro-hasta'
};
let rangoActivo = '';

function guardarFiltros() {
    const filtros = { rango: rangoActivo };
    Object.entries(CAMPOS_RECORDADOS).forEach(([clave, selector]) => {
        filtros[clave] = $(selector).value;
    });
    try { localStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros)); } catch (e) { /* ignorar */ }
}

function restaurarFiltros() {
    let filtros = null;
    try { filtros = JSON.parse(localStorage.getItem(CLAVE_FILTROS) || 'null'); } catch (e) { filtros = null; }
    if (!filtros) return;

    Object.entries(CAMPOS_RECORDADOS).forEach(([clave, selector]) => {
        const campo = $(selector);
        const valor = filtros[clave] || '';
        // Un valor que ya no existe en el catálogo se ignora
        if (campo.tagName === 'SELECT' && valor && !Array.from(campo.options).some((o) => o.value === valor)) return;
        campo.value = valor;
    });

    // "Hoy", "Ayer" y "Esta semana" se recalculan: mañana "Hoy" sigue siendo hoy
    if (filtros.rango) {
        const fechas = calcularRango(filtros.rango);
        if (fechas) {
            rangoActivo = filtros.rango;
            $('#filtro-desde').value = fechas.desde;
            $('#filtro-hasta').value = fechas.hasta;
        }
    }
    actualizarChipsRango();
}

function fechaLocalIso(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function calcularRango(rango) {
    const hoy = new Date();
    if (rango === 'hoy') {
        return { desde: fechaLocalIso(hoy), hasta: fechaLocalIso(hoy) };
    }
    if (rango === 'ayer') {
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        return { desde: fechaLocalIso(ayer), hasta: fechaLocalIso(ayer) };
    }
    if (rango === 'semana') {
        // La semana empieza el lunes
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
        return { desde: fechaLocalIso(lunes), hasta: fechaLocalIso(hoy) };
    }
    return null;
}

function aplicarRangoRapido(rango) {
    if (rangoActivo === rango) {
        // Tocar el atajo activo lo quita
        rangoActivo = '';
        $('#filtro-desde').value = '';
        $('#filtro-hasta').value = '';
    } else {
        const fechas = calcularRango(rango);
        if (!fechas) return;
        rangoActivo = rango;
        $('#filtro-desde').value = fechas.desde;
        $('#filtro-hasta').value = fechas.hasta;
    }
    paginaActual = 1;
    buscar();
}

function actualizarChipsRango() {
    document.querySelectorAll('.chip-rango').forEach((chip) => {
        chip.setAttribute('aria-pressed', String(chip.dataset.rango === rangoActivo));
    });
}

/* ---------------------------------------------------------------
   EXPORTAR CSV (con los filtros aplicados)
   --------------------------------------------------------------- */
async function exportarCsv() {
    const boton = $('#boton-exportar');
    const textoOriginal = boton.innerHTML;
    boton.disabled = true;
    boton.textContent = 'Exportando…';
    mostrarError('#error-panel', '');

    try {
        const parametros = parametrosDeFiltro();
        parametros.set('exportar', 'true');
        const respuesta = await fetch('api/admin/historial?' + parametros.toString(), conCabecerasNgrok());
        if (respuesta.status === 401) {
            volverAlLogin('Tu sesión expiró. Entra de nuevo.');
            return;
        }
        const datos = await leerJson(respuesta);
        if (!datos.ok) {
            mostrarError('#error-panel', datos.mensaje || 'No se pudo exportar.');
            return;
        }
        if (!datos.registros.length) {
            mostrarError('#error-panel', 'No hay registros para exportar con estos filtros.');
            return;
        }

        descargarCsv(datos.registros);

        if (datos.totalRegistros > datos.registros.length) {
            mostrarError('#error-panel',
                `Se exportaron los ${datos.registros.length.toLocaleString('es-CO')} registros más recientes de ` +
                `${datos.totalRegistros.toLocaleString('es-CO')}. Acota las fechas para exportar el resto.`);
        }
    } catch (error) {
        mostrarError('#error-panel', mensajeDeFalla(error));
    } finally {
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    }
}

function descargarCsv(registros) {
    // Punto y coma: Excel en español lo abre en columnas sin configurar nada
    const SEPARADOR = ';';
    const encabezados = ['Fecha', 'Movimiento', 'Estudiante', 'Documento', 'Código', 'Marca', 'Color', 'Serial', 'Descripción / Alias', 'Origen', 'Retraso (s)'];

    const celdaCsv = (valor) => {
        let texto = valor === null || valor === undefined ? '' : String(valor);
        // Evita que Excel interprete el contenido como fórmula
        if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
        return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };

    const filas = registros.map((r) => [
        (r.fechaEvento || '').replace('T', ' ').slice(0, 19),
        r.movimiento,
        r.estudiante,
        r.documento || '',
        r.codigo || '',
        r.marca,
        r.color,
        r.serial || 'Desconocido',
        r.descripcion || '',
        r.origen === 'OFFLINE_SINCRONIZADO' ? 'Offline sincronizado' : 'En línea',
        r.origen === 'OFFLINE_SINCRONIZADO' ? r.segundosRetraso : 0
    ].map(celdaCsv).join(SEPARADOR));

    const contenido = '\uFEFF' + [encabezados.join(SEPARADOR), ...filas].join('\r\n');
    const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `historial-accesos-${fechaLocalIso(new Date())}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

/* ---------------------------------------------------------------
   RESUMEN DEL DÍA Y GRÁFICAS POR HORA
   --------------------------------------------------------------- */
const HORA_INICIO_GRAFICA = 6;
const HORA_FIN_GRAFICA = 21;
let resumenDisponible = false;

async function cargarResumen() {
    try {
        const respuesta = await fetch('api/admin/resumen', conCabecerasNgrok());
        if (!respuesta.ok) return;
        const datos = await leerJson(respuesta);
        if (!datos.ok) return;

        resumenDisponible = true;
        $('#kpi-entradas').textContent = datos.entradas;
        $('#kpi-salidas').textContent = datos.salidas;
        $('#kpi-adentro').textContent = datos.adentro;
        $('#kpi-offline').textContent = datos.offline;
        pintarGraficaHoras('#grafica-entradas', datos.porHora, 'entradas', 'entrada');
        pintarGraficaHoras('#grafica-salidas', datos.porHora, 'salidas', 'salida');
    } catch (e) {
        // Servidor sin /api/admin/resumen: las tarjetas se calculan con la página actual
    }
}

function etiquetaHora(hora) {
    const sufijo = hora >= 12 ? 'p. m.' : 'a. m.';
    return `${hora % 12 === 0 ? 12 : hora % 12} ${sufijo}`;
}

function pintarGraficaHoras(selector, porHora, campo, singular) {
    const contenedor = $(selector);
    if (!contenedor || !Array.isArray(porHora)) return;

    const horas = [];
    for (let h = HORA_INICIO_GRAFICA; h <= HORA_FIN_GRAFICA; h++) {
        const fila = porHora.find((item) => Number(item.hora) === h);
        horas.push({ hora: h, total: fila ? Number(fila[campo]) || 0 : 0 });
    }
    const maximo = Math.max(1, ...horas.map((h) => h.total));
    const horaActual = new Date().getHours();
    const ancho = 100 / horas.length;

    const barras = horas.map((h, i) => {
        const alto = h.total ? Math.max(3, (h.total / maximo) * 34) : 2;
        const clase = h.hora === horaActual ? 'barra actual' : h.total ? 'barra' : 'barra vacia';
        const descripcion = `${etiquetaHora(h.hora)}: ${h.total} ${singular}${h.total === 1 ? '' : 's'}`;
        return `<rect class="${clase}" x="${(i * ancho + ancho * 0.18).toFixed(2)}" y="${(36 - alto).toFixed(2)}" ` +
               `width="${(ancho * 0.64).toFixed(2)}" height="${alto.toFixed(2)}" rx="1.2"><title>${descripcion}</title></rect>`;
    }).join('');

    const pico = horas.reduce((mejor, h) => (h.total > mejor.total ? h : mejor), horas[0]);
    contenedor.setAttribute('aria-label', pico.total
        ? `${singular[0].toUpperCase() + singular.slice(1)}s por hora de hoy. Hora pico: ${etiquetaHora(pico.hora)} con ${pico.total}.`
        : `Todavía no hay ${singular}s hoy.`);
    contenedor.innerHTML = `<svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">${barras}</svg>` +
        `<div class="kpi-grafica-eje" aria-hidden="true"><span>${etiquetaHora(HORA_INICIO_GRAFICA)}</span>` +
        `<span>${etiquetaHora(HORA_FIN_GRAFICA)}</span></div>`;
}

/* ---------------------------------------------------------------
   ALERTAS DE SEGURIDAD
   --------------------------------------------------------------- */
const ALERTAS_VISIBLES = 4;
let ultimasAlertas = [];
let alertasExpandidas = false;

const TIPOS_ALERTA = {
    HURTO: { etiqueta: 'Reportado por hurto', clase: 'hurto' },
    DISCREPANCIA_SALIDA: { etiqueta: 'Salida sin entrada registrada', clase: 'discrepancia' }
};

async function cargarAlertas() {
    const boton = $('#boton-actualizar-alertas');
    boton.disabled = true;
    try {
        const respuesta = await fetch('api/admin/alertas', conCabecerasNgrok());
        if (respuesta.status === 401) return;
        const datos = await leerJson(respuesta);
        if (!datos.ok) throw new Error(datos.mensaje);
        ultimasAlertas = datos.alertas || [];
        pintarAlertas(ultimasAlertas);
    } catch (error) {
        $('#resumen-alertas').textContent = 'No se pudieron cargar las alertas.';
    } finally {
        boton.disabled = false;
    }
}

function pintarAlertas(alertas) {
    const lista = $('#lista-alertas');
    const contador = $('#contador-alertas');
    const verTodas = $('#boton-ver-todas-alertas');
    lista.innerHTML = '';

    const hurtos = alertas.filter((a) => a.tipoAlerta === 'HURTO').length;
    contador.hidden = alertas.length === 0;
    contador.textContent = alertas.length;
    contador.classList.toggle('con-hurtos', hurtos > 0);
    $('#seccion-alertas').classList.toggle('con-hurtos', hurtos > 0);

    if (alertas.length === 0) {
        $('#resumen-alertas').textContent = 'Sin alertas. Todo en orden.';
        verTodas.hidden = true;
        const vacio = document.createElement('li');
        vacio.className = 'alerta-vacia';
        vacio.innerHTML = ILUSTRACIONES_VACIO.escudo +
            '<p class="estado-vacio-titulo">No hay equipos reportados.</p>' +
            '<p class="estado-vacio-detalle">Los reportes de hurto y las salidas sin entrada aparecerán aquí.</p>';
        lista.appendChild(vacio);
        return;
    }

    $('#resumen-alertas').textContent = hurtos
        ? `${hurtos} ${hurtos === 1 ? 'equipo reportado' : 'equipos reportados'} por hurto · ${alertas.length} en total`
        : `${alertas.length} ${alertas.length === 1 ? 'alerta reciente' : 'alertas recientes'}`;

    // Los hurtos van primero; dentro de cada grupo, la más reciente arriba
    const ordenadas = [...alertas].sort((a, b) => {
        const prioridad = (x) => (x.tipoAlerta === 'HURTO' ? 0 : 1);
        return prioridad(a) - prioridad(b) || String(b.fecha).localeCompare(String(a.fecha));
    });
    const visibles = alertasExpandidas ? ordenadas : ordenadas.slice(0, ALERTAS_VISIBLES);

    visibles.forEach((alerta) => {
        const tipo = TIPOS_ALERTA[alerta.tipoAlerta] || {
            etiqueta: (alerta.tipoAlerta || 'Alerta').replace(/_/g, ' ').toLowerCase(),
            clase: 'otra'
        };

        const item = document.createElement('li');
        item.className = `alerta alerta-${tipo.clase}`;

        const icono = document.createElement('span');
        icono.className = 'alerta-icono';
        icono.setAttribute('aria-hidden', 'true');
        icono.innerHTML = tipo.clase === 'hurto'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

        const cuerpo = document.createElement('div');
        cuerpo.className = 'alerta-cuerpo';

        const cabecera = document.createElement('p');
        cabecera.className = 'alerta-cabecera';
        const etiqueta = document.createElement('span');
        etiqueta.className = 'alerta-tipo';
        etiqueta.textContent = tipo.etiqueta;
        const fecha = document.createElement('time');
        fecha.className = 'alerta-fecha';
        fecha.textContent = formatearFecha(alerta.fecha);
        cabecera.append(etiqueta, fecha);

        const estudiante = document.createElement('p');
        estudiante.className = 'alerta-estudiante';
        const identificador = alerta.documento || alerta.codigo;
        estudiante.textContent = identificador ? `${alerta.estudiante} · ${identificador}` : alerta.estudiante;

        const equipo = document.createElement('p');
        equipo.className = 'alerta-equipo';
        const serie = alerta.serial && alerta.serial !== 'S/N' ? ` · Serie ${alerta.serial}` : '';
        equipo.textContent = `${alerta.marca} · ${alerta.color}${serie}`;

        cuerpo.append(cabecera, estudiante, equipo);
        if (alerta.descripcion) {
            const descripcion = document.createElement('p');
            descripcion.className = 'alerta-descripcion';
            descripcion.textContent = alerta.descripcion;
            cuerpo.appendChild(descripcion);
        }

        // Acciones de administración / portería sobre la alerta
        if (alerta.idDispositivo) {
            const barraAcciones = document.createElement('div');
            barraAcciones.className = 'alerta-acciones-portero';
            barraAcciones.style.marginTop = '8px';
            barraAcciones.style.display = 'flex';
            barraAcciones.style.flexWrap = 'wrap';
            barraAcciones.style.gap = '8px';

            // 1. Botón para levantar/cancelar alerta de hurto (equipo recuperado)
            if (alerta.tipoAlerta === 'HURTO') {
                const btnLevantar = document.createElement('button');
                btnLevantar.type = 'button';
                btnLevantar.className = 'btn-mini-alerta';
                btnLevantar.style.borderColor = 'var(--teal-soft)';
                btnLevantar.style.color = 'var(--teal-dark)';
                btnLevantar.textContent = 'Levantar alerta (Recuperado)';
                btnLevantar.onclick = async () => {
                    if (confirm(`¿Levantar la alerta de hurto del equipo ${alerta.marca} (${alerta.estudiante})? El equipo volverá a estar habilitado.`)) {
                        btnLevantar.disabled = true;
                        try {
                            const res = await fetch('api/admin/alertas', conCabecerasNgrok({
                                method: 'POST',
                                body: new URLSearchParams({ accion: 'levantar_hurto', idDispositivo: alerta.idDispositivo })
                            }));
                            const dat = await res.json();
                            alert(dat.mensaje || 'Alerta levantada exitosamente');
                            // Limpiar de la lista local inmediatamente para feedback instantáneo
                            ultimasAlertas = ultimasAlertas.filter((a) => a.idDispositivo !== alerta.idDispositivo);
                            pintarAlertas(ultimasAlertas);
                            await cargarAlertas();
                            cargarResumen();
                            buscar();
                        } catch (e) {
                            alert('Error: ' + e.message);
                        } finally {
                            btnLevantar.disabled = false;
                        }
                    }
                };
                barraAcciones.appendChild(btnLevantar);
            }

            // 2. Botón para desactivar equipo del sistema
            const btnDesactivar = document.createElement('button');
            btnDesactivar.type = 'button';
            btnDesactivar.className = 'btn-mini-alerta';
            btnDesactivar.textContent = 'Desactivar equipo';
            btnDesactivar.onclick = async () => {
                if (confirm(`¿Desactivar el equipo ${alerta.marca} (${alerta.estudiante}) del sistema? Ya no podrá registrar más accesos.`)) {
                    btnDesactivar.disabled = true;
                    try {
                        const res = await fetch('api/admin/alertas', conCabecerasNgrok({
                            method: 'POST',
                            body: new URLSearchParams({ accion: 'desactivar_equipo', idDispositivo: alerta.idDispositivo })
                        }));
                        const dat = await res.json();
                        alert(dat.mensaje || 'Equipo desactivado');
                        cargarAlertas();
                        cargarResumen();
                    } catch (e) {
                        alert('Error al desactivar: ' + e.message);
                    } finally {
                        btnDesactivar.disabled = false;
                    }
                }
            };
            barraAcciones.appendChild(btnDesactivar);

            cuerpo.appendChild(barraAcciones);
        }

        item.append(icono, cuerpo);
        lista.appendChild(item);
    });

    verTodas.hidden = ordenadas.length <= ALERTAS_VISIBLES;
    verTodas.textContent = alertasExpandidas ? 'Ver menos' : `Ver todas (${ordenadas.length})`;
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

/* ---------------------------------------------------------------
   ESTADO VACÍO DE TABLAS (ilustración + mensaje + sugerencia)
   --------------------------------------------------------------- */
const ILUSTRACIONES_VACIO = {
    portatil: `
        <svg viewBox="0 0 120 88" width="120" height="88" aria-hidden="true">
            <rect x="22" y="14" width="76" height="50" rx="6" fill="var(--cont)" stroke="var(--borde)" stroke-width="2"/>
            <rect x="30" y="22" width="60" height="34" rx="3" fill="var(--superficie)"/>
            <path d="M12 68h96l-6 8H18z" fill="var(--borde)"/>
            <path d="M44 33h32M44 41h20" stroke="var(--borde)" stroke-width="3" stroke-linecap="round"/>
            <circle cx="86" cy="54" r="13" fill="var(--superficie)" stroke="var(--teal)" stroke-width="3"/>
            <path d="m95.5 63.5 8 8" stroke="var(--teal)" stroke-width="4" stroke-linecap="round"/>
            <rect x="84" y="48" width="4" height="4" transform="rotate(45 86 50)" fill="var(--oro)"/>
            <rect x="84" y="55" width="4" height="4" transform="rotate(45 86 57)" fill="var(--coral)"/>
        </svg>`,
    escudo: `
        <svg viewBox="0 0 120 88" width="120" height="88" aria-hidden="true">
            <path d="M60 10 86 20v20c0 18-12 30-26 36-14-6-26-18-26-36V20z" fill="var(--cont)" stroke="var(--borde)" stroke-width="2"/>
            <path d="m48 44 8 8 16-16" fill="none" stroke="var(--teal)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="18" y="30" width="5" height="5" transform="rotate(45 20.5 32.5)" fill="var(--oro)"/>
            <rect x="97" y="52" width="5" height="5" transform="rotate(45 99.5 54.5)" fill="var(--coral)"/>
        </svg>`
};

function filaVacia(columnas, ilustracion, titulo, detalle) {
    const fila = document.createElement('tr');
    fila.className = 'fila-vacia';
    const celdaVacia = document.createElement('td');
    celdaVacia.colSpan = columnas;
    celdaVacia.className = 'sin-resultados';

    const contenido = document.createElement('div');
    contenido.className = 'estado-vacio';
    contenido.innerHTML = ILUSTRACIONES_VACIO[ilustracion] || '';

    const textoTitulo = document.createElement('p');
    textoTitulo.className = 'estado-vacio-titulo';
    textoTitulo.textContent = titulo;

    const textoDetalle = document.createElement('p');
    textoDetalle.className = 'estado-vacio-detalle';
    textoDetalle.textContent = detalle;

    contenido.append(textoTitulo, textoDetalle);
    celdaVacia.appendChild(contenido);
    fila.appendChild(celdaVacia);
    return fila;
}

function pintarIntentos(intentos) {
    const cuerpo = $('#cuerpo-tabla-intentos');
    cuerpo.innerHTML = '';

    if (intentos.length === 0) {
        cuerpo.appendChild(filaVacia(4, 'escudo',
            'Todavía no hay intentos registrados.',
            'Aquí aparecerán los ingresos al panel, exitosos y fallidos.'));
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
        cuerpo.appendChild(filaVacia(9, 'portatil',
            'No hay registros que coincidan con estos filtros.',
            'Prueba con otro rango de fechas o limpia los filtros.'));
        return;
    }

    registros.forEach((registro) => {
        const fila = document.createElement('tr');

        // Auto-corrección defensiva en el cliente por si vienen cruzados o sin clasificar:
        let doc = registro.documento;
        let cod = registro.codigo;
        if (doc && doc.trim().startsWith('0') && (!cod || cod === '—')) {
            cod = doc;
            doc = null;
        } else if (cod && !cod.trim().startsWith('0') && (!doc || doc === '—')) {
            doc = cod;
            cod = null;
        }

        fila.appendChild(celda(formatearFecha(registro.fechaEvento)));
        fila.appendChild(celda(registro.movimiento));
        fila.appendChild(celda(registro.estudiante));
        fila.appendChild(celda(doc || '—'));
        fila.appendChild(celda(cod || '—'));
        fila.appendChild(celda(registro.marca + ' · ' + registro.color));

        // Columna Serial y Detalle
        const celdaDetalle = document.createElement('td');
        const serialTxt = registro.serial || 'Desconocido';
        const spanSerial = document.createElement('div');
        spanSerial.style.fontWeight = '600';
        spanSerial.style.fontSize = '12px';
        spanSerial.textContent = serialTxt !== 'Desconocido' ? `SN: ${serialTxt}` : 'SN: Desconocido';
        celdaDetalle.appendChild(spanSerial);

        if (registro.descripcion) {
            const spanDesc = document.createElement('div');
            spanDesc.style.fontSize = '11px';
            spanDesc.style.opacity = '0.75';
            spanDesc.style.maxWidth = '180px';
            spanDesc.style.overflow = 'hidden';
            spanDesc.style.textOverflow = 'ellipsis';
            spanDesc.style.whiteSpace = 'nowrap';
            spanDesc.title = registro.descripcion;
            spanDesc.textContent = registro.descripcion;
            celdaDetalle.appendChild(spanDesc);
        }
        fila.appendChild(celdaDetalle);

        // Origen
        const celdaOrigen = document.createElement('td');
        const chip = document.createElement('span');
        const esOffline = registro.origen === 'OFFLINE_SINCRONIZADO';
        chip.className = 'chip-origen ' + (esOffline ? 'offline' : 'online');
        chip.textContent = esOffline
            ? `Offline (+${registro.segundosRetraso}s)`
            : 'En línea';
        celdaOrigen.appendChild(chip);
        fila.appendChild(celdaOrigen);

        // Columna Acción (Reportar hurto / Estado)
        const celdaAccion = document.createElement('td');
        if (registro.idDispositivo) {
            if (registro.reportadoHurto) {
                const tag = document.createElement('span');
                tag.className = 'tag-hurto-activo';
                tag.textContent = 'En alerta';
                celdaAccion.appendChild(tag);
            } else {
                const btnHurto = document.createElement('button');
                btnHurto.type = 'button';
                btnHurto.className = 'btn-mini-alerta btn-mini-hurto';
                btnHurto.title = 'Reportar este portátil como hurtado o extraviado';
                btnHurto.textContent = 'Reportar hurto';
                btnHurto.onclick = async () => {
                    const motivo = prompt(`¿Motivo o detalle del reporte de hurto para el equipo ${registro.marca} (${registro.estudiante})?:`, 'Reportado extraviado/hurtado en portería');
                    if (motivo !== null) {
                        btnHurto.disabled = true;
                        btnHurto.textContent = 'Reportando…';
                        try {
                            const res = await fetch('api/admin/alertas', conCabecerasNgrok({
                                method: 'POST',
                                body: new URLSearchParams({
                                    accion: 'reportar_hurto',
                                    idDispositivo: registro.idDispositivo,
                                    motivo: motivo.trim() || 'Reportado desde panel admin'
                                })
                            }));
                            const dat = await res.json();
                            alert(dat.mensaje || 'Reporte registrado exitosamente');
                            await cargarAlertas();
                            cargarResumen();
                            buscar();
                        } catch (e) {
                            alert('Error al reportar: ' + e.message);
                        } finally {
                            btnHurto.disabled = false;
                            btnHurto.textContent = 'Reportar hurto';
                        }
                    }
                };
                celdaAccion.appendChild(btnHurto);
            }
        } else {
            celdaAccion.textContent = '—';
        }
        fila.appendChild(celdaAccion);

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

}

function celda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
}

function formatearFecha(fechaIso) {
    if (!fechaIso) return '—';
    // Si viene como "YYYY-MM-DD HH:mm:ss" desde el servidor en zona Colombia,
    // se formatea directamente para evitar que el navegador aplique doble compensación
    const partes = fechaIso.trim().split(/[\sT]+/);
    if (partes.length >= 2) {
        const fechaPartes = partes[0].split('-');
        const horaPartes = partes[1].split(':');
        if (fechaPartes.length === 3 && horaPartes.length >= 2) {
            const anio = fechaPartes[0];
            const mes = fechaPartes[1];
            const dia = fechaPartes[2];
            let hora = parseInt(horaPartes[0], 10);
            const minuto = horaPartes[1];
            const ampm = hora >= 12 ? 'p. m.' : 'a. m.';
            hora = hora % 12;
            if (hora === 0) hora = 12;
            const horaStr = hora < 10 ? '0' + hora : hora;
            return `${dia}/${mes}/${anio}, ${horaStr}:${minuto} ${ampm}`;
        }
    }
    const fecha = new Date(fechaIso.replace(' ', 'T'));
    return isNaN(fecha.getTime()) ? fechaIso : fecha.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function mostrarError(idElemento, mensaje) {
    const elemento = $(idElemento);
    elemento.textContent = mensaje;
    elemento.hidden = !mensaje;
}

/* =====================================================================
   CONTROL DE TEMA ADMIN (CLARO / OSCURO)
   ===================================================================== */
const SVG_LUNA_ADMIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const SVG_SOL_ADMIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

function obtenerTemaActualAdmin() {
    const guardado = localStorage.getItem('autogestion-tema');
    if (guardado === 'dark' || guardado === 'light') return guardado;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTemaAdmin(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('autogestion-tema', tema);

    const color = tema === 'dark' ? '#16120F' : '#FAF8F5';
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color));

    const btn = $('#btn-tema-admin');
    if (btn) {
        const esOscuro = tema === 'dark';
        btn.innerHTML = esOscuro ? SVG_SOL_ADMIN : SVG_LUNA_ADMIN;
        btn.setAttribute('aria-label', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
        btn.setAttribute('title', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
}

function iniciarControlTemaAdmin() {
    aplicarTemaAdmin(obtenerTemaActualAdmin());
    $('#btn-tema-admin')?.addEventListener('click', () => {
        const actual = obtenerTemaActualAdmin();
        aplicarTemaAdmin(actual === 'dark' ? 'light' : 'dark');
    });
}

document.addEventListener('DOMContentLoaded', iniciar);
