# SPEC 08 — Cuentas de cliente y acceso passwordless

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Supersedes:** SPEC 06 (vigencia del checkout token después de confirmar una reserva)
> **Date:** 2026-08-04
> **Objective:** Crear y vincular cuentas de cliente después de cada pago confirmado, habilitar acceso passwordless mediante magic links y sesiones aisladas, y enviar por SMTP la confirmación de la reserva.

## Why this spec exists

El flujo público termina actualmente al confirmar el pago. El cliente recibe el resultado inmediato en el frontend, pero no conserva una cuenta ni una confirmación enviada por el restaurante.

Esta spec crea la identidad del cliente únicamente después de un pago válido. El correo de confirmación también actúa como acceso passwordless, evitando contraseñas y cuentas previas al checkout.

La consulta de reservas se mantiene separada para no mezclar identidad, autenticación, correo y portal de autoservicio en una sola entrega. La futura SPEC 09 utilizará la relación entre `Customer` y `Reservation` creada aquí.

## Scope

**In:**

- Crear o reutilizar una cuenta de cliente cuando un webhook Stripe confirme una reserva.
- Identificar al cliente por correo normalizado dentro de cada restaurante.
- Vincular la reserva confirmada mediante `Reservation.customerId` dentro de la misma transacción que confirma el pago.
- Conservar el nombre y teléfono originales cuando la cuenta ya exista.
- Mantener nombre, correo y teléfono como snapshots independientes en cada reserva.
- Crear una cuenta con `emailVerifiedAt = null` hasta consumir su primer magic link.
- Crear un magic link por cada reserva confirmada.
- Enviar después del commit un único correo que combine agradecimiento, resumen de la reserva y acceso passwordless.
- Enviar todos los correos automáticos de reservas confirmadas sin aplicar el límite de solicitudes manuales.
- Usar Nodemailer mediante un contrato de correo y SMTP de Gmail como implementación inicial.
- Persistir el estado `PENDING`, `SENT` o `FAILED` de cada entrega y un código técnico no sensible cuando falle.
- Mantener confirmados el pago, la reserva y la cuenta aunque falle SMTP.
- Permitir solicitar manualmente otro magic link mediante un endpoint público.
- Responder de forma indistinguible cuando el correo solicitado no corresponda a una cuenta.
- Limitar únicamente las solicitudes manuales a un envío por minuto por restaurante y correo normalizado.
- Invalidar los magic links anteriores no consumidos cuando se genere uno nuevo para la cuenta.
- Intercambiar un magic link válido por access token, refresh token y el DTO mínimo del cliente.
- Verificar el correo al consumir correctamente el primer magic link.
- Mantener sesiones de cliente independientes de las sesiones de trabajadores.
- Permitir sesiones simultáneas en varios dispositivos.
- Rotar el refresh token creando una nueva sesión y conservar la sesión reemplazada para detectar reutilización.
- Revocar todas las sesiones del cliente cuando se reutilice un refresh token reemplazado.
- Revocar únicamente la sesión indicada durante un logout normal.
- Exponer un endpoint autenticado con el perfil mínimo del cliente.
- Limitar el `checkoutToken` de una reserva confirmada a las 24 horas posteriores a `confirmedAt`.
- Actualizar `.env.example`, `README.md` y `api-contract/` con el nuevo contrato.
- Verificar manualmente el envío real mediante Gmail SMTP.

**Out of scope (for future specs):**

- Listar o consultar reservas propias; estas capacidades pasan a SPEC 09.
- Cancelar, reprogramar o modificar una reserva.
- Solicitar reembolsos o consultar el historial completo de pagos.
- Editar nombre, correo o teléfono del perfil.
- Contraseñas, recuperación de contraseña, OAuth o acceso mediante redes sociales.
- Unificar clientes de restaurantes diferentes en una identidad global.
- Cuentas creadas antes del pago o desde reservas que no fueron confirmadas.
- Backfill de reservas confirmadas antes de esta spec.
- Administración interna de clientes, bloqueo de cuentas o estados `ACTIVE` e `INACTIVE`.
- Eliminación de cuentas y políticas de anonimización o retención de PII.
- Facturas, comprobantes fiscales, archivos adjuntos o recibos emitidos por Stripe.
- Reintentos automáticos, outbox, cron jobs o colas para correos fallidos.
- Rate limiting transversal por IP, CAPTCHA o protección antifraude.
- Pruebas automatizadas o incorporación de un framework de testing.

## Data model

### Prisma

