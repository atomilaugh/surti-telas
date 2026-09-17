# Documento de Evaluación de Calidad del Software — SurtiTelas

**Norma deReferencia:** ISO/IEC 25010:2011  
**Proyecto:** SurtiTelas — Sistema Integral de Gestión de Negocio Textil  
**Ámbito:** Software de gestión integral para empresas dedicadas al surtido y distribución de telas  
**Backend:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Redis  
**Frontend:** React + TypeScript + Vite  
**Fecha de evaluación:** 2026-09-17  
**Alcance:** Análisis estático del código fuente, arquitectura, base de datos, infraestructura y pruebas  

---

## 1. Introducción

El presente documento realiza una evaluación estructurada de las ocho calidades del software definidas en la norma ISO/IEC 25010, aplicada al sistema **SurtiTelas**. Este sistema está concebido como una arquitectura limpia (Clean Architecture) dividida en módulos bounded contexts, con un backend API RESTful basado en Node.js/Express y un frontend SPA basado en React.

La arquitectura del backend sigue el patrón **Clean Architecture** con separación en capas `domain` / `application` / `infrastructure` / `presentation` por módulo (ver `src/config/app.ts:64`, `src/modules/*/`). La base de datos está modelada mediante Prisma Schema con más de 30 modelos y 25 enums (ver `prisma/schema.prisma`, 1706 líneas). El frontend consume la API mediante un cliente HTTP centralizado con renovación automática de tokens (ver `src/infrastructure/api/httpClient.ts`).

---

## 2. Resumen Ejecutivo

| Criterio | Estado actual | Prioridad |
|----------|--------------|-----------|
| Adecuación funcional | Alto — ~35 módulos con cobertura amplia de casos de uso | Media-Alta |
| Eficiencia de desempeño | Medio-Alto — Redis caching + paginación + metrics, pero consultas sin optimización en algunos módulos | Media-Alta |
| Compatibilidad | Alto — API RESTful estructurada + OpenAPI/Swagger + contract tests (Pact) | Baja |
| Usabilidad | Medio-Bajo — Problemas de UX documentados en Prompt.md (filtros rotos, modales confusos, datos crudos) | Alta |
| Fiabilidad | Medio-Alto — Graceful shutdown, health checks, circuitos básicos, pero carece de pruebas de integración en varios módulos | Alta |
| Seguridad | Alto — Helmet, CORS, JWT, bcrypt, 2FA, sanitización XSS, rate limiting, audit trail | Media-Alta |
| Mantenibilidad | Medio-Alto — Clean Architecture, typing fuerte, pero naming inconsistente y tech debt documentado | Media-Alta |
| Portabilidad | Alto — Contenerizado, env-based config, migraciones Prisma | Baja |

---

## 3. Criterio 1 — Adecuación Funcional

### Diagnóstico / Estado actual

El software contempla 35+ módulos (ver `src/config/app.ts:64-62`), cada uno con su capa de dominio, caso de uso, repositorio y rutas. La funcionalidad abarca: autenticación con 2FA, gestión de usuarios/roles/permisos, catálogo de productos, pedidos, pagos, recibos, ventas, facturación, compras, insumos, producción con talleres, devoluciones, entregas con ruta del día, chat en tiempo real con valoraciones, notificaciones push, reportes analíticos, CMS, auditoría, webhooks, órdenes de trabajo personalizadas, y gestión de talleres.

Los casos de uso validan las reglas de negocio en el backend (ver `src/modules/orders/application/use-cases/OrderUseCases.ts:167-188` — validación de subtotal/impuestos/descuentos contra items). Se implementan validaciones de integridad como la verificación de `isTrustedCustomer` antes de permitir pagos a cuotas (ver `Fase3-Implementation.md`). Los hooks de ciclo de vida (`unhandledRejection`, `uncaughtException`) están configurados en `server.ts:8-14`.

La arquitectura soporta un flujo de pedido complejo: `NUEVO → EN_VALIDACION → ACEPTADO → EN_PRODUCCION → DESPACHADO → EN_CAMINO → ENTREGADO`, con historial de cambios de estado (`OrderHistory`) y comisiones asociadas (`Commission`).

