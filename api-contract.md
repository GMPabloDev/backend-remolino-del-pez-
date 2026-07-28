# API Contract — Reservas de Restaurante

> Documento vivo. Refleja el estado actual del backend. Copiar manualmente al proyecto frontend.

## Errores (todas las rutas)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "field": "name", "code": "too_small", "message": "..." }]
  }
}
```

| HTTP | code | Significado |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | Token requerido, inválido o expirado |
| 401 | `INVALID_CREDENTIALS` | Email o contraseña incorrectos |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe |
| 404 | `USER_NOT_FOUND` | Usuario no existe |
| 404 | `TABLE_NOT_FOUND` | Mesa no existe |
| 404 | `MENU_CATEGORY_NOT_FOUND` | Categoría no existe |
| 404 | `DISH_NOT_FOUND` | Plato no existe |
| 404 | `PUBLIC_MENU_NOT_FOUND` | Menú público no disponible |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Horarios solapados |
| 409 | `TABLE_CODE_ALREADY_EXISTS` | Código de mesa duplicado |
| 409 | `MENU_CATEGORY_NAME_ALREADY_EXISTS` | Nombre de categoría duplicado |
| 409 | `DISH_NAME_ALREADY_EXISTS` | Nombre de plato duplicado |
| 409 | `USER_EMAIL_ALREADY_EXISTS` | Email ya registrado |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sin horarios |
| 422 | `LAST_ADMIN_REQUIRED` | Último admin activo |
| 422 | `INVALID_ROLE_BRANCH` | Rol-sucursal incompatible |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno |

---

## Auth

### POST /auth/login

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, 25 min)",
  "refreshToken": "string (opaco, 30 días)",
  "user": { "id": "uuid", "fullName": "string", "email": "string", "phone": "string | null", "role": "ADMIN|MANAGER|BRANCH_ADMIN", "status": "ACTIVE|INACTIVE", "branchId": "uuid | null", "createdAt": "ISO8601", "updatedAt": "ISO8601" }
}
```

**Errores:** `401 INVALID_CREDENTIALS` (mismo mensaje si email no existe, contraseña incorrecta o usuario inactivo).

---

### POST /auth/refresh

Rota el refresh token. El anterior se invalida. Reutilización de un token rotado → revoca todas las sesiones del usuario.

**Request:**
```json
{ "refreshToken": "string" }
```

**Response 200:** mismo formato que login.

**Errores:** `401 INVALID_REFRESH_TOKEN`

---

### POST /auth/logout

Revoca la sesión del refresh token. Idempotente.

**Request:**
```json
{ "refreshToken": "string" }
```

**Response 204:** sin contenido.

---

### PATCH /auth/password

Requiere `Authorization: Bearer <accessToken>`. Revoca todas las sesiones.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string (10-128, mayúscula, minúscula, número)" }
```

**Response 204:** sin contenido.

**Errores:** `401 INVALID_CREDENTIALS`

---

## Usuarios (requiere `Authorization: Bearer <accessToken>`, rol `ADMIN`)

### POST /users

**Request:**
```json
{
  "fullName": "string (1-150)",
  "email": "string (email, único)",
  "phone?": "string",
  "password": "string (10-128, mayúscula, minúscula, número)",
  "role": "admin | manager | branch_admin",
  "branchId?": "uuid (requerido si role=branch_admin, prohibido si admin o manager)"
}
```

**Response 201:** perfil del usuario (sin `passwordHash`).

---

### GET /users

**Query:** `?role=admin|manager|branch_admin&status=active|inactive&branchId=uuid` (todos opcionales, combinables).

**Response 200:** `User[]` (sin `passwordHash`). Sin paginación.

---

### GET /users/:userId

**Response 200:** `User` (sin `passwordHash`).

---

### PATCH /users/:userId

**Request:** todos los campos opcionales (mismo formato que POST).

**Errores:** `422 LAST_ADMIN_REQUIRED` si se degrada o desactiva al último admin activo.

---

### PATCH /users/:userId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- `inactive` → revoca todas las sesiones.
- No se puede desactivar al último `ADMIN` activo.

---

### PUT /users/:userId/password

Restablece la contraseña de otro usuario. Revoca todas sus sesiones.

**Request:**
```json
{ "password": "string (10-128, mayúscula, minúscula, número)" }
```

---

## Restaurante (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants` | `admin` |
| `GET` | `/restaurants/:restaurantId` | Todos |
| `PATCH` | `/restaurants/:restaurantId` | `admin` |

### POST /restaurants

Crea el restaurante (singleton).

