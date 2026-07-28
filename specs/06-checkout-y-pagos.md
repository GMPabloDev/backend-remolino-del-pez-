# SPEC 06 — Checkout y pagos con Stripe

> **Status:** Draft
> **Depends on:** SPEC 05
> **Date:** 2026-07-28
> **Objective:** Implementar checkout público con Stripe Checkout Sessions para cobrar reservas temporales, confirmarlas mediante webhooks y reembolsar automáticamente los pagos tardíos.

## Why this spec exists

SPEC 05 bloquea una mesa durante quince minutos, pero todavía no permite cobrar ni convertir ese bloqueo en una reserva confirmada. Esta spec incorpora Stripe como primer proveedor funcional detrás de un contrato reemplazable, porque Culqi podrá evaluarse en una spec futura sin acoplar los casos de uso al SDK actual.

## Scope

**In:**

- Generar un token opaco para cada nueva reserva temporal y usarlo como credencial bearer en las operaciones públicas de pago.
- Reconstruir el mismo token en los replays idempotentes de creación sin almacenar su valor original.
- Crear Stripe Checkout Sessions alojadas y configuradas exclusivamente para pagos con tarjeta.
- Cobrar exactamente el total congelado de la reserva en `PEN` sin recalcular platos ni precios.
- Reutilizar una Checkout Session pendiente cuando todavía sea válida.
- Permitir nuevos intentos de pago mientras la reserva continúe `pending_payment` y no haya vencido.
- Persistir cada intento de pago y sus identificadores de Stripe.
- Consultar públicamente el estado de la reserva y de su último intento de pago mediante el token opaco.
- Confirmar una reserva exclusivamente a partir de un webhook Stripe con firma válida.
- Procesar webhooks de forma idempotente mediante `event.id`.
- Confirmar atómicamente una sola vez cuando el pago coincida con la reserva y llegue antes de `expiresAt`.
- No revalidar el estado actual de sucursal, mesa, categoría, plato o configuración comercial al confirmar.
- Reembolsar automáticamente pagos exitosos tardíos, duplicados o con importe o moneda inconsistentes.
- Reintentar un reembolso fallido cuando Stripe vuelva a entregar el evento correspondiente.
- Permitir reconciliar desde Stripe Dashboard un reembolso que continúe fallando.
- Usar Stripe Test Mode, tarjetas de prueba y Stripe CLI durante la verificación.
- Mantener el contrato global de errores y la arquitectura modular de specs anteriores.

**Out of scope (for future specs):**

- Creación o activación de cuentas de cliente.
- Contraseñas, sesiones o panel para clientes.
- Correos de confirmación, activación o recuperación enviados por el backend.
- Consulta del historial completo de intentos de pago por el cliente.
- Endpoints administrativos de pagos, reembolsos o conciliación.
- Reembolsos solicitados voluntariamente por un cliente o trabajador.
- Cancelación, reprogramación, no-show o devolución de una reserva confirmada.
- Pagos parciales, pagos divididos o más de una moneda.
- Efectivo, transferencias, billeteras y métodos de pago distintos de tarjeta.
- Cupones, descuentos, promociones, propinas, IGV desglosado y cargos por servicio.
- Creación de objetos `Customer` o suscripciones en Stripe.
- Integración con Culqi u otro proveedor adicional.
- Rate limiting, CAPTCHA y reglas antifraude propias.
- Tareas programadas para conciliación o reintentos.
- Pruebas automatizadas o incorporación de un framework de testing.

## Data model

### Prisma

