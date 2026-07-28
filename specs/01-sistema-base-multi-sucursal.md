# SPEC 01 — Sistema base multi-sucursal

> **Status:** Implementado
> **Depends on:** None
> **Date:** 2026-07-27
> **Objective:** Establecer la API y persistencia necesarias para administrar un único restaurante con múltiples sucursales, cada una con reglas de reserva y horarios semanales propios.

## Scope

**In:**

- Crear, consultar y editar los datos del único restaurante del sistema.
- Impedir la creación de un segundo restaurante.
- Crear, listar, consultar y editar sucursales asociadas explícitamente al restaurante.
- Activar y desactivar sucursales sin eliminar sus datos.
- Filtrar sucursales por estado `active` o `inactive`.
- Configurar por sucursal la duración predeterminada, anticipación mínima y máxima, tolerancia de llegada y tamaño máximo del grupo.
- Reemplazar la programación semanal completa de una sucursal.
- Admitir múltiples intervalos de atención por día sin solapamientos.
- Aplicar la zona horaria global `America/Lima`.
- Normalizar los códigos de sucursal a mayúsculas y exigir que sean únicos.
- Unificar errores de dominio, validación e infraestructura bajo el contrato global acordado.

**Out of scope (for future specs):**

- Autenticación y autorización del administrador principal.
- Roles y usuarios internos.
- Creación y gestión de reservas.
- Eliminación física de restaurantes o sucursales.
- Gestión de múltiples restaurantes.
- Feriados, excepciones por fecha y cierres extraordinarios.
- Horarios que atraviesen la medianoche.
- Paginación del listado de sucursales.
- Endpoints públicos para consultar sucursales disponibles.

## Data model

### Prisma

```prisma
enum BranchStatus {
  ACTIVE
  INACTIVE
}

model Restaurant {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  legalName String
  taxId     String   @unique @db.VarChar(11)
  phone     String?
  email     String?
  timezone  String   @default("America/Lima")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  branches  Branch[]
}

model Branch {
  id           String                   @id @default(uuid()) @db.Uuid
  restaurantId String                   @db.Uuid
  name         String
  code         String
  address      String
  district     String
  province     String
  department   String
  phone        String
  email        String?
  status       BranchStatus             @default(INACTIVE)
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt
  restaurant   Restaurant               @relation(fields: [restaurantId], references: [id], onDelete: Restrict)
  rules        BranchRules?
  intervals    BranchScheduleInterval[]

  @@unique([restaurantId, code])
  @@index([restaurantId, status])
}

model BranchRules {
  id                                String   @id @default(uuid()) @db.Uuid
  branchId                          String   @unique @db.Uuid
  defaultReservationDurationMinutes Int
  minimumAdvanceMinutes             Int
  maximumAdvanceDays                Int
  arrivalToleranceMinutes           Int
  maxPartySize                      Int
  createdAt                         DateTime @default(now())
  updatedAt                         DateTime @updatedAt
  branch                            Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)
}

model BranchScheduleInterval {
  id          String   @id @default(uuid()) @db.Uuid
  branchId    String   @db.Uuid
  dayOfWeek   Int
  startMinute Int
  endMinute   Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  branch      Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@index([branchId, dayOfWeek])
}
```

### Conventions and invariants

- `Restaurant` is a singleton enforced by the create-restaurant use case.
- `taxId` contains exactly 11 numeric characters.
- `timezone` is always `America/Lima`.
- The API exposes branch statuses as `active` and `inactive`.
- Branch codes are trimmed, converted to uppercase and unique within the restaurant.
- Branch rules are mandatory and created atomically with the branch.
- All rule values are positive integers.
- `maximumAdvanceDays` represents days; the remaining temporal rules represent minutes.
- `dayOfWeek` uses ISO values from `1` (Monday) through `7` (Sunday).
- The API receives schedule times as `HH:mm`; persistence converts them to minutes elapsed since midnight.
- `startMinute` must be lower than `endMinute`.
- Intervals belonging to the same day cannot overlap.
- A branch starts as `INACTIVE` and can only become `ACTIVE` when it has at least one interval.