```prisma
enum CustomerMagicLinkSource {
  RESERVATION_CONFIRMATION
  ACCESS_REQUEST
}

enum CustomerMagicLinkDeliveryStatus {
  PENDING
  SENT
  FAILED
}

model Restaurant {
  // Campos y relaciones existentes.
  customers Customer[]
}

model Customer {
  id              String              @id @default(uuid()) @db.Uuid
  restaurantId    String              @db.Uuid
  fullName         String              @db.VarChar(150)
  email            String              @db.VarChar(320)
  normalizedEmail  String              @db.VarChar(320)
  phone            String              @db.VarChar(16)
  emailVerifiedAt  DateTime?           @db.Timestamptz(3)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  restaurant       Restaurant          @relation(fields: [restaurantId], references: [id], onDelete: Restrict)
  reservations     Reservation[]
  sessions         CustomerSession[]
  magicLinks       CustomerMagicLink[]

  @@unique([restaurantId, normalizedEmail])
  @@index([restaurantId, emailVerifiedAt])
}

model CustomerSession {
  id                    String           @id @default(uuid()) @db.Uuid
  customerId            String           @db.Uuid
  refreshTokenHash      String           @unique @db.Char(64)
  expiresAt             DateTime         @db.Timestamptz(3)
  revokedAt             DateTime?        @db.Timestamptz(3)
  replacedBySessionId   String?          @unique @db.Uuid
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  customer              Customer         @relation(fields: [customerId], references: [id], onDelete: Cascade)
  replacedBySession     CustomerSession? @relation("CustomerSessionRotation", fields: [replacedBySessionId], references: [id], onDelete: SetNull)
  replacesSession       CustomerSession? @relation("CustomerSessionRotation")

  @@index([customerId, revokedAt])
  @@index([expiresAt])
}

model CustomerMagicLink {
  id              String                          @id @default(uuid()) @db.Uuid
  customerId      String                          @db.Uuid
  reservationId   String?                         @unique @db.Uuid
  source          CustomerMagicLinkSource
  tokenHash       String                          @unique @db.Char(64)
  deliveryStatus  CustomerMagicLinkDeliveryStatus @default(PENDING)
  expiresAt       DateTime                        @db.Timestamptz(3)
  consumedAt      DateTime?                       @db.Timestamptz(3)
  invalidatedAt   DateTime?                       @db.Timestamptz(3)
  sentAt          DateTime?                       @db.Timestamptz(3)
  failedAt        DateTime?                       @db.Timestamptz(3)
  lastErrorCode   String?                         @db.VarChar(100)
  createdAt       DateTime                        @default(now())
  updatedAt       DateTime                        @updatedAt
  customer        Customer                        @relation(fields: [customerId], references: [id], onDelete: Cascade)
  reservation     Reservation?                    @relation(fields: [reservationId], references: [id], onDelete: Restrict)

  @@index([customerId, createdAt])
  @@index([deliveryStatus, createdAt])
  @@index([expiresAt])
}

model Reservation {
  // Campos y relaciones existentes.
  customerId      String?             @db.Uuid
  customer        Customer?           @relation(fields: [customerId], references: [id], onDelete: Restrict)
  customerMagicLink CustomerMagicLink?

  @@index([customerId, status, startAt])
}
```

`Reservation.customerId` permanece nullable porque no se hará backfill. Las reservas creadas antes de esta spec continúan siendo válidas.

`CustomerMagicLink.reservationId` es único y nullable. PostgreSQL permite varios valores `NULL`, por lo que cada reserva confirmada tiene como máximo un correo automático y las solicitudes manuales pueden crear enlaces sin reserva.

### Customer invariants

- `normalizedEmail` se obtiene con `trim()` y conversión a minúsculas.
- La identidad es única mediante `restaurantId + normalizedEmail`.
- El mismo correo puede pertenecer a cuentas independientes en restaurantes diferentes.
- Una cuenta nueva toma `fullName`, `email` y `phone` de la primera reserva que la confirma.
- Una cuenta existente conserva esos tres campos cuando paga reservas posteriores.
- Cada reserva mantiene sus snapshots originales y nunca depende del perfil para representar al comprador.
- Solo una reserva que transiciona válidamente a `CONFIRMED` puede crear o vincular una cuenta.
- Pagos tardíos, duplicados, inconsistentes o reembolsados no crean cuentas ni relaciones nuevas.
- La creación concurrente para el mismo restaurante y correo converge en una sola cuenta mediante la restricción única y reintentos acotados.
- La confirmación, el alta o lookup del cliente, `Reservation.customerId` y el magic link automático se persisten en la misma transacción `Serializable`.
- Si esa transacción falla, no queda una reserva confirmada sin el vínculo previsto por esta spec.
- Un fallo posterior de SMTP no revierte ningún dato de negocio.

### Magic link invariants

