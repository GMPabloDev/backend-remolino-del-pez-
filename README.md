# Backend — Reservas de Restaurante

API para la gestión de restaurantes, sucursales y usuarios internos.

## Stack

- **Runtime:** Bun
- **Framework:** Hono v4
- **ORM:** Prisma Client + PostgreSQL (Neon)
- **Validación:** Zod v4 + @hono/standard-validator
- **Autenticación:** JWT interno y de clientes + refresh tokens rotativos (jose)
- **Documentos:** PDF con `pdf-lib` y almacenamiento restringido en Cloudinary

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
| `CHECKOUT_TOKEN_SECRET` | Secreto HMAC para tokens de checkout (mín. 32 caracteres) | Sí |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (sk_test_... o sk_live_...) | Sí |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma de webhooks Stripe (whsec_...) | Sí |
| `STRIPE_CHECKOUT_SUCCESS_URL` | URL de retorno tras pago exitoso | Sí |
| `STRIPE_CHECKOUT_CANCEL_URL` | URL de retorno tras cancelación | Sí |
| `CUSTOMER_ACCESS_TOKEN_SECRET` | Secreto JWT independiente para access tokens de clientes (mín. 32 caracteres) | Sí |
| `CUSTOMER_MAGIC_LINK_URL` | URL absoluta del callback frontend para magic links | Sí |
| `SMTP_HOST` | Servidor SMTP, por ejemplo `smtp.gmail.com` | Sí |
| `SMTP_PORT` | Puerto SMTP, `587` para Gmail con STARTTLS | Sí |
| `SMTP_SECURE` | `false` para Gmail en puerto 587 | Sí |
| `SMTP_USER` | Cuenta remitente SMTP | Sí |
| `SMTP_PASS` | Contraseña de aplicación SMTP; nunca la contraseña principal | Sí |
| `SMTP_FROM_NAME` | Nombre visible del remitente | Sí |
| `SMTP_FROM_EMAIL` | Email autorizado del remitente | Sí |
| `EMAIL_LOGO_URL` | URL HTTPS opcional del logo usado en los correos | No |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary para almacenar comprobantes PDF | Sí |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | Sí |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | Sí |

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
    "role": "admin",
    "status": "active",
    "branchId": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errores:** `401 INVALID_CREDENTIALS` (no revela si el email existe o está inactivo).

### Autenticación passwordless de clientes

Los clientes no crean una cuenta antes de pagar ni usan contraseñas. Después de un pago confirmado, el backend crea o reutiliza la cuenta, genera un magic link y envía un correo combinado con agradecimiento, resumen de la reserva y acceso.

### POST /public/restaurants/:restaurantSlug/customer-auth/magic-links

Solicita un nuevo magic link. Responde siempre `202` con un mensaje genérico para no revelar si el restaurante o correo existe.

**Request:**
```json
{ "email": "ana@example.com" }
```

**Response 202:**
```json
{ "message": "Si existe una cuenta elegible, enviaremos un enlace de acceso." }
```

Las solicitudes manuales tienen cooldown de un minuto e invalidan enlaces anteriores no consumidos. Los correos automáticos por pagos confirmados no tienen ese límite.

### POST /public/customer-auth/magic-links/exchange

Intercambia un magic link de un solo uso por una sesión.

**Request:**
```json
{ "token": "opaque-base64url-token" }
```

**Response 200:**
```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "customer": {
    "fullName": "Ana Pérez",
    "email": "ana@example.com",
    "phone": "+51987654321",
    "restaurantSlug": "central"
  }
}
```

El enlace dura 15 minutos. El access token dura 25 minutos y el refresh token 30 días. El frontend debe eliminar el token de la URL con `history.replaceState`.

**Errores:** `400 VALIDATION_ERROR`, `401 INVALID_MAGIC_LINK`.

### POST /customer-auth/refresh

Rota el refresh token. El anterior queda inválido inmediatamente. Si se reutiliza un token rotado, se revocan todas las sesiones del cliente.

**Request:**
```json
{ "refreshToken": "opaque-token" }
```

**Response 200:** mismo formato que el intercambio.

**Errores:** `400 VALIDATION_ERROR`, `401 INVALID_CUSTOMER_REFRESH_TOKEN`.

### POST /customer-auth/logout

Revoca solo la sesión indicada. Es idempotente.

**Request:**
```json
{ "refreshToken": "opaque-token" }
```

**Response 204:** sin contenido.

### GET /customer-auth/me

Requiere `Authorization: Bearer <customerAccessToken>`.

**Response 200:**
```json
{
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "phone": "+51987654321",
  "restaurantSlug": "central"
}
```

