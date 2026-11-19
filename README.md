# Nova Salud — MVP Full Stack

Sistema web para inventario y ventas de botica, desarrollado como proyecto académico SENATI.

## Tecnologías
- Frontend: React + Vite, interfaz responsive.
- Backend: Node.js + Express, API REST.
- Persistencia: MySQL + Sequelize.
- Seguridad: JWT, roles `admin` y `vendedor`, bcrypt, validaciones, Helmet y CORS.

## Requisitos
Node.js 20+, MySQL 8+ y npm.

## Instalación local
1. Crear base de datos y usuario MySQL con permisos sobre ella (ejemplo):
   ```sql
   CREATE DATABASE nova_salud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'nova_app'@'localhost' IDENTIFIED BY 'clave_segura';
   GRANT ALL PRIVILEGES ON nova_salud.* TO 'nova_app'@'localhost';
   ```
2. `cd backend && cp .env.example .env && npm install`.
3. Editar `backend/.env`: credenciales MySQL, `JWT_SECRET` de 32+ caracteres aleatorios y contraseña segura para administrador.
4. `npm run dev` desde `backend`. En el primer arranque crea las tablas y, si está configurado, el administrador inicial.
5. En otra terminal: `cd frontend && cp .env.example .env && npm install && npm run dev`.
6. Abrir `http://localhost:5173` e iniciar sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Flujo principal
1. Administrador registra un producto y uno o varios lotes con fechas de vencimiento.
2. Vendedor o administrador selecciona productos y confirma una venta.
3. La API valida stock no vencido, bloquea registros para la transacción, descuenta primero los lotes que vencen antes (FEFO) y crea el comprobante interno `NS-...`.
4. Si ocurre un error, la transacción se revierte íntegramente.
5. La sección Alertas muestra productos con stock bajo y lotes vencidos.

## Endpoints principales
- `POST /api/login`
- `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- `POST /api/products/:id/batches`
- `GET /api/alerts`
- `GET /api/customers`, `POST /api/customers`
- `GET /api/sales`, `POST /api/sales`
- `GET /api/reports/summary`, `POST /api/users`

Las rutas excepto login y health requieren token `Authorization: Bearer <token>`. Las modificaciones de inventario, usuarios y reportes están limitadas a administradores.

## Pruebas y estado
- `cd backend && npm run test:unit` ejecuta pruebas de inventario sin dependencias externas.
- `cd backend && npm run test:app` comprueba que la aplicación Express se importa (requiere `npm install`).
- `cd backend && npm test` ejecuta ambas suites (requiere `npm install`).
- Verificadas manualmente: autenticación, roles, inventario, lotes, ventas, clientes, alertas, historial y reportes. Respuestas HTTP 401, 403 y 409 comprobadas. Pendiente: automatizar las pruebas de integración con MySQL y de concurrencia.
- Este código es un **primer MVP académico**: no está certificado para operación farmacéutica real ni emite comprobantes tributarios oficiales.
- La interfaz incluye inventario, registro de lotes, ventas, clientes, alertas, historial y panel de reportes para administradores. La gestión visual de usuarios y edición de productos sigue pendiente; sus endpoints están implementados.
- Antes de producción: migraciones versionadas, auditoría de movimientos, copias de seguridad, límites de solicitudes, pruebas exhaustivas y requisitos legales aplicables.

## Git/GitHub
Inicializar con `git init`, realizar commits por funcionalidad y subir el repositorio a GitHub. No se ha publicado ningún repositorio automáticamente.

## Nota del caso
El caso principal se denomina **Nova Salud**. Algunas preguntas guía del material original usan **FarmaPlus**, interpretado como una inconsistencia de denominación del enunciado.

## Verificación paso a paso (Windows / macOS / Linux)
1. Instalar Node.js y MySQL y comprobar `node -v`, `npm -v`.
2. En `backend`, ejecutar `npm run test:unit` (no necesita MySQL).
3. Crear la base de datos indicada arriba y configurar `.env` (no compartirlo ni subirlo a GitHub).
4. En `backend`, ejecutar `npm install`, luego `npm test` y `npm run dev`. Comprobar `http://localhost:3001/api/health` (respuesta esperada: `{"status":"ok"}`).
5. En `frontend`, ejecutar `npm install`, `npm run build` y `npm run dev`; abrir `http://localhost:5173`.
6. Iniciar sesión como administrador, registrar un producto con lote vigente, realizar una venta de prueba y confirmar que disminuye su stock. Intentar una venta con cantidad mayor al stock y comprobar que se rechaza.
7. Crear un lote vencido y confirmar que no incrementa el stock disponible; comprobar alertas.
8. Guardar capturas de inicio de sesión, inventario, venta, alertas y resultados de pruebas **solo después de comprobarlos**.

**Estado actualizado (18/11/2026):**

- Backend: `npm test` — 5 pruebas aprobadas, 0 fallidas.
- Frontend: `npm run build` — compilación exitosa.
- MySQL: conexión y operaciones verificadas durante las pruebas manuales.
- Seguridad: acceso sin token rechazado (401), creación de productos por vendedor rechazada (403) y usuario duplicado rechazado (409).
- Reportes: pantalla administrativa comprobada con datos de ventas.
- El proyecto sigue siendo un MVP académico; no se ha realizado una auditoría integral de seguridad.