- Cada token contiene 32 bytes aleatorios y se codifica como Base64 URL-safe sin padding.
- PostgreSQL conserva únicamente el SHA-256 hexadecimal del token.
- El token original solo existe durante la construcción del correo o la respuesta interna que inicia el envío.
- El token original nunca se registra, persiste ni incluye en errores.
- Cada magic link vence exactamente quince minutos después de su creación.
- Un enlace es válido solo si no venció, no fue consumido y no fue invalidado.
- Generar cualquier enlace nuevo invalida en la misma transacción todos los enlaces anteriores no consumidos de esa cuenta.
- Consumir un enlace y crear la primera sesión ocurre transaccionalmente.
- Dos intercambios concurrentes del mismo enlace permiten como máximo un éxito.
- El primer consumo válido establece `Customer.emailVerifiedAt`.
- Los consumos posteriores no modifican la fecha original de verificación.
- Un enlace automático usa `source = RESERVATION_CONFIRMATION` y referencia la reserva confirmada.
- Un enlace manual usa `source = ACCESS_REQUEST` y `reservationId = null`.
- El límite de un minuto se calcula únicamente sobre enlaces manuales del mismo cliente.
- El límite manual no retrasa ni suprime correos automáticos de reservas confirmadas.
- Una solicitud limitada responde igual que una solicitud aceptada y no crea ni envía otro enlace.

### Customer session invariants

- Los clientes usan un secreto distinto de los trabajadores.
- Los access tokens usan HS256 y el claim `aud = "customer"`.
- Los access tokens contienen `sub = customerId` y `jti = customerSessionId`.
- Cada access token vence después de 25 minutos.
- Cada refresh token contiene 32 bytes aleatorios y vence después de 30 días.
- PostgreSQL conserva únicamente el SHA-256 del refresh token.
- El middleware comprueba firma, audiencia, expiración, sesión, revocación y pertenencia al cliente.
- Un token de cliente nunca es válido en el middleware administrativo.
- Un token administrativo nunca es válido en el middleware de clientes.
- Refrescar crea una nueva `CustomerSession` y marca la anterior como revocada y reemplazada.
- La nueva sesión recibe una nueva vigencia de 30 días.
- La sesión reemplazada conserva su hash para reconocer una reutilización posterior.
- Reutilizar el refresh token de una sesión reemplazada revoca todas las sesiones activas del cliente.
- Un refresh token inexistente, vencido o revocado por logout no revela ninguna causa interna.
- Varias sesiones no relacionadas pueden permanecer activas en dispositivos diferentes.
- El logout normal revoca únicamente la sesión correspondiente al refresh token recibido.
- Rotar una sesión invalida inmediatamente el access token asociado a la sesión anterior.

### Checkout token amendment

- Mientras una reserva continúe `PENDING_PAYMENT`, el `checkoutToken` conserva las reglas de SPEC 06 y SPEC 07.
- Una reserva confirmada acepta su `checkoutToken` hasta antes de `confirmedAt + 24 horas`.
- En `confirmedAt + 24 horas` o después, checkout y consulta de pago responden con el `404 PUBLIC_PAYMENT_NOT_FOUND` opaco.
- El límite se calcula desde `confirmedAt`; no requiere persistir otro campo de expiración.
- El frontend puede completar el polling posterior al pago durante esa ventana.
- Después de la ventana, el acceso del cliente depende de su autenticación passwordless.

### Email delivery

- `EmailService` es un contrato independiente de Nodemailer y Gmail.
- `NodemailerEmailService` es la implementación inicial mediante SMTP.
- Cada reserva confirmada crea exactamente un `CustomerMagicLink` automático.
- Los replays del webhook no crean otro enlace ni vuelven a enviar el correo automático.
- El envío ocurre después de completar la transacción de confirmación.
- Antes del intento, el enlace permanece `PENDING`.
- Un envío aceptado por SMTP establece `SENT` y `sentAt`.
- Un fallo establece `FAILED`, `failedAt` y un `lastErrorCode` técnico no sensible.
- Un fallo SMTP no cambia el webhook procesado a fallido y no solicita otro cobro.
- Esta spec no reintenta automáticamente entregas `FAILED` o `PENDING` abandonadas por una caída del proceso.
- El cliente puede solicitar manualmente un nuevo enlace.
- Cada correo incluye una versión HTML y otra de texto plano en español.
- La fecha y hora de la reserva se convierten a la zona horaria IANA del restaurante.
- El asunto identifica que la reserva fue confirmada.
- El cuerpo incluye nombre del cliente, restaurante, sucursal, fecha, hora, personas, platos, cantidades, total, moneda y estado confirmado.
- El cuerpo incluye un único botón o URL de acceso.
- El correo no incluye mesa interna, UUID, token de checkout, IDs Stripe, datos de tarjeta ni respuestas privadas del proveedor.
- La URL se construye desde `CUSTOMER_MAGIC_LINK_URL` y añade `token` como query parameter.
- `CUSTOMER_MAGIC_LINK_URL` es absoluta y usa HTTPS, salvo `http://localhost` en desarrollo.

### Configuration

