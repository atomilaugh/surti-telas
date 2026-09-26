# Consulta de seguridad — SurtiTelas

**Fecha de revisión:** 22 de septiembre de 2026  
**Alcance:** revisión estática del árbol de trabajo actual de `software_SurtiTelas.Backend` y `software_SurtiTelas.Fronend`.  
**Clasificación:** documento de uso interno. No se incluyen valores de secretos, tokens ni credenciales.

## 1. Resumen ejecutivo

SurtiTelas cuenta con una base de defensa en profundidad: Express con Helmet, CORS configurado, Prisma/PostgreSQL, validación Zod, JWT de corta duración, rotación de refresh tokens, bcrypt, 2FA TOTP, bloqueo de cuentas, rate limiting, auditoría y controles básicos para cargas de archivos.

La postura actual es **media-alta, pero no apta para producción sin corregir hallazgos críticos**. Las prioridades son:

1. Eliminar el refresh token guardado en claro después de verificar 2FA.
2. Rotar secretos locales y retirar del historial Git el token JWT temporal versionado.
3. Corregir la cookie de refresh en desarrollo y completar los controles del flujo Google/OIDC.
4. Aplicar CSP y headers de seguridad también en el frontend/proxy de producción.
5. Validar contenido real de archivos, no solo el MIME declarado.
6. Eliminar la sanitización HTML global de las APIs JSON.

### Matriz de estado

| Dominio | Estado | Hallazgo principal | Prioridad |
|---|---|---|---|
| Hashing y cifrado | Parcial | bcrypt 12 para contraseñas; secretos 2FA almacenados sin cifrar | Alta |
| JWT y tokens | Parcial | rotación implementada, pero 2FA guarda refresh en claro | Crítica |
| OAuth 2 / OIDC | Parcial | se verifica ID Token de Google; faltan controles de nonce/state y vinculación segura | Alta |
| CSP, SOP y CORS | Parcial | Helmet en backend; frontend/proxy sin CSP y CORS abierto en desarrollo | Media-Alta |
| XSS | Parcial | no se hallaron sinks peligrosos; la sanitización global es inadecuada | Media |
| SQL injection | Bajo | Prisma y raw SQL estático con tagged templates | Bajo |
| Inyección de archivos/instrucciones | Medio | MIME allowlist sin magic bytes; metadata de nombre original sin sanitizar | Media |
| Gestión de secretos | Crítica | secretos locales y JWT versionado en el repositorio de trabajo | Crítica |

## 2. Aclaración terminológica

En seguridad web, **CSP** normalmente significa **Content Security Policy**, una política HTTP que restringe scripts, estilos, imágenes, conexiones y otros recursos. Un **Cryptographic Service Provider** es un componente criptográfico de Windows y no es la política que mitiga XSS. Este documento usa CSP para referirse a **Content Security Policy**.

OAuth 2.0 es un protocolo de **autorización**; para autenticación de usuarios se usa normalmente **OpenID Connect (OIDC)** sobre OAuth 2.0.

## 3. Algoritmos criptográficos y de hashing

### Implementación actual

- Las contraseñas se hash con `bcryptjs` y costo **12** en `software_SurtiTelas.Backend/src/modules/auth/infrastructure/services/BcryptPasswordHasher.ts:5-8`.
- El modelo `User` almacena `passwordHash`, no la contraseña en claro, en `software_SurtiTelas.Backend/prisma/schema.prisma:10-24`.
- Los JWT se firman con `jsonwebtoken` y secretos separados para access, refresh y temp en `software_SurtiTelas.Backend/src/modules/auth/infrastructure/services/JwtTokenService.ts:11-31`.
- El servicio usa el algoritmo por defecto de `jsonwebtoken` (HS256), pero no declara explícitamente el algoritmo ni valida `issuer`/`audience` en `JwtTokenService.ts:14-15,21-22,28-29,35,44,53`.
- 2FA usa TOTP de `otplib` en `software_SurtiTelas.Backend/src/modules/auth/application/use-cases/EnableTwoFactor.ts:1,9-11` y `VerifyTwoFactor.ts:5,31-33`.
- El secreto TOTP se guarda directamente en `User.twoFactorSecret`; no se encontró cifrado en reposo. Además, `EnableTwoFactor.ts:10` genera la URI con el label fijo `admin@surtitelas.com` en lugar del correo real.
- Los refresh tokens se almacenan normalmente como hash bcrypt en `RefreshToken.ts:24-25,46-49`, salvo el caso crítico de 2FA descrito abajo.