**Request:**
```json
{
  "name": "string",
  "legalName": "string",
  "taxId": "string (11 dígitos)",
  "phone?": "string",
  "email?": "string"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "string",
  "legalName": "string",
  "taxId": "string",
  "phone": "string | null",
  "email": "string | null",
  "timezone": "America/Lima",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### GET /restaurants/:restaurantId

**Response 200:** igual que `POST 201`.

### PATCH /restaurants/:restaurantId

**Request:** todos los campos opcionales (mismo formato que POST).

---

## Sucursales (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches` | Todos (filtrado) |
| `GET` | `/restaurants/:rid/branches/:bid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid` | `admin`, `manager`, `branch_admin`* |
| `PUT` | `/restaurants/:rid/branches/:bid/schedule` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal; otra → `403 FORBIDDEN`.

### POST /restaurants/:restaurantId/branches

**Request:**
```json
{
  "name": "string",
  "code": "string (normalizado a mayúsculas)",
  "address": "string",
  "district": "string",
  "province": "string",
  "department": "string",
  "phone": "string",
  "email?": "string",
  "rules": {
    "defaultReservationDurationMinutes": "int > 0",
    "minimumAdvanceMinutes": "int > 0",
    "maximumAdvanceDays": "int > 0",
    "arrivalToleranceMinutes": "int > 0",
    "maxPartySize": "int > 0"
  }
}
```

**Constraint:** `minimumAdvanceMinutes < maximumAdvanceDays * 24 * 60`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "string",
  "code": "MAYÚSCULAS",
  "address": "string",
  "district": "string",
  "province": "string",
  "department": "string",
  "phone": "string",
  "email": "string | null",
  "status": "INACTIVE",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "rules": { /* BranchRules */ },
  "intervals": []
}
```

### GET /restaurants/:restaurantId/branches

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las sucursales.
- `branch_admin`: solo su sucursal asignada.

**Response 200:** `Branch[]` (cada una con `rules` e `intervals`).

### GET /restaurants/:restaurantId/branches/:branchId

**Response 200:** `Branch` con `rules` e `intervals`.

### PATCH /restaurants/:restaurantId/branches/:branchId

**Request:** todos los campos opcionales (`rules` también parcial).

### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos atómicamente.

**Request:**
```json
{
  "intervals": [
    { "dayOfWeek": "1-7 (1=lunes)", "startTime": "HH:mm", "endTime": "HH:mm" }
  ]
}
```

**Constraints:** `startTime < endTime`, sin solapamientos en un mismo día.

### PATCH /restaurants/:restaurantId/branches/:branchId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- `active` requiere al menos un intervalo (`422` si no).
- `inactive` siempre se permite.

---

## Mesas (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches/:bid/tables` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches/:bid/tables` | Todos (restringido) |
| `GET` | `/restaurants/:rid/branches/:bid/tables/:tid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre mesas de su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### POST /restaurants/:restaurantId/branches/:branchId/tables

**Request:**
```json
{
  "code": "string (1-30, letras, números, guiones y guiones bajos)",
  "capacity": "int > 0"
}
```

- `code` se recorta y normaliza a mayúsculas.
- La mesa se crea con estado `inactive`.

**Response 201:**
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

**Errores:** `409 TABLE_CODE_ALREADY_EXISTS`, `404 BRANCH_NOT_FOUND`

### GET /restaurants/:restaurantId/branches/:branchId/tables

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las mesas de la sucursal.
- `branch_admin`: solo las mesas de su sucursal.

**Response 200:** `DiningTable[]`

### GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Response 200:** `DiningTable`

**Errores:** `404 TABLE_NOT_FOUND`, `404 BRANCH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Request:** todos los campos opcionales.
```json
{
  "code": "string",
  "capacity": "int > 0"
}
```

- Si se cambia el código, se normaliza y valida unicidad dentro de la sucursal.

**Errores:** `404 TABLE_NOT_FOUND`, `409 TABLE_CODE_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- Se permite activar mesas incluso si la sucursal está inactiva.

**Errores:** `404 TABLE_NOT_FOUND`

---

## Catálogo — Categorías (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/categories` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/categories` | Todos |
| `GET` | `/restaurants/:rid/menu/categories/:cid` | Todos |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/categories

```json
{
  "name": "Fondos",
  "position": 2
}
```

- `name`: 1-80 caracteres, único por restaurante (sin distinguir mayúsculas/minúsculas).
- `position`: entero positivo.
- La categoría se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Fondos",
  "position": 2,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/categories

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `MenuCategory[]`, ordenado por `position` ascendente y `name` ascendente.

### GET /restaurants/:restaurantId/menu/categories/:categoryId

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId

```json
{ "name": "Nuevo nombre", "position": 3 }
```

