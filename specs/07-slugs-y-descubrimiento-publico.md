# SPEC 07 — Slugs y descubrimiento público

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05, SPEC 06
> **Supersedes:** SPEC 04 (identificadores UUID del menú público), SPEC 05 (identificadores UUID de las rutas y respuestas públicas de reservas), SPEC 06 (identificadores UUID de las rutas públicas de pago)
> **Date:** 2026-07-31
> **Objective:** Incorporar slugs públicos inmutables para restaurantes y sucursales y exponer el descubrimiento necesario para navegar desde la landing hasta los flujos públicos existentes sin usar UUID de ubicación.

## Why this spec exists

El backend ya permite consultar el menú, reservar y pagar públicamente, pero el frontend necesita conocer previamente el restaurante y sus sucursales. Las lecturas actuales de esas entidades requieren autenticación y las rutas públicas existentes obligan a colocar UUID en URLs visibles al cliente.

Esta spec añade identificadores amigables únicamente en el borde público. Los UUID continúan siendo la identidad persistente y administrativa para no modificar relaciones, índices ni procesos internos.

## Scope

**In:**

- Añadir `Restaurant.slug` como identificador público único global.
- Añadir `Branch.slug` como identificador público único dentro de cada restaurante.
- Generar ambos slugs automáticamente desde `name` al crear la entidad.
- Normalizar los slugs a minúsculas ASCII, sin tildes, con segmentos alfanuméricos separados por guiones y un máximo de 80 caracteres.
- Mantener los slugs inmutables aunque posteriormente cambie `name`.
- Resolver colisiones mediante sufijos consecutivos (`miraflores`, `miraflores-2`, `miraflores-3`) y reintentar conflictos únicos concurrentes.
- Exponer el slug en las respuestas administrativas de restaurantes y sucursales, manteniendo sus rutas identificadas por UUID.
- Crear `GET /public/restaurants/:restaurantSlug` para consultar el nombre, teléfono, email y zona horaria del restaurante.
- Crear `GET /public/restaurants/:restaurantSlug/branches` para listar únicamente sucursales `ACTIVE`, ordenadas por nombre y slug ascendentes.
- Incluir en cada sucursal pública sus datos de ubicación, contacto, horarios y todas sus reglas de reserva.
- Devolver `200` con una lista vacía cuando el restaurante exista pero no tenga sucursales activas.
- Reemplazar `restaurantId` y `branchId` por `restaurantSlug` y `branchSlug` en las rutas públicas de menú, disponibilidad, reserva temporal, checkout y estado de pago.
- Reemplazar los identificadores de contexto por slugs en los DTO públicos de menú y reserva temporal.
- Mantener UUID para reservas, platos, categorías, intentos de pago y demás recursos operativos.
- Mantener los UUID internos para relaciones, consultas, idempotencia y persistencia.
- Conservar las reglas actuales: menú y nuevas reservas requieren una sucursal activa; checkout y consulta de pago siguen disponibles si la sucursal se desactiva posteriormente.
- Validar todos los parámetros públicos mediante Zod y `@hono/standard-validator`.
- Crear primero una migración independiente para los cambios de pagos de SPEC 06 que actualmente existen en `schema.prisma` pero no en el historial SQL.
- Crear después la migración propia de slugs; los datos actuales de desarrollo pueden reiniciarse y no requieren backfill.
- Actualizar `api-contract.md` y `README.md` con las nuevas rutas y respuestas.

**Out of scope (for future specs):**

- Sustituir UUID por slugs en rutas administrativas.
- Mantener aliases, redirects o compatibilidad con las rutas públicas UUID anteriores.
- Editar, regenerar o conservar un historial de slugs.
- Crear slugs para reservas, platos, categorías, mesas o pagos.
- Añadir `description`, `logoUrl`, `bannerUrl` o subida de imágenes.
- Crear un endpoint público individual para una sucursal.
- Geolocalización, coordenadas u orden por cercanía.
- Cuentas de cliente, magic links y correos; estas capacidades pasan a la futura SPEC 08.
- Preservar o migrar los datos actuales de desarrollo.
- Rate limiting, CAPTCHA o incorporación de un framework de pruebas automatizadas.

## Data model

### Prisma

```prisma
model Restaurant {
  // Campos existentes.
  slug String @unique @db.VarChar(80)
}

model Branch {
  // Campos existentes.
  slug String @db.VarChar(80)

  @@unique([restaurantId, slug])
}
```

Los UUID continúan siendo las claves primarias y foráneas. Los slugs solo actúan como identificadores públicos.