No lista reservas ni pagos.

**Errores:** `401 CUSTOMER_AUTH_REQUIRED`.

### GET /customer/reservations

Requiere `Authorization: Bearer <customerAccessToken>` y devuelve todas las reservas confirmadas del cliente autenticado, incluyendo sus items y el estado del comprobante. Devuelve `200 []` cuando no existen reservas.

### GET /customer/reservations/:reservationId/receipt/download

Requiere autenticación de cliente. Devuelve una URL firmada de Cloudinary con cinco minutos de vigencia:

```json
{
  "fileName": "comprobante-CP-000001.pdf",
  "downloadUrl": "https://res.cloudinary.com/...",
  "expiresAt": "ISO8601"
}
```

El comprobante también se adjunta al correo de confirmación. Las credenciales de Cloudinary nunca se exponen ni se guardan en URLs persistentes.

`EMAIL_LOGO_URL` es opcional. Si se configura con una URL HTTPS de Cloudinary, el logo aparece en las plantillas de confirmación y acceso. Si se omite, se muestra una marca visual alternativa.

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

## Usuarios (solo `admin`)

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
- No se puede desactivar al último `admin` activo.

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
  "slug": "central",
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

**Response 201:** sucursal con `id`, `restaurantId`, `slug`, `status: "inactive"`, `rules` y `intervals: []`.

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

Todos los campos opcionales, incluyendo `rules` (parcial). `email: null` elimina el email de la sucursal.

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
- El reemplazo del horario también actualiza `Branch.updatedAt`.

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

## Discovery público

### GET /public/restaurants/:restaurantSlug

No requiere autenticación. Devuelve `slug`, `name`, `phone`, `email` y `timezone`. No expone `legalName`, `taxId`, UUID ni timestamps.

**Errores:** `404 RESTAURANT_NOT_FOUND`

### GET /public/restaurants/:restaurantSlug/branches

No requiere autenticación. Devuelve solo sucursales `active`, ordenadas por nombre y slug. Cada sucursal incluye `restaurantSlug`, `branchSlug`, ubicación, contacto, reglas e intervalos en formato `HH:mm`. Si no hay sucursales activas, devuelve `200 []`.

**Errores:** `404 RESTAURANT_NOT_FOUND`

## Menú público

### GET /public/restaurants/:restaurantSlug/branches/:branchSlug/menu

Endpoint público, sin autenticación.

```json
{
  "restaurantSlug": "central",
  "branchSlug": "miraflores",
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

## Reservas temporales públicas

Las reservas temporales no requieren autenticación.

### GET /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/availability

Consulta horarios disponibles mediante `?date=YYYY-MM-DD&partySize=int`.

```json
{
  "date": "2026-08-01",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "availableTimes": ["12:00", "12:15", "12:30"]
}
```

Usa bloques de 15 minutos, aplica horarios, anticipación y `maxPartySize`, y no revela mesas ni cantidades disponibles. Una fecha válida sin opciones devuelve `availableTimes: []`.

### POST /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/temporary

Crea un bloqueo de 15 minutos y asigna una única mesa activa con la menor capacidad suficiente. Requiere el header `Idempotency-Key: UUID`.

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
  "items": [{ "dishId": "uuid", "quantity": 2 }]
}
```

- La hora usa únicamente minutos `00`, `15`, `30` o `45`.
- Se exigen entre 1 y 50 platos distintos, con cantidades de 1 a 99.
- Solo se aceptan platos activos y configurados como `available`.
- Se congelan nombres y precios; el total es la suma de subtotales en `PEN`.
- La reserva queda como `pending_payment` y las reservas vencidas dejan de bloquear mesas lógicamente.
- La asignación y creación usan una transacción `Serializable`; no se combinan mesas.
- `Reservation` conserva el cliente, intervalo, expiración, estado, total, clave idempotente y hash; `ReservationItem` congela nombre, precio, cantidad y subtotal.
- La primera creación devuelve `201`; repetir la misma clave y payload devuelve `200` con la reserva original, incluso si venció.
- La respuesta devuelve `branchSlug`; `reservationId` y `dishId` continúan siendo UUID.