```prisma
enum PaymentProvider {
  STRIPE
}

enum PaymentAttemptStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
  REFUND_PENDING
  REFUNDED
  REFUND_FAILED
}

enum PaymentWebhookStatus {
  PROCESSING
  PROCESSED
  FAILED
}

model Reservation {
  // Campos y relaciones existentes de SPEC 05.
  checkoutTokenVersion      String?          @db.Uuid
  checkoutTokenHash         String?          @unique @db.Char(64)
  confirmedAt               DateTime?        @db.Timestamptz(3)
  confirmedPaymentAttemptId String?          @unique @db.Uuid
  paymentAttempts           PaymentAttempt[] @relation("ReservationPaymentAttempts")
  confirmedPaymentAttempt   PaymentAttempt?  @relation("ConfirmedPaymentAttempt", fields: [confirmedPaymentAttemptId], references: [id], onDelete: Restrict)
}

model PaymentAttempt {
  id                        String               @id @default(uuid()) @db.Uuid
  reservationId             String               @db.Uuid
  provider                  PaymentProvider      @default(STRIPE)
  status                    PaymentAttemptStatus @default(PENDING)
  amount                    Decimal              @db.Decimal(10, 2)
  currency                  String               @db.Char(3)
  providerCheckoutSessionId String?              @unique @db.VarChar(255)
  providerPaymentIntentId   String?              @unique @db.VarChar(255)
  providerRefundId          String?              @unique @db.VarChar(255)
  checkoutUrl               String?              @db.VarChar(2048)
  providerExpiresAt         DateTime?             @db.Timestamptz(3)
  paidAt                    DateTime?             @db.Timestamptz(3)
  refundedAt                DateTime?             @db.Timestamptz(3)
  failedAt                  DateTime?             @db.Timestamptz(3)
  lastErrorCode             String?              @db.VarChar(100)
  createdAt                 DateTime              @default(now())
  updatedAt                 DateTime              @updatedAt
  reservation               Reservation           @relation("ReservationPaymentAttempts", fields: [reservationId], references: [id], onDelete: Restrict)
  confirmedReservation      Reservation?          @relation("ConfirmedPaymentAttempt")

  @@index([reservationId, createdAt])
  @@index([provider, status])
  @@index([status, updatedAt])
}

model PaymentWebhookEvent {
  id                 String               @id @default(uuid()) @db.Uuid
  provider           PaymentProvider      @default(STRIPE)
  providerEventId    String               @unique @db.VarChar(255)
  eventType          String               @db.VarChar(120)
  status             PaymentWebhookStatus @default(PROCESSING)
  processingAttempts Int                  @default(1)
  lastErrorCode      String?              @db.VarChar(100)
  processedAt        DateTime?            @db.Timestamptz(3)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  @@index([provider, status, updatedAt])
}
```

### Token conventions

- Cada nueva reserva recibe un `checkoutTokenVersion` aleatorio.
- El token se calcula como HMAC-SHA-256 sobre `reservationId` y `checkoutTokenVersion` usando `CHECKOUT_TOKEN_SECRET`.
- El valor entregado usa codificación Base64 URL-safe sin padding.
- PostgreSQL conserva únicamente el SHA-256 hexadecimal del token en `checkoutTokenHash`.
- El servidor puede reconstruir el token para devolver exactamente el mismo valor en un replay idempotente de SPEC 05.
- Las comparaciones de tokens se realizan en tiempo constante.
- El token se devuelve como `checkoutToken` en la respuesta de creación o replay de la reserva temporal.
- Las rutas de checkout y consulta exigen `Authorization: Bearer <checkoutToken>`.
- Un token ausente, inválido o asociado a otra reserva responde igual que una reserva inaccesible.
- El token no tiene una expiración independiente en esta spec; SPEC 07 decidirá cómo reemplazarlo al crear la cuenta de cliente.
- Las reservas existentes sin `checkoutTokenVersion` y `checkoutTokenHash` no pueden iniciar ni consultar pagos.
- Tokens, hashes, Checkout URLs y secretos nunca se escriben en logs ni respuestas de error.

### Payment invariants

