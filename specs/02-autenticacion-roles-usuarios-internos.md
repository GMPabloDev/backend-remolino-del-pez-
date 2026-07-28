# SPEC 02 — Autenticación, roles y usuarios internos

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-07-27
> **Objective:** Implementar autenticación con sesiones revocables y control de acceso mediante roles fijos para que los usuarios internos administren únicamente el restaurante y las sucursales autorizadas.

## Scope

**In:**

- Incorporar los roles fijos `ADMIN`, `MANAGER` y `BRANCH_ADMIN`.
- Incorporar usuarios internos con nombre completo, email único, teléfono opcional, contraseña, rol, estado y sucursal asignada cuando corresponda.
- Crear mediante `bun run seed` el administrador inicial usando `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- Autenticar usuarios activos mediante email y contraseña.
- Entregar `accessToken`, `refreshToken` y datos del usuario exclusivamente como JSON.
- Usar JWT de acceso con duración predeterminada de 25 minutos.
- Usar refresh tokens opacos y rotativos con duración predeterminada de 30 días.
- Mantener sesiones independientes por inicio de sesión y almacenar únicamente el hash del refresh token.
- Refrescar tokens, cerrar la sesión actual y cambiar la contraseña propia.
- Revocar inmediatamente las sesiones al cerrar sesión, cambiar o restablecer la contraseña, o desactivar al usuario.
- Permitir únicamente a `ADMIN` crear, listar, consultar, editar, activar, desactivar y restablecer contraseñas de usuarios.
- Filtrar usuarios por rol, estado y sucursal, sin paginación.
- Permitir crear administradores adicionales.
- Impedir desactivar o cambiar el rol del último administrador activo.
- Exigir una sucursal válida para `BRANCH_ADMIN`.
- Impedir asignar sucursales a `ADMIN` y `MANAGER`.
- Permitir a todos los roles consultar el restaurante.
- Permitir únicamente a `ADMIN` crear o modificar el restaurante.
- Permitir a `ADMIN` y `MANAGER` gestionar todas las sucursales.
- Limitar a `BRANCH_ADMIN` a consultar y modificar su sucursal asignada.
- Hacer que el listado de sucursales de `BRANCH_ADMIN` devuelva únicamente su sucursal.
- Proteger las rutas mediante validación del JWT, la sesión y el usuario actual.

**Out of scope (for future specs):**

- Roles personalizados y edición dinámica de permisos.
- Recuperación de contraseña por correo.
- Invitaciones o envío automático de credenciales.
- Autenticación multifactor o mediante proveedores externos.
- Transporte de tokens mediante cookies.
- Búsqueda y paginación de usuarios.
- Eliminación física de usuarios.
- Auditoría de accesos y cambios administrativos.
- Gestión de múltiples restaurantes.
- Limpieza programada de sesiones expiradas.

## Data model

### Prisma

```prisma
enum UserRole {
  ADMIN
  MANAGER
  BRANCH_ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

model User {
  id           String        @id @default(uuid()) @db.Uuid
  fullName     String        @db.VarChar(150)
  email        String        @unique @db.VarChar(320)
  phone        String?       @db.VarChar(30)
  passwordHash String        @db.VarChar(255)
  role         UserRole
  status       UserStatus    @default(ACTIVE)
  branchId     String?       @db.Uuid
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  branch       Branch?       @relation(fields: [branchId], references: [id], onDelete: Restrict)
  sessions     UserSession[]

  @@index([role])
  @@index([status])
  @@index([branchId])
}

model UserSession {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @db.Uuid
  refreshTokenHash String    @db.VarChar(64)
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
}

model Branch {
  // Campos existentes de SPEC 01.
  assignedUsers User[]
}
```

### Invariants

- La API expone roles como `admin`, `manager` y `branch_admin`.
- La API expone estados como `active` e `inactive`.
- El email se recorta y normaliza a minúsculas antes de guardarlo.
- La contraseña tiene entre 10 y 128 caracteres e incluye mayúscula, minúscula y número.
- Las contraseñas se procesan con Argon2id mediante `Bun.password`.
- `BRANCH_ADMIN` exige un `branchId` existente.
- `ADMIN` y `MANAGER` deben tener `branchId = null`.
- Debe existir al menos un usuario `ADMIN` activo.
- Reactivar un usuario no restaura sus sesiones anteriores.
- El JWT contiene como mínimo `sub`, `sid`, `iat` y `exp`.
- La autorización utiliza el rol, estado y sucursal actuales de PostgreSQL, no datos de autorización almacenados en el JWT.
- Cada sesión mantiene un único refresh token vigente.
- Rotar un refresh token invalida inmediatamente el anterior.
- Detectar la reutilización de un refresh token anterior revoca la sesión correspondiente.

### Permission matrix

| Operation | `ADMIN` | `MANAGER` | `BRANCH_ADMIN` |
| --- | --- | --- | --- |
| Consultar restaurante | Sí | Sí | Sí |
| Crear o editar restaurante | Sí | No | No |
| Crear sucursales | Sí | Sí | No |
| Listar sucursales | Todas | Todas | Solo la asignada |
| Consultar o modificar sucursal | Todas | Todas | Solo la asignada |
| Modificar reglas, horarios y estado | Todas | Todas | Solo la asignada |
| Gestionar usuarios internos | Sí | No | No |

### Authentication endpoints

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `PATCH /auth/password`

### User administration endpoints

- `POST /users`
- `GET /users`
- `GET /users/:userId`
- `PATCH /users/:userId`
- `PATCH /users/:userId/status`
- `PUT /users/:userId/password`

## Implementation plan

1. Extender `prisma/schema.prisma` con `UserRole`, `UserStatus`, `User`, `UserSession` y la relación con `Branch`; crear la migración y regenerar Prisma Client.
2. Crear `.env.example` con `DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_TTL_MINUTES=25` y `REFRESH_TOKEN_TTL_DAYS=30`.
3. Crear la carga y validación de configuración en `src/shared/config/` y los contratos de contraseña y tokens en `src/shared/security/`.
4. Implementar Argon2id con `Bun.password`, generación segura de refresh tokens, hashing de tokens y emisión/verificación de JWT.
5. Crear `src/modules/users/repositories/user.repository.ts` y su implementación Prisma con operaciones de consulta, creación, actualización y conteo de administradores activos.
6. Crear `prisma/seed.ts` para generar idempotentemente el administrador inicial sin sobrescribir una cuenta existente.
7. Implementar los esquemas y el caso de uso `create-user`, incluyendo email normalizado, contraseña cifrada y validación entre rol y sucursal.
8. Implementar `list-users` y `get-user` con filtros opcionales por rol, estado y sucursal, sin exponer `passwordHash`.
9. Implementar `update-user` y `update-user-status`; proteger al último administrador activo mediante una transacción con aislamiento `Serializable`.
10. Implementar `reset-user-password`; revocar todas las sesiones del usuario en la misma operación.
11. Crear los contratos y la implementación Prisma del repositorio de autenticación para consultar credenciales y administrar sesiones.
12. Implementar `login`; devolver el par de tokens y el perfil público del usuario sin revelar si un email existe o está inactivo.
13. Implementar `refresh-session`; rotar el refresh token, rechazar tokens expirados o revocados y detectar reutilizaciones.
14. Implementar `logout`; revocar inmediatamente la sesión representada por el refresh token.
15. Implementar `change-password`; exigir la contraseña actual y revocar todas las sesiones, incluida la utilizada para realizar el cambio.
16. Crear `src/modules/auth/middleware/` para validar JWT, cargar la sesión y usuario actuales, y exponer el contexto autenticado a los routers.
17. Crear `src/modules/users/router.ts` y `src/modules/auth/router.ts` con validación Zod para cada entrada y autorización exclusiva de `ADMIN` en las rutas de usuarios.
18. Proteger `src/modules/restaurants/router.ts` según la matriz de permisos.
19. Adaptar los casos de uso y rutas de `src/modules/branches/` para aplicar acceso global o restringido por `branchId`, incluyendo el listado limitado de `BRANCH_ADMIN`.
20. Añadir las excepciones de autenticación, autorización, email duplicado, usuario inexistente y protección del último administrador al contrato global de errores.
21. Completar el composition root en `src/index.ts` mediante inyección por constructor y montar los routers `/auth` y `/users`.
22. Actualizar `README.md` y `api-contract.md` con variables de entorno, seed, autenticación, endpoints, permisos, solicitudes, respuestas y errores.
23. Verificar la migración, generación de Prisma Client, seed, compilación y flujo manual completo con `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run seed` y `bunx tsc --noEmit`.

## Acceptance criteria

- [ ] Prisma valida y genera el cliente sin errores.
- [ ] `bun run seed` crea un `ADMIN` activo usando las variables de entorno.
- [ ] Repetir el seed con el mismo email no modifica los datos ni la contraseña existentes.
- [ ] Ningún endpoint devuelve `passwordHash` ni hashes de refresh tokens.
- [ ] Los emails se guardan recortados y en minúsculas.
- [ ] Los emails duplicados retornan `409 USER_EMAIL_ALREADY_EXISTS`.
- [ ] Las contraseñas que incumplen la política son rechazadas.
- [ ] Un `BRANCH_ADMIN` sin sucursal válida es rechazado.
- [ ] Un `ADMIN` o `MANAGER` con sucursal asignada es rechazado.
- [ ] `POST /auth/login` acepta credenciales válidas de un usuario activo.
- [ ] Credenciales incorrectas, emails inexistentes y usuarios inactivos no revelan cuál condición falló.
- [ ] Login y refresh devuelven `accessToken`, `refreshToken` y el perfil público del usuario como JSON.
- [ ] El access token dura 25 minutos por defecto.
- [ ] El refresh token dura 30 días por defecto.
- [ ] Los tiempos pueden configurarse mediante variables de entorno.
- [ ] El refresh token se almacena únicamente como hash.
- [ ] Cada refresh genera un nuevo par de tokens e invalida el refresh token anterior.
- [ ] Reutilizar un refresh token rotado revoca su sesión.
- [ ] Cerrar sesión invalida inmediatamente la sesión actual.
- [ ] Cambiar la contraseña propia exige la contraseña actual.
- [ ] Cambiar o restablecer una contraseña revoca todas las sesiones del usuario.
- [ ] Desactivar un usuario revoca todas sus sesiones.
- [ ] Reactivar un usuario exige iniciar sesión nuevamente.
- [ ] Solo `ADMIN` puede acceder a `/users`.
- [ ] El listado de usuarios admite filtros combinables por rol, estado y sucursal.
- [ ] El listado de usuarios no utiliza paginación.
- [ ] `ADMIN` puede crear otro usuario `ADMIN`.
- [ ] No se puede desactivar ni cambiar el rol del último `ADMIN` activo.
- [ ] Todos los usuarios autenticados pueden consultar el restaurante.
- [ ] Solo `ADMIN` puede crear o modificar el restaurante.
- [ ] `ADMIN` y `MANAGER` pueden gestionar todas las sucursales.
- [ ] `BRANCH_ADMIN` no puede crear sucursales.
- [ ] El listado solicitado por `BRANCH_ADMIN` contiene únicamente su sucursal.
- [ ] `BRANCH_ADMIN` puede modificar datos, reglas, horarios y estado de su sucursal.
- [ ] `BRANCH_ADMIN` recibe `403 FORBIDDEN` al intentar operar sobre otra sucursal.
- [ ] Una sesión revocada, expirada o perteneciente a un usuario inactivo no autoriza peticiones.
- [ ] Las rutas protegidas sin credenciales válidas retornan `401`.
- [ ] Las operaciones sin permisos retornan `403 FORBIDDEN`.
- [ ] Los errores mantienen el contrato global `{ "error": { "code", "message", "details" } }`.
- [ ] `bunx tsc --noEmit` finaliza correctamente.
- [ ] `README.md` y `api-contract.md` reflejan el contrato implementado.

## Decisions

- **Sí:** roles fijos `ADMIN`, `MANAGER` y `BRANCH_ADMIN`.
- **No:** roles personalizados. Requieren otro modelo de permisos.
- **Sí:** `ADMIN` controla usuarios, restaurante y todas las sucursales.
- **Sí:** `MANAGER` administra todas las sucursales sin gestionar usuarios ni modificar el restaurante.
- **Sí:** `BRANCH_ADMIN` administra una única sucursal.
- **Sí:** administradores adicionales creados por otro `ADMIN`.
- **Sí:** conservar siempre al menos un administrador activo.
- **No:** eliminación física de usuarios.
- **Sí:** cuenta inicial mediante un seed explícito e idempotente.
- **No:** creación automática del administrador al iniciar la API.
- **Sí:** credenciales iniciales provenientes de variables de entorno.
- **Sí:** contraseña establecida manualmente por `ADMIN`.
- **No:** cambio obligatorio de contraseña en el primer acceso.
- **Sí:** cambio voluntario con verificación de la contraseña actual.
- **Sí:** Argon2id mediante `Bun.password`.
- **Sí:** JWT de acceso de 25 minutos por defecto.
- **Sí:** refresh token opaco y rotativo de 30 días por defecto.
- **Sí:** ambos tokens se entregan como JSON para clientes Next.js SSR y Flutter.
- **No:** cookies administradas por el backend.
- **Sí:** sesiones persistidas por dispositivo con refresh tokens cifrados mediante hash.
- **Sí:** consultar sesión y usuario en PostgreSQL en cada petición protegida para lograr revocación inmediata.
- **Sí:** revocar todas las sesiones ante cambio o restablecimiento de contraseña.
- **No:** recuperación de contraseña por email en esta fase.
- **Sí:** listado completo de usuarios con filtros.
- **No:** paginación o búsqueda textual en esta fase.

## Risks

| Risk | Mitigation |
| --- | --- |
| Una condición de carrera podría desactivar simultáneamente a los últimos administradores. | Contar y modificar administradores dentro de una transacción `Serializable`. |
| Un refresh token robado podría reutilizarse después de rotarlo. | Asociarlo a una sesión identificable, comparar su hash y revocar la sesión al detectar reutilización. |
| Los tokens podrían filtrarse desde un cliente web. | Entregarlos solo por HTTPS, no registrarlos y documentar que cada cliente debe almacenarlos de forma segura. |
| Consultar la sesión en cada petición añade carga a PostgreSQL. | Usar consultas indexadas por UUID y conservar access tokens cortos. |
| Las sesiones expiradas podrían acumularse. | Excluirlas de toda autorización y dejar la limpieza programada para una spec posterior. |
| Un cambio de rol podría conservar permisos antiguos en un JWT vigente. | Resolver rol, estado y sucursal desde PostgreSQL en cada petición. |
| El seed podría exponer credenciales mediante logs. | Nunca imprimir `ADMIN_PASSWORD` ni incluir credenciales reales en archivos versionados. |

## What is **not** in this spec

- Roles personalizados.
- Recuperación de contraseña por correo.
- Invitaciones automáticas.
- MFA o proveedores externos.
- Cookies de autenticación administradas por el backend.
- Búsqueda o paginación de usuarios.
- Eliminación física de usuarios.
- Auditoría administrativa.
- Limpieza programada de sesiones.
- Soporte multi-restaurante.
