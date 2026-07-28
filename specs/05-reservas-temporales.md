# SPEC 05 — Reservas temporales

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04
> **Date:** 2026-07-27
> **Objective:** Implementar disponibilidad pública y reservas temporales de quince minutos con platos a precio congelado y asignación automática de una mesa.

## Scope

**In:**

- Consultar públicamente horarios disponibles de una sucursal para una fecha y cantidad de personas.
- Generar horarios en bloques de quince minutos alineados a los minutos `00`, `15`, `30` y `45`.
- Aplicar la duración, anticipación mínima, anticipación máxima y tamaño máximo del grupo configurados en `BranchRules`.
- Exigir que la duración completa de la reserva quepa dentro de un único intervalo de atención.
- Crear públicamente una reserva temporal sin exigir autenticación ni una cuenta de cliente.
- Registrar nombre completo, email normalizado y teléfono internacional del cliente.
- Exigir al menos un plato disponible y admitir hasta cincuenta platos distintos por reserva.
- Registrar una cantidad entera entre 1 y 99 para cada plato.
- Congelar el identificador, nombre, precio unitario y subtotal de cada plato durante la reserva temporal.
- Calcular el total en `PEN` como suma de subtotales, sin componentes adicionales de pricing.
- Asignar una única mesa activa con la menor capacidad suficiente.
- Desempatar mesas de igual capacidad por código ascendente y luego por identificador ascendente.
- Bloquear la mesa durante el intervalo solicitado mientras la reserva `pending_payment` no haya vencido.
- Considerar también las futuras reservas `confirmed` al calcular disponibilidad.
- Liberar lógicamente el bloqueo quince minutos después de crear la reserva, sin borrar ni actualizar el registro.
- Crear la reserva y sus platos dentro de una transacción `Serializable` con reintentos acotados.
- Exigir un `Idempotency-Key` UUID y conservar el resultado original ante reintentos idénticos.
- Mantener privadas la identidad y el código de la mesa asignada.
- Mantener el contrato global de errores definido en specs anteriores.

**Out of scope (for future specs):**

- Procesamiento o confirmación de pagos.
- Creación de cuentas de cliente.
- Envío de enlaces de activación o creación de contraseña.
- Panel del cliente, cupones o historial de reservas.
- Consulta pública de una reserva temporal por identificador.
- Tokens públicos para consultar o pagar una reserva.
- Cancelación explícita de reservas temporales.
- Listado, consulta o gestión interna de reservas.
- Reprogramación, cancelación o gestión de reservas confirmadas.
- Propinas, IGV desglosado, descuentos, promociones y cargos por servicio.
- Rate limiting, CAPTCHA y límites de bloqueos por email.
- Retención, anonimización o eliminación programada de reservas vencidas.
- Combinación de mesas o selección manual de mesa por el cliente.
- Excepciones de horario por feriados o fechas especiales.
- Modificación automática de reservas ante cambios administrativos en sucursales, mesas o platos.

## Data model

### Prisma

```prisma
enum ReservationStatus {
  PENDING_PAYMENT
  CONFIRMED
}

model Branch {
  // Campos y relaciones existentes de specs anteriores.
  reservations Reservation[]
}

model DiningTable {
  // Campos y relaciones existentes de SPEC 03.
  reservations Reservation[]
}

model Dish {
  // Campos y relaciones existentes de SPEC 04.
  reservationItems ReservationItem[]
}

model Reservation {
  id             String            @id @default(uuid()) @db.Uuid
  branchId       String            @db.Uuid
  tableId        String            @db.Uuid
  idempotencyKey String            @unique @db.Uuid
  requestHash    String            @db.VarChar(64)
  status         ReservationStatus @default(PENDING_PAYMENT)
  fullName       String            @db.VarChar(150)
  email          String            @db.VarChar(320)
  phone          String            @db.VarChar(16)
  partySize      Int
  startAt        DateTime          @db.Timestamptz(3)
  endAt          DateTime          @db.Timestamptz(3)
  expiresAt      DateTime          @db.Timestamptz(3)
  currency       String            @db.Char(3)
  total          Decimal           @db.Decimal(10, 2)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  branch         Branch            @relation(fields: [branchId], references: [id], onDelete: Restrict)
  table          DiningTable       @relation(fields: [tableId], references: [id], onDelete: Restrict)
  items          ReservationItem[]

  @@index([branchId, status, startAt, endAt])
  @@index([tableId, status, startAt, endAt])
  @@index([status, expiresAt])
}

model ReservationItem {
  id            String      @id @default(uuid()) @db.Uuid
  reservationId String      @db.Uuid
  dishId        String      @db.Uuid
  dishName      String      @db.VarChar(120)
  unitPrice     Decimal     @db.Decimal(10, 2)
  quantity      Int
  subtotal      Decimal     @db.Decimal(10, 2)
  createdAt     DateTime    @default(now())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  dish          Dish        @relation(fields: [dishId], references: [id], onDelete: Restrict)

  @@unique([reservationId, dishId])
  @@index([dishId])
}
```

