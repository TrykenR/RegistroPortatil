# Checklist de pruebas en celulares reales

Hazlo después de desplegar la versión nueva. Usa la URL de Ngrok con HTTPS
(el modo sin conexión **no funciona** con una IP de red local).

## 0. Antes de empezar (una sola vez)

- [ ] Ejecutaste las migraciones `03_migracion_panel_admin.sql` y `04_migracion_seguridad_privacidad.sql` (en ese orden) en tu base de datos actual.
- [ ] Refrescaste Maven en el IDE (para descargar jBCrypt), hiciste `package` y reemplazaste el `.war` en `webapps`.
- [ ] Reiniciaste el servicio de Tomcat.
- [ ] En el celular, abre la app y en DevTools (o en Ajustes del navegador, borrando datos del sitio) confirma que la caché nueva se instaló: debe llamarse `autogestion-v2`. Si sigue la `v1`, el celular todavía ve la versión vieja.

## 1. Navegación y botón "atrás"

Repite esta secuencia en **cada uno** de los cuatro escenarios:

| Escenario | Cómo abrirlo |
|---|---|
| A. Chrome en Android, pestaña normal | Escanear el QR |
| B. App instalada en Android | Menú de Chrome → "Instalar app" |
| C. Safari en iPhone, pestaña normal | Escanear el QR |
| D. iPhone con "Añadir a pantalla de inicio" | Menú compartir → Añadir a pantalla de inicio |

**Secuencia:**

1. Escribe el documento de prueba y toca **Continuar**. Debe aparecer "¿Cuál traes hoy?".
2. Haz el gesto o botón de **atrás** del celular. Debe volver a la pantalla del documento, **sin salir de la web**.
3. Vuelve a continuar y esta vez toca el botón **Usar otro documento** de la pantalla. Debe hacer lo mismo que el gesto.
4. Continúa, toca un equipo y llega a la pantalla verde. Toca **Listo**.
5. Haz **atrás**. **No** debe reaparecer la lista de equipos ni la confirmación. Esta es la prueba clave del celular compartido.
6. Repite el paso 4 tres veces seguidas y luego haz **atrás** una vez: debe salir de la app o quedarse en el inicio, no pasar por pantallas viejas.

Anota para cada escenario qué pasó. En especial en **D (iPhone instalado)**: no estoy seguro de que ahí funcione el gesto de deslizar desde el borde. Esta prueba lo decide, y si no funciona, la app debe poder usarse igual con el botón **Atrás** dibujado en pantalla.

## 2. Modo sin conexión (repetir después de los cambios)

1. Con internet, abre la app, identifícate con un estudiante que **ya tenga equipos** y llega a la lista (así se guarda su perfil en el celular).
2. Cierra la app. Activa el **modo avión**.
3. Ábrela de nuevo: debe cargar. Arriba debe verse la barra terracota "Sin conexión…".
4. Identifícate y toca un equipo. La pantalla de confirmación debe ser **terracota**, con la línea "Guardado sin conexión · se enviará solo".
5. Desactiva el modo avión. Espera unos segundos con la app abierta.
6. En tu PC, comprueba que el registro llegó:

```sql
SELECT movimiento, origen, fecha_hora_evento, fecha_hora_sincronizado, segundos_de_retraso
FROM Vista_Historial_Accesos
ORDER BY fecha_hora_evento DESC LIMIT 3;
```

Debe aparecer con origen `OFFLINE_SINCRONIZADO` y la hora del toque, no la de la sincronización.

**Casos que deben fallar con un mensaje claro (no en silencio):**
- [ ] Sin conexión y con un documento **nuevo**: avisa que necesita conexión.
- [ ] Sin conexión y agregando un equipo nuevo: avisa que necesita conexión.

## 3. Funciones nuevas

**Consentimiento de datos**
- [ ] Un documento que no existe pide nombre, apellidos y la casilla. Sin marcarla, **no deja continuar**.
- [ ] El estudiante de prueba (ya existía antes) ve la pantalla "Tratamiento de tus datos" y, al aceptar, sigue hacia sus equipos. La segunda vez que entra, ya no la ve.

**Regla de los 45 minutos**
- [ ] Registra un equipo (ENTRADA). Vuelve a registrarlo enseguida: debe seguir mostrando ENTRADA y **no** crear una fila nueva de salida.

**Documento de 10 dígitos**
- [ ] El campo no deja escribir más de 10 dígitos.

**Límite de intentos**
- [ ] En el panel de administración, escribe una clave incorrecta 5 veces seguidas. El sexto intento debe responder "Demasiados intentos…" aunque pongas la clave correcta. Espera 15 minutos o reinicia Tomcat para quitar el bloqueo.
- [ ] Entra al panel con la clave correcta y abre "Intentos de inicio de sesión recientes": deben verse los fallidos con su IP.

**Panel de administración**
- [ ] Busca por documento parcial, filtra por marca y por fechas.
- [ ] Con más de 25 registros, aparecen los botones **Anterior / Siguiente** y "Página X de Y".

## 4. Respaldos

- [ ] Ejecuta `bd/respaldo_diario.bat` a mano (después de seguir `LEEME_respaldos.txt`). Debe aparecer un `.zip` y una línea "OK" en `respaldo.log`.
- [ ] **Prueba restaurarlo** en una base de prueba. Un respaldo que nunca se restauró no es una garantía.
