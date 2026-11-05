/* =====================================================================
   app.js · Autogestión de portátiles Uniguajira (PWA Offline-First)
   Fiel a /design-reference (Tokens, UI, animaciones y contrato de color)
   ===================================================================== */

'use strict';

const BASE_API = 'api';

/* Brands and colors matching design-reference data.ts */
const BRANDS = ['Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'Apple', 'Samsung', 'Huawei', 'Otra'];
const COLORS = [
  { name: 'Negro', hex: '#1F1D1B' },
  { name: 'Gris', hex: '#6E6C69' },
  { name: 'Plata', hex: '#C8CBCF' },
  { name: 'Blanco', hex: '#F4F3EF' },
  { name: 'Azul', hex: '#22508F' },
  { name: 'Rojo', hex: '#A8261C' },
  { name: 'Rosado', hex: '#E3A3B5' },
  { name: 'Dorado', hex: '#CFAE6C' },
  { name: 'Verde', hex: '#2E6A4E' },
];

const EXTRA_COLORS = {
  morado: '#5B3A8C',
  lila: '#A58BC9',
  naranja: '#D9732B',
  amarillo: '#E3C04A',
  cafe: '#6B4A32',
  'café': '#6B4A32',
  beige: '#D9C8A9',
  vinotinto: '#5E1A24',
  celeste: '#7DB4DD',
  turquesa: '#2A9D9A',
  champana: '#E2D2B0',
  'champaña': '#E2D2B0',
  grafito: '#3A3A3C'
};

function getColorHex(name) {
  if (!name) return '#C9C2B7';
  const k = name.trim().toLowerCase();
  const found = COLORS.find((c) => c.name.toLowerCase() === k);
  if (found) return found.hex;
  return EXTRA_COLORS[k] || '#C9C2B7';
}

function isColorLight(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  if (isNaN(n)) return true;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function shadeColor(hex, amt) {
  let col = hex.replace('#', '');
  if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
  const num = parseInt(col, 16);
  if (isNaN(num)) return '#888888';
  let r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) + ((num >> 16) & 255) * amt)));
  let g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) + ((num >> 8) & 255) * amt)));
  let b = Math.min(255, Math.max(0, Math.round((num & 255) + (num & 255) * amt)));
  return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* SVG Laptop Glyph Generator (Ported from LaptopGlyph.tsx) */
let glyphUid = 0;
function renderLaptopGlyph(brand, colorName, size = 80) {
  const id = 'lg' + (++glyphUid);
  const fill = getColorHex(colorName);
  const light = isColorLight(fill);
  const ink = light ? 'rgba(36,28,22,.62)' : 'rgba(255,255,255,.85)';
  const b = (brand || '').trim();

  let emblemSvg = '';
  switch (b) {
    case 'Lenovo':
      emblemSvg = `
        <rect x="18" y="54" width="28" height="8" rx="1" fill="${ink}" />
        <text x="32" y="58.3" text-anchor="middle" dominant-baseline="central" fill="${fill}" font-size="5.4" font-weight="700" font-family="system-ui">Lenovo</text>
      `;
      break;
    case 'HP':
      emblemSvg = `
        <circle cx="60" cy="35" r="11" fill="none" stroke="${ink}" stroke-width="1.8" />
        <text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="11" font-weight="700" font-style="italic" font-family="system-ui">hp</text>
      `;
      break;
    case 'Dell':
      emblemSvg = `
        <circle cx="60" cy="35" r="12" fill="none" stroke="${ink}" stroke-width="1.6" />
        <text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="7" font-weight="700" letter-spacing="0.4" font-family="system-ui">DELL</text>
      `;
      break;
    case 'Asus':
      emblemSvg = `<text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="8.5" font-weight="700" letter-spacing="3" font-family="system-ui">ASUS</text>`;
      break;
    case 'Acer':
      emblemSvg = `<text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="12" font-weight="600" font-family="system-ui">acer</text>`;
      break;
    case 'Apple':
      emblemSvg = `
        <g fill="${ink}">
          <circle cx="60" cy="37" r="8" />
          <ellipse cx="62.5" cy="25.5" rx="2.2" ry="4" transform="rotate(35 62.5 25.5)" />
        </g>
      `;
      break;
    case 'Samsung':
      emblemSvg = `<text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="6.6" font-weight="700" letter-spacing="1.6" font-family="system-ui">SAMSUNG</text>`;
      break;
    case 'Huawei':
      emblemSvg = `
        <g fill="${ink}">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map((r) => `<ellipse cx="60" cy="28" rx="2" ry="6.5" transform="rotate(${r} 60 35)" opacity="0.9" />`).join('')}
        </g>
      `;
      break;
    default: {
      const initial = (b[0] || '?').toUpperCase();
      emblemSvg = `
        <path d="M60 21 L74 35 L60 49 L46 35 Z" fill="none" stroke="${ink}" stroke-width="1.6" />
        <text x="60" y="35" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="12" font-weight="700" font-family="system-ui">${initial}</text>
      `;
    }
  }

  const baseShade = shadeColor(fill, light ? -0.14 : -0.3);

  return `
    <svg viewBox="0 0 120 86" width="${size}" height="${(size * 86) / 120}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0.28" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect x="12" y="3" width="96" height="64" rx="7" fill="${fill}" stroke="${light ? '#BDB6AB' : 'none'}" stroke-width="1.2" />
      <rect x="12" y="3" width="96" height="64" rx="7" fill="url(#${id}g)" />
      ${emblemSvg}
      <path d="M2 69 H118 L112 79.5 Q111 82 108 82 H12 Q9 82 8 79.5 Z" fill="${baseShade}" />
      <rect x="48" y="69" width="24" height="3" rx="1.5" fill="rgba(0,0,0,.2)" />
    </svg>
  `;
}