- La API representa providers y estados en minúsculas.
- Cada `PaymentAttempt` pertenece a una sola reserva.
- `amount` y `currency` son snapshots del `total` y `currency` de la reserva al crear el intento.
- Stripe recibe el importe convertido exactamente a la unidad mínima de `PEN`.
- La conversión rechaza importes que no tengan exactamente dos decimales o que excedan los límites de Stripe.
- Stripe Checkout usa `mode: payment` y `payment_method_types: ["card"]`.
- La Checkout Session utiliza los snapshots de `ReservationItem` y nunca consulta precios actuales del catálogo.
- La sesión no permite descuentos, códigos promocionales, impuestos automáticos, shipping ni pagos parciales.
- El email normalizado de la reserva se usa para completar el email del checkout, sin crear un `Customer` de Stripe.
- Los metadatos incluyen únicamente `reservationId` y `paymentAttemptId`; no incluyen nombre, email, teléfono ni otros datos personales.
- `STRIPE_CHECKOUT_SUCCESS_URL` y `STRIPE_CHECKOUT_CANCEL_URL` son URLs absolutas configuradas por el servidor.
- El placeholder de Stripe `{CHECKOUT_SESSION_ID}` puede aparecer en la URL de éxito, pero ningún token de reserva se incorpora a una URL.
- Una reserva puede tener varios intentos, pero como máximo uno puede quedar asociado mediante `confirmedPaymentAttemptId`.
- Una sesión `pending` con URL disponible se reutiliza mientras tanto la reserva como la sesión sigan vigentes.
- Un intento `failed` o `expired` permite crear otro intento únicamente si la reserva todavía es pagable.
- Un intento no puede cobrar una reserva cuyo estado ya sea `confirmed`.
- La fecha límite de negocio siempre es `Reservation.expiresAt`, aunque Stripe mantenga abierta su Checkout Session durante más tiempo.
- Un pago recibido cuando `now >= expiresAt` se considera tardío.
- Una reserva se confirma solo si sigue `PENDING_PAYMENT`, no ha vencido y el pago tiene el importe y moneda esperados.
- Confirmar establece `status = CONFIRMED`, `confirmedAt`, `confirmedPaymentAttemptId` y el intento como `PAID` dentro de una misma transacción.
- Cambios administrativos posteriores al bloqueo no impiden la confirmación de un pago válido.
- Un pago tardío, duplicado o inconsistente pasa a `REFUND_PENDING` sin confirmar la reserva.
- El reembolso solicita exactamente el importe cobrado mediante una clave idempotente derivada de `paymentAttemptId`.
- Un reembolso aceptado por Stripe deja el intento como `REFUNDED` cuando su estado final sea exitoso.
- Un fallo al solicitar o completar el reembolso deja el intento como `REFUND_FAILED` y conserva un código técnico no sensible.
- Reprocesar el webhook de un intento `REFUND_FAILED` vuelve a solicitar el mismo reembolso con la misma clave idempotente.
- Ningún error interno o de Stripe expone secretos, payloads completos ni datos de tarjeta.

### Webhook invariants

- `POST /webhooks/stripe` consume el cuerpo crudo antes de cualquier parseo JSON.
- La firma se verifica con `Stripe-Signature` y `STRIPE_WEBHOOK_SECRET`.
- Un evento con firma inválida no se persiste ni produce cambios de negocio.
- `providerEventId` conserva `event.id` y evita procesar dos veces un evento completado.
- Un evento nuevo empieza en `PROCESSING`.
- Un evento `PROCESSED` repetido responde `200` sin repetir transiciones, confirmaciones ni reembolsos.
- Un evento `FAILED` repetido incrementa `processingAttempts` y vuelve a procesarse.
- Los errores recuperables dejan el evento en `FAILED` y responden con estado no exitoso para que Stripe lo reintente.
- Los eventos reconocidos sin relación con un intento local válido se registran sin confirmar ninguna reserva.
- Los eventos no utilizados se reconocen con `200` y no alteran pagos.
- Se procesan como mínimo los eventos de Checkout completado o expirado, fallo del PaymentIntent y actualización o fallo de reembolso necesarios para mantener los estados acordados.
- Los identificadores, metadata, importe, moneda y estado pagado de Stripe se validan antes de confirmar.
- Las transiciones de reserva y pago usan una transacción `Serializable` con reintentos acotados para resolver carreras entre webhooks.

### Configuration

```env
CHECKOUT_TOKEN_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CHECKOUT_SUCCESS_URL=
STRIPE_CHECKOUT_CANCEL_URL=
```

- `CHECKOUT_TOKEN_SECRET` debe contener al menos 32 bytes de entropía.
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son obligatorios y diferentes.
- Las URLs aceptan `https`; `http` se admite únicamente para `localhost` durante desarrollo.
- La aplicación falla al iniciar si alguna variable es inválida o está ausente.
- `.env.example` contiene nombres y valores de ejemplo no sensibles, nunca claves reales.

### Public endpoints

- `POST /public/restaurants/:restaurantId/branches/:branchId/reservations/:reservationId/checkout`
- `GET /public/restaurants/:restaurantId/branches/:branchId/reservations/:reservationId/payment`
- `POST /webhooks/stripe`

Los dos primeros endpoints no exigen una sesión de usuario, pero sí un bearer token de la reserva. El webhook no usa bearer token y se autentica exclusivamente mediante la firma de Stripe.

