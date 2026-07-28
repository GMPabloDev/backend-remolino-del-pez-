# Backend — Reservas de Restaurante

API para la gestión de restaurantes, sucursales y usuarios internos.

## Stack

- **Runtime:** Bun
- **Framework:** Hono v4
- **ORM:** Prisma Client + PostgreSQL (Neon)
- **Validación:** Zod v4 + @hono/standard-validator
- **Autenticación:** JWT + refresh tokens rotativos (jose)

## Requisitos

- Bun >= 1.x
- PostgreSQL

## Instalación

```sh
bun install
cp .env.example .env  # Configurar todas las variables
bun --bun run prisma generate
bun --bun run prisma migrate dev
bun run seed           # Crear el administrador inicial
```

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Conexión PostgreSQL | Sí |
| `ADMIN_NAME` | Nombre del admin inicial (seed) | Solo seed |
| `ADMIN_EMAIL` | Email del admin inicial (seed) | Solo seed |
| `ADMIN_PASSWORD` | Contraseña del admin inicial (seed) | Solo seed |
| `ACCESS_TOKEN_SECRET` | Secreto para firmar JWT (mín. 32 caracteres) | Solo auth |
| `ACCESS_TOKEN_TTL_MINUTES` | Duración del access token (default: 25) | No |
| `REFRESH_TOKEN_TTL_DAYS` | Duración del refresh token (default: 30) | No |

## Desarrollo

```sh
bun run dev
```

Servidor en `http://localhost:3000`.

---

## Roles y permisos

| Rol | Restaurante | Sucursales | Usuarios |
|-----|-------------|------------|----------|
| Rol | Restaurante | Sucursales | Mesas | Catálogo | Usuarios |
|-----|-------------|------------|-------|----------|----------|
| `admin` | Crear, ver, editar | CRUD completo en todas | CRUD completo en todas | CRUD completo global y por sucursal | CRUD completo |
| `manager` | Solo ver | CRUD completo en todas | CRUD completo en todas | CRUD completo global y por sucursal | Sin acceso |
| `branch_admin` | Solo ver | Solo su sucursal asignada | Solo su sucursal asignada | Solo lectura global; precio/estado en su sucursal | Sin acceso |

---

## Autenticación

Todos los endpoints de gestión requieren el header:

```
Authorization: Bearer <accessToken>
```