### Formato del slug

```ts
const publicSlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
```

Reglas de generación:

- Normalizar el nombre con Unicode NFKD.
- Eliminar tildes y marcas diacríticas.
- Convertir a minúsculas.
- Reemplazar cada secuencia no alfanumérica por `-`.
- Eliminar guiones iniciales y finales.
- Usar `restaurant` o `branch` si el nombre normalizado queda vacío.
- Truncar la base cuando sea necesario para que el slug y su sufijo no superen 80 caracteres.
- Intentar primero la base y después los sufijos `-2`, `-3`, etc.
- Reintentar si una creación concurrente provoca una restricción única.
- No aceptar `slug` en los cuerpos de creación o actualización.
- No modificarlo cuando cambie `name`.

### DTO de restaurante público

```ts
interface PublicRestaurantDto {
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  timezone: string;
}
```

### DTO de sucursal pública

```ts
interface PublicBranchDto {
  restaurantSlug: string;
  branchSlug: string;
  name: string;
  address: string;
  district: string;
  province: string;
  department: string;
  phone: string;
  email: string | null;
  rules: {
    defaultReservationDurationMinutes: number;
    minimumAdvanceMinutes: number;
    maximumAdvanceDays: number;
    arrivalToleranceMinutes: number;
    maxPartySize: number;
  };
  intervals: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}
```

`dayOfWeek` usa `1` para lunes y `7` para domingo. `startTime` y `endTime` se exponen como `HH:mm`, evitando que el frontend deba convertir los minutos internos.

### DTOs públicos existentes

```ts
interface PublicMenuResponse {
  restaurantSlug: string;
  branchSlug: string;
  categories: PublicMenuCategory[];
}

interface TemporaryReservationDto {
  id: string;
  branchSlug: string;
  // Los demás campos existentes no cambian.
}
```

Los DTOs de disponibilidad, checkout y estado de pago no cambian porque actualmente no exponen el contexto de restaurante o sucursal.

Los identificadores de categorías, platos, reservas e intentos de pago permanecen como UUID.

## Public HTTP contract

### Discovery

| Method | Route | Authentication |
| --- | --- | --- |
| `GET` | `/public/restaurants/:restaurantSlug` | No |
| `GET` | `/public/restaurants/:restaurantSlug/branches` | No |

`GET /public/restaurants/:restaurantSlug` devuelve directamente `PublicRestaurantDto`.

`GET /public/restaurants/:restaurantSlug/branches` devuelve directamente `PublicBranchDto[]`. Solo incluye sucursales `ACTIVE` y las ordena por `name ASC, slug ASC`.

Un restaurante existente sin sucursales activas sigue siendo público y produce `200 []` en el listado.

### Existing public routes amended

| Method | Route |
| --- | --- |
| `GET` | `/public/restaurants/:restaurantSlug/branches/:branchSlug/menu` |
| `GET` | `/public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/availability` |
| `POST` | `/public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/temporary` |
| `POST` | `/public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/checkout` |
| `GET` | `/public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/payment` |

Las versiones públicas con `:restaurantId` y `:branchId` dejan de existir. No se incorporan aliases ni redirects.

`reservationId` continúa siendo UUID en las rutas de checkout y estado de pago. La autorización continúa dependiendo del `checkoutToken`; conocer el UUID no concede acceso.

### Resolution invariants

- Los routers validan parámetros, invocan casos de uso y devuelven respuestas; nunca resuelven slugs mediante repositorios.
- Cada módulo público resuelve los slugs a UUID mediante su propio contrato de repositorio antes de ejecutar consultas internas.
- Menú, disponibilidad y creación de una reserva nueva exigen que la sucursal pertenezca al restaurante y esté `ACTIVE`.
- Checkout y consulta de pago validan la relación entre reserva, sucursal y restaurante mediante slugs, pero no exigen que la sucursal continúe `ACTIVE`.
- El hash idempotente de una reserva temporal conserva los UUID internos resueltos, no las cadenas de slug.
- Un replay idempotente válido se devuelve aunque la sucursal haya sido desactivada después de la creación original.
- Los slugs válidos son canónicos y sensibles a mayúsculas; una variante no canónica no redirige.

### Error contract

| Route family | Condition | Response |
| --- | --- | --- |
| Discovery | Slug de restaurante inválido o inexistente | `404 RESTAURANT_NOT_FOUND` |
| Public menu | Par de slugs inválido, inexistente o no publicable | `404 PUBLIC_MENU_NOT_FOUND` |
| Public reservations | Par de slugs inválido, inexistente o no publicable | `404 PUBLIC_RESERVATION_NOT_FOUND` |
| Public payments | Slugs, reserva o token que no coinciden | `404 PUBLIC_PAYMENT_NOT_FOUND` |