### Temporary reservation response amendment

La respuesta definida en SPEC 05 añade el token opaco tanto para una creación `201` como para un replay idempotente `200`:

```json
{
  "id": "uuid",
  "status": "pending_payment",
  "checkoutToken": "opaque-base64url-token",
  "expiresAt": "ISO8601"
}
```

Los demás campos de la respuesta permanecen sin cambios.

### Create checkout response

Una sesión nueva devuelve `201`. Reutilizar una sesión pendiente devuelve `200` con la misma representación:

```json
{
  "reservationId": "uuid",
  "paymentAttemptId": "uuid",
  "status": "pending",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "reservationExpiresAt": "ISO8601",
  "checkoutExpiresAt": "ISO8601",
  "currency": "PEN",
  "total": "71.80"
}
```

- El endpoint no requiere datos de pago en el body.
- El importe se devuelve como cadena con dos decimales.
- `checkoutUrl` solo aparece en esta respuesta autorizada.
- Una reserva confirmada no genera otra sesión.
- Una reserva vencida no genera ni reutiliza una sesión.

### Payment status response

```json
{
  "reservationId": "uuid",
  "reservationStatus": "pending_payment",
  "payment": {
    "id": "uuid",
    "provider": "stripe",
    "status": "pending",
    "amount": "71.80",
    "currency": "PEN",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "total": "71.80",
  "currency": "PEN",
  "expiresAt": "ISO8601",
  "confirmedAt": null
}
```

- `payment` es `null` cuando todavía no existe ningún intento.
- Si existen varios intentos, se devuelve el más reciente por `createdAt` e `id` descendentes.
- La respuesta nunca incluye `checkoutUrl`, identificadores de Stripe, datos del cliente, platos, mesa ni token.
- La redirección de Stripe no confirma el pago; el frontend consulta este endpoint mientras espera el webhook.

### Public errors

| HTTP | Code | Condition |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Algún UUID de ruta tiene formato inválido. |
| `400` | `INVALID_STRIPE_SIGNATURE` | El webhook no contiene una firma Stripe válida. |
| `404` | `PUBLIC_PAYMENT_NOT_FOUND` | La ruta no corresponde a una reserva accesible o el bearer token está ausente o es inválido. |
| `409` | `RESERVATION_EXPIRED` | La reserva alcanzó `expiresAt` antes de crear o reutilizar el checkout. |
| `409` | `RESERVATION_ALREADY_CONFIRMED` | La reserva ya fue confirmada y no admite otro checkout. |
| `409` | `PAYMENT_STATE_CONFLICT` | El intento cambió concurrentemente y la operación no puede repetirse de forma segura. |
| `503` | `PAYMENT_PROVIDER_UNAVAILABLE` | Stripe no permitió crear o recuperar la Checkout Session. |

Los errores mantienen `{ "error": { "code", "message", "details" } }`. Los fallos internos del webhook usan respuestas no exitosas para solicitar un reintento de Stripe, sin incluir detalles sensibles.

## Implementation plan