### Conventions and invariants

- `Reservation` representa tanto el bloqueo temporal como la futura reserva confirmada.
- SPEC 05 solo crea registros con estado interno `PENDING_PAYMENT`.
- `CONFIRMED` queda reservado para la futura spec de pagos.
- La API representa los estados como `pending_payment` y `confirmed`.
- Una reserva `PENDING_PAYMENT` bloquea la mesa únicamente mientras `expiresAt > now`.
- Una reserva `CONFIRMED` bloquea la mesa durante todo su intervalo, sin depender de `expiresAt`.
- Los intervalos son semiabiertos: `[startAt, endAt)`.
- Existe solapamiento cuando una reserva comienza antes del final solicitado y termina después del inicio solicitado.
- Una reserva que termina a las `20:00` no bloquea otra que comienza a las `20:00`.
- La API recibe `date` como `YYYY-MM-DD` y `time` como `HH:mm` en `America/Lima`.
- `startAt` y `endAt` se calculan con `America/Lima` y se persisten como instantes con zona horaria.
- `endAt` resulta de sumar `defaultReservationDurationMinutes` a `startAt`.
- `expiresAt` resulta de sumar exactamente quince minutos al instante de creación del servidor.
- El inicio debe usar uno de los minutos `00`, `15`, `30` o `45`.
- Si un intervalo de atención comienza a las `12:10`, su primer horario elegible es `12:15`.
- La duración completa debe caber dentro de un único `BranchScheduleInterval`.
- La fecha y hora deben respetar `minimumAdvanceMinutes` y `maximumAdvanceDays` en el instante de cada consulta o creación.
- `partySize` es un entero entre 1 y `BranchRules.maxPartySize`.
- Solo participan mesas `ACTIVE` de la sucursal con `capacity >= partySize`.
- Nunca se combinan mesas.
- La selección ordena las mesas candidatas por `capacity`, `code` e `id`, todos ascendentes.
- La disponibilidad pública es orientativa; la creación vuelve a validar sucursal, horario, mesas, platos y conflictos.
- `fullName` se recorta y contiene entre 2 y 150 caracteres.
- `email` se recorta, valida y persiste en minúsculas con un máximo de 320 caracteres.
- `phone` se recorta y usa formato E.164: signo `+` seguido de 8 a 15 dígitos.
- `items` contiene entre 1 y 50 platos distintos.
- Cada `dishId` puede aparecer una sola vez.
- `quantity` es un entero entre 1 y 99.
- Un plato es reservable únicamente si su categoría y el plato global están activos, y su configuración en la sucursal está `AVAILABLE`.
- Platos `SOLD_OUT`, `INACTIVE`, no configurados o ajenos al restaurante y sucursal se consideran no disponibles.
- `dishName`, `unitPrice` y `subtotal` son snapshots y no cambian si después se modifica el catálogo.
- `subtotal` equivale a `unitPrice * quantity` y se calcula en el servidor.
- `total` equivale a la suma de subtotales y se calcula en el servidor.
- `currency` siempre se persiste y devuelve como `PEN`.
- Los importes se reciben desde `BranchDish.price` y se devuelven como cadenas con dos decimales.
- No se aceptan importes, subtotales, totales ni moneda enviados por el cliente.
- `Idempotency-Key` es un UUID obligatorio y único globalmente.
- `requestHash` es un SHA-256 hexadecimal del restaurante, sucursal y payload validado y normalizado.
- Para el hash, los platos se ordenan por `dishId` para que el orden del arreglo no altere la equivalencia semántica.
- Repetir una clave con el mismo hash devuelve la reserva original, aunque haya vencido o cambie el catálogo.
- Repetir una clave con un hash diferente retorna `409 IDEMPOTENCY_KEY_REUSED`.
- Un nuevo intento después de vencer requiere un nuevo `Idempotency-Key`.
- Las respuestas públicas nunca exponen `tableId`, el código de mesa, `requestHash` ni `idempotencyKey`.
- No se elimina físicamente ninguna reserva vencida en esta spec.
- Desactivar o editar una sucursal, mesa, categoría o plato no modifica reservas temporales ya creadas.