### Hallazgo / Oportunidad de mejora

**Complejidad del flujo de pedidos personalizados sin validación de transición de estados en el frontend.** El esquema Prisma define `CustomOrderStatus` con 14 estados (ver `schema.prisma:1635-1651`), pero el frontend (`App.tsx`) no implementa una máquina de estados explícita que valide cada transición. Esto permite estados inconsistentes, como los errores 409 Conflict reportados en `Prompt.md:146` (`GET /api/v1/custom-orders → 409 Conflict`).

**Gestión de permisos con bugs documentados.** El `Prompt.md:7-12` reporta que al crear un rol y asignar permisos, éstos no se guardan ni se cargan al editar. Esto afecta directamente la adecuación funcional del sistema de autorización. El `AuthRepository.ts` define la interfaz completa (`assignPermissionToRole`, `listRolePermissions`, `findPermissionsByRole`), pero la implementación frontend (`AppProviders.tsx:54-60`) no sincroniza correctamente los permisos entre el rol creado y la lista desplegable.

**Inconsistencia en la validación de estados de empleados.** El `Prompt.md:17` muestra un error 422: `"estado: Invalid enum value. Expected 'ACTIVO' | 'INACTIVO', received 'Activo'"`. El enum Prisma usa mayúsculas (`ACTIVO`/`INACTIVO`, ver `schema.prisma:1511-1514`), pero la UI envía `"Activo"` con minúscula inicial, indicando falta de normalización en el frontend.

### Acción de mejora propuesta / implementada

1. **Implementar una máquina de estados (State Machine) para `CustomOrderStatus`.** Definir una matriz de transiciones válidas en el dominio (`custom_orders/domain/entities/`) y validar cada cambio de estado tanto en el backend como en el frontend antes de enviar la petición. Esto resolverá los conflictos 409.

2. **Normalizar el enum `EmployeeStatus` en el frontend.** Mapear `"Activo"` → `"ACTIVO"` y `"Inactivo"` → `"INACTIVO"` en `employeesApi.ts` antes de enviar al backend, o cambiar el esquema Prisma a usar un enum `EmployeeStatus` en lugar de un `String` para el campo `estado`.

3. **Auditar y corregir el flujo de asignación de permisos.** Verificar que `assignPermissionToRole` en `PrismaAuthRepository.ts` persista correctamente y que `listRolePermissions` retorne los permisos asociados al editar un rol. Añadir tests de integración para este flujo crítico.

---

## 4. Criterio 2 — Eficiencia de Desempeño

### Diagnóstico / Estado actual

El sistema implementa varias estrategias de optimización de rendimiento:

- **Rate limiting basado en Redis** con script de Lua atómico (`redisUserRateLimiter.ts:7-20`) — 100 req/15 min por usuario, escalable horizontalmente.
- **Caching de consultas** mediante middleware Redis (`cache.ts:1-30`) con TTL configurable.
- **Rate limiting global** con `express-rate-limit` (300 req/15 min en desarrollo, configurable en producción).
- **Medición de métricas Prometheus** con histogramas de duración de requests y contadores (`metrics.ts:6-19`).
- **Paginación cursor-based** en repositorios (`PaginationSchema` en `validators/index.ts:92-96`).
- **Code splitting** en el frontend con `React.lazy` y `manualChunks` en Vite (`vite.config.ts:61-69`).
- **Health checks** con latencia de DB/Redis y detección de event loop lag (`healthCheck.ts:19-64`).

### Hallazgo / Oportunidad de mejora

**Consultas N+1 potenciales en repositorios con `include` anidados.** Varios repositorios Prisma usan `include` profundos para obtener relaciones anidadas. Por ejemplo, `PrismaDeliveryRepository` incluye `order`, `cliente` y `domiciliario` en una sola consulta (`Fase5-Diagnostic.md:33`), pero en módulos como `orders` y `sales-orders`, el uso de `include` con múltiples relaciones anidadas puede generar consultas costosas sin profiling. El `Prompt.md:40` documenta errores 400 en `admin/orders` durante la carga con debounce, indicando cuellos de botella.

