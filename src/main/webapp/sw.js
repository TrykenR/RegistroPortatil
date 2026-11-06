/* =====================================================================
   sw.js · Service Worker
   Universidad de La Guajira · Autogestión de Portátiles

   HACE DOS TRABAJOS DISTINTOS:

   1. CACHÉ DEL SHELL (que la app abra sin red)
      Guarda index.html, CSS, JS e iconos en la primera visita. Después,
      aunque el estudiante llegue a la portería sin señal, la app carga.
      Sin esto, "offline-first" no existe: el navegador ni siquiera
      alcanzaría a mostrar la pantalla para registrar.

   2. SINCRONIZACIÓN EN SEGUNDO PLANO
      Cuando vuelve la conexión, vacía la cola de IndexedDB contra el
      backend Java — incluso si el estudiante ya cerró la pestaña.
      Usa Background Sync donde existe (Chrome/Android) y, donde no
      (Safari/iOS), app.js hace el respaldo con el evento 'online'.

   IMPORTANTE SOBRE NGROK Y HTTPS:
   Los Service Workers solo funcionan sobre HTTPS o en localhost. Un
   http://192.168.x.x NO sirve. Por eso el túnel de Ngrok no es solo
   comodidad para exponer el backend: su HTTPS es lo que HACE POSIBLE
   la parte offline de este proyecto.
   ===================================================================== */

'use strict';

// Subir este número obliga a refrescar la caché en todos los celulares.
const VERSION_CACHE = 'autogestion-v13';

const ARCHIVOS_DEL_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db-offline.js',
    './manifest.webmanifest',
    './fuentes/figtree-latin.woff2',
    './fuentes/figtree-latin-ext.woff2',
    './iconos/icono-192.png',
    './iconos/icono-512.png'
];

// Reutiliza la misma capa de IndexedDB que usa app.js: una sola
// definición de la base, sin duplicar lógica entre los dos contextos.
importScripts('./db-offline.js');

/* ---------------------------------------------------------------
   INSTALACIÓN · precarga del shell
   --------------------------------------------------------------- */
self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(VERSION_CACHE)
            // cache: 'reload' obliga a pedir cada archivo al servidor, sin
            // usar la copia que el navegador pudiera tener en su propia
            // caché HTTP. Sin esto, el Service Worker podía guardar como
            // "versión nueva" un index.html viejo.
            .then((cache) => cache.addAll(
                ARCHIVOS_DEL_SHELL.map((ruta) => new Request(ruta, { cache: 'reload' }))
            ))
            // skipWaiting: el SW nuevo toma el control sin esperar a que
            // el estudiante cierre todas las pestañas. En una app de
            // portería nadie va a hacer eso.
            .then(() => self.skipWaiting())
    );
});

/* ---------------------------------------------------------------
   ACTIVACIÓN · limpieza de cachés viejas
   --------------------------------------------------------------- */
self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((claves) => Promise.all(
                claves.filter((clave) => clave !== VERSION_CACHE)
                      .map((clave) => caches.delete(clave))
            ))
            .then(() => self.clients.claim())
    );
});

/* ---------------------------------------------------------------
   INTERCEPCIÓN DE PETICIONES

   - Llamadas a /api/  -> NETWORK ONLY. Nunca se cachean. Una respuesta
     vieja del servidor ("tienes estos equipos") sería peor que un
     error honesto, y un POST cacheado sería un registro fantasma.
     Si falla, app.js se encarga de encolar en IndexedDB.

   - Archivos de la app (HTML, CSS, JS) -> RED PRIMERO, CACHÉ DE RESPALDO.
     Con internet, siempre se sirve la versión más reciente, así nunca
     se mezcla un index.html viejo con un app.js nuevo (eso dejaba la
     pantalla en blanco: el JS intentaba mostrar una pantalla que el
     HTML viejo no tenía). Sin internet, o si el servidor tarda más de
     TIEMPO_MAXIMO_RED_MS, se usa la copia guardada, que es lo que hace
     funcionar la app en la portería sin señal.
   --------------------------------------------------------------- */
const TIEMPO_MAXIMO_RED_MS = 4000;

self.addEventListener('fetch', (evento) => {
    const url = new URL(evento.request.url);

    if (url.pathname.includes('/api/')) {
        return; // network only: deja pasar la petición sin tocarla
    }
    if (evento.request.method !== 'GET') {
        return;
    }

    evento.respondWith(redPrimero(evento.request));
});

/** Rechaza si la promesa no responde a tiempo (red lenta = como sin red). */
function conTiempoLimite(promesa, milisegundos) {
    return new Promise((resolver, rechazar) => {
        const reloj = setTimeout(() => rechazar(new Error('tiempo agotado')), milisegundos);
        promesa.then(
            (valor) => { clearTimeout(reloj); resolver(valor); },
            (error) => { clearTimeout(reloj); rechazar(error); }
        );
    });
}

/**
 * Solo se guarda en caché lo que de verdad es de esta app. Ngrok (plan
 * gratuito) puede responder con su página de aviso, que también llega
 * con código 200; si se guardara como si fuera index.html, la app
 * dejaría de abrir sin conexión. Las páginas de esta app mencionan
 * "portátiles" en el título; la de aviso de Ngrok no.
 */
