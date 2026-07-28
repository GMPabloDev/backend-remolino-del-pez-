# SPEC 03 — Gestión de mesas por sucursal

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-07-27
> **Objective:** Implementar la gestión autenticada de mesas por sucursal para registrar su capacidad y estado como base de la futura asignación automática de reservas.

## Scope

**In:**

- Crear mesas asociadas explícitamente a una sucursal.
- Identificar cada mesa mediante un código obligatorio y único dentro de su sucursal.
- Normalizar los códigos de mesa a mayúsculas.
- Registrar la capacidad de cada mesa como un entero positivo.
- Crear cada mesa con estado inicial `inactive`.
- Listar todas las mesas de una sucursal sin paginación.
- Filtrar el listado por estado `active` o `inactive`.
- Consultar una mesa específica dentro de su restaurante y sucursal.
- Editar el código y la capacidad de una mesa.
- Activar y desactivar mesas sin eliminar sus datos.
- Permitir configurar y activar mesas aunque la sucursal esté inactiva.
- Permitir a `ADMIN` y `MANAGER` gestionar mesas de cualquier sucursal.
- Limitar a `BRANCH_ADMIN` a gestionar mesas de su sucursal asignada.
- Mantener el contrato global de errores y la autenticación definidos en las specs anteriores.

**Out of scope (for future specs):**

- Eliminación física de mesas.
- Creación, edición o activación masiva de mesas.
- Áreas como salón, terraza o piso.
- Preferencias de ubicación del cliente.
- Catálogo y selección de platos.
- Consulta pública de disponibilidad.
- Asignación automática o combinación de mesas.
- Creación y gestión de reservas.
- Restricciones de edición basadas en reservas futuras.
- Cambios en los requisitos para activar una sucursal.

## Data model

### Prisma

```prisma
enum DiningTableStatus {
  ACTIVE
  INACTIVE
}

model Branch {
  // Campos y relaciones existentes de SPEC 01 y SPEC 02.
  tables DiningTable[]
}

model DiningTable {
  id        String            @id @default(uuid()) @db.Uuid
  branchId  String            @db.Uuid
  code      String            @db.VarChar(30)
  capacity  Int
  status    DiningTableStatus @default(INACTIVE)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  branch    Branch            @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@unique([branchId, code])
  @@index([branchId, status])
  @@index([branchId, status, capacity])
}
```

### Conventions and invariants

- `DiningTable` representa una mesa física reservable dentro de una sucursal.
- `branchId` debe corresponder a una sucursal perteneciente al `restaurantId` de la ruta.
- `code` se recorta y convierte a mayúsculas antes de persistirse.
- `code` contiene entre 1 y 30 caracteres y acepta únicamente letras, números, guiones y guiones bajos mediante `^[A-Z0-9_-]+$`.
- `code` es único dentro de cada sucursal, pero puede repetirse en sucursales diferentes.
- `capacity` debe ser un entero positivo.
- `capacity` no depende de `BranchRules.maxPartySize` porque esa regla puede cambiar sin invalidar una mesa existente.
- Una mesa nueva siempre se persiste como `INACTIVE`.
- La API recibe y devuelve los estados como `active` e `inactive`.
- Una mesa puede estar activa mientras su sucursal está inactiva.
- La activación de una sucursal continúa exigiendo únicamente un horario válido, según SPEC 01.
- Las operaciones no eliminan físicamente registros de `DiningTable`.

### API representation