**Sin compresión HTTP.** La configuración de Express en `app.ts` no incluye `compression()` (gzip/brotli), lo que impacta el rendimiento en transferencias de datos JSON grandes (catálogos con imágenes, reportes).

**Sin rate limiting selectivo en endpoints críticos.** Aunque hay rate limiting global y por usuario, endpoints como `/api/v1/orders` y `/api/v1/custom-orders` no tienen rate limiting específico por recurso, lo que puede permitir abusos en endpoints costosos.

**Acceso token en `localStorage` sin protección contra XSS.** El access token se almacena en `localStorage` (`tokenStorage.ts:10`), lo cual, aunque no es un problema de rendimiento directo, impacta en la seguridad y puede forzar invalidaciones de sesión frecuentes si se requiere rotación por XSS.

### Acción de mejora propuesta / implementada

1. **Instalar y configurar `compression` middleware.** Añadir `app.use(compression({ threshold: 1024 }))` en `app.ts` para comprimir respuestas JSON y mejorar tiempos de carga en el frontend.

2. **Profiling de consultas Prisma.** Habilitar `log: ['query']` en desarrollo y usar `prisma.$explainRaw` para identificar consultas N+1. Añadir índices compuestos en campos de filtrado frecuente (ej. `orders(estado, fecha, asesorId)` ya indexado en `schema.prisma:313`).

3. **Implementar rate limiting por endpoint para recursos costosos.** Configurar `express-rate-limit` específico para `/api/v1/custom-orders` y `/api/v1/admin/orders` con límites más restrictivos.

4. **Añadir headers de caché estática.** Configurar `Cache-Control` para assets estáticos en `/uploads` y resources públicos (`app.ts:154`).

---

## 5. Criterio 3 — Compatibilidad

### Diagnóstico / Estado actual

El backend expone una API RESTful bien estructurada bajo el prefijo `/api/v1/` con separación clara de rutas por módulo (`app.ts:231-276`). La API incluye:

- **Documentación OpenAPI/Swagger** generada con `swagger-jsdoc` y servida vía `swagger-ui-express` (`setupSwagger` en `app.ts:280-282`).
- **Contract testing con Pact** (`tests/contract/`) para validar compatibilidad entre consumer y provider.
- **API versioning** consistente bajo `/api/v1/`.
- **Respuesta envelope estándar** `{ success, data, message, error }` consumida por el cliente (`httpClient.ts:167-178`).
- **CORS configurado** con whitelist de orígenes y soporte para credentials (`app.ts:107-127`).
- **Proxy de Vite** para desarrollo (`vite.config.ts:50-55`).

### Hallazgo / Oportunidad de mejora

**Duplicidad de routers de entregas.** El esquema define dos routers: `deliveryRouter` (entregas de pedidos) y `deliveryTrackingRouter` (seguimiento de entregas) (`app.ts:49,260`), lo que puede causar confusión en la API y potenciales inconsistencias de contrato.

**Swagger deshabilitado en producción.** `setupSwagger(app)` solo se ejecuta cuando `NODE_ENV !== 'production'` (`app.ts:280`), lo que reduce la compatibilidad documental para consumidores externos en producción.

**Inconsistencia en el envelope de respuestas.** Algunos endpoints retornan directamente el payload sin el envelope `{ success, data }`, lo que requiere que el cliente (`httpClient.ts:177`) maneje el caso `payload = json?.data ?? json` como fallback.

### Acción de mejora propuesta / implementada

1. **Unificar los routers de delivery.** Consolidar `deliveryRouter` y `deliveryTrackingRouter` bajo un único módulo de entregas con rutas claras (`/entregas` vs `/seguimiento`).

2. **Habilitar Swagger en producción con autenticación.** Servir la documentación OpenAPI en producción detrás de autenticación (basic auth o rol ADMIN), manteniendo compatibilidad para testing externo.

3. **Estandarizar el envelope de respuestas.** Garantizar que todos los endpoints usen el envelope `{ success, data, message }` consistentemente, eliminando el fallback en `httpClient.ts:177`.

---

## 6. Criterio 4 — Usabilidad

### Diagnóstico / Estado actual

El frontend implementa una interfaz basada en:

- **React Router v7** con rutas anidadas y layouts por rol (`App.tsx` — 398 líneas con ~40 vistas lazy-loaded).
- **ProtectedRoute** con verificación de roles y permisos (`ProtectedRoute.tsx:21-50`).
- **Tailwind CSS + Radix UI** para componentes accesibles.
- **Modo oscuro/claro** con `next-themes`.
- **Toaster (Sonner)** para notificaciones toast.
- **ErrorBoundary** centralizado (`ErrorBoundary.tsx:13-52`).
- **Dashboard analíticico** con gráficos Recharts.
- **Chat en tiempo real** con reacciones, archivos y encuestas de satisfacción.

### Hallazgo / Oportunidad de mejora

**Múltiples problemas de usabilidad documentados en `Prompt.md`:**

| Área | Problema | Severidad |
|------|----------|-----------|
| Gestión de Ventas | Errores 400 en carga de pedidos con búsqueda | Alta |
| Pagos/Abonos | Tabla muestra "id" crudos, filtros no buscan por nombre de cliente | Alta |
| Registro de Abono | ID automático confuso en lugar de nombre legible | Media |
| Clientes | Mensaje "Contraseña es obligatoria" aparece aunque se llene el campo | Alta |
| Pedidos Personalizados | Columna "cliente" visible (debería oculta), caracteres con tilde rotos (�) | Media-Alta |
| Catálogo | No se puede resetear el filtro de categoría | Media |
| Producción | Formulario incompleto: falta tipo de tela, insumos, colores, tallas | Alta |
| Notificaciones | Sistema de notificaciones no funciona en panel de cliente | Alta |

**Datos crudos expuestos en UIs.** La tabla de Pagos (`Pagos.tsx`) muestra IDs internos (`cmt689v100001igyggi539s7r`) en lugar de nombres descriptivos de clientes o solicitudes. Esto viola el principio de separación de preocupaciones entre identificadores internos y representación visual.

**Codificación de caracteres inconsistente.** El `Prompt.md:115-116` reporta caracteres con tilde renderizados como `�` en la página de Pedidos Personalizados. Aunque se realizó un esfuerzo de corrección UTF-8 (`AGENTS.md`), persisten problemas de encoding en datos procedentes de la base de datos o APIs externas.

### Acción de mejora propuesta / implementada

1. **Reemplazar IDs internos por labels descriptivos en todas las tablas.** En `Pagos.tsx`, `Abonos.tsx` y otras páginas, mapear los campos ID a nombres legibles usando los stores de `clientes`/`pedidos` ya hidratados en `AppProviders.tsx:54-60`.

2. **Forzar codificación UTF-8 en capas de datos.** Añadir `charset: 'utf8'` en la configuración de Prisma (`datasource db`) y validar la codificación en el pipeline de inserción. Añadir middleware Express `app.use(express.text({ charset: 'utf-8' }))`.

3. **Implementar reset de filtros en Catálogo.** Añadir un botón "Limpiar filtros" en `AdminCatalogo.tsx` que restablezca el estado de búsqueda y selección de categoría a su valor por defecto.

4. **Reparar el formulario de Nueva Orden de Producción.** Completar el modal en `AdminProduccion.tsx` con campos para tipo de tela, selección múltiple de insumos, selector de colores y distribución de tallas (`curvaTallas`).

5. **Diagnosticar y reparar el sistema de notificaciones.** Verificar la conexión Socket.io en el cliente (`socket.io-client` en `httpClient.ts`), la suscripción a eventos de notificaciones en el backend (`notifications` module) y la sincronización con el store de Zustand.

---

## 7. Criterio 5 — Fiabilidad

### Diagnóstico / Estado actual

El sistema implementa mecanismos de fiabilidad a nivel de infraestructura:

- **Graceful shutdown** en `server.ts:60-78` — cierra conexiones de Prisma, Redis y tracing ante señales SIGTERM/SIGINT.
- **Health checks** estructurados: `/health`, `/health/database`, `/health/redis`, `/health/memory` con chequeos de conectividad, latencia y event loop lag (`healthCheck.ts:76-117`).
- **Circuito de protección de rate limiting** — Redis no disponible → fallo degradado (`redisUserRateLimiter.ts:59-66`).
- **Manejo global de errores** centralizado en `errorHandler.ts:7-66` con manejo de `ZodError`, errores Prisma (P2002/P2025) y `AppError` tipados.
- **Winston Daily Rotate File** — logs rotados diariamente, retención de 14-30 días (`logger.ts:20-56`).
- **Account lockout** después de 5 intentos fallidos (`LoginUser.ts:24-25,76-78`).
- **Idempotencia** para operaciones POST/PUT/PATCH (`idempotency.ts:8-43`).

### Hallazgo / Oportunidad de mejaga

**Carencia de pruebas de integración en módulos críticos.** El módulo `deliveries` no tiene pruebas unitarias (`Fase5-Diagnostic.md:146`: "No tests found for deliveries module"). Aunque existen 107 archivos de tests unitarios en el backend y 17 de integración, varios módulos como `alert`, `financial`, `export` carecen de cobertura.

**Falta de retry con circuito abierto (circuit breaker).** Aunque Redis tiene fallback degradado, no hay un patrón de circuito abierto para llamadas a servicios externos (SMTP, APIs de tereros, webhooks). El `SmtpEmailService` y los webhooks no tienen reintentos con backoff exponencial.

**Sin estrategia de retry en el cliente HTTP.** El `httpClient.ts` no implementa reintentos con backoff para errores transitorios (502/503/504), lo que impacta la fiabilidad percibida en redes inestables.

**Promesas no manejadas en listeners de cierre.** En `redis.ts:13-19`, los listeners `error` y `connect` no manejan correctamente los errores fatais que podrían requerir un reinicio del proceso.

### Acción de mejora propuesta / implementada

1. **Implementar tests para el módulo `deliveries`.** Crear tests unitarios para `ListRutaDelDia`, `ChangeDeliveryStatus` y `CreateDelivery` usando mocks de `DeliveryRepository` (como ya se hizo en `ListRutaDelDia.test.ts`).

2. **Implementar circuit breaker para servicios externos.** Usar `opossum` o patrón manual para envolver llamadas a SMTP, webhooks y APIs externas con configuración de timeout, retry con backoff y timeout de circuito abierto.

3. **Añadir retry con backoff exponencial en `httpClient.ts`.** Configurar 3 reintentos para errores 5xx/429 con backoff exponencial y jitter, respetando el TTL de los headers `Retry-After`.

4. **Añadir manejo de errores robusto en Redis client.** Configurar reconexión automática y eventos de error críticos que disparen reinicio del proceso vía `PM2`/process manager.

---

## 8. Criterio 6 — Seguridad

### Diagnóstico / Estado actual

El sistema implementa múltiples capas de defensa:

- **Helmet.js** con CSP estricto, HSTS (1 año), COOP `same-origin`, COEP `require-corp`, `frameAncestors: ['none']`, `referrerPolicy: strict-origin-when-cross-origin` (`app.ts:80-103`).
- **JWT** con 3 secretos separados: access (15m), refresh (7d), temp (5m) — `JwtTokenService.ts:11-30`.
- **bcryptjs** para hashing de contraseñas (`BcryptPasswordHasher.ts`).
- **2FA** con `otplib` (TOTP) + secret encriptado (`EnableTwoFactor.ts`, `VerifyTwoFactor.ts`).
- **Account lockout** tras 5 intentos fallidos con duración de 15 minutos (`LoginUser.ts:24-25,76-78`).
- **Rate limiting multinivel:** global (`express-rateLimit`), por usuario (Redis Lua script, 100 req/15 min), por operación sensible (`sensitiveUserRateLimiter.ts`, `forgotPasswordRateLimiter.ts`, `recoveryRateLimiter.ts`).
- **Cloudflare Turnstile** para CAPTCHA en operaciones sensibles (`turnstile.ts:7-43`).
- **Sanitización de input** — escape HTML para prevenir XSS (`sanitize.ts:5-43`), preservando campos sensibles (`password`, `token`, etc.).
- **Idempotencia** para prevenir replay attacks (`idempotency.ts`).
- **Audit trail** completo — `AuditService.ts` registra login exitidos/fracasos, bloqueos, operaciones de usuario (`LoginUser.ts:39-48,55-63`).
- **Validación de secretos en producción** — mínimo 32 caracteres, no valores por defecto (`validateProductionSecrets.ts:1-39`).
- **Cookies httpOnly + SameSite** para refresh tokens (`authApi.ts`).
- **CORS** con whitelist de orígenes (`app.ts:107-127`).
- **Validación de DTOs** con Zod (`parseDto` en `validate.ts:4-12`).