Los parámetros públicos se validan con Zod y `@hono/standard-validator`. Los hooks específicos de estas rutas convierten un slug no canónico al `404` opaco correspondiente en vez de permitir que un `ZodError` alcance el manejador global.

## Implementation plan

1. Generar una migración independiente que lleve el historial SQL desde SPEC 05 hasta el modelo de pagos ya definido por SPEC 06; aplicar la migración y verificar que Prisma no reporte drift antes de tocar slugs.
2. Añadir `Restaurant.slug` y `Branch.slug` a `prisma/schema.prisma`, crear la migración `add_public_slugs`, reiniciar los datos de desarrollo si Prisma lo requiere y regenerar `src/generated/prisma`.
3. Crear la utilidad compartida de normalización y candidatos en `src/shared/slug/slug.ts`, junto con el schema reutilizable de parámetros públicos; verificar casos con tildes, símbolos, nombres vacíos tras normalización, truncamiento y sufijos.
4. Añadir un error interno compartido para distinguir colisiones de la restricción de slug; los repositorios Prisma deben mapear únicamente las restricciones de slug y dejar intactos otros conflictos únicos.
5. Extender `RestaurantRepository` y `PrismaRestaurantRepository` con búsqueda por slug y persistencia del campo; actualizar `create-restaurant` para generar el slug inmutable y reintentar una colisión concurrente.
6. Extender `BranchRepository` y `PrismaBranchRepository` con búsqueda por slug dentro del restaurante, consulta de disponibilidad del candidato y persistencia del campo; actualizar `create-branch` para generar sufijos y reintentar colisiones sin alterar la validación de `code`.
7. Crear `PublicRestaurantDto`, su mapper y el caso de uso `get-public-restaurant`; devolver solo los campos aprobados y reutilizar `RestaurantNotFoundException`.
8. Crear `PublicBranchDto`, su mapper y el caso de uso `list-public-branches`; consultar únicamente sucursales `ACTIVE`, convertir intervalos a `HH:mm` y aplicar el orden `name ASC, slug ASC` desde el repositorio.
9. Crear los routers públicos de discovery dentro de los módulos `restaurants` y `branches`; validar los slugs con `@hono/standard-validator` y montar ambos endpoints en `src/index.ts` sin autenticación.
10. Actualizar el contrato, repositorio de contexto, implementación, router y DTO de `get-public-menu` para recibir slugs, resolver UUID internos y devolver `restaurantSlug` y `branchSlug`.
11. Ampliar `ReservationRepository` con resolución de contexto por `restaurantSlug` y `branchSlug`, conservando `branch.id` y `restaurantId` para disponibilidad, platos, mesas y persistencia.
12. Actualizar `get-availability` y su router para recibir slugs; conservar las reglas actuales de sucursal activa, ventana de anticipación, horarios y mesas disponibles.
13. Actualizar `create-temporary-reservation` y su router para recibir slugs, calcular la idempotencia con UUID internos y devolver `branchSlug`; verificar primero los replays antes de rechazar una sucursal posteriormente inactiva.
14. Cambiar el schema de parámetros, los contratos y los routers de pagos para aceptar slugs y conservar `reservationId` como UUID; sustituir el uso directo de `schema.parse` por validación estándar.
15. Cambiar `PaymentRepository.findReservationForPayment` para filtrar en una sola consulta por `reservationId`, `Branch.slug` y `Restaurant.slug`; mantener sin cambios los métodos internos y del webhook que trabajan con UUID.
16. Actualizar `create-checkout` y `get-payment-status` para usar el nuevo lookup sin revalidar el estado comercial de la sucursal, preservando token, importe, vigencia, idempotencia y reglas de reembolso de SPEC 06.
17. Completar el composition root en `src/index.ts`, retirar helpers públicos basados en UUID que queden sin uso y mantener intactos los mounts administrativos y `/webhooks/stripe`.
18. Actualizar `api-contract.md` y `README.md` con slugs administrativos, DTOs de discovery, rutas públicas nuevas, rutas reemplazadas, ejemplos y aclaraciones sobre los UUID operativos que permanecen.
19. Ejecutar Prisma validation/generation, TypeScript y Biome; después verificar manualmente discovery, menú, disponibilidad, reserva temporal, replay idempotente, checkout y consulta de pago con slugs válidos e inválidos.