### Evaluación

- **Correcto:** bcrypt con costo 12 es una base razonable para contraseñas.
- **No es cifrado:** bcrypt y los JWT firmados no cifran datos. Un JWT es legible por quien lo posea; solo garantiza integridad/autenticidad mientras la clave sea segura.
- **Riesgo:** los secretos 2FA en claro permiten generar códigos válidos si se compromete la base de datos.
- **Riesgo:** no validar explícitamente algoritmo, emisor y audiencia facilita configuraciones inseguras o aceptación de tokens de otro contexto.

### Recomendación

- Mantener bcrypt con costo adaptativo o migrar nuevas contraseñas a **Argon2id** si la plataforma lo permite.
- Cifrar secretos 2FA en reposo con **AES-256-GCM** y una clave externa al esquema de la base de datos (KMS/Vault/secret manager).
- Usar claves JWT aleatorias, independientes y de al menos 256 bits; declarar `algorithms: ['HS256']` y validar `issuer`, `audience`, `exp`, `nbf` y `type`.
- Para varios servicios o rotación frecuente, evaluar firma asimétrica (RS256/ES256) con administración de claves.
- Nunca guardar contraseñas, secretos TOTP, refresh tokens o claves privadas en código, logs o respuestas API.

## 4. Manejo de tokens y sesiones

### Flujo actual

- Access token: 15 minutos.
- Refresh token: 7 días.
- Token temporal de 2FA: 5 minutos.
- Los valores están configurados en `software_SurtiTelas.Backend/src/config/env.ts:16-20` y se firman en `JwtTokenService.ts:11-31`.
- El refresh token se guarda como hash bcrypt y se rota en `RefreshToken.ts:15-51`.
- El logout limpia la cookie y revoca el refresh almacenado en `auth.controller.ts:103-138` y `Logout.ts:25-36`.
- El frontend actual guarda el access token solo en memoria en `software_SurtiTelas.Fronend/src/infrastructure/api/tokenStorage.ts:1-19`.
- El estado de sesión (`user` e `isAuthenticated`) se persiste en `localStorage` mediante Zustand en `authStore.ts:93-100,193-200`; no se encontró el access token dentro de ese almacenamiento.
- Ante un 401, `httpClient.ts:93-123,157-165` llama a `/auth/refresh` con `credentials: 'include'`, guarda el nuevo access token en memoria y reintenta una vez.

### Hallazgos críticos

1. **Refresh token en claro tras 2FA.** `VerifyTwoFactor.ts:36-39` genera un refresh token y lo envía directamente a `updateRefreshToken` sin hash. Cualquier lectura de la tabla `users.refresh_token` permite reutilizar la sesión.
2. **Cookie incompatible en desarrollo.** `auth.controller.ts:23-31` usa `SameSite=None` con `Secure=false` cuando `NODE_ENV` no es producción. Los navegadores modernos rechazan esa combinación. Además, `clearCookie` usa `SameSite=Lax` en desarrollo (`auth.controller.ts:103-110`), por lo que los atributos de creación y borrado no coinciden.
3. **Revocación no inmediata del access token.** Un access token puede seguir siendo válido hasta 15 minutos después de logout, cambio de contraseña o desactivación de usuario. No se encontró una blacklist/familia de sesiones en Redis.
4. **Sin detección de reuse del refresh token.** La rotación reemplaza el token, pero no se encontró una marca de compromiso cuando un refresh token antiguo se presenta después de haber sido rotado.
5. **Token temporal versionado.** `software_SurtiTelas.Fronend/tmp_decode_token.js:1` está tracked por Git y contiene un JWT. No se reproduce su valor en este documento. Debe eliminarse del repositorio y tratarse como comprometido; si el secreto de firma sigue activo, rotarlo.
6. **Secretos locales.** El `.env` del backend contiene credenciales de desarrollo/producción en el directorio de trabajo. Está ignorado por Git, pero cualquier copia del directorio o publicación accidental los expone. Rotar JWT, base de datos, SMTP, VAPID, Turnstile y métricas; verificar también el historial Git.