```env
CUSTOMER_ACCESS_TOKEN_SECRET=
CUSTOMER_MAGIC_LINK_URL=http://localhost:4321/auth/magic-link
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=Restaurante Olímpico
SMTP_FROM_EMAIL=
```

- `CUSTOMER_ACCESS_TOKEN_SECRET` debe contener al menos 32 bytes de entropía y ser distinto de `ACCESS_TOKEN_SECRET` y `CHECKOUT_TOKEN_SECRET`.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM_NAME` son cadenas obligatorias no vacías.
- `SMTP_PORT` es un entero entre 1 y 65535.
- `SMTP_SECURE` acepta explícitamente `true` o `false`.
- Gmail sobre el puerto `587` exige `SMTP_SECURE=false` y usa STARTTLS.
- `SMTP_FROM_EMAIL` debe ser un correo válido y normalmente coincide con `SMTP_USER` o un alias autorizado.
- `SMTP_PASS` usa una contraseña de aplicación de Gmail y nunca la contraseña principal de la cuenta.
- La aplicación rechaza al iniciar variables ausentes, vacías o sintácticamente inválidas.
- El arranque valida configuración, pero no depende de una conexión SMTP disponible.
- `.env.example` contiene placeholders y nunca credenciales reales.
- Ninguna clave, contraseña o token aparece en logs o respuestas HTTP.

## HTTP contract

### Request magic link

`POST /public/restaurants/:restaurantSlug/customer-auth/magic-links`

```json
{
  "email": "cliente@example.com"
}
```

Respuesta `202` para una cuenta existente, inexistente, limitada o no elegible:

```json
{
  "message": "Si existe una cuenta elegible, enviaremos un enlace de acceso."
}
```

- El endpoint no exige autenticación.
- `restaurantSlug` se valida con el schema público de SPEC 07.
- `email` se valida, recorta y normaliza.
- Solo una cuenta ya creada por una reserva confirmada puede recibir el correo.
- Un restaurante inexistente, un correo desconocido y el cooldown producen la misma representación.
- El endpoint nunca devuelve datos del cliente.
- Una solicitud manual válida invalida enlaces anteriores y crea un correo de acceso sin resumen de una reserva específica.

### Exchange magic link

`POST /public/customer-auth/magic-links/exchange`

```json
{
  "token": "opaque-base64url-token"
}
```

Respuesta `200`:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "customer": {
    "fullName": "Ana Pérez",
    "email": "ana@example.com",
    "phone": "+51987654321",
    "restaurantSlug": "restaurante-olimpico"
  }
}
```

- El token identifica de forma opaca al cliente y al restaurante.
- La respuesta nunca incluye UUID, hashes, timestamps ni estado SMTP.
- El frontend debe intercambiar el token inmediatamente y retirarlo de la URL mediante `history.replaceState`.

### Refresh customer session

`POST /customer-auth/refresh`

```json
{
  "refreshToken": "opaque-token"
}
```

Respuesta `200`:

```json
{
  "accessToken": "jwt",
  "refreshToken": "new-opaque-token",
  "customer": {
    "fullName": "Ana Pérez",
    "email": "ana@example.com",
    "phone": "+51987654321",
    "restaurantSlug": "restaurante-olimpico"
  }
}
```

El endpoint rota la sesión. El refresh token anterior no vuelve a ser válido.

### Logout customer session

`POST /customer-auth/logout`

```json
{
  "refreshToken": "opaque-token"
}
```

La respuesta exitosa es `204` sin body. Repetir logout con un token inexistente o ya revocado también devuelve `204` para mantener idempotencia.

### Get current customer

`GET /customer-auth/me`

Requiere `Authorization: Bearer <customerAccessToken>`.

Respuesta `200`:

```json
{
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "phone": "+51987654321",
  "restaurantSlug": "restaurante-olimpico"
}
```

Este endpoint valida la sesión, pero no lista reservas ni pagos.

### Errors

| HTTP | Code | Condition |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body o parámetros con formato inválido. |
| `401` | `INVALID_MAGIC_LINK` | Magic link inexistente, vencido, consumido o invalidado. |
| `401` | `INVALID_CUSTOMER_REFRESH_TOKEN` | Refresh token inexistente, vencido, reemplazado o revocado. |
| `401` | `CUSTOMER_AUTH_REQUIRED` | Access token ausente, inválido, vencido o asociado a una sesión no activa. |
| `404` | `PUBLIC_PAYMENT_NOT_FOUND` | `checkoutToken` inválido o vencido después de la ventana posterior a la confirmación. |

Los errores mantienen `{ "error": { "code", "message", "details" } }`. Las causas internas de autenticación y los errores privados de Gmail nunca se exponen.

## Implementation plan