```json
{
  "id": "uuid",
  "branchId": "uuid",
  "code": "TERRAZA-02",
  "capacity": 4,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Endpoints

- `POST /restaurants/:restaurantId/branches/:branchId/tables`
- `GET /restaurants/:restaurantId/branches/:branchId/tables`
- `GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId`
- `PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId`
- `PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status`

## Implementation plan

1. Extender `prisma/schema.prisma` con `DiningTableStatus`, `DiningTable` y la relación `Branch.tables`; crear la migración, validar el esquema y regenerar Prisma Client.
2. Crear el contrato `DiningTableRepository` y su implementación Prisma bajo `src/modules/tables/repositories/`, incluyendo consultas por identificador, sucursal, estado y código normalizado.
3. Crear los DTO, el mapper de salida y los esquemas Zod bajo `src/modules/tables/dto/`, `src/modules/tables/mapper/` y `src/modules/tables/schemas/`; garantizar que ningún endpoint exponga los valores internos `ACTIVE` o `INACTIVE`.
4. Crear `TABLE_NOT_FOUND` y `TABLE_CODE_ALREADY_EXISTS` como excepciones independientes bajo `src/modules/tables/exceptions/` e integrarlas con el manejador global existente.
5. Implementar `create-table` con contratos e implementación separados; comprobar que la sucursal pertenece al restaurante de la ruta, normalizar el código y persistir siempre el estado inicial `INACTIVE`.
6. Implementar `list-tables` con filtro opcional por estado y sin paginación; validar la pertenencia de la sucursal antes de consultar sus mesas.
7. Implementar `get-table`; tratar como `TABLE_NOT_FOUND` una mesa inexistente o que no pertenezca a la sucursal indicada.
8. Implementar `update-table`; permitir cambios parciales de `code` y `capacity`, repetir la normalización y mapear conflictos de unicidad incluso ante solicitudes concurrentes.
9. Implementar `update-table-status`; aceptar únicamente `active` o `inactive` y permitir la activación aunque la sucursal esté inactiva.
10. Crear `src/modules/tables/router.ts` con las cinco rutas anidadas, validación mediante Zod y `@hono/standard-validator`, autenticación obligatoria y autorización por sucursal.
11. Autorizar a `ADMIN` y `MANAGER` sobre cualquier sucursal; autorizar a `BRANCH_ADMIN` únicamente cuando el `branchId` de la ruta coincida con su sucursal asignada y responder `403 FORBIDDEN` en cualquier otro caso.
12. Instanciar `PrismaDiningTableRepository` y los casos de uso mediante inyección por constructor en `src/index.ts`; montar el router en `/restaurants/:restaurantId/branches/:branchId/tables`.
13. Actualizar `README.md` y `api-contract.md` con el modelo, permisos, solicitudes, respuestas, filtros y errores de las rutas de mesas.
14. Verificar el esquema, la generación del cliente y la compilación con `bun --bun run prisma validate`, `bun --bun run prisma generate` y `bunx tsc --noEmit`; ejecutar manualmente los flujos de creación, consulta, edición y cambio de estado con los tres roles.

Cada caso de uso tendrá su propia carpeta con contrato e implementación, y cada excepción permanecerá en un archivo independiente según `AGENTS.md`.

## Acceptance criteria

- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate` y `bunx tsc --noEmit` finalizan correctamente.
- [ ] La migración crea `DiningTable` con UUID, relación obligatoria con `Branch`, capacidad, estado y marcas de tiempo.
- [ ] `POST /restaurants/:restaurantId/branches/:branchId/tables` requiere autenticación y crea una mesa con estado `inactive`.
- [ ] Crear una mesa devuelve `201` con `id`, `branchId`, `code`, `capacity`, `status`, `createdAt` y `updatedAt`.
- [ ] El código se recorta y normaliza a mayúsculas antes de persistirse.
- [ ] El código acepta entre 1 y 30 caracteres y rechaza caracteres distintos de letras, números, guiones y guiones bajos.
- [ ] La capacidad rechaza cero, números negativos, decimales y valores no numéricos.
- [ ] La capacidad puede ser mayor que `BranchRules.maxPartySize`.
- [ ] Repetir un código normalizado dentro de la misma sucursal retorna `409 TABLE_CODE_ALREADY_EXISTS`.
- [ ] Dos sucursales diferentes pueden usar el mismo código de mesa.
- [ ] Solicitudes concurrentes con el mismo código no crean duplicados y una de ellas retorna `409 TABLE_CODE_ALREADY_EXISTS`.
- [ ] `GET /restaurants/:restaurantId/branches/:branchId/tables` devuelve todas las mesas de la sucursal sin paginación.
- [ ] Los filtros `status=active` y `status=inactive` devuelven únicamente mesas con el estado solicitado.
- [ ] Un estado de filtro distinto de `active` o `inactive` retorna `400 VALIDATION_ERROR`.
- [ ] `GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId` devuelve la mesa solicitada.
- [ ] Una mesa inexistente o perteneciente a otra sucursal retorna `404 TABLE_NOT_FOUND`.
- [ ] Una sucursal inexistente o que no pertenece al restaurante de la ruta retorna `404 BRANCH_NOT_FOUND`.
- [ ] `PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId` actualiza únicamente `code` y `capacity` cuando se suministran.
- [ ] Actualizar el código vuelve a aplicar recorte, formato, normalización y unicidad.
- [ ] `PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status` acepta exclusivamente `active` o `inactive`.
- [ ] Activar una mesa de una sucursal inactiva está permitido.
- [ ] Crear o activar mesas no modifica automáticamente el estado de la sucursal.
- [ ] Activar una sucursal continúa exigiendo horario, pero no exige mesas activas.
- [ ] `ADMIN` y `MANAGER` pueden crear, listar, consultar, editar, activar y desactivar mesas de cualquier sucursal.
- [ ] `BRANCH_ADMIN` puede ejecutar todas las operaciones de mesas únicamente en su sucursal asignada.
- [ ] `BRANCH_ADMIN` recibe `403 FORBIDDEN` al operar sobre las mesas de otra sucursal.
- [ ] Una petición sin una sesión válida retorna `401 UNAUTHORIZED`.
- [ ] La API recibe y devuelve los estados de mesa como `active` e `inactive`.
- [ ] Todos los errores mantienen la estructura `{ "error": { "code", "message", "details" } }`.
- [ ] No existe ningún endpoint para eliminar físicamente mesas o administrarlas de forma masiva.
- [ ] No se incorpora ninguna ruta pública de disponibilidad o asignación automática.
- [ ] `README.md` y `api-contract.md` documentan las rutas y el contrato de mesas.

