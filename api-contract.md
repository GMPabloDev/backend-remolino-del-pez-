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
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Horarios solapados |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sin horarios |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno |

---

### POST /restaurants

Crea el restaurante (singleton, solo puede existir uno).

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

---

### GET /restaurants/:restaurantId

**Response 200:** igual que `POST 201`.

---

### PATCH /restaurants/:restaurantId

**Request:** todos los campos opcionales (mismo formato que POST).

**Response 200:** igual que `POST 201`.

---

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

**Constraint:** `minimumAdvanceMinutes < maximumAdvanceDays * 24 * 60`.

---

### GET /restaurants/:restaurantId/branches

**Query:** `?status=active|inactive` (opcional)

**Response 200:** `Branch[]` (cada una con `rules` e `intervals`).

---

### GET /restaurants/:restaurantId/branches/:branchId

**Response 200:** `Branch` con `rules` e `intervals`.

---

### PATCH /restaurants/:restaurantId/branches/:branchId

**Request:** todos los campos opcionales (mismo formato que POST, `rules` también parcial).

**Response 200:** `Branch` actualizada.

---

### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos atómicamente.

**Request:**
```json
{
  "intervals": [
    {
      "dayOfWeek": "1-7 (1=lunes)",
      "startTime": "HH:mm",
      "endTime": "HH:mm"
    }
  ]
}
```

**Constraints:** `startTime < endTime`, sin solapamientos en un mismo día.

**Response 200:** `Branch` con los nuevos `intervals`.

---

### PATCH /restaurants/:restaurantId/branches/:branchId/status

**Request:**
```json
{ "status": "active" | "inactive" }
```

- `active` requiere al menos un intervalo de horario (422 si no).
- `inactive` siempre se permite.

**Response 200:** `Branch` con el nuevo `status`.