1. Extender `src/shared/config/env.ts` y `.env.example` con el secreto de clientes, URL de magic link y siete variables SMTP; validar entropía, URLs, email, puerto y combinación segura de Gmail.
2. Añadir los enums, `Customer`, `CustomerSession`, `CustomerMagicLink`, `Reservation.customerId` y relaciones a `prisma/schema.prisma`; crear una migración independiente y regenerar `src/generated/prisma`.
3. Crear los DTOs y mappers mínimos bajo `src/modules/customers/dto/` y `src/modules/customers/mapper/`; no reutilizar modelos Prisma en respuestas.
4. Crear `src/modules/customers/repositories/customer.repository.ts` con operaciones para lookup, magic links, entregas y perfil autenticado.
5. Implementar `src/modules/customers/repositories/prisma-customer.repository.ts`; mantener aquí todo acceso Prisma de solicitudes manuales y perfil.
6. Ampliar el contrato y la implementación de `PaymentRepository` para crear o reutilizar el cliente, vincular la reserva e insertar el magic link automático dentro de la transacción de confirmación existente.
7. Resolver en `PrismaPaymentRepository` las carreras de `restaurantId + normalizedEmail` y los replays sin crear dos cuentas, vínculos o enlaces para una misma reserva.
8. Crear `src/modules/customer-auth/services/customer-magic-link.service.ts` y su implementación criptográfica para generar tokens, calcular hashes y construir expiraciones de quince minutos.
9. Crear `src/modules/customer-auth/services/customer-token.service.ts` y `jwt-customer-token.service.ts` con secreto separado, audiencia `customer`, access tokens de 25 minutos y refresh tokens opacos.
10. Crear el contrato `src/shared/email/email.service.ts` y la implementación `src/shared/email/nodemailer-email.service.ts` usando el transporter SMTP configurado.
11. Crear el generador de confirmación HTML y texto bajo `src/modules/customers/services/`; usar snapshots de reserva y zona horaria del restaurante sin incluir datos internos.
12. Extender `process-stripe-webhook` para recibir el token original generado alrededor de la transacción y solicitar el envío únicamente después del commit.
13. Actualizar el estado del magic link a `SENT` o `FAILED` después del intento SMTP; mantener el evento Stripe procesado y redactar errores sensibles.
14. Implementar `request-customer-magic-link`; devolver siempre la respuesta `202`, aplicar el cooldown solo a enlaces `ACCESS_REQUEST` e invalidar enlaces activos cuando corresponda.
15. Implementar `exchange-customer-magic-link`; consumir el enlace, establecer `emailVerifiedAt`, crear la sesión inicial y devolver tokens y DTO dentro de una operación transaccional segura.
16. Implementar la rotación de refresh creando una nueva fila `CustomerSession`, revocando la anterior y conservando la relación `replacedBySessionId`.
17. Implementar detección de reutilización de una sesión reemplazada y revocación de todas las sesiones activas del cliente.
18. Implementar logout idempotente y `get-current-customer` sin incluir reservas, pagos, UUID ni timestamps.
19. Crear schemas Zod para email, magic token y refresh token bajo `src/modules/customer-auth/schemas/`; validarlos mediante `@hono/standard-validator`.
20. Crear excepciones independientes para `INVALID_MAGIC_LINK`, `INVALID_CUSTOMER_REFRESH_TOKEN` y `CUSTOMER_AUTH_REQUIRED`.
21. Crear el middleware de cliente bajo `src/modules/customer-auth/middleware/`; verificar secreto, audiencia, sesión y pertenencia sin reutilizar el contexto administrativo.
22. Crear `src/modules/customer-auth/router.ts` con solicitud, intercambio, refresh, logout y perfil; mantener los routers limitados a validación, caso de uso y respuesta.
23. Actualizar la autorización de checkout y estado de pago para rechazar opacamente tokens de reservas confirmadas cuando `now >= confirmedAt + 24 horas`.
24. Instanciar repositorios, servicios y casos de uso mediante inyección por constructor en `src/index.ts`; montar las rutas sin añadir capas arquitectónicas.
25. Actualizar `api-contract/00-convenciones.md`, `api-contract/01-publico.md`, `api-contract/README.md` y `README.md` con autenticación de clientes, SMTP, respuestas, errores y límite del checkout token.
26. Ejecutar `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .`; corregir toda incompatibilidad.
27. Verificar manualmente creación y reutilización de cuenta, confirmación transaccional, replay de webhook, cooldown, enlaces invalidados, consumo concurrente, refresh rotation, reutilización, logout y aislamiento entre middlewares.
28. Enviar mediante Gmail SMTP un correo real de prueba y verificar asunto, HTML, texto plano, zona horaria, contenido permitido, enlace de acceso y ausencia de secretos.

Cada caso de uso tendrá su propia carpeta con contrato e implementación. Los casos de uso dependerán de interfaces y nunca de Nodemailer, Prisma o servicios concretos.

## Acceptance criteria

