# Backend — Reservas de Restaurante

API para la gestión de restaurantes y sucursales.

## Stack

- **Runtime:** Bun
- **Framework:** Hono v4
- **ORM:** Prisma Client + PostgreSQL (Neon)
- **Validación:** Zod v4 + @hono/standard-validator

## Requisitos

- Bun >= 1.x
- PostgreSQL

## Instalación

```sh
bun install
cp .env.example .env  # Configurar DATABASE_URL
bun --bun run prisma generate
bun --bun run prisma migrate dev
```

## Desarrollo

```sh
bun run dev
```

Servidor en `http://localhost:3000`.

---

## Endpoints

> **Autenticación:** diferida. Todos los endpoints de gestión serán exclusivos del administrador principal una vez implementado el spec de roles y usuarios.

### Restaurante

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/restaurants` | Crear el restaurante (singleton) |
| `GET` | `/restaurants/:restaurantId` | Obtener restaurante por ID |
| `PATCH` | `/restaurants/:restaurantId` | Actualizar datos del restaurante |

#### POST /restaurants

```json
{
  "name": "Central",
  "legalName": "Central S.A.C.",
  "taxId": "20123456789",
  "phone": "999888777",
  "email": "contacto@central.pe"
}
```

**Respuesta 201:**

```json
{
  "id": "uuid",
  "name": "Central",
  "legalName": "Central S.A.C.",
  "taxId": "20123456789",
  "phone": "999888777",
  "email": "contacto@central.pe",
  "timezone": "America/Lima",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errores:** `400` validación, `409 RESTAURANT_ALREADY_EXISTS`

#### GET /restaurants/:restaurantId

**Respuesta 200:** misma estructura que `POST 201`.

**Errores:** `404 RESTAURANT_NOT_FOUND`

#### PATCH /restaurants/:restaurantId

Todos los campos son opcionales. Mismo formato que `POST`.

**Errores:** `400` validación, `404 RESTAURANT_NOT_FOUND`

---

### Sucursales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/restaurants/:restaurantId/branches` | Crear sucursal |
| `GET` | `/restaurants/:restaurantId/branches` | Listar sucursales |
| `GET` | `/restaurants/:restaurantId/branches/:branchId` | Detalle de sucursal |
| `PATCH` | `/restaurants/:restaurantId/branches/:branchId` | Actualizar sucursal |
| `PUT` | `/restaurants/:restaurantId/branches/:branchId/schedule` | Reemplazar horarios |
| `PATCH` | `/restaurants/:restaurantId/branches/:branchId/status` | Activar/desactivar |

#### POST /restaurants/:restaurantId/branches

```json
{
  "name": "Sucursal Miraflores",
  "code": "MIRAFLORES",
  "address": "Av. Larco 123",
  "district": "Miraflores",
  "province": "Lima",
  "department": "Lima",
  "phone": "999111222",
  "email": "miraflores@central.pe",
  "rules": {
    "defaultReservationDurationMinutes": 60,
    "minimumAdvanceMinutes": 60,
    "maximumAdvanceDays": 30,
    "arrivalToleranceMinutes": 15,
    "maxPartySize": 8
  }
}
```

- `code` se normaliza a mayúsculas automáticamente.
- La sucursal se crea en estado `inactive`.

**Respuesta 201:** sucursal con `id`, `status: "INACTIVE"`, `rules` y `intervals: []`.

**Errores:** `400` validación, `404 RESTAURANT_NOT_FOUND`, `409 BRANCH_CODE_ALREADY_EXISTS`

#### GET /restaurants/:restaurantId/branches

**Query params:** `?status=active` | `?status=inactive`

**Respuesta 200:** arreglo de sucursales (cada una incluye `rules` e `intervals`).

**Errores:** `404 RESTAURANT_NOT_FOUND`

#### GET /restaurants/:restaurantId/branches/:branchId

**Respuesta 200:** sucursal completa con `rules` e `intervals`.

**Errores:** `404 BRANCH_NOT_FOUND`

#### PATCH /restaurants/:restaurantId/branches/:branchId

Todos los campos son opcionales, incluyendo `rules` (parcial).

```json
{
  "name": "Nuevo nombre",
  "code": "NUEVOCODIGO",
  "rules": {
    "maxPartySize": 12
  }
}
```

- Si se envía `code`, se normaliza y valida unicidad.

**Errores:** `400` validación, `404 BRANCH_NOT_FOUND`, `409 BRANCH_CODE_ALREADY_EXISTS`

#### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos de la sucursal en una operación atómica.

```json
{
  "intervals": [
    { "dayOfWeek": 1, "startTime": "12:00", "endTime": "16:00" },
    { "dayOfWeek": 1, "startTime": "19:00", "endTime": "23:00" },
    { "dayOfWeek": 7, "startTime": "10:00", "endTime": "15:00" }
  ]
}
```

- `dayOfWeek`: 1 (lunes) a 7 (domingo).
- `startTime` / `endTime`: formato `HH:mm` 24 horas.
- `startTime` debe ser anterior a `endTime`.
- Los intervalos de un mismo día no pueden solaparse.

**Errores:** `400` validación, `404 BRANCH_NOT_FOUND`, `409 BRANCH_SCHEDULE_CONFLICT`

#### PATCH /restaurants/:restaurantId/branches/:branchId/status

```json
{ "status": "active" }
```

- Solo se permite `active` si la sucursal tiene al menos un intervalo de horario.
- `inactive` siempre se permite y conserva los datos.

**Errores:** `400` validación, `404 BRANCH_NOT_FOUND`, `422 BRANCH_SCHEDULE_REQUIRED`

---

## Formato de errores

Todas las respuestas de error siguen la estructura:

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

| Campo | Descripción |
|-------|-------------|
| `code` | Identificador en inglés y mayúsculas |
| `message` | Mensaje legible en español |
| `details` | Arreglo de errores por campo (siempre presente) |

**Códigos de error del dominio:**

| Código HTTP | Código de error | Significado |
|-------------|-----------------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe o no pertenece al restaurante |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Intervalos de horario solapados |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Se requiere horario para activar |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno (sin detalles expuestos) |

---

## Comandos

```sh
# Desarrollo
bun run dev

# Prisma
bun --bun run prisma generate
bun --bun run prisma migrate dev
bun --bun run prisma studio

# TypeScript
bunx tsc --noEmit
```

## Arquitectura

- **Feature-first:** cada módulo en `src/modules/<feature>/`
- **Casos de uso:** lógica de negocio pura, sin dependencias HTTP
- **Repositorios:** única capa con acceso a Prisma
- **Excepciones de dominio:** una por archivo, traducidas por el handler global
- **Composition root:** `src/index.ts` ensambla todas las dependencias