Todos los campos opcionales.

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`, `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId/status

```json
{ "status": "active" }
```

- Desactivar una categoría conserva sus platos y configuraciones por sucursal.

---

## Catálogo — Platos (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/dishes` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/dishes` | Todos |
| `GET` | `/restaurants/:rid/menu/dishes/:did` | Todos |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/dishes

```json
{
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "categoryId": "uuid",
  "position": 1
}
```

- `name`: 1-120 caracteres, único por restaurante.
- `description`: 1-1000 caracteres.
- `imageUrl`: nulo o URL `http/https` de hasta 2048 caracteres.
- `ingredients`: máx. 50 elementos de 1-100 caracteres.
- `allergens`: máx. 30 elementos de 1-100 caracteres.
- Ingredientes y alérgenos se normalizan: recorte, sin vacíos, sin duplicados case-insensitive.
- `categoryId`: UUID de una categoría del mismo restaurante.
- `position`: entero positivo.
- El plato se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "categoryId": "uuid",
  "categoryName": "Fondos",
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "position": 1,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/dishes

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `DishDto[]`, ordenado por `position` ascendente y `name` ascendente.

### GET /restaurants/:restaurantId/menu/dishes/:dishId

**Errores:** `404 DISH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId

Todos los campos opcionales. `imageUrl` acepta `null` para eliminar la referencia.

```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "imageUrl": null,
  "ingredients": ["Nuevo ingrediente"],
  "allergens": [],
  "categoryId": "uuid",
  "position": 3
}
```

- Actualizar `ingredients` o `allergens` reemplaza la lista completa.

**Errores:** `404 DISH_NOT_FOUND`, `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId/status

```json
{ "status": "active" }
```

- Desactivar un plato conserva sus configuraciones por sucursal.

---

## Catálogo — Configuración por sucursal (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `GET` | `/restaurants/:rid/branches/:bid/dishes` | Todos (restringido) |
| `PUT` | `/restaurants/:rid/branches/:bid/dishes/:did` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### GET /restaurants/:restaurantId/branches/:branchId/dishes

Devuelve todos los platos globales con su configuración local o `null`.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "restaurantId": "uuid",
    "categoryId": "uuid",
    "categoryName": "Fondos",
    "name": "Lomo saltado",
    "description": "Lomo de res con papas y arroz",
    "imageUrl": "https://example.com/lomo.jpg",
    "ingredients": ["Lomo de res", "Papa", "Arroz"],
    "allergens": ["Soya"],
    "position": 1,
    "status": "active",
    "branchConfiguration": {
      "price": "35.90",
      "status": "available"
    },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

### PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId

Crea o reemplaza la configuración comercial de un plato en una sucursal. Idempotente.

```json
{
  "price": "35.90",
  "status": "available"
}
```

- `price`: cadena decimal con exactamente dos posiciones (ej. `"35.90"`). Mayor que `0.00` y máximo `99999999.99`.
- `status`: `available`, `sold_out` o `inactive`.

**Response 200:**
```json
{
  "price": "35.90",
  "status": "available"
}
```

- Configurar un plato no requiere que la categoría, el plato o la sucursal estén activos.

**Errores:** `404 BRANCH_NOT_FOUND`, `404 DISH_NOT_FOUND`, `403 FORBIDDEN`

---

## Menú público (sin autenticación)

| Método | Ruta |
|--------|------|
| `GET` | `/public/restaurants/:rid/branches/:bid/menu` |

### GET /public/restaurants/:restaurantId/branches/:branchId/menu

Devuelve el menú publicable de una sucursal activa. Sin autenticación.

**Response 200** (sucursal activa sin platos publicables):
```json
{
  "restaurantId": "uuid",
  "branchId": "uuid",
  "categories": []
}
```

**Response 200** (con platos):
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
          "description": "Lomo de res con papas y arroz",
          "imageUrl": "https://example.com/lomo.jpg",
          "ingredients": ["Lomo de res", "Papa", "Arroz"],
          "allergens": ["Soya"],
          "position": 1,
          "price": "35.90",
          "status": "available"
        }
      ]
    }
  ]
}
```

- Solo aparecen categorías activas, platos activos y configuraciones `available` o `sold_out`.
- Configuraciones `inactive` y platos sin configuración local se omiten.
- Categorías sin platos publicables se omiten.
- Platos `sold_out` aparecen marcados pero visibles.
- Categorías y platos se ordenan por `position` ascendente y `name` ascendente.

**Errores:** `404 PUBLIC_MENU_NOT_FOUND` (restaurante o sucursal inexistente, no relacionados, o sucursal inactiva).