/* App state */
const estado = {
  idEstudiante: null,
  nombre: '',
  identificador: '',
  equipos: [],
  destinoTrasConsentimiento: null,
  selectedBrand: '',
  selectedColor: '',
  historyDepth: 0,
  pinIngresado: '',
  pinModo: 'verificar', // 'verificar' | 'configurar' | 'confirmar_config' | 'salida_temprana'
  pinNuevoTemporal: '',
  datosPendientesPin: null,
  equipoPendientePin: null
};

const $ = (s) => document.querySelector(s);

function conCabecerasNgrok(init = {}) {
  const h = new Headers(init.headers || {});
  h.set('ngrok-skip-browser-warning', 'true');
  return { ...init, headers: h };
}

async function pedir(rutaRelativa, init = {}) {
  const url = BASE_API + (rutaRelativa.startsWith('/') ? rutaRelativa : '/' + rutaRelativa);
  const resp = await fetch(url, conCabecerasNgrok(init));
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('El sistema está fuera de servicio por ahora. Pasa con el portero e inténtalo de nuevo más tarde.');
  }
  const datos = await resp.json();
  if (!resp.ok) {
    throw new Error(datos.mensaje || 'Error en el servidor.');
  }
  return datos;
}

/* Local storage for remembered document */
const CLAVE_STORAGE = 'autogestion_documento_recordado';
const documentoRecordado = () => localStorage.getItem(CLAVE_STORAGE) || '';
const recordarDocumento = (doc) => localStorage.setItem(CLAVE_STORAGE, doc);
const olvidarDocumento = () => localStorage.removeItem(CLAVE_STORAGE);

/* Greeting based on current time */
function actualizarSaludo() {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const el = $('#saludo-dia');
  if (el) el.textContent = saludo;
}

/* Screen navigation with history pushState */
function mostrarPantalla(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = $('#' + id);
  if (target) {
    target.classList.add('active');
    const main = target.querySelector('.screen-main');
    if (main) {
      main.classList.remove('animate-rise');
      void main.offsetWidth;
      main.classList.add('animate-rise');
    }
  }
}

function avanzarA(idPantalla) {
  estado.historyDepth += 1;
  history.pushState({ pantalla: idPantalla, depth: estado.historyDepth }, '', '#' + idPantalla);
  mostrarPantalla(idPantalla);
}

function volverAlInicio() {
  const d = estado.historyDepth;
  estado.historyDepth = 0;
  if (d > 0) history.go(-d);
  mostrarPantalla('pantalla-identificacion');
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.pantalla) {
    const s = e.state.pantalla;
    estado.historyDepth = e.state.depth || 0;
    // Regla que no se negocia: nunca volver a una confirmación ya cerrada
    if (s === 'pantalla-confirmacion') {
      volverAlInicio();
    } else {
      mostrarPantalla(s);
    }
  } else {
    mostrarPantalla('pantalla-identificacion');
  }
});

/* Errors */
function mostrarError(idSelector, mensaje) {
  const el = $(idSelector);
  if (!el) return;
  if (!mensaje) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.style.display = 'flex';
  el.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span>${mensaje}</span>
  `;
}

/* Status Banner */
async function actualizarBarraEstado() {
  const wrap = $('#status-banner-wrap');
  const banner = $('#status-banner');
  const icon = $('#status-banner-icon');
  const title = $('#status-banner-title');
  const detail = $('#status-banner-detail');
  const stitches = $('#status-stitches');
  if (!wrap) return;

  let pendientes = 0;
  try {
    pendientes = await self.BDOffline.contarPendientes();
  } catch (e) { /* ignore */ }

  const online = navigator.onLine;

  if (online && pendientes === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  if (!online) {
    banner.className = 'status-banner coral';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
    title.textContent = 'Sin conexión';
    detail.textContent = pendientes ? `${pendientes} registro(s) en espera` : 'Tus registros se guardarán en el celular';
  } else {
    banner.className = 'status-banner teal';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`;
    title.textContent = `Sincronizando ${pendientes} registro(s)…`;
    detail.textContent = 'Volvió la conexión';
  }

  if (pendientes > 0) {
    stitches.style.display = 'flex';
    stitches.innerHTML = Array.from({ length: Math.min(pendientes, 5) })
      .map(() => '<span class="status-stitch"></span>')
      .join('');
  } else {
    stitches.style.display = 'none';
  }
}

/* Service Worker & Sync */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    navigator.serviceWorker.addEventListener('message', (evento) => {
      if (evento.data && evento.data.tipo === 'COLA_SINCRONIZADA') {
        actualizarBarraEstado();
      }
    });
  }).catch(() => {});
}