## Acceptance criteria

### Persistence and slug generation

- [ ] Existe una migración SQL independiente que registra los modelos y campos de pagos de SPEC 06 antes de la migración de slugs.
- [ ] `Restaurant.slug` es obligatorio, tiene máximo 80 caracteres y es único globalmente.
- [ ] `Branch.slug` es obligatorio, tiene máximo 80 caracteres y es único dentro de `restaurantId`.
- [ ] Los UUID siguen siendo claves primarias y foráneas de restaurantes y sucursales.
- [ ] Crear `Restaurante Olímpico` genera `restaurante-olimpico`.
- [ ] Dos sucursales del mismo restaurante llamadas `Miraflores` generan `miraflores` y `miraflores-2`.
- [ ] Dos sucursales de restaurantes distintos pueden compartir el slug `miraflores`.
- [ ] Una colisión concurrente de slug se reintenta con el siguiente sufijo disponible.
- [ ] Ningún slug supera 80 caracteres después de añadir su sufijo.
- [ ] Actualizar el nombre de un restaurante o sucursal no cambia su slug.
- [ ] Los schemas de creación y actualización no aceptan un slug proporcionado por el cliente.
- [ ] Las respuestas administrativas de restaurante y sucursal incluyen el slug generado.
- [ ] Las rutas administrativas continúan identificando restaurantes y sucursales mediante UUID.

### Public discovery

- [ ] `GET /public/restaurants/:restaurantSlug` no exige autenticación.
- [ ] La respuesta pública del restaurante contiene exclusivamente `slug`, `name`, `phone`, `email` y `timezone`.
- [ ] La respuesta pública del restaurante no expone `legalName`, `taxId`, UUID ni timestamps.
- [ ] Un slug de restaurante inválido o inexistente produce `404 RESTAURANT_NOT_FOUND`.
- [ ] `GET /public/restaurants/:restaurantSlug/branches` no exige autenticación.
- [ ] El listado contiene únicamente sucursales `ACTIVE` del restaurante indicado.
- [ ] Una sucursal `INACTIVE` nunca aparece en el listado público.
- [ ] Las sucursales se ordenan por nombre y después por slug en orden ascendente.
- [ ] Cada sucursal incluye slugs, ubicación, contacto, reglas e intervalos con horas `HH:mm`.
- [ ] Un restaurante existente sin sucursales activas devuelve `200` con `[]`.
- [ ] El listado no expone UUID, `code`, `status` ni timestamps de sucursal.

### Existing public flow

- [ ] El menú público usa `restaurantSlug` y `branchSlug` en la URL y no acepta la versión anterior con UUID.
- [ ] El menú devuelve `restaurantSlug` y `branchSlug` en lugar de `restaurantId` y `branchId`.
- [ ] El menú conserva categorías, platos, precios, estados y orden definidos por SPEC 04.
- [ ] Disponibilidad y creación de reserva temporal usan slugs y no aceptan las versiones anteriores con UUID de ubicación.
- [ ] La respuesta de reserva temporal devuelve `branchSlug` en lugar de `branchId`.
- [ ] Disponibilidad y nuevas reservas rechazan una sucursal inactiva con `404 PUBLIC_RESERVATION_NOT_FOUND`.
- [ ] Un replay idempotente válido conserva la respuesta original aunque la sucursal haya sido desactivada.
- [ ] El hash idempotente continúa usando los UUID internos canónicos de restaurante y sucursal.
- [ ] Checkout y estado de pago usan slugs para restaurante y sucursal y mantienen `reservationId` como UUID.
- [ ] Checkout y estado de pago continúan funcionando si la sucursal se desactiva después de crear la reserva.
- [ ] Pagos con slugs, reserva o token que no coinciden devuelven el mismo `404 PUBLIC_PAYMENT_NOT_FOUND`.
- [ ] El webhook Stripe conserva su ruta y comportamiento sin cambios.
- [ ] Categorías, platos, reservas e intentos de pago conservan sus UUID en payloads y persistencia.

### Validation and verification

- [ ] Todos los parámetros de slug se validan mediante Zod y `@hono/standard-validator`.
- [ ] Un parámetro público inválido nunca termina en `500 INTERNAL_SERVER_ERROR` por un `ZodError` sin manejar.
- [ ] Las rutas públicas UUID anteriores no tienen aliases ni redirects.
- [ ] `api-contract.md` y `README.md` documentan las rutas y respuestas vigentes.
- [ ] `bun --bun run prisma validate` finaliza correctamente.
- [ ] `bun --bun run prisma generate` finaliza correctamente.
- [ ] El typecheck configurado en el proyecto finaliza correctamente.
- [ ] Biome finaliza sin errores en los archivos modificados.