### Recomendación de almacenamiento

- Mantener el access token en memoria o migrar a una cookie `HttpOnly; Secure; SameSite` gestionada por un backend-for-frontend.
- Si la autenticación pasa a cookies, añadir protección CSRF (token doble submit o SameSite adecuado) y no confiar solo en CORS.
- Usar `SameSite=Lax` en desarrollo y `SameSite=None; Secure=true` únicamente para un flujo cross-site HTTPS que lo requiera.
- Añadir `jti`, versión de sesión o familia de refresh tokens; detectar reuse y revocar toda la familia comprometida.
- Revocar sesiones en logout, cambio de contraseña, desactivación de usuario y rotación de claves.
- No persistir permisos sensibles en `localStorage` si pueden quedar desactualizados; usarlos solo como caché y validar siempre en el backend.

## 5. Inicio de sesión con Google: OAuth 2 / OIDC

### Implementación actual

- El backend importa `OAuth2Client` y verifica un ID Token de Google con `verifyIdToken` en `software_SurtiTelas.Backend/src/modules/auth/application/use-cases/GoogleAuth.ts:1,9-35`.
- El frontend obtiene y envía el ID Token al endpoint `/auth/google` en `software_SurtiTelas.Fronend/src/presentation/pages/auth/LoginPage.tsx:97-126`.
- El backend valida `audience` con `GOOGLE_CLIENT_ID` (`GoogleAuth.ts:23-30`) y crea o vincula un usuario local (`GoogleAuth.ts:40-60`).
- Luego emite access/refresh tokens y guarda el refresh como hash (`GoogleAuth.ts:62-81`).

### Evaluación

Este es un flujo de **verificación de ID Token de Google/OIDC**, no una implementación completa de OAuth 2 Authorization Code en el backend. No se encontró:

- validación explícita de `nonce`;
- uso/validación de `state` para prevenir CSRF en un flujo por redirección;
- PKCE, aplicable si se migra a Authorization Code;
- validación explícita de `email_verified`;
- política documentada para vincular una cuenta local existente con un `sub` de Google distinto;
- discovery/JWKS propio; la biblioteca lo gestiona internamente, pero conviene fijar y probar la configuración.

El punto más delicado es la vinculación por correo: un token válido con el mismo email pero otro `sub` puede terminar asociándose a la cuenta local (`GoogleAuth.ts:44-60`). Debe exigirse verificación de correo y un proceso explícito de vinculación/desvinculación.

### Recomendación

- Si se mantiene Google Identity Services/ID Token: generar y verificar `nonce`, comprobar `email_verified`, validar `iss`, `aud`, `exp`, `iat` y `sub`, y definir una política segura de account linking.
- Si se implementa OAuth 2 Authorization Code: usar **PKCE**, `state` aleatorio, redirect URI exactas en allowlist y exchange de código en servidor; nunca incluir client secret en el navegador.
- Aplicar 2FA después del login social para roles privilegiados.
- Registrar y auditar el evento de vinculación de identidad externa.

Referencias: RFC 6749 (OAuth 2.0), RFC 7636 (PKCE), RFC 9700 (OAuth 2.0 Security BCP) y OpenID Connect Core 1.0.

## 6. CSP, política del mismo origen, CORS y headers

### Implementación actual

