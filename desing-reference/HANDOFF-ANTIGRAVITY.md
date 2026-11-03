# Traspaso a Antigravity: rediseño de Portería Uniguajira

Este repositorio es un **prototipo de diseño navegable** (React 19 + Vite + Tailwind CSS v4 + lucide-react).
La interfaz es la referencia final. El servidor, la red y la cola sin conexión están **simulados** en `src/lib/store.ts`.
El objetivo es replicar esta interfaz en la app real y conectarla a su lógica existente (API, service worker, IndexedDB, etc.).

## Cómo usarlo

1. Corre el prototipo (`pnpm install && pnpm dev`) para verlo en vivo. El panel "Prototipo" de la izquierda (en móvil, la pestaña del borde derecho) cambia la conexión, el reloj y los documentos de prueba. Este panel **no** debe pasar a producción.
2. Abre en Antigravity el repositorio de la app real y agrega esta carpeta al workspace (o cópiala a `/design-reference`).
3. Pégale al agente el prompt del final de este documento.

## Mapa de archivos

| Archivo | Qué es | En la app real |
|---|---|---|
| `src/index.css` | Tokens de color, animaciones (`@keyframes`), base | Copiar tal cual |
| `src/assets/uniguajira-logo.png`, `uniguajira-simbolo.png` | Logo completo y símbolo, fondo transparente | Copiar |
| `src/components/Wayuu.tsx` | Motivo tejido (rombo escalonado en cuadrícula): `WayuuBand`, `WayuuField`, `WayuuMark` | Copiar |
| `src/components/LaptopGlyph.tsx` | Ilustración SVG del portátil (color real de la tapa + emblema abstracto por marca) | Copiar |
| `src/components/ui.tsx` | `Screen` (layout), botones, campos, `ErrorNote`, `ConsentBox`, `Simbolo` | Copiar |
| `src/components/StatusBanner.tsx` | Aviso flotante de conexión/sincronización | Copiar y conectar al estado real de red y cola |
| `src/student/*` | Pantallas del estudiante | Copiar y cambiar las llamadas de `store.ts` por la API real |
| `src/admin/*` | Login y panel de administración | Igual |
| `src/lib/copy.ts` | Textos de error con voz humana | Copiar; mapear los códigos de error reales a estas claves |
| `src/lib/data.ts` | Marcas, colores y datos de ejemplo | Conservar `BRANDS`, `COLORS`, `colorHex`; descartar `seed()` |
| `src/lib/store.ts` | **Simulación** de servidor, red y cola | **No copiar.** Usarlo solo como contrato de comportamiento |
| `src/components/DemoPanel.tsx`, `App.tsx` (marco del teléfono) | Herramientas del prototipo | **No copiar** |

## Tokens

Colores del logo: coral `#CC5C50`, turquesa `#60A8B8`, oro `#E1A140`.

| Token | Valor | Uso |
|---|---|---|
| `coral` / `coral-dark` / `coral-soft` | `#CC5C50` / `#A8473C` / `#F9E4E0` | Acción principal **y** estado "guardado en el celular" |
| `teal` / `teal-dark` / `teal-soft` | `#2B8496` / `#1F6574` / `#DFEFF3` | Estado "guardado en el servidor" (turquesa profundizado para texto blanco al sol) |
| `turquesa` | `#60A8B8` | Solo decorativo (motivos, logo) |
| `oro` / `oro-dark` / `oro-soft` | `#E1A140` / `#9A6A1C` / `#FBEFD8` | Motivos; `oro-dark` en textos pequeños de encabezado |
| `papel`, `cont`, `borde`, `sub`, `tinta`, `aviso` | `#FAF8F5`, `#F2F1EF`, `#DEDAD3`, `#6B655C`, `#241C16`, `#B3261E` | Fondo, contenedores, bordes, texto secundario, texto, errores |

Tipografía: solo la del sistema (`system-ui`), sin fuentes externas, porque la app funciona sin internet.
Radio de 14 px. Botones de acción de 64 px de alto, en la parte inferior.

## Reglas que no se negocian

