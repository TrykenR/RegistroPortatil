# Sistema de Autogestion de Registro de Portatiles — Uniguajira

Sistema web con arquitectura Offline-First (PWA) disenado para agilizar el ingreso de equipos portatiles en la Universidad de La Guajira mediante codigo QR.

---

## Arquitectura y Tecnologias

* Backend: Java (Servlets / DAO / Maven) ejecutandose sobre Apache Tomcat 10.
* Base de Datos: MySQL 8.x normalizada hasta 4NF.
* Frontend: PWA nativa en HTML5, CSS3 (Manual de marca Uniguajira) y Vanilla JavaScript.
* Modo Offline: IndexedDB + Service Worker (sw.js) con Background Sync API para encolar registros sin red.
* Despliegue: Docker + Railway (dominio HTTPS permanente y base de datos MySQL en la nube).

---

## Estructura del Proyecto

```text
├── bd/
│   ├── 01_esquema.sql          # Tablas, catalogos y vistas (4NF)
│   └── 02_datos_iniciales.sql  # Datos semilla (marcas, colores, origenes)
├── src/
│   └── main/
│       ├── java/co/edu/uniguajira/autogestion/
│       │   ├── dao/             # Acceso a datos (Estudiante, Dispositivo, Historial)
│       │   ├── modelo/          # Entidades (Estudiante, Dispositivo, HistorialAcceso)
│       │   ├── util/            # ConexionBD (lectura de env vars de Railway) y JsonUtil
│       │   └── web/             # Servlets API y FiltroCORS
│       └── webapp/              # Frontend PWA (index.html, app.js, sw.js, styles.css)
├── Dockerfile                   # Configuracion para despliegue automatico en Railway
├── pom.xml                      # Configuracion de dependencias Maven
└── README.md