Helmet configura en producción (`software_SurtiTelas.Backend/src/config/app.ts:80-103`):

- `default-src 'self'`;
- `script-src 'self'`;
- `style-src 'self'`;
- `img-src 'self' data: https:`;
- `font-src 'self' data:`;
- `connect-src 'self' wss: https://surti-telas-backend.onrender.com`;
- `frame-ancestors 'none'`;
- `base-uri 'self'`;
- `form-action 'self'`;
- HSTS con un año e `includeSubDomains`;
- COOP `same-origin`, COEP `require-corp` y `Referrer-Policy: strict-origin-when-cross-origin`.

CORS usa una lista de orígenes desde `CORS_ORIGIN`, permite credenciales y restringe métodos/headers en `app.ts:105-129`. En desarrollo, cualquier origen es aceptado (`app.ts:109-111`).

### Hallazgos

- La CSP está aplicada al backend, pero `software_SurtiTelas.Fronend/vercel.json:1-7` solo define un rewrite y no headers CSP/HSTS/Permissions-Policy para el frontend.
- `software_SurtiTelas.Fronend/nginx.conf:1-29` tampoco agrega headers de seguridad.
- No hay `report-uri` ni `report-to` en la CSP; las violaciones no generan alertas.
- Falta `Permissions-Policy` para cámara, micrófono, geolocalización y otras APIs del navegador.
- `connectSrc` contiene un origen backend hardcodeado y debe ser configurable por entorno.
- CORS abierto en desarrollo es aceptable solo si `NODE_ENV=development` está garantizado; una configuración incorrecta en producción lo abriría.
- La política del mismo origen del navegador y CORS no sustituyen la validación de autenticación ni la protección CSRF.

### Recomendación

- Publicar headers equivalentes en cada borde: backend, Vercel y Nginx.
- Añadir CSP en modo `Content-Security-Policy-Report-Only` inicialmente, con `report-to`/`report-uri`, límite de tamaño y rate limit en el endpoint de reportes.
- Migrar a nonces o hashes para scripts/estilos que deban ser inline; evitar `'unsafe-eval'` y reducir `'unsafe-inline'`.
- Hacer `connect-src`, `img-src` y demás orígenes configurables.
- Añadir `Permissions-Policy`, `X-Content-Type-Options: nosniff` y mantener `frame-ancestors 'none'`.
- Validar en pruebas que la CSP no bloquee Vite, mapas, WebSockets, Turnstile, PDFs o imágenes legítimas.

## 7. Prevención de XSS

### Controles observados

- React escapa por defecto los valores renderizados como texto.
- No se encontraron sinks directos como `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval` o `new Function` en el código frontend/backend revisado.
- El backend aplica `escapeHtml` a body, query y params en `software_SurtiTelas.Backend/src/modules/shared/presentation/middlewares/sanitize.ts:5-12,33-43`.
- La auditoría redacta campos sensibles en `AuditService.ts:23-42`.

### Problema de diseño

La sanitización global de entrada **no es una defensa XSS correcta para una API JSON**. Convierte texto legítimo en entidades HTML (`&lt;`, `&gt;`, `&quot;`) y puede contaminar la base de datos. La defensa debe ser:

1. validación estricta en la entrada;
2. escape específico según el contexto de salida (HTML, atributo, URL, JavaScript, CSS);
3. CSP como capa adicional;
4. sanitización HTML solo cuando se acepte HTML rico y mediante una librería adecuada.

### Riesgos adicionales

- `CustomOrderMapper.ts:7-16` solo elimina URLs `blob:`; no valida que las URLs de referencia sean HTTP/HTTPS y de orígenes permitidos.
- `useUserRole.ts:3-16` escribe un rol en un atributo DOM; el riesgo es bajo, pero el valor debe provenir de un enum/allowlist.
- No se encontró una librería de sanitización frontend como DOMPurify; es aceptable mientras no se renderice HTML no confiable.

### Recomendación