### Global error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [
      {
        "field": "rules.maxPartySize",
        "code": "too_small",
        "message": "Debe ser mayor que cero"
      }
    ]
  }
}
```

- `error.code` uses uppercase English identifiers.
- `error.message` and detail messages are presented in Spanish.
- `error.details` is always present.
- Unexpected errors expose neither internal messages nor stack traces.

## Implementation plan

1. Extend `prisma/schema.prisma` with `Restaurant`, `Branch`, `BranchRules`, `BranchScheduleInterval` and `BranchStatus`; create the initial migration and regenerate the client. Verification: `bun --bun run prisma validate` and `bun --bun run prisma generate`.
2. Add the Prisma connection in `src/shared/database/prisma-client.ts`; add the base exception, error response types and global Hono error handler under `src/shared/errors/`. Register the handler in `src/index.ts` and verify that the existing root route remains executable.
3. Create the restaurant contracts and Prisma repository under `src/modules/restaurants/repositories/`; only the repository implementation may use Prisma Client.
4. Implement the `create-restaurant` use case, its Zod schema and `POST /restaurants` route. Reject a second restaurant with `409 RESTAURANT_ALREADY_EXISTS`.
5. Implement `get-restaurant` and `update-restaurant` with `GET /restaurants/:restaurantId` and `PATCH /restaurants/:restaurantId`. Return `404 RESTAURANT_NOT_FOUND` when appropriate.
6. Create the branch contracts and Prisma repository under `src/modules/branches/repositories/`. Implement `create-branch` so that `Branch` and `BranchRules` are persisted atomically, the code is normalized and the initial state is `INACTIVE`.
7. Add `POST /restaurants/:restaurantId/branches` with request validation and domain exceptions for a missing restaurant and duplicate branch code.
8. Implement `list-branches` and `get-branch`; expose `GET /restaurants/:restaurantId/branches` with optional `status=active|inactive` and `GET /restaurants/:restaurantId/branches/:branchId`. Include rules and weekly intervals in branch details.
9. Implement `update-branch` and expose `PATCH /restaurants/:restaurantId/branches/:branchId`. Allow partial updates to general data and rules; renormalize and revalidate the code when it changes.
10. Implement `replace-branch-schedule` and expose `PUT /restaurants/:restaurantId/branches/:branchId/schedule`. Validate ISO weekdays, `HH:mm` values and overlaps before replacing all intervals in one transaction.
11. Implement `update-branch-status` and expose `PATCH /restaurants/:restaurantId/branches/:branchId/status`. Reject activation without at least one interval using `422 BRANCH_SCHEDULE_REQUIRED`.
12. Complete the composition root in `src/index.ts` by instantiating repositories and use cases through constructor dependency injection, then mounting both routers. Verify compilation with `bunx tsc --noEmit`.
13. Document the available endpoints, request formats, status codes and manual execution commands in `README.md`, leaving authentication explicitly marked as deferred rather than simulated.

Each use case will have its own folder with a contract and implementation, and each exception will have an independent file according to `AGENTS.md`.

## Acceptance criteria

- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate` and `bunx tsc --noEmit` finish successfully.
- [ ] `POST /restaurants` creates a restaurant with a generated UUID and timezone `America/Lima`.
- [ ] The restaurant RUC accepts exactly 11 numeric characters.
- [ ] Attempting to create a second restaurant returns `409 RESTAURANT_ALREADY_EXISTS`.
- [ ] `GET /restaurants/:restaurantId` returns the existing restaurant or `404 RESTAURANT_NOT_FOUND`.
- [ ] `PATCH /restaurants/:restaurantId` updates only the supplied fields.
- [ ] `POST /restaurants/:restaurantId/branches` atomically creates a branch and its mandatory rules.
- [ ] A new branch always starts with status `inactive`.
- [ ] A branch code is trimmed and converted to uppercase before persistence.
- [ ] Repeating a branch code within the restaurant returns `409 BRANCH_CODE_ALREADY_EXISTS`.
- [ ] All rule values reject zero, negative numbers and non-integers.
- [ ] Minimum advance must be lower than maximum advance after converting both values to minutes.
- [ ] `GET /restaurants/:restaurantId/branches` returns every branch without pagination.
- [ ] The `status=active` and `status=inactive` filters return only matching branches.
- [ ] `GET /restaurants/:restaurantId/branches/:branchId` includes general data, rules and weekly intervals.
- [ ] A branch that does not belong to the route restaurant is treated as not found.
- [ ] `PATCH /restaurants/:restaurantId/branches/:branchId` updates general data, rules and code according to the defined invariants.
- [ ] `PUT /restaurants/:restaurantId/branches/:branchId/schedule` replaces the complete previous schedule atomically.
- [ ] A weekly schedule accepts ISO weekdays `1–7`, 24-hour `HH:mm` values and multiple intervals per day.
- [ ] Intervals with invalid bounds or overlaps return `409 BRANCH_SCHEDULE_CONFLICT`.
- [ ] Activating a branch without intervals returns `422 BRANCH_SCHEDULE_REQUIRED`.
- [ ] Activating a branch with at least one valid interval changes its status to `active`.
- [ ] Deactivating a branch preserves its data, rules and schedule.
- [ ] Every error uses the global `{ "error": { "code", "message", "details" } }` structure.
- [ ] Validation errors identify each affected field inside `error.details`.
- [ ] Unexpected errors return `500 INTERNAL_SERVER_ERROR`, expose no internal details and are logged on the server.
- [ ] No endpoint physically deletes a restaurant or branch.
- [ ] The API executes without authentication while its future admin-only requirement remains documented.