### Public endpoints

- `GET /public/restaurants/:restaurantId/branches/:branchId/reservations/availability`
- `POST /public/restaurants/:restaurantId/branches/:branchId/reservations/temporary`

Ninguno de los endpoints exige autenticación.

### Availability request and response

```http
GET /public/restaurants/{restaurantId}/branches/{branchId}/reservations/availability?date=2026-08-01&partySize=4
```

```json
{
  "date": "2026-08-01",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "availableTimes": ["12:00", "12:15", "12:30"]
}
```

- `availableTimes` se ordena de forma ascendente y no contiene duplicados.
- La respuesta no muestra mesas ni cantidades restantes.
- Una sucursal activa y válida sin opciones devuelve `200` con `availableTimes: []`.
- Una fecha completa fuera del rango de anticipación también devuelve `200` con una lista vacía.
- Para la fecha actual se omiten únicamente los horarios que ya no cumplen la anticipación mínima.

### Temporary reservation request

```http
POST /public/restaurants/{restaurantId}/branches/{branchId}/reservations/temporary
Idempotency-Key: 8786e1af-31e6-48d1-ab99-864bc74e9558
Content-Type: application/json
```

```json
{
  "date": "2026-08-01",
  "time": "13:30",
  "partySize": 4,
  "customer": {
    "fullName": "Ana Torres",
    "email": "ana@example.com",
    "phone": "+51987654321"
  },
  "items": [
    {
      "dishId": "uuid",
      "quantity": 2
    }
  ]
}
```

### Temporary reservation response

La primera creación devuelve `201`. Un reintento idempotente devuelve `200` con la misma representación.

```json
{
  "id": "uuid",
  "branchId": "uuid",
  "status": "pending_payment",
  "date": "2026-08-01",
  "startTime": "13:30",
  "endTime": "14:30",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "expiresAt": "ISO8601",
  "partySize": 4,
  "customer": {
    "fullName": "Ana Torres",
    "email": "ana@example.com",
    "phone": "+51987654321"
  },
  "items": [
    {
      "dishId": "uuid",
      "name": "Lomo saltado",
      "unitPrice": "35.90",
      "quantity": 2,
      "subtotal": "71.80"
    }
  ],
  "currency": "PEN",
  "total": "71.80",
  "createdAt": "ISO8601"
}
```

### Public errors

| HTTP | Code | Condition |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Parámetros, body o `Idempotency-Key` ausentes o inválidos. |
| `404` | `PUBLIC_RESERVATION_NOT_FOUND` | Restaurante o sucursal inexistente, relación incorrecta o sucursal inactiva. |
| `409` | `RESERVATION_TIME_UNAVAILABLE` | Horario fuera de reglas, fuera de atención o sin una mesa libre. |
| `409` | `DISH_NOT_AVAILABLE` | Al menos un plato no puede reservarse en la sucursal. |
| `409` | `IDEMPOTENCY_KEY_REUSED` | La clave ya corresponde a otra solicitud normalizada. |

Todos los errores conservan `{ "error": { "code", "message", "details" } }`. `DISH_NOT_AVAILABLE` identifica en `details` los `dishId` rechazados sin revelar información interna del catálogo.

## Implementation plan

