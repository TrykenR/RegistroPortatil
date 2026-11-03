# Autogestión de Registro de Portátiles · Universidad de La Guajira

MVP de autogestión total: el estudiante escanea un QR en la portería,
se valida con su documento, elige el portátil que trae y le muestra al
portero una pantalla de confirmación gigante. Sin intermediarios.

Funciona **sin conexión**: si el estudiante pierde la señal justo al
registrarse, el acceso se guarda en el celular con la hora exacta y se
sincroniza solo cuando vuelve la red.

---

## Estructura del proyecto

```
autogestion-portatiles/
├── pom.xml                       Proyecto Maven (WAR). Ábrelo con esto.
├── README.md
├── bd/
│   ├── 01_esquema.sql            DDL en 4FN
│   └── 02_datos_iniciales.sql    Catálogos + estudiante de prueba
└── src/main/
    ├── java/co/edu/uniguajira/autogestion/
    │   ├── modelo/   Estudiante, Dispositivo, HistorialAcceso
    │   ├── dao/      EstudianteDAO, DispositivoDAO, HistorialAccesoDAO
    │   ├── util/     ConexionBD, JsonUtil
    │   └── web/      5 servlets + FiltroCors
    └── webapp/
        ├── index.html            5 pantallas en un archivo
        ├── styles.css            Paleta terracota + verde del logo
        ├── app.js                Lógica condicional y manejo offline
        ├── db-offline.js         Capa de IndexedDB
        ├── sw.js                 Service Worker (caché + background sync)
        ├── manifest.webmanifest  Hace la app instalable
        ├── iconos/               Iconos de la PWA
        └── WEB-INF/web.xml       MIME types del manifest
```

---

## Estado de verificación

Lo que se probó antes de entregar, no solo se escribió:

| Qué | Resultado |
|---|---|
| Compilación de las 14 clases Java (JDK 21) | Sin errores ni advertencias |
| `01_esquema.sql` + `02_datos_iniciales.sql` en MariaDB 10.11 | Ejecutan limpio |
| Las 5 consultas reales de los DAO | Devuelven lo esperado |
| Validación de pertenencia (equipo ajeno) | Bloquea correctamente |
| Ciclo offline completo (entrada 07:00 sin red → sincroniza 07:06) | Conserva la hora real, 360s de retraso registrados |
| Secuencia ENTRADA → SALIDA con un registro llegando tarde | Se ordena bien |
| Antirrebote de 90 segundos | Bloquea el duplicado |
| Sintaxis de `app.js`, `sw.js`, `db-offline.js` y el manifest | Válida |
| IDs del DOM y clases CSS referenciadas | Todas existen |

---

## Puesta en marcha

### 1. Base de datos

```bash
mysql -u root -p < bd/01_esquema.sql
mysql -u root -p < bd/02_datos_iniciales.sql
```

Luego cambia la clave en `bd/01_esquema.sql` (línea del `CREATE USER`) y
en `src/main/java/.../util/ConexionBD.java`. Vienen con
`cambiar_esta_clave` a propósito, para que no se te pase.

### 2. Backend

Abre el `pom.xml` con IntelliJ IDEA (File → Open) o NetBeans (File → Open
Project). Maven descarga solo el driver de MySQL y la API de Servlets.

Despliega en **Tomcat 10 o superior**. El WAR se llama `autogestion.war`,
así que el contexto queda en `/autogestion`.

> **Si tu Tomcat es 9 o anterior**: cambia en `pom.xml` la dependencia a
> `javax.servlet-api` (está comentada ahí mismo) y reemplaza en los 6
> archivos de `web/` el import `jakarta.servlet` por `javax.servlet`.

Comprueba que responde antes de seguir:

```
http://localhost:8080/autogestion/api/catalogos
```

Debe devolver el JSON de marcas y colores.

### 3. Túnel de Ngrok

```bash
ngrok http 8080
```

Ngrok te dará una URL tipo `https://a1b2c3d4.ngrok-free.app`. La URL que
va en el QR es esa **más la ruta del contexto**:

```
https://a1b2c3d4.ngrok-free.app/autogestion/
```

Genera el QR con esa URL completa (cualquier generador en línea sirve) e
imprímelo para la portería.

> **Ojo con el plan gratuito**: la URL cambia cada vez que reinicias
> Ngrok, y eso invalida el QR impreso. Para la sustentación, deja el
> túnel levantado desde antes y no lo cierres. Si necesitas una URL fija,
> el plan gratuito permite reservar un dominio estático desde el panel de
> Ngrok — vale la pena para no reimprimir el QR.