### Hallazgo / Oportunidad de mejora

**Access token almacenado en `localStorage` (vulnerabilidad XSS).** `tokenStorage.ts:10` almacena el token en `localStorage`, que es susceptible a ataques XSS. Si existe cualquier vulnerabilidad XSS en la aplicación, el token puede ser robado. El refresh token está correctamente en cookie httpOnly, pero el access token debería estar en memoria o cookie httpOnly también.

**CSP restrictivo puede bloquear funcionalidades legítimas.** La política `scriptSrc: ["'self'"]` en `app.ts:83` bloqueará scripts externos (ej. Google Analytics, widgets de terceros), pero el `connectSrc` incluye `https://surti-telas-backend.onrender.com` de forma hardcodeada, lo que limita portabilidad.

**Falta de Content Security Policy report-uri/report-to.** No hay configuración de reporte de violaciones de CSP, lo que dificulta la detección de intentos de ataque XSS.

**Sin headers de seguridad adicionales.** Falta `Permissions-Policy` para restringir APIs del navegador (cámara, micrófono, geolocalización) y `Cross-Origin-Opener-Policy` parcialmente configurado.

**Password validation inadecuada.** El `Prompt.md:109` reporta que el formulario de "Nuevo Cliente" muestra "Contraseña es obligatoria" aun cuando se ingresa. Esto indica un bug en la validación del backend (`RegisterUser.ts`) o en la serialización del formulario, que podría dar lugar a información sobre el estado de validación.

### Acción de mejora propuesta / implementada

1. **Migrar access token de localStorage a cookie httpOnly.** Implementar un doble buffer: el access token se almacena en cookie httpOnly con `maxAge` corto y `SameSite=Strict`, con renovación vía refresh token. Eliminar `localStorage.setItem` en `tokenStorage.ts`.

2. **Añadir CSP report-uri.** Configurar `report-uri /api/v1/security/csp-report` en Helmet y crear un endpoint para recibir reportes de violaciones. Habilitar `report-to` con `Reporting-Endpoints`.

3. **Añadir Permissions-Policy header.** Restringir APIs no utilizadas: `camera=(), microphone=(), geolocation=(), payment=(self)`.

4. **Refactorizar CSP connectSrc.** Hacer configurable los orígenes permitidos vía `env.CONNECTED_ORIGINS` en lugar de hardcodear `render.com`.

---

## 9. Criterio 7 — Mantenibilidad

### Diagnóstico / Estado actual

La arquitectura Clean Architecture promueve alta mantenibilidad:

- **Separación de capas clara:** Cada módulo (`src/modules/*/`) contiene `domain`, `application`, `infrastructure`, `presentation` con responsabilidades bien definidas. Los casos de uso inyectan repositorios abstractos (DIP), como demuestra `ListRutaDelDia` tras su refactorización en Fase 5 (`Fase5-Diagnostic.md:231-250`).
- **TypeScript fuerte:** ~461 archivos `.ts` en backend, ~188 `.tsx` en frontend, con tipado estricto (`tsconfig.json`).
- **Zod para validación** de DTOs y configuración de entorno (`env.ts:12-36`).
- **Event-driven architecture** con `EventBus` y suscriptores (`server.ts:18-44`, `events.ts:33847` líneas).
- **Mapeadores (Mappers)** que separan el dominio del modelo de persistencia (`DeliveryMapper.ts` en `Fase5-Diagnostic.md:112-114`).
- **Container DI** en cada módulo (`authContainer.ts`, `paymentContainer.ts`, etc.).

### Hallazgo / Oportunidad de mejora