1. Extender `prisma/schema.prisma` con `ReservationStatus`, `Reservation`, `ReservationItem` y sus relaciones; crear la migración, validar el esquema y regenerar Prisma Client.
2. Crear `src/modules/reservations/repositories/reservation.repository.ts` con contratos para cargar el contexto operativo de la sucursal, consultar bloqueos, resolver platos reservables, recuperar una reserva por clave idempotente y crear el agregado transaccionalmente.
3. Implementar `src/modules/reservations/repositories/prisma-reservation.repository.ts`; mantener todo acceso a Prisma y toda transacción dentro del repositorio.
4. Implementar en el repositorio la detección de solapamientos para `CONFIRMED` y para `PENDING_PAYMENT` con `expiresAt > now`, usando intervalos semiabiertos.
5. Implementar la creación con aislamiento `Serializable`, restricción única sobre `idempotencyKey` y un máximo de tres reintentos ante conflictos serializables conocidos; después del límite, responder como falta de disponibilidad sin filtrar errores internos.
6. Crear `src/modules/reservations/dto/reservation.dto.ts` y `src/modules/reservations/mapper/reservation.mapper.ts`; convertir fechas a `America/Lima`, enums a minúsculas y decimales a cadenas de dos posiciones sin exponer la mesa.
7. Crear `src/modules/reservations/schemas/get-availability.schema.ts` para validar UUID de ruta, fecha y `partySize` mediante Zod y `@hono/standard-validator`.
8. Crear `src/modules/reservations/schemas/create-temporary-reservation.schema.ts` para validar `Idempotency-Key`, fecha, hora, cliente, cantidad de personas, platos, cantidades y duplicados.
9. Crear excepciones independientes para `PUBLIC_RESERVATION_NOT_FOUND`, `RESERVATION_TIME_UNAVAILABLE`, `DISH_NOT_AVAILABLE` e `IDEMPOTENCY_KEY_REUSED` bajo `src/modules/reservations/exceptions/`.
10. Implementar `get-availability` con contrato e implementación separados; validar la sucursal activa, generar bloques alineados a cuartos de hora, aplicar horarios y reglas, y conservar solo los bloques con al menos una mesa compatible libre.
11. Implementar en `create-temporary-reservation` la normalización de cliente, la validación temporal y la creación del hash canónico SHA-256 antes de consultar la clave idempotente.
12. Resolver primero un reintento idempotente; devolver la reserva original con `200` cuando el hash coincida y `409 IDEMPOTENCY_KEY_REUSED` cuando difiera, sin volver a validar catálogo o disponibilidad.
13. Validar para una creación nueva la sucursal activa, las reglas, el intervalo de atención y todos los platos; congelar nombres y precios y calcular subtotales y total con aritmética decimal.
14. Seleccionar y bloquear dentro de la misma transacción la mesa activa disponible de menor capacidad, con desempate por código e identificador; crear `Reservation` y todos sus `ReservationItem` atómicamente.
15. Crear `src/modules/reservations/router.ts` con las dos rutas públicas y sin middleware de autenticación; devolver `201` para creación, `200` para replay idempotente y los errores de dominio acordados.
16. Instanciar `PrismaReservationRepository` y ambos casos de uso mediante inyección por constructor en `src/index.ts`; montar el router bajo `/public/restaurants/:restaurantId/branches/:branchId/reservations`.
17. Ejecutar `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .`; corregir incompatibilidades antes de documentar el contrato.
18. Actualizar `README.md` y `api-contract.md` con los modelos, endpoints, validaciones, respuestas, idempotencia, expiración, asignación, concurrencia y errores de reservas temporales.
19. Verificar manualmente disponibilidad, creación, replay idempotente, expiración lógica, platos no disponibles, reglas horarias y solicitudes concurrentes con datos reproducibles.

Cada caso de uso tendrá su propia carpeta con contrato e implementación. Cada excepción permanecerá en un archivo independiente. No se incorporará un framework de pruebas en esta spec.

## Acceptance criteria

- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .` finalizan correctamente.
- [ ] La migración crea `Reservation`, `ReservationItem`, `ReservationStatus`, relaciones, restricciones e índices definidos.
- [ ] `GET /public/restaurants/:restaurantId/branches/:branchId/reservations/availability` no exige autenticación.
- [ ] `POST /public/restaurants/:restaurantId/branches/:branchId/reservations/temporary` no exige autenticación.
- [ ] Una sesión ausente no provoca `401` en ninguna de las dos rutas públicas.
- [ ] Un restaurante o sucursal inexistente, una relación incorrecta o una sucursal inactiva retorna `404 PUBLIC_RESERVATION_NOT_FOUND`.
- [ ] La disponibilidad exige `date` válida con formato `YYYY-MM-DD` y `partySize` entero positivo.
- [ ] La disponibilidad rechaza `partySize` mayor que `BranchRules.maxPartySize`.
- [ ] La disponibilidad utiliza `defaultReservationDurationMinutes` de la sucursal.
- [ ] La disponibilidad aplica `minimumAdvanceMinutes` respecto al instante actual.
- [ ] La disponibilidad aplica `maximumAdvanceDays` respecto al instante actual.
- [ ] Una fecha completa fuera del rango permitido retorna `200` con `availableTimes: []`.
- [ ] Para la fecha actual se omiten los horarios que no cumplen la anticipación mínima.
- [ ] Los horarios generados usan exclusivamente minutos `00`, `15`, `30` y `45`.
- [ ] Un intervalo que comienza a las `12:10` produce `12:15` como primer inicio posible.
- [ ] Cada horario permite que la duración completa termine dentro del mismo intervalo de atención.
- [ ] Un horario cuya duración excedería el cierre del intervalo no aparece.
- [ ] Una sucursal activa sin mesas activas compatibles retorna `200` con `availableTimes: []`.
- [ ] Los horarios se devuelven ordenados ascendentemente y sin duplicados.
- [ ] La respuesta de disponibilidad incluye únicamente `date`, `timezone`, `durationMinutes` y `availableTimes`.
- [ ] La respuesta de disponibilidad no revela códigos, identificadores ni cantidades de mesas.
- [ ] La creación exige `Idempotency-Key` con formato UUID.
- [ ] La creación exige `date`, `time`, `partySize`, `customer` e `items`.
- [ ] `time` rechaza minutos distintos de `00`, `15`, `30` y `45`.
- [ ] `fullName` acepta entre 2 y 150 caracteres después del recorte.
- [ ] El email válido se recorta y persiste en minúsculas con un máximo de 320 caracteres.
- [ ] El teléfono acepta únicamente formato E.164 con 8 a 15 dígitos después de `+`.
- [ ] `partySize` acepta enteros entre 1 y `BranchRules.maxPartySize`.
- [ ] La creación exige entre 1 y 50 platos distintos.
- [ ] Un `dishId` repetido retorna `400 VALIDATION_ERROR`.
- [ ] La cantidad de cada plato acepta únicamente enteros entre 1 y 99.
- [ ] La creación rechaza importes, moneda, subtotales o total enviados por el cliente.
- [ ] Un plato con categoría inactiva retorna `409 DISH_NOT_AVAILABLE`.
- [ ] Un plato global inactivo retorna `409 DISH_NOT_AVAILABLE`.
- [ ] Un plato `sold_out`, `inactive`, no configurado o ajeno a la sucursal retorna `409 DISH_NOT_AVAILABLE`.
- [ ] `DISH_NOT_AVAILABLE` identifica los `dishId` rechazados dentro de `error.details`.
- [ ] La creación congela `dishId`, nombre, precio unitario, cantidad y subtotal de cada plato.
- [ ] Modificar posteriormente el nombre o precio del plato no altera los snapshots de la reserva.
- [ ] Cada subtotal equivale exactamente a precio unitario por cantidad.
- [ ] El total equivale exactamente a la suma de subtotales.
- [ ] La moneda persistida y devuelta siempre es `PEN`.
- [ ] Todos los importes se devuelven como cadenas con exactamente dos decimales.
- [ ] Una creación nueva devuelve `201` y estado `pending_payment`.
- [ ] `expiresAt` equivale a quince minutos después del instante de creación del servidor.
- [ ] `endAt` equivale a `startAt` más `defaultReservationDurationMinutes`.
- [ ] Crear fuera de anticipación, fuera del horario o sin mesa retorna `409 RESERVATION_TIME_UNAVAILABLE`.
- [ ] La asignación considera únicamente mesas activas con capacidad suficiente.
- [ ] La asignación elige la mesa libre de menor capacidad suficiente.
- [ ] Dos mesas de igual capacidad se desempatan por código y luego por identificador ascendente.
- [ ] La creación nunca combina dos o más mesas.
- [ ] La respuesta de creación no expone `tableId`, código de mesa, `idempotencyKey` ni `requestHash`.
- [ ] Una reserva `pending_payment` no vencida elimina de disponibilidad los horarios que se solapan para su mesa.
- [ ] Una reserva `pending_payment` con `expiresAt <= now` deja de bloquear inmediatamente sin cambiar su estado persistido.
- [ ] Una reserva `confirmed` bloquea su mesa durante todo `[startAt, endAt)` sin depender de `expiresAt`.
- [ ] Una reserva que termina exactamente al comenzar otra no produce solapamiento.
- [ ] Dos solicitudes concurrentes no asignan la misma mesa para intervalos solapados.
- [ ] Si existe otra mesa compatible, un reintento serializable puede asignarla a la solicitud concurrente.
- [ ] Si se agotan las mesas durante la carrera, una solicitud retorna `409 RESERVATION_TIME_UNAVAILABLE`.
- [ ] Repetir la misma clave y payload normalizado devuelve `200`, el mismo identificador y los snapshots originales.
- [ ] Cambiar únicamente el orden de `items` no altera la equivalencia idempotente.
- [ ] Repetir una clave después de vencer devuelve la reserva original y no crea un nuevo bloqueo.
- [ ] Reutilizar una clave con restaurante, sucursal o payload diferente retorna `409 IDEMPOTENCY_KEY_REUSED`.
- [ ] Solicitudes concurrentes con el mismo `Idempotency-Key` crean como máximo una reserva.
- [ ] Desactivar o editar una sucursal, mesa, categoría o plato no modifica automáticamente una reserva ya creada.
- [ ] No existe un endpoint público para consultar una reserva temporal por identificador.
- [ ] No existe un endpoint para cancelar explícitamente una reserva temporal.
- [ ] No existen rutas administrativas de reservas en esta spec.
- [ ] No se crean cuentas de cliente ni se envían contraseñas o enlaces de activación.
- [ ] No se implementan pagos, descuentos, propinas, IGV desglosado ni cargos por servicio.
- [ ] No se implementan límites por email, rate limiting ni CAPTCHA.
- [ ] No existe una tarea programada para borrar o anonimizar reservas vencidas.
- [ ] Todos los errores mantienen `{ "error": { "code", "message", "details" } }`.
- [ ] `README.md` y `api-contract.md` documentan las rutas y reglas implementadas.

## Decisions

- **Sí:** creación y disponibilidad públicas sin autenticación. Obligar a crear una cuenta antes del pago puede reducir conversiones.
- **Sí:** crear la cuenta del cliente únicamente después de un pago exitoso en una spec posterior.
- **Sí:** enviar en el futuro un enlace de activación de un solo uso para crear contraseña.
- **No:** autogenerar ni enviar contraseñas por correo. Introduce riesgos de seguridad y una experiencia innecesariamente frágil.
- **Sí:** consultar disponibilidad por fecha y cantidad de personas antes de intentar crear el bloqueo.
- **Sí:** usar `date` y `time` locales bajo `America/Lima` y persistir instantes con zona horaria.
- **Sí:** usar bloques globales de quince minutos en `00`, `15`, `30` y `45`.
- **Sí:** derivar la duración de `defaultReservationDurationMinutes`.
- **Sí:** aplicar anticipación mínima, anticipación máxima y tamaño máximo del grupo definidos por la sucursal.
- **Sí:** exigir que la reserva completa quepa dentro de un único intervalo de atención.
- **Sí:** una sola mesa con la menor capacidad suficiente.
- **No:** selección manual ni combinación de mesas.
- **Sí:** desempate determinista por capacidad, código e identificador.
- **Sí:** intervalos semiabiertos `[startAt, endAt)` para permitir reservas contiguas.
- **Sí:** bloqueo temporal de quince minutos calculado mediante `expiresAt`.
- **No:** cron para marcar reservas expiradas. Las consultas ignoran los bloqueos vencidos inmediatamente.
- **Sí:** reutilizar el mismo registro al pasar de `pending_payment` a `confirmed` en la futura spec de pagos.
- **No:** persistir un estado `expired`. La expiración es una condición derivada.
- **Sí:** considerar desde ahora reservas `confirmed` al calcular conflictos.
- **Sí:** exigir al menos un plato para crear la reserva.
- **Sí:** aceptar hasta cincuenta platos distintos y cantidades entre 1 y 99.
- **Sí:** congelar nombre, precio unitario y subtotal de cada plato.
- **Sí:** honrar el precio congelado durante la vigencia del bloqueo aunque cambie el catálogo.
- **Sí:** `PEN` como moneda y suma de subtotales como total.
- **No:** propinas, IGV desglosado, descuentos o cargos por servicio. Forman una capa de pricing independiente.
- **Sí:** transacción `Serializable` con reintentos acotados para evitar asignaciones dobles.
- **Sí:** tratar el `POST` como autoridad final; el `GET` de disponibilidad puede quedar obsoleto inmediatamente.
- **Sí:** `Idempotency-Key` UUID obligatorio y hash del payload normalizado.
- **Sí:** devolver la reserva original ante un replay idéntico, incluso si ya venció.
- **No:** crear otro bloqueo al repetir una clave vencida. El cliente debe generar una clave nueva.
- **No:** límite de bloqueos por email. Puede impedir compras legítimas y es fácil de evadir sin verificar identidad.
- **No:** rate limiting o CAPTCHA en esta spec. Se diseñarán como protección transversal posterior.
- **No:** exponer la mesa asignada en respuestas públicas.
- **No:** consulta pública de la reserva en esta spec. La futura consulta deberá protegerse mediante token.
- **No:** cancelación explícita. El bloqueo se libera por expiración lógica.
- **No:** gestión interna de reservas confirmadas. Requiere una spec propia.
- **No:** modificar bloqueos existentes ante cambios administrativos. La futura spec de pagos definirá sus revalidaciones antes de cobrar.
- **No:** eliminar reservas vencidas en esta spec. Una tarea programada y su política de retención se diseñarán posteriormente.
- **No:** pruebas automatizadas porque el proyecto aún no dispone de framework; la verificación será estática y manual reproducible.

## Risks

| Risk | Mitigation |
| --- | --- |
| Dos solicitudes podrían observar libre la misma mesa. | Crear bajo aislamiento `Serializable`, reintentar conflictos conocidos y volver a resolver la mesa dentro de cada intento. |
| La disponibilidad mostrada podría quedar obsoleta antes del `POST`. | Tratarla como orientativa y revalidar todo durante la creación transaccional. |
| Un atacante podría bloquear mesas mediante muchas reservas impagadas. | Limitar cada bloqueo a quince minutos y dejar rate limiting o CAPTCHA para una spec transversal de seguridad. |
| Reintentos del cliente podrían duplicar bloqueos. | Exigir una clave UUID, persistirla con unicidad y comparar un hash canónico de la solicitud. |
| Una clave podría repetirse con otro cuerpo o en otra sucursal. | Incluir ruta y payload normalizado en `requestHash` y devolver `IDEMPOTENCY_KEY_REUSED`. |
| Reservas vencidas conservarán PII y crecerán indefinidamente. | Registrar el riesgo y diseñar después una política de retención con eliminación o anonimización programada. |
| La conversión entre hora local e instante podría mover los límites. | Centralizar el cálculo en `America/Lima`, persistir `Timestamptz` y verificar casos cercanos a apertura y cierre. |
| Cambios de precio podrían alterar el importe entre selección y pago. | Persistir snapshots decimales y hacer que un replay devuelva siempre los importes originales. |
| Cambios administrativos podrían dejar un bloqueo asociado a entidades inactivas. | No alterar silenciosamente el bloqueo; la futura spec de pagos decidirá qué estados revalidar antes del cobro. |
| Los reintentos serializables podrían agotarse bajo alta contención. | Mantener un límite de tres intentos y devolver un error de disponibilidad estable sin filtrar detalles de infraestructura. |
| La cantidad de slots podría aumentar si existen intervalos extensos. | Generar solo bloques del día solicitado y consultar conflictos mediante índices por sucursal, mesa, estado e intervalo. |

## What is **not** in this spec

- Pagos o transición efectiva a `confirmed`.
- Cuentas de cliente, panel, cupones y magic links.
- Consulta pública protegida mediante token.
- Cancelación de reservas temporales.
- Gestión administrativa de reservas confirmadas.
- Reprogramaciones, cancelaciones y no-shows.
- Propinas, IGV desglosado, descuentos y cargos por servicio.
- Rate limiting, CAPTCHA o límites por email.
- Retención, anonimización o limpieza programada de datos vencidos.
- Combinación o selección manual de mesas.
- Feriados, cierres excepcionales y horarios que atraviesan medianoche.
- Reglas de pago ante sucursales, mesas o platos desactivados después del bloqueo.
- Pruebas automatizadas o incorporación de un framework de testing.

Cada una de estas capacidades se definirá en una spec posterior cuando corresponda.