- Retirar `app.use(sanitizeInput)` de `app.ts:158` para APIs JSON.
- Mantener Zod y validadores de dominio; aplicar escape únicamente en la capa de presentación HTML.
- Prohibir HTML no confiable o usar DOMPurify con una allowlist estricta.
- Validar esquemas y protocolos de URLs; bloquear `javascript:`, `data:` y esquemas no permitidos.
- Mantener CSP estricta y pruebas XSS en CI.

## 8. Prevención de inyección de código

### SQL injection

- La mayoría de consultas usa Prisma ORM, que parametriza valores (`Prisma*Repository.ts`).
- Se encontraron raw SQL en templates etiquetados y estáticos:
  - health check: `software_SurtiTelas.Backend/src/shared/infrastructure/healthCheck.ts:20-23`;
  - lock advisory de pedidos: `PrismaOrderRepository.ts:194-197`;
  - lock advisory de órdenes personalizadas: `PrismaCustomOrderRepository.ts:174-177`;
  - agregaciones de analytics: `analytics.controller.ts:48-52`.
- No se encontró interpolación de entrada de usuario en esos raw queries.

**Conclusión:** no se identificó SQL injection confirmada. Mantener las consultas raw como tagged templates y nunca construir SQL mediante concatenación. Validar con allowlists los campos de ordenamiento, filtros y nombres dinámicos.

### Inyección de comandos, plantillas y deserialización

- No se encontraron usos de `child_process`, `exec`, `spawn`, `eval`, `Function`, `vm` ni motores de plantillas inseguros en el backend revisado.
- No se identificó un vector confirmado de inyección de instrucciones.

### Inyección mediante archivos

Controles actuales:

- MIME allowlist y límites de tamaño en `software_SurtiTelas.Backend/src/shared/infrastructure/multer/multerConfig.ts:18-30`.
- Nombres aleatorios con UUID/timestamp y directorios fijos en `multerConfig.ts:6-15`, `avatarUpload.ts:6-25` y middlewares de pedidos personalizados.
- La ruta pública de uploads se monta en `app.ts:156`.

Riesgos confirmados:

- La validación se basa en `file.mimetype`, que el cliente puede falsificar; no se encontró validación de magic bytes/signatura.
- La extensión se toma de `file.originalname` y no siempre se cruza con el MIME permitido (`multerConfig.ts:12-14`, `avatarUpload.ts:13-15`).
- `originalname` se persiste como metadata en `order.controller.ts:193-198` y en controladores de pedidos personalizados sin una normalización explícita.
- Los archivos quedan bajo un árbol público `/uploads`; los payment proofs tienen una ruta específica bloqueada en `app.ts:152-154`, pero debe verificarse cada endpoint de descarga y sus autorizaciones.

### SSRF

El validador de webhooks bloquea loopback, privados, link-local y varios rangos reservados en `software_SurtiTelas.Backend/src/modules/webhooks/presentation/validators/webhook.validators.ts:3-33`. Sin embargo, acepta `http:` y debe reforzarse contra DNS rebinding, redirecciones y cambios de resolución entre validación y petición.

### Recomendación

- Validar firma/magic bytes, extensión, dimensiones y tipo real; rechazar SVG/HTML/ZIP si no son requeridos.
- Normalizar y limitar `originalname`; nunca usarlo para construir rutas.
- Guardar uploads fuera del document root o servirlos mediante un endpoint autenticado y autorizado.
- Escanear archivos y limitar relación de compresión para evitar ZIP bombs.
- Para webhooks, exigir HTTPS, resolver y volver a validar el destino, seguir/redireccionar con política estricta y limitar puertos.
- Mantener Prisma parametrizado y añadir pruebas con payloads de SQLi, path traversal y archivos políglota.

## 9. Controles complementarios observados