**Naming inconsistente entre backend y frontend.** El backend usa `PascalCase` para modelos Prisma y `snake_case` en `@map()` para columnas, pero el frontend define tipos como `Pedido.total` (camelCase) mientras la API retorna `numero`, `cliente_id`, `asesor_nombre` (snake_case). El `Fase3-Implementation.md` documenta la corrección `Pedido.total: string → number` en 8 archivos, evidenciando el esfuerzo requerido para mantener coherencia de tipos.

**Duplicidad de módulos con nombres similares.** Existen módulos `alerts` y `alert`, `commission` y `commissions`, `delivery` y `deliveries` (`app.ts:20,49,260`). Esto crea ambigüedad en mantenimiento y posible duplicidad de lógica.

**Tech debt documentado acumulado.** El `Prompt.md` contiene 30+ hallazgos de usabilidad y funcionalidad sin priorizar, indicando falta de backlog técnico estructurado. La falta de un archivo `AGENTS.md` en el backend (solo existe en frontend) reduce la guía de estilo para contribuidores.

**Sin linting configurado en CI/CD visible.** Aunque `package.json` define scripts `lint` y `typecheck`, no hay evidencia de ejecución automática en CI. Los 4 pre-existing TypeScript errors en el frontend (`Fase3-Implementation.md:86`) indican que `typecheck` no es un bloqueo en el pipeline.

**Schema Prisma con convenciones mixtas.** Algunos modelos usan `snake_case` con `@map()` (ej: `custom_orders`, `quote_items`) mientras otros usan `PascalCase` (`Order`, `Payment`, `Customer`). La falta de convención única complica el aprendizaje y mantenimiento.

### Acción de mejora propuesta / implementada

1. **Unificar la convención de nombrado del schema Prisma.** Migrar todos los modelos a `PascalCase` con `@map` solo para columnas, eliminando modelos como `custom_orders` en favor de `CustomOrder`. Usar prisma rename y migration.

2. **Consolidar módulos duplicados.** Fusionar `alerts`/`alert` en un único módulo `alerts`, `commission`/`commissions` en `commission`, y mantener `deliveries` como el módulo único (eliminando `delivery`).

3. **Crear `AGENTS.md` para el backend.** Documentar arquitectura, convenciones de código, scripts de test, y guía de contribución para el backend, igualando al frontend.

4. **Configurar CI/CD con lint+typecheck como bloqueo.** Añadir un workflow de GitHub Actions que ejecute `npm run lint`, `npm run typecheck`, `npm run test` en cada PR, bloqueando merges con fallos.

---

## 10. Criterio 8 — Portabilidad

### Diagnóstico / Estado actual

El sistema está diseñado para ser portable:

- **Configuration via environment variables** con validación Zod (`env.ts:12-36`). Todas las variables críticas (DB URL, JWT secrets, Redis URL, CORS, SMTP) son configurables.
- **Docker-ready:** El backend usa `process.cwd()` para rutas relativas (`app.ts:154` — `path.resolve(process.cwd(), 'uploads')`), compatible con contenerización.
- **Prisma migrations** para portabilidad de esquema (`prisma/migrations/`).
- **Vite con alias de paths** (`vite.config.ts:9-31`) para portabilidad de imports.
- **Multi-environment** (`development`, `staging`, `test`, `production`) con configuración condicional (`app.ts:171,173,280`).

### Hallazgo / Oportunidad de mejora

**Falta de `Dockerfile` y `docker-compose.yml` en el repositorio.** Aunque el software está preparado para contenerización (paths relativos, env vars), no se incluyen archivos Docker, lo que complica el despliegue reproducible y la portabilidad a entornos cloud.

**Hardcodeo de orígenes en `start-services.bat`.** El script de inicio (`start-services.bat`) probablemente contiene rutas y puertos específicos de Windows, limitando portabilidad a Linux/macOS.

**Falta de configuración para múltiples bases de datos.** El `datasource db` en Prisma está configurado únicamente para PostgreSQL (`schema.prisma:5-8`), sin abstracción para otros motores.

**CSP con origen hardcodeado.** Como se mencionó en el criterio de seguridad, `connectSrc` contiene `https://surti-telas-backend.onrender.com` hardcodeado.

### Acción de mejora propuesta / implementada