1. Instalar el SDK oficial `stripe` y documentar que toda verificación manual se ejecuta en Stripe Test Mode.
2. Extender `src/shared/config/env.ts` y `.env.example` con los cinco valores de token y Stripe; validar entropía, presencia y URLs al iniciar.
3. Extender `prisma/schema.prisma` con los enums, campos de `Reservation`, `PaymentAttempt`, `PaymentWebhookEvent` y sus relaciones; crear la migración y regenerar Prisma Client.
4. Crear `src/modules/reservations/services/checkout-token.service.ts` como contrato y `hmac-checkout-token.service.ts` como implementación basada en HMAC y SHA-256.
5. Modificar el repositorio y el caso de uso `create-temporary-reservation` para crear versión y hash del token en reservas nuevas y reconstruir el token en replays idempotentes.
6. Extender `src/modules/reservations/dto/reservation.dto.ts` y su mapper para incluir `checkoutToken` únicamente en la respuesta de creación o replay, sin persistir ni registrar el valor original.
7. Crear `src/modules/payments/repositories/payment.repository.ts` con operaciones para autorizar una reserva, administrar intentos, reservar transiciones y registrar eventos webhook.
8. Implementar `src/modules/payments/repositories/prisma-payment.repository.ts`; mantener dentro del repositorio todo acceso a Prisma y las transacciones `Serializable`.
9. Implementar en el repositorio la selección determinista del último intento y la reutilización segura de un intento `PENDING` bajo concurrencia.
10. Crear `src/modules/payments/services/payment-gateway.service.ts` con tipos independientes del SDK para crear sesiones, interpretar eventos y solicitar reembolsos.
11. Implementar `src/modules/payments/services/stripe-payment-gateway.service.ts` con Stripe Checkout, tarjeta como único método, URLs fijas, metadata mínima y claves idempotentes.
12. Crear DTOs y mappers de pago bajo `src/modules/payments/dto/` y `src/modules/payments/mapper/`; convertir enums a minúsculas y decimales a cadenas de dos posiciones.
13. Crear esquemas Zod para UUID y bearer token bajo `src/modules/payments/schemas/` y validarlos mediante `@hono/standard-validator` en las rutas públicas.
14. Crear excepciones independientes para `PUBLIC_PAYMENT_NOT_FOUND`, `RESERVATION_EXPIRED`, `RESERVATION_ALREADY_CONFIRMED`, `PAYMENT_STATE_CONFLICT`, `PAYMENT_PROVIDER_UNAVAILABLE` e `INVALID_STRIPE_SIGNATURE`.
15. Implementar `create-checkout` con contrato e implementación separados; autorizar el token, validar vigencia y estado, reutilizar una sesión activa o crear un intento y una Checkout Session.
16. Hacer que `create-checkout` persista primero un intento identificable y use una clave idempotente basada en su UUID al llamar a Stripe, para que un reintento no cree sesiones duplicadas.
17. Implementar `get-payment-status`; autorizar el mismo token y devolver únicamente la reserva y el último intento mediante el contrato público mínimo.
18. Implementar `process-stripe-webhook`; verificar la firma sobre el cuerpo crudo, registrar `event.id`, ignorar eventos completados y reabrir eventos fallidos.
19. Implementar la confirmación transaccional para un pago válido y oportuno sin revalidar entidades administrativas ni precios actuales.
20. Implementar la transición a `REFUND_PENDING` para pagos tardíos, duplicados o inconsistentes y solicitar el reembolso con una clave idempotente estable.
21. Implementar las actualizaciones `REFUNDED` y `REFUND_FAILED`; responder de forma recuperable cuando Stripe deba reenviar el evento y aceptar conciliación posterior desde Dashboard.
22. Crear `src/modules/payments/router.ts` para checkout y consulta pública, y `src/modules/payments/webhook.router.ts` para el cuerpo crudo y la firma Stripe.
23. Instanciar repositorio, servicios y casos de uso mediante inyección por constructor en `src/index.ts`; montar las rutas públicas y `/webhooks/stripe` sin añadir capas arquitectónicas.
24. Ejecutar `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .`; corregir toda incompatibilidad antes de documentar.
25. Actualizar `README.md` y `api-contract.md` con configuración, seguridad del token, endpoints, respuestas, estados, webhooks, reembolsos y comandos de Stripe CLI.
26. Verificar manualmente con Stripe Test Mode la creación y reutilización de sesiones, pago aprobado, tarjeta rechazada, replay de webhooks, carreras, pago tardío y reembolso automático sin realizar cargos reales.

Cada caso de uso tendrá su propia carpeta con contrato e implementación. Los casos de uso dependerán de interfaces y nunca del SDK Stripe ni de repositorios concretos. Cada excepción permanecerá en un archivo independiente.

## Acceptance criteria

- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .` finalizan correctamente.
- [ ] La migración crea enums, campos, relaciones, restricciones e índices definidos para pagos y webhooks.
- [ ] El SDK oficial de Stripe está declarado como dependencia de producción.
- [ ] La aplicación rechaza al iniciar una configuración Stripe o de token ausente o inválida.
- [ ] `.env.example` no contiene ninguna clave real.
- [ ] Cada reserva temporal nueva persiste una versión y un hash de token, pero nunca el token original.
- [ ] La creación inicial de una reserva devuelve `checkoutToken`.
- [ ] Un replay con el mismo `Idempotency-Key` y payload devuelve exactamente el mismo `checkoutToken`.
- [ ] Reordenar los items y repetir la creación conserva el mismo token cuando el request normalizado es equivalente.
- [ ] El token usa Base64 URL-safe y no aparece en logs ni mensajes de error.
- [ ] Las reservas anteriores sin datos de token reciben `404 PUBLIC_PAYMENT_NOT_FOUND` al intentar pagar o consultar.
- [ ] Las rutas públicas de pago no exigen una sesión de usuario interno.
- [ ] Las rutas públicas de pago exigen `Authorization: Bearer <checkoutToken>`.
- [ ] Un token ausente, incorrecto o perteneciente a otra reserva no permite distinguir si la reserva existe.
- [ ] Restaurante, sucursal y reserva deben corresponder entre sí para iniciar o consultar un pago.
- [ ] `POST .../checkout` no recibe datos de tarjeta, importe, moneda ni URLs desde el cliente.
- [ ] Una reserva `pending_payment` y no vencida puede crear una Checkout Session.
- [ ] Una Checkout Session nueva devuelve `201`, URL alojada, identificadores públicos, expiraciones, total y moneda.
- [ ] Stripe Checkout está configurado con `mode: payment` y tarjeta como único método.
- [ ] Stripe Checkout cobra en `PEN` el total congelado de la reserva convertido exactamente a unidad mínima.
- [ ] Los line items de Stripe se derivan de los snapshots de la reserva y suman exactamente su total.
- [ ] Stripe no recibe descuentos, impuestos automáticos, shipping, propinas ni cargos adicionales.
- [ ] Stripe no crea un objeto `Customer` para el checkout.
- [ ] La metadata Stripe contiene solo `reservationId` y `paymentAttemptId`.
- [ ] La URL de éxito y cancelación provienen exclusivamente de variables de entorno.
- [ ] Una URL suministrada por el cliente no puede reemplazar las URLs configuradas.
- [ ] Repetir el `POST` mientras existe una sesión pendiente válida devuelve `200` con el mismo `paymentAttemptId` y `checkoutUrl`.
- [ ] Solicitudes concurrentes de checkout crean como máximo una sesión pendiente reutilizable para el mismo instante lógico.
- [ ] Un intento `failed` o `expired` permite otro intento si la reserva todavía no venció.
- [ ] Cada nuevo intento se persiste independientemente y conserva sus identificadores Stripe.
- [ ] Una reserva vencida devuelve `409 RESERVATION_EXPIRED` y no crea ni reutiliza sesiones.
- [ ] Una reserva confirmada devuelve `409 RESERVATION_ALREADY_CONFIRMED` y no crea otra sesión.
- [ ] Una indisponibilidad de Stripe devuelve `503 PAYMENT_PROVIDER_UNAVAILABLE` sin filtrar la respuesta privada del proveedor.
- [ ] `GET .../payment` devuelve `payment: null` antes del primer intento.
- [ ] Cuando existen varios intentos, `GET .../payment` devuelve únicamente el último con orden determinista.
- [ ] La consulta devuelve estados en minúsculas e importes como cadenas con dos decimales.
- [ ] La consulta no expone Checkout URL, IDs Stripe, cliente, items, mesa, bearer token ni hashes.
- [ ] Volver desde Stripe por la URL de éxito no confirma por sí solo la reserva.
- [ ] `POST /webhooks/stripe` obtiene el cuerpo crudo antes de parsearlo.
- [ ] Un webhook sin `Stripe-Signature` válida devuelve `400 INVALID_STRIPE_SIGNATURE`.
- [ ] Un webhook con firma inválida no crea eventos ni modifica pagos o reservas.
- [ ] Cada webhook válido se identifica de forma única mediante `event.id`.
- [ ] Reenviar un evento `processed` devuelve `200` sin repetir efectos.
- [ ] Reenviar un evento `failed` incrementa sus intentos y vuelve a ejecutar el procesamiento.
- [ ] Un tipo de evento no utilizado responde `200` sin alterar el estado de negocio.
- [ ] Un evento completado solo confirma cuando Stripe indica que el pago está efectivamente pagado.
- [ ] Antes de confirmar se validan sesión, PaymentIntent, metadata, importe y moneda contra el intento local.
- [ ] Un pago válido recibido antes de `expiresAt` cambia la reserva a `confirmed`.
- [ ] La confirmación establece `confirmedAt`, `confirmedPaymentAttemptId` y el intento `paid` atómicamente.
- [ ] Una reserva confirmada conserva su bloqueo sin depender de `expiresAt`, conforme a SPEC 05.
- [ ] Cambios posteriores en sucursal, mesa, categoría, plato o precio no impiden confirmar un pago válido.
- [ ] La confirmación no recalcula items, subtotales ni total desde el catálogo actual.
- [ ] Dos webhooks concurrentes no pueden confirmar dos intentos para la misma reserva.
- [ ] Un pago duplicado para una reserva ya confirmada no reemplaza el intento que la confirmó.
- [ ] Un pago con importe o moneda distintos no confirma la reserva.
- [ ] Un pago recibido exactamente en `expiresAt` o después no confirma la reserva.
- [ ] Un pago tardío, duplicado o inconsistente pasa a `refund_pending`.
- [ ] El reembolso automático usa el importe efectivamente cobrado y una clave idempotente basada en `paymentAttemptId`.
- [ ] Reprocesar el mismo caso no crea dos reembolsos Stripe.
- [ ] Un reembolso completado cambia el intento a `refunded` y establece `refundedAt`.
- [ ] Un reembolso fallido cambia el intento a `refund_failed` sin confirmar la reserva.
- [ ] Reenviar el webhook de un `refund_failed` vuelve a intentar el mismo reembolso idempotente.
- [ ] Un reembolso realizado posteriormente desde Stripe Dashboard puede reconciliar el intento como `refunded`.
- [ ] Los eventos webhook recuperables responden con estado no exitoso para activar los reintentos de Stripe.
- [ ] Ningún endpoint o webhook expone claves, firmas, payloads completos, datos de tarjeta ni errores privados de Stripe.
- [ ] Los errores públicos mantienen `{ "error": { "code", "message", "details" } }`.
- [ ] Stripe CLI puede reenviar el mismo evento sin duplicar confirmaciones ni reembolsos.
- [ ] El flujo aprobado se verifica con tarjetas de Stripe Test Mode y no genera cargos reales.
- [ ] Una tarjeta de prueba rechazada no confirma la reserva.
- [ ] `README.md` y `api-contract.md` documentan configuración, rutas, token, estados, webhooks, reembolsos y pruebas manuales.
- [ ] No se crean cuentas, sesiones ni contraseñas de cliente.
- [ ] El backend no envía correos de confirmación, recibo o activación.
- [ ] No se implementan métodos distintos de tarjeta, Culqi, descuentos, propinas ni cargos adicionales.
- [ ] No se incorporan endpoints administrativos, cron jobs ni framework de pruebas.

## Decisions

- **Sí:** Stripe como primer proveedor funcional porque es la integración conocida actualmente por el equipo.
- **Sí:** contrato `PaymentGatewayService` independiente del SDK para facilitar una futura integración con Culqi.
- **No:** integrar Stripe y Culqi simultáneamente. Culqi tendrá su propia spec cuando exista un alcance de migración o convivencia.
- **Sí:** Stripe Checkout Sessions alojado para evitar que el backend procese datos de tarjeta.
- **No:** Payment Element embebido en esta fase.
- **Sí:** tarjeta como único método de pago.
- **No:** métodos asíncronos, efectivo, transferencias o billeteras.
- **Sí:** URLs de éxito y cancelación configuradas mediante variables de entorno.
- **No:** aceptar URLs de retorno arbitrarias enviadas por el cliente.
- **Sí:** bearer token opaco por reserva para checkout y consulta pública.
- **Sí:** HMAC determinista con versión aleatoria para reconstruir el mismo token en replays idempotentes.
- **No:** guardar el token original en PostgreSQL.
- **No:** usar únicamente el UUID público de la reserva como autorización.
- **Sí:** token válido sin vencimiento independiente hasta que SPEC 07 defina su reemplazo.
- **Sí:** múltiples intentos persistidos mientras la reserva permanezca pagable.
- **Sí:** reutilizar una sesión pendiente válida antes de crear otro intento.
- **Sí:** una sola confirmación exitosa por reserva.
- **Sí:** confirmación exclusiva mediante webhook firmado.
- **No:** confiar en la redirección del navegador ni en una consulta iniciada por el frontend para confirmar.
- **Sí:** persistir `event.id` y permitir reprocesar únicamente eventos fallidos.
- **Sí:** transacciones `Serializable` con reintentos acotados para transiciones concurrentes.
- **Sí:** validar importe, moneda, metadata e identificadores Stripe antes de confirmar.
- **Sí:** respetar snapshots y total de SPEC 05.
- **No:** recalcular precios o disponibilidad comercial durante el pago.
- **Sí:** revalidar únicamente estado `pending_payment`, vigencia y coincidencia exacta del pago.
- **No:** invalidar el pago por cambios posteriores en sucursal, mesa o catálogo.
- **Sí:** considerar tardío un pago recibido en `expiresAt` o después.
- **Sí:** reembolsar automáticamente pagos tardíos, duplicados o inconsistentes.
- **Sí:** usar una clave idempotente estable para impedir reembolsos duplicados.
- **Sí:** marcar `refund_failed` y reintentar cuando Stripe reenvíe el evento.
- **Sí:** permitir conciliación excepcional mediante Stripe Dashboard.
- **No:** crear una tarea programada de reintentos en esta spec.
- **Sí:** consulta pública mínima para que el frontend espere el webhook.
- **No:** exponer el historial completo de intentos ni identificadores internos del proveedor.
- **No:** crear cuentas de cliente o enviar correos; ambas capacidades pasan a SPEC 07.
- **Sí:** verificar únicamente en Stripe Test Mode con Stripe CLI y tarjetas de prueba.
- **No:** pruebas automatizadas porque el proyecto todavía no dispone de framework.

## Risks

| Risk | Mitigation |
| --- | --- |
| Stripe puede mantener una Checkout Session abierta después de los quince minutos de la reserva. | Usar `Reservation.expiresAt` como límite de negocio y reembolsar cualquier pago tardío. |
| El webhook puede llegar después de la redirección del navegador. | Exponer una consulta protegida para que el frontend espere el estado persistido. |
| Stripe puede reenviar el mismo evento o entregar eventos fuera de orden. | Persistir `event.id`, aplicar transiciones idempotentes y verificar el estado actual antes de cada cambio. |
| Dos intentos podrían pagarse casi simultáneamente. | Confirmar uno mediante una transacción `Serializable` y reembolsar automáticamente cualquier cobro adicional. |
| El proceso puede fallar después de pedir un reembolso y antes de persistirlo. | Usar una clave idempotente derivada del intento y reconciliar mediante reintento del webhook. |
| Un fallo permanente de reembolso puede retener dinero sin una reserva confirmada. | Exponer `refund_failed`, mantener el evento reintentable y permitir resolución desde Stripe Dashboard. |
| Un atacante con acceso al UUID podría intentar consultar o pagar una reserva ajena. | Exigir un token HMAC opaco, almacenar solo su hash y responder con un `404` indistinguible cuando falle. |
| Un token podría filtrarse en logs, analytics o URLs. | Transportarlo solo en `Authorization`, no incorporarlo a redirecciones y aplicar redacción explícita en logs. |
| Rotar `CHECKOUT_TOKEN_SECRET` invalidaría todos los tokens vigentes. | Tratar el secreto como configuración persistente y diseñar versionado de claves en una spec futura si se requiere rotación sin corte. |
| Una integración futura con Culqi podría exigir estados o identificadores diferentes. | Mantener casos de uso sobre un contrato de gateway y guardar identificadores externos con nombres neutrales al proveedor. |
| Un importe decimal mal convertido podría cobrar un valor incorrecto. | Centralizar la conversión a unidad mínima y comparar nuevamente importe y moneda en el webhook. |
| Los eventos almacenados y los intentos fallidos crecerán indefinidamente. | Mantenerlos indexados y definir retención o archivado en una spec operativa posterior. |

## What is **not** in this spec

- Cuentas, autenticación o panel de clientes.
- Correos enviados por el backend.
- Historial público completo de pagos.
- Gestión administrativa de reservas, pagos o reembolsos.
- Cancelaciones, reprogramaciones y devoluciones voluntarias.
- Métodos de pago distintos de tarjeta.
- Culqi u otros proveedores adicionales.
- Stripe Customers, suscripciones o pagos recurrentes.
- Descuentos, promociones, propinas, impuestos automáticos y cargos por servicio.
- Rate limiting, CAPTCHA o antifraude propio.
- Conciliación programada y tareas cron.
- Rotación transparente del secreto de tokens.
- Retención o limpieza de eventos e intentos antiguos.
- Pruebas automatizadas o framework de testing.

Estas capacidades se definirán en specs posteriores cuando exista un alcance concreto.
