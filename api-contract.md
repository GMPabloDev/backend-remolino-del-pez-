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
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Horarios solapados |
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
