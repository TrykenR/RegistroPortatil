/* =====================================================================
   db-offline.js · Capa de persistencia local (IndexedDB)
   Universidad de La Guajira · Autogestión de Portátiles

   POR QUÉ INDEXEDDB Y NO LOCALSTORAGE
   localStorage es síncrono (congela la interfaz mientras escribe) y solo
   guarda texto. Aquí hay que guardar una COLA de registros pendientes a
   la que tanto app.js como el Service Worker deben poder entrar —
   incluso cuando la pestaña está cerrada. IndexedDB es asíncrona, la ve
   el Service Worker, y soporta índices para consultar la cola.

   QUÉ SE GUARDA AQUÍ
   1. "pendientes"  -> registros de acceso hechos sin señal, esperando
                       sincronizar. Es lo crítico: si esto se pierde, el
                       estudiante entró y no quedó constancia.
   2. "perfil"      -> el último estudiante identificado y sus equipos,
                       para que la app pueda mostrar los botones grandes
                       aunque arranque sin red.
   3. "catalogos"   -> marcas y colores, para poder registrar un equipo
                       nuevo estando offline.

   Este archivo se carga tanto desde app.js (con <script>) como desde
   sw.js (con importScripts), por eso no usa 'export' ni módulos ES.
   ===================================================================== */

'use strict';

const BD_NOMBRE = 'autogestion-uniguajira';
const BD_VERSION = 1;

const ALMACEN_PENDIENTES = 'pendientes';
const ALMACEN_PERFIL     = 'perfil';
const ALMACEN_CATALOGOS  = 'catalogos';

/**
 * Abre (y crea si hace falta) la base local. Devuelve una promesa porque
 * toda la API de IndexedDB es por eventos, y envolverla en promesas hace
 * que el resto del código pueda usar async/await sin anidar callbacks.
 */
function abrirBD() {
    return new Promise((resolver, rechazar) => {
        const solicitud = indexedDB.open(BD_NOMBRE, BD_VERSION);

        // Solo corre la primera vez, o cuando sube BD_VERSION.
        solicitud.onupgradeneeded = (evento) => {
            const bd = evento.target.result;

            if (!bd.objectStoreNames.contains(ALMACEN_PENDIENTES)) {
                const almacen = bd.createObjectStore(ALMACEN_PENDIENTES, {
                    keyPath: 'idLocal',
                    autoIncrement: true
                });
                // Índice para poder purgar por antigüedad más adelante.
                almacen.createIndex('porFecha', 'fechaEvento', { unique: false });
            }

            if (!bd.objectStoreNames.contains(ALMACEN_PERFIL)) {
                bd.createObjectStore(ALMACEN_PERFIL, { keyPath: 'clave' });
            }

            if (!bd.objectStoreNames.contains(ALMACEN_CATALOGOS)) {
                bd.createObjectStore(ALMACEN_CATALOGOS, { keyPath: 'clave' });
            }
        };

        solicitud.onsuccess = () => resolver(solicitud.result);
        solicitud.onerror = () => rechazar(solicitud.error);
    });
}

/** Envuelve una transacción en promesa, para no repetir el patrón. */
function ejecutarTransaccion(almacen, modo, operacion) {
    return abrirBD().then((bd) => new Promise((resolver, rechazar) => {
        const transaccion = bd.transaction(almacen, modo);
        const objeto = transaccion.objectStore(almacen);
        const solicitud = operacion(objeto);

        transaccion.oncomplete = () => resolver(solicitud ? solicitud.result : undefined);
        transaccion.onerror = () => rechazar(transaccion.error);
        transaccion.onabort = () => rechazar(transaccion.error);
    }));
}

/* ---------------------------------------------------------------
   COLA DE REGISTROS PENDIENTES
   --------------------------------------------------------------- */

/**
 * Encola un acceso hecho sin señal.
 * fechaEvento se calcula AQUÍ, en el momento del toque, no al
 * sincronizar: esa es toda la razón de ser del modo offline. El
 * backend la recibe como fechaEventoCliente y la guarda en
 * Historial_Accesos.fecha_hora_evento.
 */
function encolarPendiente(registro) {
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
        almacen.add({
            idEstudiante:  registro.idEstudiante,
            idDispositivo: registro.idDispositivo,
            // Formato ISO local sin zona: es lo que parsea el servlet con
            // DateTimeFormatter.ISO_LOCAL_DATE_TIME.
            fechaEvento:   registro.fechaEvento,
            marca:         registro.marca,
            color:         registro.color,
            hex:           registro.hex,
            intentos:      0
        })
    );
}

function listarPendientes() {
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readonly', (almacen) =>
        almacen.getAll()
    );
}

function contarPendientes() {
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readonly', (almacen) =>
        almacen.count()
    );
}

/** Se llama solo cuando el servidor confirmó que ya lo guardó. */
function eliminarPendiente(idLocal) {
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
        almacen.delete(idLocal)
    );
}

function limpiarPendientes() {
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
        almacen.clear()
    );
}

/**
 * Cuenta un intento fallido. No se borra el registro: si el servidor no
 * respondió, el acceso sigue siendo real y debe reintentarse.
 */
function marcarIntentoFallido(registro) {
    registro.intentos = (registro.intentos || 0) + 1;
    return ejecutarTransaccion(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
        almacen.put(registro)
    );
}

/* ---------------------------------------------------------------
   PERFIL Y CATÁLOGOS CACHEADOS
   Permiten que la app sea usable desde el primer segundo aunque
   arranque sin señal.
   --------------------------------------------------------------- */

function guardarPerfil(identificador, datos) {
    return ejecutarTransaccion(ALMACEN_PERFIL, 'readwrite', (almacen) =>
        almacen.put({ clave: identificador, datos, guardadoEn: Date.now() })
    );
}

function leerPerfil(identificador) {
    return ejecutarTransaccion(ALMACEN_PERFIL, 'readonly', (almacen) =>
        almacen.get(identificador)
    );
}

function guardarCatalogos(catalogos) {
    return ejecutarTransaccion(ALMACEN_CATALOGOS, 'readwrite', (almacen) =>
        almacen.put({ clave: 'catalogos', datos: catalogos })
    );
}

function leerCatalogos() {
    return ejecutarTransaccion(ALMACEN_CATALOGOS, 'readonly', (almacen) =>
        almacen.get('catalogos')
    );
}

/* En el Service Worker no existe 'window', así que se expone en el
   ámbito global genérico (self), que funciona en ambos contextos. */
self.BDOffline = {
    encolarPendiente,
    listarPendientes,
    contarPendientes,
    eliminarPendiente,
    limpiarPendientes,
    marcarIntentoFallido,
    guardarPerfil,
    leerPerfil,
    guardarCatalogos,
    leerCatalogos
};