1. **Crear `Dockerfile` y `docker-compose.yml`.** Configurar contenedores para backend, frontend, PostgreSQL y Redis con variables de entorno externas (`.env.example`), permitiendo despliegue reproducible en cualquier entorno.

2. **Externalizar todos los orígenes hardcodeados.** Mover `https://surti-telas-backend.onrender.com` a `env.CONNECTED_ORIGINS` y `CORS_ORIGIN` ya soporta múltiples orígenes (ver `app.ts:105`).

3. **Crear `.env.example`.** Documentar todas las variables de entorno requeridas con valores de ejemplo, facilitando la configuración en nuevos entornos.

---

## 11. Matriz de Priorización de Acciones de Mejora

| # | Criterio | Acción | Severidad | Prioridad | Estatus |
|---|----------|--------|-----------|-----------|---------|
| 1 | Usabilidad | Reemplazar IDs crudos por labels descriptivos en tablas | Alta | Alta | Por implementar |
| 2 | Funcionalidad | Normalizar enum EmployeeStatus (Activo → ACTIVO) | Alta | Alta | Por implementar |
| 3 | Funcionalidad | Auditar flujo de permisos (rol → permisos) | Alta | Alta | Por implementar |
| 4 | Funcionalidad | Implementar State Machine para CustomOrderStatus | Alta | Alta | Por implementar |
| 5 | Usabilidad | Forzar UTF-8 en capas de datos | Media-Alta | Alta | Por implementar |
| 6 | Usabilidad | Registrar formulario completo de Orden de Producción | Alta | Alta | Por implementar |
| 7 | Fiabilidad | Añadir tests para módulo deliveries | Alta | Alta | Por implementar |
| 8 | Seguridad | Migrar access token de localStorage a cookie httpOnly | Alta | Alta | Por implementar |
| 9 | Seguridad | Añadir CSP report-uri y Permissions-Policy | Media | Media | Por implementar |
| 10 | Rendimiento | Añadir compresión HTTP (compression middleware) | Media | Media | Por implementar |
| 11 | Mantenibilidad | Unificar naming conventions en Prisma schema | Media-Alta | Media-Alta | Por implementar |
| 12 | Mantenibilidad | Consolidar módulos duplicados (alerts/alert, etc.) | Media | Media | Por implementar |
| 13 | Mantenibilidad | Crear AGENTS.md para backend + CI/CD con lint/typecheck | Media | Media | Por implementar |
| 14 | Portabilidad | Crear Dockerfile + docker-compose.yml + .env.example | Baja | Media | Por implementar |
| 15 | Compatibilidad | Unificar routers de delivery y estandarizar envelope | Baja | Baja | Por implementar |

---

## 12. Conclusiones

El software **SurtiTelas** demuestra un nivel avanzado de madurez arquitectónica, con una base de código de **~461 archivos backend** y **~188 archivos frontend** construidos sobre Clean Architecture, TypeScript, Prisma y React. La implementación de controles de seguridad es robusta (HSTS, CSP, 2FA, rate limiting multinivel, sanitización XSS, auditoría), y la observabilidad está completa (tracing OpenTelemetry, métricas Prometheus, health checks estructurados).

Los principales aspectos a fortalecer se concentran en:

1. **Usabilidad:** Problemas documentados en `Prompt.md` afectan múltiples flujos críticos (pagos, clientes, producción, notificaciones).
2. **Seguridad del cliente:** El access token en `localStorage` es el vector de ataque XSS más crítico.
3. **Coherencia en capas:** Naming inconsistente y módulos duplicados aumentan la complejidad de mantenimiento.
4. **Cobertura de pruebas:** Carencia de tests en módulos como `deliveries`, `alert`, `financial`, `export`.

Se ha documentado un historial de mejoras implementadas (Fase 3: validación de INSTALLMENTS, sincronización de tipos Pedido.total; Fase 5: refactorización de ListRutaDelDia a Repository Pattern, corrección del bug `total: 0` en CreateDelivery), demostrando una práctica evolutiva de refactorización basada en diagnósticos.

---

*Documento elaborado el 2026-09-17 basado en análisis estático del repositorio SurtiTelas.*