---

## Por qué Ngrok no es solo comodidad

Esto es lo que conviene tener claro para sustentar el proyecto:

**Los Service Workers solo funcionan sobre HTTPS o en `localhost`.** Un
`http://192.168.1.50:8080` no sirve — el navegador se niega a registrar
el Service Worker, y sin Service Worker no hay caché del shell ni
sincronización en segundo plano.

Es decir: el HTTPS que da Ngrok no es un detalle de despliegue, es lo que
**hace posible toda la arquitectura offline**. En un despliegue real de
la universidad se resolvería con un certificado interno en el servidor de
portería; aquí Ngrok cumple esa función.

MySQL, mientras tanto, nunca se expone: Ngrok solo abre el puerto de
Tomcat. Por eso `ConexionBD` apunta a `127.0.0.1` aunque el estudiante
entre por una URL pública.

---

## Cómo funciona la lógica condicional

Un único endpoint decide todo: `GET /api/estudiante?identificador=...`

`ControladorAutogestionServlet` consulta `Estudiantes` y, si existe,
también sus dispositivos. Devuelve uno de tres estados:

| Estado | Significa | Pantalla que abre `app.js` |
|---|---|---|
| `NUEVO` | el documento no existe | pide nombres y apellidos |
| `SIN_EQUIPOS` | existe pero sin portátiles | va directo al formulario de equipo |
| `FRECUENTE` | tiene equipos vinculados | botones grandes para elegir |

`app.js` no decide nada por su cuenta: lee `datos.estado` y cambia de
pantalla. Toda la regla de negocio vive en el servlet, así que si mañana
cambia se edita en un solo lugar.

---

## Cómo funciona el modo offline

### La regla que gobierna todo

**Un registro de acceso nunca puede perderse por falta de señal.** Si el
POST falla, el acceso se encola con la hora exacta del toque y la
pantalla de confirmación se muestra igual — porque el estudiante *sí*
entró y el portero necesita ver algo.

Lo que cambia es el color:

- **Verde institucional** = quedó registrado en el servidor.
- **Terracota** = guardado en el celular, pendiente de enviar.

Se distinguen a propósito: el portero debe poder notar la diferencia sin
leer la letra pequeña, y el estudiante no debe creer que quedó en el
sistema cuando todavía está en cola.

### El recorrido de un registro offline

```
1. El estudiante toca su portátil a las 07:00. No hay señal.
2. app.js intenta POST /api/accesos → falla (sin red).
3. Se encola en IndexedDB con fechaEvento = 07:00 (hora del TOQUE).
4. Se muestra el check en terracota. El estudiante entra.
5. A las 07:06 vuelve la señal.
6. El Service Worker despierta (Background Sync) y reenvía el registro
   con fechaEventoCliente = 07:00.
7. El servidor lo guarda:
      fecha_hora_evento       = 07:00  (cuándo pasó)
      fecha_hora_sincronizado = 07:06  (cuándo llegó)
      id_origen               = OFFLINE_SINCRONIZADO
8. Solo entonces se borra de la cola local.
```

### Qué sí y qué no funciona sin red

| Acción | ¿Sin red? | Por qué |
|---|---|---|
| Abrir la app | Sí | El shell está cacheado |
| Identificarse (usuario frecuente) | Sí | El perfil quedó en IndexedDB |
| Registrar entrada/salida | Sí | Se encola y sincroniza después |
| Registrarse por primera vez | **No** | El servidor debe asignar el ID |
| Agregar un equipo nuevo | **No** | Igual: sin ID no hay qué encolar |

Los dos casos que no funcionan se avisan con un mensaje claro en vez de
fingir que salió bien.

### Límite real que conviene mencionar en la sustentación

Background Sync existe en Chrome y Android. **Safari/iOS no lo soporta**,
así que ahí la sincronización solo ocurre cuando el estudiante vuelve a
abrir la app (`app.js` escucha el evento `online` como respaldo). No es
un descuido del código: es una limitación de la plataforma, y está
comentada en `app.js`.

---

## Decisiones de base de datos (4FN)

La justificación completa está comentada dentro de `01_esquema.sql`. Lo
esencial:

- **Marca y color van en catálogos aparte**, nunca como texto en
  `Dispositivos_Estudiante`. Es lo que evita el `'Lenovo'` / `'LENOVO'` /
  `'lenovo'` del registro manual actual.