async function esContenidoPropio(respuesta) {
    const tipo = respuesta.headers.get('content-type') || '';
    if (!tipo.includes('text/html')) return true;
    const texto = await respuesta.clone().text();
    return /portátiles/i.test(texto);
}

async function redPrimero(peticion) {
    // Se abre SOLO la caché de la versión actual. caches.match() a secas
    // busca en todas las versiones, incluidas las viejas.
    const cache = await caches.open(VERSION_CACHE);

    try {
        // cache: 'no-cache' obliga al servidor a confirmar que el archivo
        // no cambió, en vez de aceptar una copia vieja del navegador.
        const respuesta = await conTiempoLimite(
            fetch(peticion, { cache: 'no-cache' }), TIEMPO_MAXIMO_RED_MS);

        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic'
                && await esContenidoPropio(respuesta)) {
            await cache.put(peticion, respuesta.clone());
        }
        return respuesta;

    } catch (error) {
        const guardada = await cache.match(peticion);
        if (guardada) return guardada;

        // Sin red y sin esa página guardada: al menos abrir el inicio
        // para que la app arranque en vez de mostrar el dinosaurio.
        if (peticion.mode === 'navigate') {
            const inicio = await cache.match('./index.html');
            if (inicio) return inicio;
        }
        return Response.error();
    }
}

/* ---------------------------------------------------------------
   BACKGROUND SYNC · el evento que vacía la cola
   El navegador dispara esto cuando detecta que volvió la conexión,
   aunque la pestaña esté cerrada. app.js registra el tag con
   registration.sync.register('sincronizar-accesos').
   --------------------------------------------------------------- */
self.addEventListener('sync', (evento) => {
    if (evento.tag === 'sincronizar-accesos') {
        evento.waitUntil(sincronizarPendientes());
    }
});

/* También se puede disparar a mano desde app.js con postMessage, para
   los navegadores que no soportan Background Sync (Safari/iOS). */
self.addEventListener('message', (evento) => {
    if (evento.data && evento.data.tipo === 'SINCRONIZAR') {
        evento.waitUntil(sincronizarPendientes());
    }
});

/**
 * Recorre la cola de IndexedDB y envía cada registro al backend.
 *
 * Reglas que sigue:
 * - Solo borra un pendiente si el servidor confirmó (ok: true). Si la
 *   red se cae a mitad, el registro sigue en cola y se reintenta.
 * - Manda fechaEventoCliente: así el backend guarda CUÁNDO PASÓ, no
 *   cuándo llegó. Esa distinción es la que hace honesto el historial.
 * - Un 403 (equipo que ya no pertenece al estudiante) sí borra el
 *   pendiente: reintentarlo para siempre solo llenaría la cola.
 */
const MAX_REINTENTOS_OFFLINE = 3;

/**
 * Recorre la cola de IndexedDB y envía cada registro al backend.
 *
 * Reglas que sigue:
 * - Borra el pendiente si el servidor confirma o si es un registro duplicado ya registrado.
 * - Un 403, 400 o 404 (datos inexistentes/inválidos) o superar MAX_REINTENTOS_OFFLINE 
 *   sí borra el pendiente para evitar atascos permanentes en el dispositivo.
 */
async function sincronizarPendientes() {
    const pendientes = await self.BDOffline.listarPendientes();
    if (!pendientes.length) return;

    let sincronizados = 0;
    let modificados = false;

    for (const registro of pendientes) {
        try {
            const cuerpo = new URLSearchParams({
                idEstudiante:       registro.idEstudiante,
                idDispositivo:      registro.idDispositivo,
                fechaEventoCliente: registro.fechaEvento,
                idOrigen:           '2'
            });

            const respuesta = await fetch('./api/accesos', {
                method: 'POST',
                body: cuerpo,
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos.ok || datos.movimiento) {
                    await self.BDOffline.eliminarPendiente(registro.idLocal);
                    sincronizados++;
                    modificados = true;
                    continue;
                }
            }

            // Error de cliente permanente (400, 403, 404, etc.)
            if (respuesta.status >= 400 && respuesta.status < 500) {
                await self.BDOffline.eliminarPendiente(registro.idLocal);
                modificados = true;
                continue;
            }

            // Descartar tras superar límite de reintentos
            if ((registro.intentos || 0) >= MAX_REINTENTOS_OFFLINE) {
                await self.BDOffline.eliminarPendiente(registro.idLocal);
                modificados = true;
                continue;
            }

            await self.BDOffline.marcarIntentoFallido(registro);

        } catch (error) {
            if ((registro.intentos || 0) >= MAX_REINTENTOS_OFFLINE) {
                await self.BDOffline.eliminarPendiente(registro.idLocal);
                modificados = true;
            } else {
                await self.BDOffline.marcarIntentoFallido(registro);
            }
        }
    }

    if (modificados) {
        await avisarAlaApp(sincronizados);
    }
}

/** Le avisa a las pestañas abiertas para que actualicen el contador. */
async function avisarAlaApp(cantidad) {
    const clientes = await self.clients.matchAll({ includeUncontrolled: true });
    clientes.forEach((cliente) => {
        cliente.postMessage({ tipo: 'SINCRONIZADOS', cantidad });
    });
}