**Errores:** `400 VALIDATION_ERROR`, `404 PUBLIC_RESERVATION_NOT_FOUND`, `409 RESERVATION_TIME_UNAVAILABLE`, `409 DISH_NOT_AVAILABLE`, `409 IDEMPOTENCY_KEY_REUSED`.

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
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token interno inválido o expirado |
| 401 | `INVALID_MAGIC_LINK` | Magic link inexistente, vencido, consumido o invalidado |
| 401 | `INVALID_CUSTOMER_REFRESH_TOKEN` | Refresh token de cliente inválido, vencido, reemplazado o revocado |
| 401 | `CUSTOMER_AUTH_REQUIRED` | Access token de cliente ausente, inválido o sin sesión activa |
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
| 404 | `PUBLIC_RESERVATION_NOT_FOUND` | Restaurante o sucursal no disponible para reservas |
| 409 | `TABLE_CODE_ALREADY_EXISTS` | Código de mesa duplicado |
| 409 | `MENU_CATEGORY_NAME_ALREADY_EXISTS` | Nombre de categoría duplicado |
| 409 | `DISH_NAME_ALREADY_EXISTS` | Nombre de plato duplicado |
| 409 | `RESERVATION_TIME_UNAVAILABLE` | Horario o mesa no disponible |
| 409 | `DISH_NOT_AVAILABLE` | Plato no disponible en la sucursal |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Clave reutilizada con otra solicitud |
| 409 | `RESERVATION_EXPIRED` | La reserva venció y no admite pagos |
| 409 | `RESERVATION_ALREADY_CONFIRMED` | La reserva ya fue confirmada |
| 409 | `PAYMENT_STATE_CONFLICT` | Conflicto de estado en el pago |
| 503 | `PAYMENT_PROVIDER_UNAVAILABLE` | Proveedor de pagos no disponible |
| 400 | `INVALID_STRIPE_SIGNATURE` | Firma de webhook Stripe inválida |
| 404 | `PUBLIC_PAYMENT_NOT_FOUND` | Reserva no encontrada o token inválido |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sin horarios |
| 422 | `LAST_ADMIN_REQUIRED` | No se puede eliminar al último admin |
| 422 | `INVALID_ROLE_BRANCH` | Rol y sucursal incompatibles |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno |

---

## Checkout y pagos con Stripe

Las reservas temporales incluyen un `checkoutToken` opaco (HMAC-SHA256) que autoriza las operaciones de pago. No se requiere sesión de usuario interno. Tras confirmar el pago, el token sigue siendo válido para checkout/consulta hasta antes de `confirmedAt + 24 horas`; después responde `404 PUBLIC_PAYMENT_NOT_FOUND` y el cliente debe usar customer-auth.

### POST /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/checkout

Crea o reutiliza una Stripe Checkout Session para pagar la reserva.

**Headers:** `Authorization: Bearer <checkoutToken>`

**Body:** vacío.

**Response 201 (nueva sesión):**
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

**Response 200 (sesión reutilizada):** mismo formato.

**Errores:** `404 PUBLIC_PAYMENT_NOT_FOUND`, `409 RESERVATION_EXPIRED`, `409 RESERVATION_ALREADY_CONFIRMED`, `503 PAYMENT_PROVIDER_UNAVAILABLE`.

Una reserva confirmada cuyo `confirmedAt + 24 horas` ya pasó responde `404 PUBLIC_PAYMENT_NOT_FOUND`, sin revelar que existe.

### GET /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/payment

Consulta el estado de la reserva y su último intento de pago.

**Headers:** `Authorization: Bearer <checkoutToken>`

**Response 200:**
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

`payment` es `null` cuando todavía no existe ningún intento. No expone `checkoutUrl` ni identificadores Stripe.

**Errores:** `404 PUBLIC_PAYMENT_NOT_FOUND`.

### POST /webhooks/stripe

Recibe eventos de Stripe. Autenticado por `Stripe-Signature`. Procesa idempotentemente por `event.id`.

**Response 200:** `{ "received": true }`.

**Errores:** `400 INVALID_STRIPE_SIGNATURE`. Los errores recuperables devuelven estado no exitoso para que Stripe reintente.

### Flujo de pago

1. Crear reserva temporal → obtener `checkoutToken`.
2. `POST .../checkout` → obtener `checkoutUrl`.
3. Redirigir al cliente a `checkoutUrl`.
4. Stripe redirige a `successUrl` o `cancelUrl`.
5. El frontend consulta `GET .../payment` para esperar la confirmación.
6. Stripe envía webhook → la reserva pasa a `confirmed`.
7. El backend crea o reutiliza la cuenta de cliente y envía el correo combinado de confirmación y acceso.

Pagos tardíos, duplicados o con importe incorrecto se reembolsan automáticamente. Un fallo SMTP no revierte el pago ni la reserva.

### Verificación manual con Stripe CLI

```sh
# Escuchar webhooks localmente
stripe listen --forward-to localhost:3000/webhooks/stripe

# Reenviar un evento específico
stripe events resend <event-id>

# Tarjetas de prueba: 4242 4242 4242 4242 (éxito), 4000 0000 0000 0002 (rechazo)
```

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