### Persistence and customer provisioning

- [ ] `bun --bun run prisma validate` y `bun --bun run prisma generate` finalizan correctamente.
- [ ] La migración crea enums, modelos, relaciones, restricciones e índices definidos por esta spec.
- [ ] `Customer` es único por `restaurantId + normalizedEmail`.
- [ ] El mismo correo puede existir como cliente en dos restaurantes diferentes.
- [ ] `Reservation.customerId` es nullable y no invalida reservas anteriores.
- [ ] No se ejecuta backfill de reservas confirmadas existentes.
- [ ] Una reserva confirmada nueva queda vinculada a un cliente dentro de la transacción de confirmación.
- [ ] El primer pago confirmado para un correo crea exactamente una cuenta.
- [ ] Un pago posterior del mismo correo normalizado y restaurante reutiliza la cuenta existente.
- [ ] Espacios y diferencias de mayúsculas en el correo no crean cuentas duplicadas.
- [ ] Dos confirmaciones concurrentes para el mismo correo y restaurante convergen en una sola cuenta.
- [ ] Una cuenta existente conserva su nombre, email de presentación y teléfono originales.
- [ ] Cada reserva conserva sus propios snapshots aunque difieran del perfil existente.
- [ ] Un pago tardío, duplicado, inconsistente o destinado a reembolso no crea una cuenta.
- [ ] Un fallo de la transacción no deja una reserva confirmada sin el vínculo y magic link exigidos.
- [ ] Cada reserva confirmada crea como máximo un magic link `RESERVATION_CONFIRMATION`.
- [ ] Repetir un webhook procesado no crea otra cuenta, relación, magic link ni correo.

### Confirmation email and SMTP

- [ ] Nodemailer continúa declarado como dependencia de producción.
- [ ] La aplicación rechaza configuración SMTP ausente, vacía o inválida.
- [ ] La aplicación rechaza un secreto de clientes corto o igual a otro secreto conocido.
- [ ] El puerto `587` con Gmail usa `SMTP_SECURE=false` y STARTTLS.
- [ ] `.env.example` no contiene usuario, contraseña de aplicación ni otro secreto real.
- [ ] Cada nueva reserva confirmada intenta enviar un correo automático después del commit.
- [ ] Dos reservas confirmadas dentro del mismo minuto intentan enviar sus dos correos automáticos.
- [ ] El cooldown manual nunca suprime un correo automático.
- [ ] Un envío aceptado deja el magic link como `sent` y establece `sentAt`.
- [ ] Un fallo SMTP deja el magic link como `failed`, establece `failedAt` y guarda solo un código técnico no sensible.
- [ ] Un fallo SMTP no revierte el cliente, la reserva, el pago ni el evento webhook procesado.
- [ ] Un fallo SMTP no expone credenciales ni la respuesta completa de Gmail.
- [ ] No existe un reintento automático de correos fallidos en esta spec.
- [ ] El correo tiene versión HTML y texto plano en español.
- [ ] El asunto comunica que la reserva fue confirmada.
- [ ] La fecha y hora se muestran en la zona horaria del restaurante.
- [ ] El correo muestra cliente, restaurante, sucursal, fecha, hora, personas, platos, cantidades, total, moneda y estado.
- [ ] El correo no muestra mesa, UUID, identificadores Stripe, token de checkout ni datos de tarjeta.
- [ ] El botón usa `CUSTOMER_MAGIC_LINK_URL` y contiene un único token opaco como query parameter.
- [ ] Una prueba real mediante Gmail SMTP entrega el correo en una bandeja controlada.

### Manual magic links

- [ ] La solicitud pública usa el slug de restaurante y no exige autenticación.
- [ ] Una cuenta existente recibe `202` con el mensaje genérico acordado.
- [ ] Un restaurante inexistente recibe la misma respuesta `202`.
- [ ] Un correo inexistente recibe la misma respuesta `202`.
- [ ] Una solicitud dentro del cooldown recibe la misma respuesta `202`.
- [ ] Las respuestas no permiten enumerar restaurantes o cuentas.
- [ ] La primera solicitud manual elegible crea un enlace `ACCESS_REQUEST`.
- [ ] Repetir la solicitud antes de un minuto no crea ni envía otro enlace.
- [ ] Repetirla después de un minuto crea un enlace nuevo.
- [ ] Todo enlace nuevo invalida los enlaces anteriores no consumidos del cliente.
- [ ] Los correos automáticos no están sujetos al cooldown manual.
- [ ] El token contiene 32 bytes aleatorios y usa Base64 URL-safe sin padding.
- [ ] Solo el hash SHA-256 del token se persiste.
- [ ] El token original no aparece en logs ni errores.
- [ ] Un enlace vence a los quince minutos.
- [ ] Un enlace válido se consume una sola vez.
- [ ] Dos intercambios concurrentes producen como máximo una sesión exitosa.
- [ ] Un enlace vencido, consumido, invalidado o inexistente devuelve el mismo `401 INVALID_MAGIC_LINK`.
- [ ] Consumir el primer enlace establece `emailVerifiedAt`.
- [ ] Consumir enlaces posteriores no reemplaza la fecha original de verificación.