- **`Dispositivos_Estudiante` fusiona dispositivo y dueño** en una tabla.
  Aquí un portátil siempre pertenece a un único estudiante, así que es
  una relación 1:N simple — no hay dependencia multivaluada que separar.
- **`Historial_Accesos` separa las dos fechas.** Para un registro que
  llegó tarde, "cuándo pasó" y "cuándo se guardó" son instantes
  distintos, y ambos son datos útiles: uno es la evidencia del suceso, el
  otro es el dato de auditoría confiable. Meterlos en una sola columna
  perdería información real.
- **`Origenes_Registro` es tabla y no un booleano** `es_offline`, para
  poder añadir un tercer origen (por ejemplo `IMPORTADO_MANUAL`) sin
  tocar la estructura.

`fecha_hora_sincronizado` **siempre** la pone el motor con `NOW()`, nunca
el cliente. La fecha del celular se acepta para saber cuándo ocurrió el
acceso, pero jamás como dato de auditoría — un celular puede tener la
hora mal, a propósito o no.

---

## Datos de prueba

El estudiante cargado por `02_datos_iniciales.sql`:

- Documento: `1007654321` — o código: `2019115034` (ambos funcionan)
- Dos equipos: LENOVO NEGRO ("El de la U") y HP GRIS ("El de la casa")

Cualquier otro documento de 5 a 20 dígitos entra por el flujo de usuario
nuevo.

### Cómo probar el modo offline

1. Abre la app por la URL de Ngrok y regístrate una vez (con red).
2. Abre DevTools → Application → Service Workers y marca **Offline**.
   En el celular, basta con activar modo avión.
3. Recarga: la app sigue abriendo.
4. Identifícate y toca un equipo → **check en terracota**, con el aviso
   de que está pendiente.
5. Quita el modo offline. En DevTools → Application → IndexedDB →
   `autogestion-uniguajira` → `pendientes` verás la cola vaciarse.
6. Confirma en la base de datos:

```sql
SELECT movimiento, origen,
       fecha_hora_evento, fecha_hora_sincronizado, segundos_de_retraso
FROM Vista_Historial_Accesos
ORDER BY fecha_hora_evento DESC;
```

Debe aparecer con origen `OFFLINE_SINCRONIZADO` y el retraso en segundos.

---

## Qué falta para pasar de MVP a producción

- Como nadie valida el alta, `EstudianteDAO.registrar` debería consultar
  el sistema académico en vez de hacer un INSERT con lo que el estudiante
  escriba.
- `FiltroCors` usa `Access-Control-Allow-Origin: *`. Sirve para un MVP
  sin sesiones; si se agrega login, hay que pasar a lista blanca de
  orígenes.
- Panel de auditoría sobre `Vista_Historial_Accesos` para el jefe de
  seguridad.
- Política de retención del historial: crece rápido.
- Un pool de conexiones (HikariCP) en lugar de `DriverManager`.

---

## Novedades de esta versión

- **Panel de administración** (`admin.html`): botón discreto "Acceder"; usuario `admin`, clave inicial `cambiar123` (cámbiala). Búsqueda por documento/código, filtros por marca, color, movimiento, origen y fechas, paginación, y bitácora de intentos de inicio de sesión.
- **Regla de 45 minutos** entre una entrada y una salida del mismo equipo, para evitar registros por toques accidentales.
- **Documento de 5 a 10 dígitos.**
- **Botón "atrás"** integrado con el historial del navegador; "Listo" borra la sesión y regresa al inicio.
- **Habeas Data (Ley 1581 de 2012):** casilla de consentimiento obligatoria en el alta, y pantalla de aceptación para estudiantes que ya existían.
- **Límite de peticiones por IP** (`/api/estudiante`: 20 por minuto; login del panel: 5 por 15 minutos).
- **Respaldos automáticos** (`bd/respaldo_diario.bat`, ver `bd/LEEME_respaldos.txt`).

### Orden para actualizar una instalación que ya tenías

1. `bd/03_migracion_panel_admin.sql`
2. `bd/04_migracion_seguridad_privacidad.sql` (ambas se pueden repetir sin dañar nada)
3. Refrescar Maven (dependencia nueva: jBCrypt), `package`, reemplazar el `.war`, reiniciar Tomcat.
4. Seguir `docs/checklist_pruebas.md`.

### Límites que conviene conocer

- El estudiante se identifica solo con su documento: quien lo conozca podría hacerse pasar por él.
- El límite de peticiones vive en la memoria de Tomcat: se reinicia al reiniciar el servicio.
- Con un solo administrador compartido no hay forma de saber *quién* hizo qué en el panel.