### POST /auth/login

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "MiPassword123"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "user": {
    "id": "uuid",
    "fullName": "Administrador",
    "email": "admin@example.com",
    "phone": null,
    "role": "ADMIN",
    "status": "ACTIVE",
    "branchId": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errores:** `401 INVALID_CREDENTIALS` (no revela si el email existe o está inactivo).

### POST /auth/refresh

Rota el refresh token: el anterior queda invalidado inmediatamente. Si se detecta reutilización de un token ya rotado, se revocan todas las sesiones del usuario.

**Request:**
```json
{ "refreshToken": "abc123..." }
```

**Response 200:** mismo formato que login.

**Errores:** `401 INVALID_REFRESH_TOKEN`

### POST /auth/logout

Revoca la sesión correspondiente al refresh token. Idempotente.

**Request:**
```json
{ "refreshToken": "abc123..." }
```

**Response 204:** sin contenido.

### PATCH /auth/password

Requiere autenticación. Revoca todas las sesiones del usuario, incluida la actual.

**Request:**
```json
{
  "currentPassword": "MiPassword123",
  "newPassword": "NuevaClave456"
}
```

**Response 204:** sin contenido.

**Errores:** `401 INVALID_CREDENTIALS`

---

## Usuarios (solo `ADMIN`)

### POST /users

**Request:**
```json
{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "999888777",
  "password": "UnaClaveSegura1",
  "role": "manager",
  "branchId": null
}
```

- `role`: `admin`, `manager` o `branch_admin`.
- `branchId`: requerido para `branch_admin`, prohibido para `admin` y `manager`.
- Contraseña: 10–128 caracteres, mínimo una mayúscula, una minúscula y un número.

**Response 201:** perfil del usuario (sin `passwordHash`).

**Errores:** `400` validación, `409 USER_EMAIL_ALREADY_EXISTS`, `422 INVALID_ROLE_BRANCH`

### GET /users

**Query params:** `?role=manager&status=active&branchId=uuid` (todos opcionales y combinables).

**Response 200:** arreglo de usuarios (sin `passwordHash`).

### GET /users/:userId

**Response 200:** perfil del usuario.

**Errores:** `404 USER_NOT_FOUND`

### PATCH /users/:userId

Todos los campos son opcionales. Mismo formato que `POST`.

**Errores:** `400` validación, `404 USER_NOT_FOUND`, `409 USER_EMAIL_ALREADY_EXISTS`, `422 LAST_ADMIN_REQUIRED`, `422 INVALID_ROLE_BRANCH`

### PATCH /users/:userId/status

```json
{ "status": "inactive" }
```

- Desactivar revoca todas las sesiones del usuario.
- No se puede desactivar al último `ADMIN` activo.

**Errores:** `404 USER_NOT_FOUND`, `422 LAST_ADMIN_REQUIRED`

### PUT /users/:userId/password

Restablece la contraseña de otro usuario. Revoca todas sus sesiones.

```json
{ "password": "NuevaClave456" }
```

**Errores:** `404 USER_NOT_FOUND`

---

## Restaurante

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `POST` | `/restaurants` | Sí | `admin` |
| `GET` | `/restaurants/:restaurantId` | Sí | Todos |
| `PATCH` | `/restaurants/:restaurantId` | Sí | `admin` |

### POST /restaurants

Crea el restaurante (singleton, solo puede existir uno).

```json
{
  "name": "Central",
  "legalName": "Central S.A.C.",
  "taxId": "20123456789",
  "phone": "999888777",
  "email": "contacto@central.pe"
}
```

**Response 201:**
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

**Errores:** `400` validación, `401` no autenticado, `403` sin permisos, `409 RESTAURANT_ALREADY_EXISTS`

### GET /restaurants/:restaurantId

**Response 200:** misma estructura que `POST 201`.

**Errores:** `401`, `404 RESTAURANT_NOT_FOUND`

### PATCH /restaurants/:restaurantId

Todos los campos opcionales. Mismo formato que `POST`.

**Errores:** `400`, `401`, `403`, `404 RESTAURANT_NOT_FOUND`

---

## Sucursales

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `POST` | `/restaurants/:rid/branches` | Sí | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches` | Sí | Todos (filtrado por sucursal) |
| `GET` | `/restaurants/:rid/branches/:bid` | Sí | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid` | Sí | `admin`, `manager`, `branch_admin`* |
| `PUT` | `/restaurants/:rid/branches/:bid/schedule` | Sí | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/status` | Sí | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal asignada; otra sucursal → `403`.

### POST /restaurants/:restaurantId/branches

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

- `code` se normaliza a mayúsculas.
- La sucursal se crea en estado `inactive`.

**Response 201:** sucursal con `id`, `status: "INACTIVE"`, `rules` y `intervals: []`.

**Errores:** `400`, `401`, `403`, `404 RESTAURANT_NOT_FOUND`, `409 BRANCH_CODE_ALREADY_EXISTS`

### GET /restaurants/:restaurantId/branches

**Query params:** `?status=active` | `?status=inactive`

- `admin` y `manager` ven todas las sucursales.
- `branch_admin` solo ve la suya.

**Response 200:** arreglo de sucursales (cada una incluye `rules` e `intervals`).

### GET /restaurants/:restaurantId/branches/:branchId

**Response 200:** sucursal completa con `rules` e `intervals`.

**Errores:** `401`, `403`, `404 BRANCH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/branches/:branchId

Todos los campos opcionales, incluyendo `rules` (parcial).

```json
{
  "name": "Nuevo nombre",
  "code": "NUEVOCODIGO",
  "rules": { "maxPartySize": 12 }
}
```

### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos atómicamente.

```json
{
  "intervals": [
    { "dayOfWeek": 1, "startTime": "12:00", "endTime": "16:00" },
    { "dayOfWeek": 1, "startTime": "19:00", "endTime": "23:00" }
  ]
}
```

- `dayOfWeek`: 1 (lunes) a 7 (domingo).
- `startTime` / `endTime`: `HH:mm` 24h. `startTime < endTime`.
- Sin solapamientos en un mismo día.

**Errores:** `409 BRANCH_SCHEDULE_CONFLICT`

### PATCH /restaurants/:restaurantId/branches/:branchId/status

```json
{ "status": "active" }
```

- `active` requiere al menos un intervalo.
- `inactive` siempre se permite.

**Errores:** `422 BRANCH_SCHEDULE_REQUIRED`

---

## Mesas

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `POST` | `/restaurants/:rid/branches/:bid/tables` | Sí | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches/:bid/tables` | Sí | Todos (restringido) |
| `GET` | `/restaurants/:rid/branches/:bid/tables/:tid` | Sí | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid` | Sí | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid/status` | Sí | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre las mesas de su sucursal asignada; otra sucursal → `403`.

### POST /restaurants/:restaurantId/branches/:branchId/tables

```json
{
  "code": "TERRAZA-02",
  "capacity": 4
}
```

- `code`: 1-30 caracteres, letras/números/guiones/guiones bajos. Se normaliza a mayúsculas.
- `capacity`: entero positivo.
- La mesa se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "branchId": "uuid",
  "code": "TERRAZA-02",
  "capacity": 4,
  "status": "inactive",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errores:** `400`, `401`, `403`, `404 BRANCH_NOT_FOUND`, `409 TABLE_CODE_ALREADY_EXISTS`

### GET /restaurants/:restaurantId/branches/:branchId/tables

**Query params:** `?status=active` | `?status=inactive`

**Response 200:** arreglo de mesas.

### GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Response 200:** mesa individual.

**Errores:** `401`, `403`, `404 BRANCH_NOT_FOUND`, `404 TABLE_NOT_FOUND`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId

Todos los campos opcionales.

```json
{
  "code": "NUEVO-01",
  "capacity": 6
}
```

- Si se cambia el código, se revalida formato y unicidad.

**Errores:** `404 TABLE_NOT_FOUND`, `409 TABLE_CODE_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status

```json
{ "status": "active" }
```

- Se permite activar mesas aunque la sucursal esté inactiva.

---

## Catálogo de platos

El catálogo es global por restaurante. Cada plato se configura por sucursal con precio y disponibilidad independientes.

### Categorías

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `POST` | `/restaurants/:rid/menu/categories` | Sí | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/categories` | Sí | Todos |
| `GET` | `/restaurants/:rid/menu/categories/:cid` | Sí | Todos |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid` | Sí | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid/status` | Sí | `admin`, `manager` |

### Platos

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `POST` | `/restaurants/:rid/menu/dishes` | Sí | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/dishes` | Sí | Todos |
| `GET` | `/restaurants/:rid/menu/dishes/:did` | Sí | Todos |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did` | Sí | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did/status` | Sí | `admin`, `manager` |

### Configuración por sucursal

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| `GET` | `/restaurants/:rid/branches/:bid/dishes` | Sí | Todos (restringido) |
| `PUT` | `/restaurants/:rid/branches/:bid/dishes/:did` | Sí | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal asignada.

### POST /restaurants/:restaurantId/menu/categories

```json
{
  "name": "Fondos",
  "position": 2
}
```

- `name`: 1-80 caracteres, único por restaurante (case-insensitive).
- `position`: entero positivo.
- Creada con estado `inactive`.

**Errores:** `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`

### GET /restaurants/:restaurantId/menu/categories

**Query:** `?status=active|inactive`

Ordenado por `position` ascendente, `name` ascendente.

### POST /restaurants/:restaurantId/menu/dishes

```json
{
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa"],
  "allergens": ["Soya"],
  "categoryId": "uuid",
  "position": 1
}
```

- `imageUrl`: opcional, `null` o URL `http/https` ≤ 2048 caracteres.
- Ingredientes (máx 50) y alérgenos (máx 30): se normalizan (recorte, sin vacíos, deduplicados case-insensitive).
- Creado con estado `inactive`.

**Errores:** `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId

Todos los campos opcionales. `imageUrl: null` elimina la referencia. Actualizar `ingredients` o `allergens` reemplaza la lista completa.

### PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId

Configura precio y disponibilidad de un plato para una sucursal. Idempotente.

```json
{
  "price": "35.90",
  "status": "available"
}
```

- `price`: cadena decimal dos posiciones, > `0.00`, ≤ `99999999.99`.
- `status`: `available`, `sold_out` o `inactive`.
- No requiere que categoría, plato o sucursal estén activos.

**Response 200:** `{ "price": "35.90", "status": "available" }`

### GET /restaurants/:restaurantId/branches/:branchId/dishes

Lista todos los platos globales con su configuración local (`branchConfiguration`) o `null`.

## Menú público

### GET /public/restaurants/:restaurantId/branches/:branchId/menu

Endpoint público, sin autenticación.

```json
{
  "restaurantId": "uuid",
  "branchId": "uuid",
  "categories": [
    {
      "id": "uuid",
      "name": "Fondos",
      "position": 2,
      "dishes": [
        {
          "id": "uuid",
          "name": "Lomo saltado",
          "description": "...",
          "imageUrl": "...",
          "ingredients": ["..."],
          "allergens": ["..."],
          "position": 1,
          "price": "35.90",
          "status": "available"
        }
      ]
    }
  ]
}
```

- Solo categorías activas, platos activos y configuraciones `available`/`sold_out`.
- Los platos `sold_out` aparecen pero marcados.
- Categorías sin platos publicables se omiten.
- Sucursal activa sin platos: `200 { "categories": [] }`.
- Sucursal inexistente, no relacionada o inactiva: `404 PUBLIC_MENU_NOT_FOUND`.

---

## Formato de errores

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

| Código HTTP | Código de error | Significado |
|-------------|-----------------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | Token requerido, inválido o expirado |
| 401 | `INVALID_CREDENTIALS` | Email o contraseña incorrectos |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos para la operación |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe |
| 404 | `USER_NOT_FOUND` | Usuario no existe |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Horarios solapados |
| 409 | `USER_EMAIL_ALREADY_EXISTS` | Email ya registrado |
| 404 | `TABLE_NOT_FOUND` | Mesa no existe |
| 404 | `MENU_CATEGORY_NOT_FOUND` | Categoría no existe |
| 404 | `DISH_NOT_FOUND` | Plato no existe |
| 404 | `PUBLIC_MENU_NOT_FOUND` | Menú público no disponible |
| 409 | `TABLE_CODE_ALREADY_EXISTS` | Código de mesa duplicado |
| 409 | `MENU_CATEGORY_NAME_ALREADY_EXISTS` | Nombre de categoría duplicado |
| 409 | `DISH_NAME_ALREADY_EXISTS` | Nombre de plato duplicado |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sin horarios |
| 422 | `LAST_ADMIN_REQUIRED` | No se puede eliminar al último admin |
| 422 | `INVALID_ROLE_BRANCH` | Rol y sucursal incompatibles |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno |

---

## Comandos

```sh
# Desarrollo
bun run dev

# Prisma
bun --bun run prisma generate
bun --bun run prisma migrate dev
bun --bun run prisma studio

# Seed
bun run seed

# TypeScript y lint
bunx tsc --noEmit
bun run check
```

## Arquitectura

- **Feature-first:** cada módulo en `src/modules/<feature>/`
- **Casos de uso:** lógica de negocio pura, sin dependencias HTTP
- **Repositorios:** única capa con acceso a Prisma
- **Excepciones de dominio:** una por archivo, traducidas por el handler global
- **Composition root:** `src/index.ts` ensambla todas las dependencias
- **Autenticación:** JWT (access token 25 min) + refresh token opaco rotativo (30 días)
- **Autorización:** rol, estado y sucursal resueltos desde BD en cada petición