async function solicitarSincronizacion() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await reg.sync.register('sincronizar-accesos');
    } else {
      reg.active?.postMessage({ tipo: 'INTENTAR_SINCRONIZACION' });
    }
  } catch (e) { /* ignore */ }
}

/* Step 1: Identify */
async function continuarConDocumento() {
  const boton = $('#boton-continuar');
  const input = $('#campo-documento');
  const docBox = $('#doc-box');
  const doc = input.value.trim().replace(/\D/g, '');

  if (doc.length < 5 || doc.length > 10) {
    docBox.classList.add('error');
    mostrarError('#error-identificacion', 'Escribe tu documento completo, solo números.');
    return;
  }
  docBox.classList.remove('error');
  mostrarError('#error-identificacion', '');

  boton.disabled = true;
  boton.innerHTML = '<span>Buscando…</span>';

  estado.identificador = doc;
  recordarDocumento(doc);

  try {
    const datos = await pedir('/estudiante?identificador=' + encodeURIComponent(doc));

    if (datos.estado === 'FRECUENTE') {
      try { await self.BDOffline.guardarPerfil(doc, datos); } catch (e) { /* ignore */ }
    }
    aplicarEstadoEstudiante(datos);

  } catch (error) {
    // Offline plan B
    let rescatado = false;
    try {
      const guardado = await self.BDOffline.leerPerfil(doc);
      if (guardado && guardado.datos) {
        aplicarEstadoEstudiante(guardado.datos);
        rescatado = true;
      }
    } catch (e) { /* ignore */ }

    if (!rescatado) {
      mostrarError('#error-identificacion', navigator.onLine ? error.message : 'No hay señal aquí y no tenemos tus equipos guardados en este celular. Pasa con el portero.');
    }
  } finally {
    boton.disabled = false;
    boton.innerHTML = '<span>Continuar</span> <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

function aplicarEstadoEstudiante(datos) {
  if (datos.estado === 'NUEVO') {
    estado.idEstudiante = null;
    $('#doc-nuevo-tag').textContent = estado.identificador;
    $('#campo-pin-nuevo').value = '';
    avanzarA('pantalla-datos-nuevo');
    $('#campo-nombres').focus();
    return;
  }

  estado.idEstudiante = datos.idEstudiante;
  estado.nombre = datos.nombre || '';

  // Habeas Data
  if (datos.consentimiento === false) {
    estado.destinoTrasConsentimiento = datos;
    const primerNombre = (estado.nombre.split(' ')[0] || '');
    $('#titulo-consentimiento').textContent = primerNombre ? `${primerNombre}, antes de seguir…` : 'Antes de seguir…';
    avanzarA('pantalla-consentimiento');
    return;
  }

  // Acceso directo a los equipos registrados (se retira la solicitud obligatoria de PIN al loguearse)
  continuarSegunEstado(datos);
}

function continuarSegunEstado(datos) {
  if (datos.estado === 'SIN_EQUIPOS') {
    abrirPantallaEquipoNuevo('pantalla-identificacion', true);
    return;
  }

  estado.equipos = datos.dispositivos || [];
  const primerNombre = (datos.nombre || '').split(' ')[0] || '';
  $('#saludo-estudiante').textContent = primerNombre ? `Hola, ${primerNombre}.` : 'Hola.';
  pintarEquipos(estado.equipos);
  avanzarA('pantalla-equipos');
}

/* ============ PIN HANDLING ============ */
function abrirPantallaPinSalidaTemprana(equipo, mensaje, minutos) {
  estado.equipoPendientePin = equipo;
  estado.pinModo = 'salida_temprana';
  estado.pinIngresado = '';
  $('#subtitulo-pin').textContent = 'Confirmación de Salida Rápida';
  $('#titulo-pin').textContent = 'Ingresa tu PIN';
  $('#desc-pin').textContent = mensaje || 'Has ingresado hace menos de 45 minutos. Digita tu PIN para autorizar la salida.';
  mostrarError('#error-pin', '');
  actualizarPinDots();
  avanzarA('pantalla-pin');
}

function abrirPantallaConfigurarPin(datos) {
  estado.datosPendientesPin = datos;
  estado.pinModo = 'configurar';
  estado.pinIngresado = '';
  estado.pinNuevoTemporal = '';
  $('#subtitulo-pin').textContent = 'Protege tu cuenta';
  $('#titulo-pin').textContent = 'Crea tu PIN';
  $('#desc-pin').textContent = 'Elige 4 números que recuerdes fácilmente en portería.';
  mostrarError('#error-pin', '');
  actualizarPinDots();
  avanzarA('pantalla-pin');
}

function actualizarPinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, idx) => {
    if (idx < estado.pinIngresado.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function onPinDigit(digit) {
  if (estado.pinIngresado.length >= 4) return;
  estado.pinIngresado += digit;
  actualizarPinDots();
  mostrarError('#error-pin', '');

  if (estado.pinIngresado.length === 4) {
    setTimeout(procesarPinCompleto, 120);
  }
}

function onPinBorrar() {
  if (estado.pinIngresado.length > 0) {
    estado.pinIngresado = estado.pinIngresado.slice(0, -1);
    actualizarPinDots();
    mostrarError('#error-pin', '');
  }
}

function onPinLimpiar() {
  estado.pinIngresado = '';
  actualizarPinDots();
  mostrarError('#error-pin', '');
}

async function procesarPinCompleto() {
  const pin = estado.pinIngresado;

  if (estado.pinModo === 'salida_temprana') {
    if (!estado.equipoPendientePin) {
      retroceder();
      return;
    }
    // Reintentar registrar acceso enviando el PIN
    const eq = estado.equipoPendientePin;
    estado.pinIngresado = '';
    actualizarPinDots();
    try {
      await registrarAcceso(eq, null, pin);
    } catch (e) {
      mostrarError('#error-pin', e.message || 'PIN incorrecto.');
      const dotContainer = $('#pin-dots-container');
      dotContainer.classList.remove('animate-shake');
      void dotContainer.offsetWidth;
      dotContainer.classList.add('animate-shake');
    }
    return;
  }

  if (estado.pinModo === 'verificar') {
    // Si estamos sin conexión y hay perfil guardado localmente, permitir paso o validar
    if (!navigator.onLine) {
      // Offline: conceder paso con nota
      continuarSegunEstado(estado.datosPendientesPin);
      return;
    }

    try {
      const cuerpo = new URLSearchParams({
        accion: 'verificar',
        idEstudiante: estado.datosPendientesPin.idEstudiante,
        pin: pin
      });
      const resp = await pedir('/estudiante/pin', { method: 'POST', body: cuerpo });
      if (resp.valido) {
        continuarSegunEstado(estado.datosPendientesPin);
      }
    } catch (e) {
      estado.pinIngresado = '';
      actualizarPinDots();
      mostrarError('#error-pin', e.message || 'PIN incorrecto.');
      const dotContainer = $('#pin-dots-container');
      dotContainer.classList.remove('animate-shake');
      void dotContainer.offsetWidth;
      dotContainer.classList.add('animate-shake');
    }
  } else if (estado.pinModo === 'configurar') {
    // Primer paso de configuración: pedir confirmación
    estado.pinNuevoTemporal = pin;
    estado.pinIngresado = '';
    estado.pinModo = 'confirmar_config';
    actualizarPinDots();
    $('#titulo-pin').textContent = 'Confirma tu PIN';
    $('#desc-pin').textContent = 'Escribe de nuevo los 4 números.';
  } else if (estado.pinModo === 'confirmar_config') {
    if (pin !== estado.pinNuevoTemporal) {
      estado.pinIngresado = '';
      actualizarPinDots();
      mostrarError('#error-pin', 'Los números no coinciden. Intenta de nuevo.');
      const dotContainer = $('#pin-dots-container');
      dotContainer.classList.remove('animate-shake');
      void dotContainer.offsetWidth;
      dotContainer.classList.add('animate-shake');
      return;
    }

    // Guardar PIN en el servidor
    try {
      const cuerpo = new URLSearchParams({
        accion: 'configurar',
        idEstudiante: estado.datosPendientesPin.idEstudiante,
        pin: pin
      });
      await pedir('/estudiante/pin', { method: 'POST', body: cuerpo });
      estado.datosPendientesPin.tienePin = true;
      continuarSegunEstado(estado.datosPendientesPin);
    } catch (e) {
      mostrarError('#error-pin', e.message || 'No se pudo guardar el PIN.');
    }
  }
}

/* Step 2: New Student (Caso A) */
async function guardarDatosNuevo() {
  const boton = $('#boton-guardar-datos');
  const nombres = $('#campo-nombres').value.trim();
  const apellidos = $('#campo-apellidos').value.trim();
  const pin = $('#campo-pin-nuevo').value.trim();
  const acepto = $('#campo-acepto-datos').checked;

  if (!nombres || !apellidos) {
    mostrarError('#error-datos-nuevo', 'Escribe tu nombre y tu apellido.');
    return;
  }
  if (pin && !pin.matches && !/^\d{4}$/.test(pin)) {
    mostrarError('#error-datos-nuevo', 'El PIN debe tener exactamente 4 números.');
    return;
  }
  if (!acepto) {
    $('#consent-card-nuevo').classList.add('invalid');
    mostrarError('#error-datos-nuevo', 'Debes aceptar el tratamiento de tus datos para continuar.');
    return;
  }
  $('#consent-card-nuevo').classList.remove('invalid');
  mostrarError('#error-datos-nuevo', '');

  if (!navigator.onLine) {
    mostrarError('#error-datos-nuevo', 'Tu primer registro necesita conexión. Busca señal o pasa con el portero.');
    return;
  }

  boton.disabled = true;
  boton.innerHTML = '<span>Guardando…</span>';

  try {
    // Si empieza por 0 es código estudiantil, de lo contrario es cédula/documento
    const esCodigo = estado.identificador.startsWith('0');
    const cuerpo = new URLSearchParams({
      [esCodigo ? 'codigoEstudiantil' : 'numeroDocumento']: estado.identificador,
      nombres,
      apellidos,
      pin: pin || '',
      aceptoTratamiento: 'true'
    });
    const datos = await pedir('/estudiante/nuevo', { method: 'POST', body: cuerpo });
    estado.idEstudiante = datos.idEstudiante;
    estado.nombre = nombres + ' ' + apellidos;

    abrirPantallaEquipoNuevo('pantalla-datos-nuevo', true);
  } catch (error) {
    mostrarError('#error-datos-nuevo', error.message);
  } finally {
    boton.disabled = false;
    boton.innerHTML = '<span>Continuar</span> <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

/* Habeas Data consent */
async function confirmarConsentimientoExistente() {
  const boton = $('#boton-aceptar-consentimiento');
  const acepto = $('#campo-acepto-datos-existente').checked;

  if (!acepto) {
    $('#consent-card-existente').classList.add('invalid');
    mostrarError('#error-consentimiento', 'Debes aceptar el tratamiento de tus datos para continuar.');
    return;
  }
  $('#consent-card-existente').classList.remove('invalid');
  mostrarError('#error-consentimiento', '');

  boton.disabled = true;
  boton.textContent = 'Guardando…';

  try {
    const cuerpo = new URLSearchParams({ idEstudiante: estado.idEstudiante });
    await pedir('/estudiante/consentimiento', { method: 'POST', body: cuerpo });

    const destino = estado.destinoTrasConsentimiento;
    destino.consentimiento = true;
    if (destino.estado === 'FRECUENTE') {
      try { await self.BDOffline.guardarPerfil(estado.identificador, destino); } catch (e) { /* ignore */ }
    }
    continuarSegunEstado(destino);
  } catch (error) {
    mostrarError('#error-consentimiento', error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Aceptar y continuar';
  }
}

/* Step 3: New Laptop */
function abrirPantallaEquipoNuevo(pantallaAnterior, esPrimeraVez = false) {
  $('#boton-atras-equipo').dataset.volver = pantallaAnterior;
  $('#boton-guardar-equipo').textContent = esPrimeraVez ? 'Guardar y registrar entrada' : 'Guardar y registrar';

  estado.selectedBrand = 'Lenovo';
  estado.selectedColor = 'Gris';
  $('#campo-alias').value = '';
  $('#campo-otra-marca').value = '';
  $('#campo-otra-marca').style.display = 'none';
  $('#campo-otro-color').value = '';
  $('#campo-otro-color').style.display = 'none';
  mostrarError('#error-equipo-nuevo', '');

  construirSelectorMarcas();
  construirSelectorColores();
  actualizarPreviewEquipo();

  avanzarA('pantalla-equipo-nuevo');
}

function construirSelectorMarcas() {
  const grid = $('#grid-marcas');
  grid.innerHTML = '';
  BRANDS.forEach((brand) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-brand-choice ${estado.selectedBrand === brand ? 'selected' : ''}`;
    btn.textContent = brand;
    btn.addEventListener('click', () => {
      estado.selectedBrand = brand;
      document.querySelectorAll('.btn-brand-choice').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      const campoOtra = $('#campo-otra-marca');
      if (brand === 'Otra') {
        campoOtra.style.display = 'block';
        campoOtra.focus();
      } else {
        campoOtra.style.display = 'none';
      }
      actualizarPreviewEquipo();
    });
    grid.appendChild(btn);
  });
}

function construirSelectorColores() {
  const grid = $('#grid-colores');
  grid.innerHTML = '';
  COLORS.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-color-circle ${estado.selectedColor === c.name ? 'selected' : ''}`;
    btn.style.backgroundColor = c.hex;
    btn.title = c.name;
    btn.innerHTML = estado.selectedColor === c.name ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${isColorLight(c.hex) ? '#241C16' : '#fff'}" stroke-width="3.5" class="animate-pop"><path d="M20 6 9 17l-5-5"/></svg>` : '';

    btn.addEventListener('click', () => {
      estado.selectedColor = c.name;
      construirSelectorColores();
      $('#campo-otro-color').style.display = 'none';
      actualizarPreviewEquipo();
    });
    grid.appendChild(btn);
  });

  // Plus button for other color
  const btnOther = document.createElement('button');
  btnOther.type = 'button';
  btnOther.className = `btn-color-circle other-color ${estado.selectedColor === 'Otra' ? 'selected' : ''}`;
  btnOther.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5v14"/></svg>`;
  btnOther.addEventListener('click', () => {
    estado.selectedColor = 'Otra';
    construirSelectorColores();
    const campoOtro = $('#campo-otro-color');
    campoOtro.style.display = 'block';
    campoOtro.focus();
    actualizarPreviewEquipo();
  });
  grid.appendChild(btnOther);
}

function actualizarPreviewEquipo() {
  let b = estado.selectedBrand;
  if (b === 'Otra') b = $('#campo-otra-marca').value.trim() || 'Otra';
  let c = estado.selectedColor;
  if (c === 'Otra') c = $('#campo-otro-color').value.trim() || 'Color';

  $('#preview-laptop-glyph').innerHTML = renderLaptopGlyph(b, c, 58);
  $('#preview-laptop-title').textContent = `${(b || 'Marca').toUpperCase()} - ${(c || 'Color').toUpperCase()}`;
  $('#color-seleccionado-nombre').textContent = c ? `· ${c}` : '';

  const nick = $('#campo-alias').value.trim();
  $('#preview-laptop-nick').textContent = nick ? `“${nick}”` : 'Así lo verá el portero';
}

$('#campo-otra-marca')?.addEventListener('input', actualizarPreviewEquipo);
$('#campo-otro-color')?.addEventListener('input', actualizarPreviewEquipo);
$('#campo-alias')?.addEventListener('input', actualizarPreviewEquipo);

async function guardarEquipoYRegistrar() {
  const boton = $('#boton-guardar-equipo');
  let b = estado.selectedBrand;
  if (b === 'Otra') b = $('#campo-otra-marca').value.trim();
  let c = estado.selectedColor;
  if (c === 'Otra') c = $('#campo-otro-color').value.trim();
  const nick = $('#campo-alias').value.trim();

  if (!b || !c) {
    mostrarError('#error-equipo-nuevo', 'Elige la marca y el color de tu equipo.');
    return;
  }

  if (!navigator.onLine) {
    mostrarError('#error-equipo-nuevo', 'Agregar un equipo nuevo necesita conexión. Si ya tienes equipos guardados, vuelve atrás y elige uno.');
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Guardando…';
  mostrarError('#error-equipo-nuevo', '');

  try {
    // 1. Obtener catálogos de la API
    const catalogos = await pedir('/catalogos');
    
    // 2. Extraer los objetos de marca y color
    const marcaObj = catalogos.marcas.find((m) => m.nombre.toLowerCase() === b.toLowerCase()) || 
                     catalogos.marcas.find((m) => m.nombre === 'OTRA') || 
                     catalogos.marcas[0];
                     
    const colorObj = catalogos.colores.find((col) => col.nombre.toLowerCase() === c.toLowerCase()) || 
                     catalogos.colores[0];

    // Extraer los IDs sin importar si vienen como .id, .id_marca / .id_color o .idMarca / .idColor
    const idMarcaVal = marcaObj.id || marcaObj.id_marca || marcaObj.idMarca;
    const idColorVal = colorObj.id || colorObj.id_color || colorObj.idColor;

    // 3. Enviar los parámetros en ambos formatos (snake_case y camelCase) para máxima compatibilidad
    const cuerpo = new URLSearchParams({
      idEstudiante: estado.idEstudiante,
      id_estudiante: estado.idEstudiante,
      idMarca: idMarcaVal,
      id_marca: idMarcaVal,
      idColor: idColorVal,
      id_color: idColorVal,
      alias: nick
    });

    const nuevo = await pedir('/dispositivos', { method: 'POST', body: cuerpo });

    await registrarAcceso({
      id: nuevo.idDispositivo || nuevo.id_dispositivo,
      marca: b,
      color: c,
      alias: nick
    });

  } catch (error) {
    mostrarError('#error-equipo-nuevo', error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar y registrar';
  }
}

/* Step 4: My Laptops list */
function pintarEquipos(dispositivos) {
  const contenedor = $('#lista-equipos');
  contenedor.innerHTML = '';

  const avisoOff = $('#aviso-offline-equipos');
  if (avisoOff) {
    avisoOff.style.display = (!navigator.onLine) ? 'flex' : 'none';
  }

  dispositivos.forEach((d, i) => {
    const li = document.createElement('li');
    li.className = 'animate-rise';
    li.style.animationDelay = `${i * 70}ms`;

    const btn = document.createElement('button');
    btn.className = 'laptop-item-btn';
    btn.type = 'button';

    const glyphWrap = document.createElement('span');
    glyphWrap.className = 'laptop-glyph-wrap';
    glyphWrap.innerHTML = renderLaptopGlyph(d.marca, d.color, 70);

    const info = document.createElement('span');
    info.className = 'laptop-info';
    info.innerHTML = `
      <span class="laptop-brand">${d.marca}</span>
      <span class="laptop-color">${d.color}</span>
      ${d.alias ? `<span class="laptop-nick">“${d.alias}”</span>` : ''}
    `;

    btn.append(glyphWrap, info);
    btn.addEventListener('click', () => registrarAcceso(d, btn));
    li.appendChild(btn);
    contenedor.appendChild(li);
  });
}

/* Register movement (online vs offline) */
async function registrarAcceso(equipo, botonTocado, pinConfirmado = null) {
  document.querySelectorAll('.laptop-item-btn').forEach((b) => (b.disabled = true));
  if (botonTocado) {
    botonTocado.classList.add('busy');
  }

  const horaActual = new Date();
  const fechaEvento = horaActual.toISOString().slice(0, 19);

  try {
    const params = {
      idEstudiante: estado.idEstudiante,
      idDispositivo: equipo.id
    };
    if (pinConfirmado) {
      params.pin = pinConfirmado;
    }
    const cuerpo = new URLSearchParams(params);

    const respuesta = await fetch(BASE_API + '/accesos', conCabecerasNgrok({ method: 'POST', body: cuerpo }));
    const datos = await respuesta.json();

    // Caso: Salida anticipada requiere PIN
    if (datos.requierePin) {
      document.querySelectorAll('.laptop-item-btn').forEach((b) => (b.disabled = false));
      if (botonTocado) botonTocado.classList.remove('busy');
      abrirPantallaPinSalidaTemprana(equipo, datos.mensaje, datos.minutosTranscurridos);
      return;
    }

    if (!datos.ok && !datos.alerta) {
      throw new Error(datos.mensaje || 'No se pudo registrar.');
    }

    if (datos.alerta) {
      pintarConfirmacion({
        marca: datos.marca || equipo.marca,
        color: datos.color || equipo.color,
        movimiento: datos.titulo || 'ALERTA',
        hora: datos.hora || formatHora(horaActual),
        esAlerta: true
      }, false);
      return;
    }

    pintarConfirmacion({
      marca: datos.marca,
      color: datos.color,
      movimiento: datos.movimiento,
      hora: datos.hora
    }, false);

  } catch (error) {
    const esRechazoDelServidor = error instanceof Error
      && !(error instanceof TypeError)
      && error.message
      && !error.message.includes('Failed to fetch');

    if (esRechazoDelServidor && navigator.onLine) {
      alert(error.message);
      document.querySelectorAll('.laptop-item-btn').forEach((b) => (b.disabled = false));
      if (botonTocado) botonTocado.classList.remove('busy');
      return;
    }

    // Sin red: encolar en IndexedDB
    await encolarYConfirmar(equipo, fechaEvento);
  }
}

async function encolarYConfirmar(equipo, fechaEvento) {
  try {
    await self.BDOffline.encolarPendiente({
      idEstudiante: estado.idEstudiante,
      idDispositivo: equipo.id,
      fechaEvento,
      marca: equipo.marca,
      color: equipo.color,
      hex: getColorHex(equipo.color)
    });

    await solicitarSincronizacion();
    await actualizarBarraEstado();

    pintarConfirmacion({
      marca: equipo.marca,
      color: equipo.color,
      movimiento: 'ENTRADA',
      hora: formatHora(new Date())
    }, true);

  } catch (error) {
    alert('No pudimos guardar el registro en este celular. Pasa con el portero.');
    document.querySelectorAll('.laptop-item-btn').forEach((b) => (b.disabled = false));
  }
}

function formatHora(d) {
  return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/* Step 5: Confirm Screen (Rules that are not negotiated) */
function pintarConfirmacion(datos, esOffline) {
  const pantalla = $('#pantalla-confirmacion');
  pantalla.style.display = 'flex';

  // Rule 1: Solid teal if online, solid coral if offline
  if (datos.esAlerta) {
    pantalla.className = 'screen-confirm alerta';
  } else if (esOffline) {
    pantalla.className = 'screen-confirm coral';
  } else {
    pantalla.className = 'screen-confirm teal';
  }

  // Type label and direction icon
  const mov = datos.movimiento || 'ENTRADA';
  $('#texto-movimiento').textContent = mov;
  const dirIcon = $('#confirm-dir-icon');
  if (mov === 'ENTRADA') {
    dirIcon.innerHTML = '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>';
  } else {
    dirIcon.innerHTML = '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>';
  }

  // Rule 3: FitLine cq sizing for brand and color
  const brandEl = $('#confirm-line-brand');
  const colorEl = $('#confirm-line-color');
  const brandText = datos.marca || '';
  const colorText = datos.color || '';
  brandEl.textContent = brandText;
  colorEl.textContent = colorText;

  const cqB = Math.min(48, Math.round(122 / Math.max(brandText.length, 2)));
  brandEl.style.fontSize = `min(128px, ${cqB}cqw)`;

  const cqC = Math.min(48, Math.round(122 / Math.max(colorText.length, 2)));
  colorEl.style.fontSize = `min(128px, ${cqC}cqw)`;

  // Bottom notes
  $('#confirm-note-offline').style.display = esOffline ? 'flex' : 'none';
  const nameFirst = (estado.nombre || '').split(' ')[0] || '';
  $('#confirm-meta-name').textContent = nameFirst;
  $('#confirm-meta-time').textContent = datos.hora || formatHora(new Date());

  // Redraw check animation
  const checkPath = $('#check-path-anim');
  if (checkPath) {
    checkPath.style.animation = 'none';
    void checkPath.offsetWidth;
    checkPath.style.animation = 'draw 520ms 220ms cubic-bezier(0.65, 0, 0.35, 1) both';
  }

  avanzarA('pantalla-confirmacion');
  if (navigator.vibrate) navigator.vibrate(120);
}

/* Initialization */
function iniciar() {
  registrarServiceWorker();
  actualizarBarraEstado();
  actualizarSaludo();

  // Consent checkbox interactive styling
  const chkNuevo = $('#campo-acepto-datos');
  chkNuevo?.addEventListener('change', () => {
    const card = $('#consent-card-nuevo');
    const icon = $('#consent-check-icon-nuevo');
    if (chkNuevo.checked) {
      card.classList.add('checked');
      icon.style.display = 'block';
    } else {
      card.classList.remove('checked');
      icon.style.display = 'none';
    }
  });

  const chkExistente = $('#campo-acepto-datos-existente');
  chkExistente?.addEventListener('change', () => {
    const card = $('#consent-card-existente');
    const icon = $('#consent-check-icon-existente');
    if (chkExistente.checked) {
      card.classList.add('checked');
      icon.style.display = 'block';
    } else {
      card.classList.remove('checked');
      icon.style.display = 'none';
    }
  });

  // Teclado PIN interactivo
  document.querySelectorAll('.btn-key[data-digit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onPinDigit(btn.dataset.digit);
    });
  });
  $('#btn-pin-borrar')?.addEventListener('click', onPinBorrar);
  $('#btn-pin-limpiar')?.addEventListener('click', onPinLimpiar);

  // Soporte teclado físico para el PIN
  window.addEventListener('keydown', (e) => {
    if ($('#pantalla-pin')?.style.display === 'flex') {
      if (e.key >= '0' && e.key <= '9') {
        onPinDigit(e.key);
      } else if (e.key === 'Backspace') {
        onPinBorrar();
      } else if (e.key === 'Escape') {
        onPinLimpiar();
      }
    }
  });

  // Buttons binding
  $('#boton-continuar')?.addEventListener('click', continuarConDocumento);
  $('#campo-documento')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') continuarConDocumento();
  });
  $('#campo-documento')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    $('#doc-box')?.classList.remove('error');
    mostrarError('#error-identificacion', '');
  });

  $('#boton-guardar-datos')?.addEventListener('click', guardarDatosNuevo);
  $('#boton-aceptar-consentimiento')?.addEventListener('click', confirmarConsentimientoExistente);
  $('#boton-guardar-equipo')?.addEventListener('click', guardarEquipoYRegistrar);
  $('#boton-otro-equipo')?.addEventListener('click', () => abrirPantallaEquipoNuevo('pantalla-equipos', false));

  // Back buttons
  $('#boton-atras-equipo')?.addEventListener('click', () => {
    const destino = $('#boton-atras-equipo').dataset.volver || 'pantalla-identificacion';
    mostrarPantalla(destino);
  });
  document.querySelectorAll('[data-volver]').forEach((b) => {
    b.addEventListener('click', () => {
      const destino = b.dataset.volver;
      if (destino) {
        mostrarPantalla(destino);
      } else {
        history.back();
      }
    });
  });

  // Done button
  $('#boton-listo')?.addEventListener('click', () => {
    $('#pantalla-confirmacion').style.display = 'none';
    estado.idEstudiante = null;
    estado.nombre = '';
    estado.equipos = [];
    volverAlInicio();
  });

  $('#boton-olvidar')?.addEventListener('click', () => {
    olvidarDocumento();
    $('#campo-documento').value = '';
    $('#aviso-recordado').style.display = 'none';
    $('#campo-documento').focus();
  });

  // Mostrar directamente la pantalla de identificación
  mostrarPantalla('pantalla-identificacion');

  // Pre-fill remembered document
  const rec = documentoRecordado();
  if (rec) {
    $('#campo-documento').value = rec;
    const aviso = $('#aviso-recordado');
    if (aviso) aviso.style.display = 'flex';
  }

  window.addEventListener('online', () => {
    solicitarSincronizacion();
    actualizarBarraEstado();
  });
  window.addEventListener('offline', actualizarBarraEstado);

  // Inicializar botón y comportamiento de Guía de uso
  iniciarGuiaDeUso();
}

/* =====================================================================
   COMPORTAMIENTO GUÍA DE USO
   ===================================================================== */
function iniciarGuiaDeUso() {
  const tagTexto = $('#guia-tag-texto');
  const modal = $('#modal-guia');
  const btnAbrir = $('#btn-abrir-guia');
  const btnCerrar = $('#btn-cerrar-guia');
  const btnCerrar2 = $('#btn-cerrar-guia-2');
  const btnEntendido = $('#btn-entendido-guia');
  const btnEntendidoAdmin = $('#btn-entendido-guia-admin');

  const cardEstudiante = $('#guia-card-estudiante');
  const cardAdmin = $('#guia-card-admin');
  const btnIrAdmin = $('#btn-guia-ir-admin');
  const btnVolverEstudiante = $('#btn-guia-volver-estudiante');

  if (!btnAbrir || !modal) return;

  // Al entrar, la etiqueta "Guía de uso" se muestra y se oculta automáticamente a los 2.5 segundos
  setTimeout(() => {
    if (tagTexto) {
      tagTexto.classList.add('escondido');
    }
  }, 2500);

  // Al pasar el mouse por encima vuelve a mostrar la etiqueta si el usuario quiere leerla
  btnAbrir.addEventListener('mouseenter', () => {
    if (tagTexto) tagTexto.classList.remove('escondido');
  });
  btnAbrir.addEventListener('mouseleave', () => {
    if (tagTexto) tagTexto.classList.add('escondido');
  });

  const abrirModal = () => {
    mostrarTarjetaEstudiante();
    modal.style.display = 'flex';
  };
  const cerrarModal = () => {
    modal.style.display = 'none';
  };

  const mostrarTarjetaAdmin = () => {
    if (cardEstudiante) cardEstudiante.style.display = 'none';
    if (cardAdmin) cardAdmin.style.display = 'flex';
  };

  const mostrarTarjetaEstudiante = () => {
    if (cardAdmin) cardAdmin.style.display = 'none';
    if (cardEstudiante) cardEstudiante.style.display = 'flex';
  };

  btnAbrir.addEventListener('click', abrirModal);
  btnCerrar?.addEventListener('click', cerrarModal);
  btnCerrar2?.addEventListener('click', cerrarModal);
  btnEntendido?.addEventListener('click', cerrarModal);
  btnEntendidoAdmin?.addEventListener('click', cerrarModal);

  btnIrAdmin?.addEventListener('click', mostrarTarjetaAdmin);
  btnVolverEstudiante?.addEventListener('click', mostrarTarjetaEstudiante);

  // Cerrar al tocar fuera de la tarjeta
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });
}

document.addEventListener('DOMContentLoaded', iniciar);