### Customer sessions

- [ ] El intercambio devuelve `accessToken`, `refreshToken` y el DTO mínimo del cliente.
- [ ] El DTO contiene solo `fullName`, `email`, `phone` y `restaurantSlug`.
- [ ] El access token vence después de 25 minutos.
- [ ] El refresh token vence después de 30 días.
- [ ] Los JWT de clientes contienen `aud = customer`.
- [ ] Los JWT de clientes usan un secreto diferente al administrativo.
- [ ] Un token de cliente es rechazado por el middleware administrativo.
- [ ] Un token administrativo es rechazado por el middleware de clientes.
- [ ] El middleware rechaza una sesión vencida o revocada aunque el JWT todavía no haya vencido.
- [ ] Refrescar crea una nueva sesión y revoca la anterior.
- [ ] La sesión anterior conserva su hash y referencia a la sesión reemplazante.
- [ ] El access token asociado a la sesión anterior deja de funcionar después del refresh.
- [ ] Reutilizar un refresh token reemplazado revoca todas las sesiones activas del cliente.
- [ ] Refresh tokens inválidos, vencidos o revocados devuelven el mismo `401 INVALID_CUSTOMER_REFRESH_TOKEN`.
- [ ] Un cliente puede mantener sesiones independientes en dos dispositivos.
- [ ] Logout revoca únicamente la sesión indicada y devuelve `204`.
- [ ] Repetir logout devuelve `204` sin revelar el estado anterior.
- [ ] `GET /customer-auth/me` exige un bearer token de cliente válido.
- [ ] `GET /customer-auth/me` no devuelve reservas, pagos, UUID ni timestamps.

### Checkout token amendment

- [ ] Una reserva `pending_payment` conserva la autorización definida en SPEC 06 y SPEC 07.
- [ ] El checkout token de una reserva confirmada permite consultar el pago antes de `confirmedAt + 24 horas`.
- [ ] El token deja de autorizar exactamente en `confirmedAt + 24 horas`.
- [ ] Un token vencido devuelve `404 PUBLIC_PAYMENT_NOT_FOUND` sin revelar que la reserva existe.
- [ ] La expiración se calcula desde `confirmedAt` sin un nuevo secreto ni token visible.

### Architecture, documentation and verification

- [ ] Los routers solo validan, invocan casos de uso y devuelven respuestas.
- [ ] Solo repositorios concretos acceden a Prisma.
- [ ] Servicios y casos de uso dependen de interfaces e inyección por constructor.
- [ ] Customer, customer-auth, pagos y correo no dependen de implementaciones concretas entre sí.
- [ ] Todos los parámetros y cuerpos se validan con Zod y `@hono/standard-validator`.
- [ ] Cada excepción reside en su propio archivo.
- [ ] `bun run typecheck` finaliza correctamente.
- [ ] Biome finaliza sin errores en los archivos modificados.
- [ ] `README.md` documenta variables SMTP, contraseña de aplicación, flujo y verificación manual.
- [ ] `api-contract/` documenta rutas, respuestas, errores, seguridad y expiración del checkout token.
- [ ] No se incorporan pruebas automatizadas ni un framework de testing.

## Decisions