## Decisions

- **Sí:** separar la gestión de mesas del catálogo de platos y del flujo de reservas. Cada dominio tendrá su propia spec.
- **Sí:** implementar primero mesas, después platos y finalmente reservas para que la asignación dependa de modelos ya definidos.
- **Sí:** usar `DiningTable` como nombre del modelo Prisma. Evita confundir la entidad con el concepto genérico de tabla de base de datos.
- **Sí:** mantener `/tables` como nombre del recurso HTTP. Es el término esperado por los clientes de la API.
- **Sí:** asociar cada mesa a una única sucursal.
- **Sí:** usar UUID para identificar mesas.
- **Sí:** código obligatorio, normalizado a mayúsculas y único dentro de la sucursal.
- **Sí:** limitar el código a 30 caracteres y a letras, números, guiones y guiones bajos.
- **Sí:** capacidad entera positiva sin límite derivado de `BranchRules.maxPartySize`.
- **No:** almacenar un área o ubicación. Se añadirá únicamente cuando se definan preferencias de reserva.
- **Sí:** estado propio `active` o `inactive` mediante `DiningTableStatus`.
- **Sí:** crear mesas como `inactive` para evitar que entren accidentalmente en la futura asignación.
- **Sí:** permitir activar mesas mientras la sucursal está inactiva. Esto facilita preparar la configuración antes de habilitar operaciones.
- **No:** cambiar la activación de sucursales definida en SPEC 01. Una sucursal activa sin mesas disponibles simplemente no ofrecerá disponibilidad futura.
- **Sí:** rutas anidadas bajo restaurante y sucursal para expresar y validar la pertenencia completa.
- **Sí:** listado completo con filtro opcional por estado.
- **No:** paginación o filtros públicos por capacidad en esta spec.
- **Sí:** `ADMIN` y `MANAGER` administran todas las mesas, mientras `BRANCH_ADMIN` queda limitado a su sucursal.
- **No:** eliminación física. La desactivación preserva identidad e historial futuro.
- **No:** operaciones masivas. No son necesarias para el alcance inicial.
- **No:** disponibilidad, combinación o asignación de mesas. Esas reglas pertenecen a la futura spec de reservas.
- **No:** pruebas automatizadas en esta spec porque el proyecto todavía no dispone de un framework de pruebas; la verificación será mediante compilación y flujos manuales reproducibles.

## Risks

| Risk | Mitigation |
| --- | --- |
| Dos solicitudes concurrentes podrían intentar crear el mismo código normalizado. | Mantener la restricción única compuesta en PostgreSQL y mapear su violación a `TABLE_CODE_ALREADY_EXISTS`. |
| Un `BRANCH_ADMIN` podría intentar operar sobre una sucursal ajena alterando la ruta. | Comparar el `branchId` de la ruta con la sucursal actual del usuario antes de ejecutar el caso de uso. |
| Una mesa podría quedar activa mientras su sucursal está inactiva. | Considerarlo un estado válido de preparación; la futura disponibilidad exigirá que ambas entidades estén activas. |
| Una sucursal activa podría no tener ninguna mesa activa. | La futura consulta de disponibilidad devolverá ausencia de opciones sin cambiar automáticamente el estado de la sucursal. |
| Editar capacidad o estado podría afectar reservas cuando estas existan. | La futura spec de reservas definirá restricciones y manejo de reservas vigentes antes de habilitar ese flujo. |
| El formato interno del enum podría filtrarse como `ACTIVE` o `INACTIVE`. | Centralizar el mapeo de salida y verificar que todas las respuestas públicas usen minúsculas. |

## What is **not** in this spec

- Catálogo o selección de platos.
- Reservas temporales o confirmadas.
- Integración con pasarelas de pago.
- Disponibilidad pública.
- Asignación o combinación automática de mesas.
- Áreas y preferencias de ubicación.
- Restricciones basadas en reservas futuras.
- Eliminación física de mesas.
- Operaciones masivas.
- Modificaciones a las reglas de activación de sucursales.

Cada una de estas capacidades se definirá en una spec posterior cuando corresponda.