## Decisions

- **Sí:** slugs para restaurante y sucursal en todo el borde público. La landing y el selector no deben construir URLs con UUID de ubicación.
- **No:** sustituir UUID internos. Siguen siendo apropiados para relaciones, administración y recursos operativos.
- **Sí:** mantener la estructura `/public/restaurants/:restaurantSlug/branches/:branchSlug/...`. Conserva el contrato REST existente y solo cambia la identidad pública.
- **No:** crear rutas públicas más cortas. Se evita introducir una segunda organización de endpoints.
- **Sí:** reemplazo inmediato de las rutas públicas UUID de SPEC 04, SPEC 05 y SPEC 06. El frontend aún está en construcción y no existe una necesidad concreta de compatibilidad.
- **No:** aliases o redirects para UUID. Duplicarían el contrato público y ampliarían la superficie de mantenimiento.
- **Sí:** generación automática e inmutable desde `name`. Evita pedir al administrador conocimiento sobre URLs y protege enlaces ya emitidos.
- **No:** regenerar el slug al renombrar. Rompería navegación, checkout y polling de pagos.
- **Sí:** ASCII lowercase con guiones y máximo 80 caracteres. Produce URLs canónicas y comparaciones simples en PostgreSQL.
- **Sí:** sufijos automáticos y reintento de restricciones únicas. La base de datos continúa siendo la autoridad ante concurrencia.
- **No:** backfill de datos actuales. La base solo contiene datos descartables de desarrollo y puede reiniciarse.
- **Sí:** migración faltante de pagos separada de la migración de slugs. Mantiene legible el historial por spec.
- **Sí:** DTOs públicos explícitos. No se devuelven modelos Prisma que puedan filtrar datos internos al crecer.
- **Sí:** exponer todas las reglas e intervalos de sucursal. El frontend puede construir el selector y limitar correctamente el formulario de reserva.
- **No:** endpoint público individual de sucursal. El listado ya contiene toda la información requerida por las tarjetas.
- **Sí:** `200 []` para un restaurante sin sucursales activas. La landing sigue siendo representable sin convertir ausencia temporal en inexistencia.
- **Sí:** conservar UUID para `reservationId`, platos, categorías e intentos. No son identificadores de ubicación ni requieren URLs amigables.
- **Sí:** la futura spec de cuentas de cliente pasa a SPEC 08. SPEC 07 resuelve primero el bloqueo actual del frontend.

## Risks

| Risk | Mitigation |
| --- | --- |
| Dos creaciones simultáneas eligen el mismo candidato de slug. | Restricciones únicas en PostgreSQL, error interno específico y reintento con el siguiente sufijo. |
| El sufijo hace que un slug supere 80 caracteres. | Truncar la base en función de la longitud del sufijo antes de persistir. |
| Un cambio de nombre rompe enlaces si regenera el slug. | El slug es inmutable y no forma parte de los schemas de actualización. |
| Resolver slugs solo para sucursales activas rompe pagos o replays posteriores. | Separar el lookup de identidad del chequeo comercial; pagos y replays no revalidan `ACTIVE`. |
| Usar slugs en el hash idempotente cambia la identidad de una petición. | Resolver primero y conservar UUID internos en el hash de SPEC 05. |
| Un `ZodError` directo en pagos termina como error 500. | Validar parámetros con `@hono/standard-validator` y hooks de error público. |
| La migración de slugs absorbe cambios de pagos no registrados. | Crear y aplicar primero una migración independiente correspondiente a SPEC 06. |
| Los DTOs públicos filtran campos internos al reutilizar entidades Prisma. | Definir DTOs y mappers públicos con listas explícitas de campos. |
| El frontend sigue usando rutas UUID documentadas anteriormente. | Actualizar el contrato, README y eliminar los mounts anteriores en el mismo cambio. |

## What is **not** in this spec

- Slugs en rutas administrativas o para recursos operativos.
- Compatibilidad con rutas públicas UUID anteriores.
- Edición de slugs, aliases históricos o redirects.
- Branding, imágenes o descripciones comerciales.
- Detalle público individual de sucursal.
- Geolocalización o selección automática por cercanía.
- Cuentas, sesiones, magic links o correos de clientes.
- Rate limiting, CAPTCHA o pruebas automatizadas.

Cada una de estas capacidades, si se incorpora, debe definirse en una spec posterior.