1. **Contrato de colores:** teal = quedó en el servidor; coral = quedó en el celular y se enviará solo. Aplica en la confirmación, en el aviso y en la etiqueta "Origen" del admin. Las gráficas del admin usan tinta y gris para entrada y salida, **nunca** teal ni coral.
2. Cada pantalla cabe sin scroll en un iPhone SE (375×667). El contenido escaso se centra verticalmente (`<Screen center>`); si crece, vuelve a desplazarse desde arriba.
3. La confirmación es para el portero: un solo color sólido, check animado, ENTRADA o SALIDA, y marca y color en dos renglones ajustados al ancho (máximo 128 px; ver `FitLine` en `Confirm.tsx`, que usa unidades `cqw`).
4. El estudiante nunca elige entrada o salida: lo decide el último movimiento del día. Si el cambio llega antes de 45 minutos, solo se vuelve a confirmar el último estado y no se crea un registro nuevo.
5. El botón "atrás" recorre el flujo (cada pantalla es una entrada de `history`) y nunca vuelve a una confirmación ya cerrada.
6. Dar de alta un estudiante o un equipo exige conexión. Registrar una entrada o salida funciona sin conexión si el estudiante ya está guardado en el celular.
7. Campo de documento: solo números, máximo 10, sin contador ni barra de progreso debajo.

## Flujo del estudiante

`Splash` (una vez por sesión) → `Identify` → según la respuesta del servidor:
- `new` → `NewStudent` (nombre, apellido y consentimiento obligatorio, Ley 1581) → `NewLaptop`
- `consent` (registrado antes de la regla) → `Consent` (una sola vez) → `MyLaptops` o `NewLaptop`
- `existing` → `MyLaptops` (un toque = registro) o `NewLaptop` si no tiene equipos

→ `Confirm` → "Listo" vuelve a `Identify` con el documento recordado.

Equivalencias del contrato simulado → API real (ver `store.ts`):
- `lookup(doc)` → `{kind:'new'} | {kind:'consent', student, laptops} | {kind:'existing', student, laptops, fromCache}`
- `registerStudent`, `giveConsent`, `addLaptop` (también registra la primera entrada), `registerMovement` → `MoveResult {type, origin, at, reconfirmed, laptop, student}`
- Errores, como `ApiError(code)`: `invalid`, `not_owner`, `rate`, `down` (servidor, túnel o PC apagados; incluye la respuesta HTML en vez de JSON), `noconn`, `consent`, `name`, `laptop`, `auth`

## Panel de administración

Orden de la página, por prioridad:
1. Alerta de seguridad (solo si una IP falla 3 o más veces en 24 h).
2. **Historial:** búsqueda por documento o código, filtros (marca, color, movimiento, origen, rango de fechas), tabla y paginación de 25.
3. **Resumen**, después del historial: indicadores, movimiento por hora, origen de los registros, última semana y marcas más vistas.
4. Sección plegable de seguridad con los intentos de acceso.

La sesión se cierra a los 30 minutos sin actividad y al salir de la página (`pagehide`).

## Prompt para pegar en Antigravity

```
Tengo dos carpetas en el workspace: la app real (PWA de registro de portátiles de la
Universidad de La Guajira) y /design-reference, un prototipo de diseño en React + Tailwind v4.

Objetivo: rediseñar el frontend de la app real para que se vea y se comporte exactamente
como /design-reference, SIN cambiar la lógica de negocio, la API, el service worker ni el
almacenamiento sin conexión que ya existen.

1. Lee primero /design-reference/HANDOFF-ANTIGRAVITY.md completo. Sus "Reglas que no se
   negocian" son obligatorias.
2. Revisa cómo está hecha la app real (framework, estilos, rutas, cliente de API, cola offline)
   y propónme un plan antes de editar: qué archivos copias, cuáles adaptas y cómo mapeas cada
   función simulada de src/lib/store.ts a la llamada real equivalente.
3. Copia los tokens de src/index.css, los assets del logo y los componentes visuales
   (Wayuu, LaptopGlyph, ui, StatusBanner). Si la app real no usa Tailwind v4, traduce los
   tokens y las clases a su sistema de estilos sin cambiar valores.
4. Rehaz cada pantalla del estudiante y el panel de administración siguiendo el prototipo
   (layout, textos, animaciones y orden del panel: filtros e historial primero, resumen después).
5. No incluyas DemoPanel ni el marco de teléfono de App.tsx, ni datos simulados.
6. Verifica en 375×667 que ninguna pantalla haga scroll, que la confirmación sea teal cuando se
   guarda en el servidor y coral cuando se guarda sin conexión, y que el botón atrás funcione.
```