- Validación Zod/DTO en la frontera HTTP (`validate.ts:4-11`).
- Rate limiting global y por usuario en `app.ts:163-177`; limitadores sensibles y de recuperación en sus middlewares correspondientes.
- Bloqueo tras cinco intentos fallidos en `LoginUser.ts:24-25,76-91`.
- Turnstile en operaciones sensibles (`turnstile.ts:5-59`).
- RBAC con roles y permisos (`authorize.ts:4-28`).
- Auditoría de eventos de autenticación y redacción de campos sensibles (`AuditService.ts:23-42`).
- Validación de secretos de producción en `validateProductionSecrets.ts:2-38`.
- CORS con credenciales y allowlist en producción (`app.ts:105-129`).

### Controles que faltan o deben reforzarse

- No se encontró una política de sesiones concurrentes ni gestión de dispositivos.
- No se encontró blacklist de access tokens con TTL corto.
- No se encontró detección de reuse de refresh tokens.
- No se encontró validación automática de vulnerabilidades de dependencias en CI.
- El archivo `software_SurtiTelas.Backend/README.md:75-78` documenta credenciales de seed; no deben existir en producción y deben rotarse/forzar cambio tras cualquier despliegue.
- `npm audit` no pudo completarse por timeout en esta revisión; debe ejecutarse en CI con fallo para vulnerabilidades altas/críticas.

## 10. Plan de corrección priorizado

### P0 — antes de producción

1. Hashear el refresh token en `VerifyTwoFactor.ts:38` antes de persistirlo.
2. Eliminar `tmp_decode_token.js` del repositorio e historial si corresponde; rotar el secreto JWT asociado.
3. Rotar todos los secretos locales del `.env` y moverlos a un secret manager.
4. Corregir `SameSite`/`Secure` de la cookie y hacer coincidir creación y borrado.
5. Cifrar `twoFactorSecret` en reposo y corregir el label de `otpauthUrl` para usar el email real.
6. Revisar la vinculación de cuentas Google: `email_verified`, `nonce`, `sub` y account linking.

### P1 — primera sprint

7. Retirar la sanitización HTML global de APIs JSON.
8. Añadir CSP/headers en Vercel y Nginx, con reporteo y orígenes configurables.
9. Validar magic bytes y normalizar nombres de archivos.
10. Añadir `issuer`, `audience`, `algorithms` y `type` a la verificación JWT.
11. Implementar revocación/familias de refresh tokens y reuse detection.
12. Eliminar credenciales de seed de producción y exigir cambio de contraseña inicial.

### P2 — siguiente sprint

13. Añadir pruebas de seguridad: JWT inválido/expirado, replay, XSS, SQLi, path traversal, MIME falsificado y CORS.
14. Añadir ESLint security/no-secrets y análisis SAST en CI.
15. Reforzar SSRF de webhooks con HTTPS, DNS revalidation y control de redirecciones.
16. Revisar y actualizar Vite y demás dependencias; ejecutar `npm audit` como gate.
17. Añadir monitoreo de violaciones CSP, reutilización de tokens y accesos a uploads sensibles.

## 11. Referencias de buenas prácticas

- OWASP Authentication Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP Password Storage Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
- OWASP Session Management Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- OWASP JSON Web Token Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html>
- OWASP Cross Site Scripting Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- OWASP Content Security Policy Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html>
- OWASP SQL Injection Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html>
- OWASP Input Validation Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- OWASP File Upload Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
- RFC 6749 — OAuth 2.0: <https://www.rfc-editor.org/rfc/rfc6749>
- RFC 7636 — Proof Key for Code Exchange: <https://www.rfc-editor.org/rfc/rfc7636>
- RFC 9700 — OAuth 2.0 Security Best Current Practice: <https://www.rfc-editor.org/rfc/rfc9700>
- RFC 8725 — JWT Best Current Practices: <https://www.rfc-editor.org/rfc/rfc8725>

## 12. Limitaciones

Esta consulta es una revisión estática del código y la configuración visibles. No incluye pruebas dinámicas, pentesting, revisión de infraestructura real, análisis de tráfico, validación de despliegues ni auditoría completa del historial Git. La ausencia de un sink en una búsqueda estática no demuestra ausencia total de vulnerabilidades.