## Decisions

- **Yes:** a single restaurant with multiple branches. This is the current business scope.
- **No:** multi-company or multiple restaurant support. It requires data isolation and deserves another spec.
- **Yes:** model `Restaurant` explicitly. This avoids relying on fixed configuration or manual records.
- **Yes:** reject a second restaurant from the use case with `409 Conflict`.
- **Yes:** nested routes under `/restaurants/:restaurantId/branches`. They make ownership explicit.
- **No:** implicitly resolve “the only restaurant” under `/branches`. It would hide a relevant relationship.
- **Yes:** use UUIDs for all entities.
- **Yes:** store rules in `BranchRules` with a one-to-one relationship. This keeps operational configuration separate.
- **Yes:** create branches as `inactive`. A branch without schedules must not become available.
- **Yes:** activate and deactivate without physical deletion. Data must remain available for future reservations.
- **No:** physical deletion endpoints.
- **Yes:** administrator-provided codes normalized to uppercase and unique within the restaurant.
- **Yes:** multiple daily intervals and atomic replacement of the complete schedule through `PUT`.
- **No:** individual interval CRUD. It would facilitate partial and inconsistent states.
- **Yes:** `HH:mm` times in the API and minutes since midnight in persistence. This simplifies comparisons and overlap detection.
- **No:** schedules crossing midnight. They will be split across two days if later required.
- **Yes:** a single `America/Lima` timezone stored in the restaurant.
- **No:** timezone per branch. Operations are limited to Peru.
- **No:** holidays and date exceptions. They will be defined in another spec.
- **Yes:** complete branch listing with an optional status filter.
- **No:** pagination. The restaurant will have at most approximately ten branches.
- **Yes:** authentication and authorization are deferred, while documenting that management will be restricted to the main administrator.
- **Yes:** independent domain exceptions and a global error handler.
- **Yes:** error codes in English and public messages in Spanish.
- **Yes:** `error.details` is always an array to maintain a stable contract.
- **No:** expose internal messages or stack traces in `500` responses.

## Risks

| Risk | Mitigation |
| --- | --- |
| Two concurrent requests could both attempt to create the singleton restaurant. | Execute the existence check and creation in a transaction with `Serializable` isolation and map contention to `RESTAURANT_ALREADY_EXISTS`. |
| Concurrent schedule updates could leave partial or stale intervals. | Validate first and replace all intervals inside one database transaction. |
| Time conversion errors could alter interval boundaries. | Centralize conversion between `HH:mm` and minutes since midnight and validate the range `00:00–23:59`. |
| Management endpoints have no authentication in this spec. | Do not expose this API publicly until the authentication and admin authorization spec is implemented. |
| Concurrent requests could reuse a normalized branch code. | Keep the composite database unique constraint and map its violation to `BRANCH_CODE_ALREADY_EXISTS`. |
| Unexpected errors could leak database or infrastructure information. | Return a generic `500` response and restrict technical details to server-side logging. |

## What is **not** in this spec

- Authentication, roles or internal users.
- Reservation creation or management.
- Multiple restaurants or companies.
- Physical deletion of restaurants or branches.
- Holidays, date exceptions or extraordinary closures.
- Schedules crossing midnight.
- Branch list pagination.
- Public branch availability endpoints.

Each of these capabilities requires its own future spec.