- **Sí:** dividir el trabajo. SPEC 08 entrega identidad, correo y autenticación; SPEC 09 entregará consulta de reservas.
- **Sí:** crear la cuenta únicamente después de una confirmación de pago válida.
- **No:** exigir registro o cuenta antes de reservar y pagar.
- **Sí:** identidad única por restaurante y correo normalizado.
- **No:** identidad global compartida entre restaurantes.
- **Sí:** conservar nombre y teléfono originales del perfil.
- **No:** sobrescribir el perfil con cada reserva sin una acción autenticada.
- **Sí:** mantener los datos de la reserva como snapshots independientes.
- **Sí:** vincular cliente, reserva y magic link en la transacción de confirmación.
- **No:** confirmar y vincular mediante una operación eventual separada.
- **Sí:** un correo combinado de agradecimiento, confirmación y acceso por cada reserva confirmada.
- **No:** enviar dos correos consecutivos de confirmación y activación.
- **Sí:** Nodemailer con SMTP de Gmail detrás de `EmailService`.
- **No:** acoplar los casos de uso directamente a Nodemailer.
- **Sí:** enviar después del commit.
- **No:** revertir una confirmación por un fallo SMTP.
- **Sí:** persistir estado y código de fallo del intento.
- **No:** guardar respuestas SMTP completas o credenciales.
- **No:** outbox, cron o reintentos automáticos en esta spec.
- **Sí:** magic links aleatorios, opacos, de un solo uso y con quince minutos de vigencia.
- **No:** JWT autocontenido como magic link.
- **Sí:** invalidar enlaces activos al crear uno nuevo.
- **Sí:** respuesta `202` opaca para solicitudes manuales.
- **No:** revelar si el restaurante o correo existe.
- **Sí:** cooldown de un minuto solo para solicitudes manuales.
- **No:** limitar correos automáticos por pagos confirmados.
- **Sí:** access y refresh tokens en JSON para mantener el patrón actual del backend.
- **No:** cookies HttpOnly en esta fase porque exigirían otro contrato CORS y de dominios.
- **Sí:** secreto y audiencia exclusivos para clientes.
- **No:** aceptar tokens de clientes en rutas administrativas.
- **Sí:** sesiones simultáneas por dispositivo.
- **Sí:** rotación mediante una nueva sesión para conservar evidencia del refresh anterior.
- **No:** sobrescribir el hash en la misma fila porque impediría detectar reutilización.
- **Sí:** revocar todas las sesiones ante reutilización de un token reemplazado.
- **Sí:** logout idempotente que revoca solo la sesión indicada.
- **Sí (reversión de SPEC 06):** el checkout token de una reserva confirmada vence después de 24 horas.
- **No:** mantener indefinidamente una credencial de reserva después del pago.
- **No:** backfill de reservas anteriores; `customerId` permanece nullable.
- **Sí:** envío manual real mediante Gmail SMTP como criterio de aceptación.
- **No:** pruebas automatizadas porque el proyecto todavía no dispone de framework.

## Risks

| Risk | Mitigation |
| --- | --- |
| Dos webhooks intentan crear la misma cuenta. | Restricción única por restaurante y correo, transacción `Serializable` y reintentos acotados. |
| El pago se confirma pero el proceso cae antes de enviar el correo. | Persistir primero el magic link como `PENDING`; permitir que el cliente solicite un enlace manual, sin prometer reintento automático en esta spec. |
| Gmail rechaza credenciales normales o bloquea el inicio de sesión. | Exigir contraseña de aplicación, documentar 2FA y verificar con una bandeja controlada. |
| SMTP acepta el mensaje pero la aplicación falla antes de marcarlo como enviado. | No reenviar automáticamente estados ambiguos; el cliente puede solicitar un enlace nuevo. |
| Un atacante enumera correos mediante el endpoint público. | Respuesta `202` idéntica para cuenta existente, inexistente, restaurante inválido y cooldown. |
| Un atacante provoca spam sobre una cuenta conocida. | Cooldown persistente de un minuto e invalidación del enlace anterior. Rate limiting por IP queda para una spec transversal. |
| El token aparece en historial o referrer del navegador. | Vigencia corta, un solo uso y requisito contractual de retirarlo de la URL inmediatamente después del intercambio. |
| Un magic link viejo se usa después de solicitar otro. | Invalidar transaccionalmente todos los enlaces activos al crear el nuevo. |
| Un refresh token robado se reutiliza después de rotar. | Conservar la sesión reemplazada y revocar todas las sesiones al detectar el replay. |
| Los tokens administrativos y de clientes se confunden. | Secretos, audiencia, middlewares, contextos y modelos de sesión separados. |
| El perfil se altera usando el correo de otra persona en una nueva reserva. | No sobrescribir nombre ni teléfono de una cuenta existente; verificar propiedad únicamente mediante email. |
| El checkout token continúa filtrado después del pago. | Rechazarlo opacamente después de 24 horas desde `confirmedAt`. |
| Las filas de sesiones y magic links crecen con el tiempo. | Mantener índices por expiración y definir limpieza o retención en una spec operativa futura. |
| Los correos incluyen demasiada información personal. | Usar una plantilla explícita y excluir mesa, UUID, proveedor, tarjeta y secretos. |

## What is **not** in this spec

- Listado o detalle de reservas del cliente; queda para SPEC 09.
- Cancelaciones, reprogramaciones, no-show o reembolsos solicitados.
- Edición de perfil o cambio de correo.
- Contraseñas, recuperación de contraseña, OAuth o redes sociales.
- Cookies de sesión para clientes.
- Administración, bloqueo o eliminación de clientes.
- Identidad global entre restaurantes.
- Backfill de reservas confirmadas existentes.
- Facturas, comprobantes, adjuntos o recibos Stripe.
- Reintentos automáticos, outbox, workers o cron jobs de correo.
- Rate limiting transversal por IP o CAPTCHA.
- Limpieza o retención automática de sesiones, enlaces y datos personales.
- Pruebas automatizadas o framework de testing.

Cada capacidad diferida deberá definirse en una spec posterior con alcance y criterios propios.
