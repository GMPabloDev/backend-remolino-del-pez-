# SPEC 04 — Catálogo de platos

> **Status:** Implementado
> **Amended by:** SPEC 07
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-07-27
> **Objective:** Implementar un catálogo global de categorías y platos con precio y disponibilidad independientes por sucursal, incluyendo su administración autenticada y consulta pública.

## Scope

**In:**

- Crear categorías globales asociadas al único restaurante del sistema.
- Identificar cada categoría mediante un nombre único por restaurante sin distinguir mayúsculas y minúsculas.
- Ordenar categorías mediante una posición entera positiva.
- Crear cada categoría con estado inicial `inactive`.
- Listar, consultar, editar, activar y desactivar categorías sin eliminarlas físicamente.
- Crear platos globales asociados al restaurante y a una categoría.
- Registrar para cada plato nombre, descripción, URL opcional de imagen, ingredientes, alérgenos y posición dentro de su categoría.
- Identificar cada plato mediante un nombre único por restaurante sin distinguir mayúsculas y minúsculas.
- Crear cada plato con estado inicial `inactive`.
- Listar, consultar, editar, activar y desactivar platos sin eliminarlos físicamente.
- Permitir cambiar la categoría y posición de un plato.
- Representar ingredientes y alérgenos como listas de texto normalizadas.
- Configurar cada plato independientemente por sucursal con precio y estado `available`, `sold_out` o `inactive`.
- Permitir preparar configuraciones aunque la sucursal, categoría o plato estén inactivos.
- Listar para una sucursal todos los platos globales e indicar su configuración local o `null`.
- Permitir a `ADMIN` y `MANAGER` administrar categorías, platos y configuraciones de cualquier sucursal.
- Permitir a `BRANCH_ADMIN` consultar el catálogo global y administrar únicamente precio y estado en su sucursal asignada.
- Exponer un menú público por sucursal sin autenticación.
- Mostrar públicamente platos `available` y `sold_out` con su estado correspondiente.
- Ocultar del menú público categorías, platos y configuraciones inactivas.
- Omitir del menú público las categorías sin platos publicables.
- Conservar el contrato global de errores y la autorización definidos en specs anteriores.

**Out of scope (for future specs):**

- Carga, almacenamiento, transformación o eliminación de archivos de imagen.
- Inventario o control de existencias por ingrediente.
- Cantidades, unidades, costos o relaciones administrables para ingredientes y alérgenos.
- Variantes, tamaños, extras, complementos o modificadores de platos.
- Precios promocionales, descuentos, impuestos o historial de precios.
- Información nutricional.
- Eliminación física u operaciones masivas de categorías y platos.
- Búsqueda, paginación y filtrado público avanzado.
- Selección de platos dentro de una reserva.
- Congelación del precio en una reserva o pedido.
- Disponibilidad por fecha, horario o cantidad.
- Pedidos, pagos y entrega a domicilio.

## Data model

### Prisma

```prisma
enum MenuCategoryStatus {
  ACTIVE
  INACTIVE
}

enum DishStatus {
  ACTIVE
  INACTIVE
}

enum BranchDishStatus {
  AVAILABLE
  SOLD_OUT
  INACTIVE
}

model Restaurant {
  // Campos y relaciones existentes de specs anteriores.
  menuCategories MenuCategory[]
  dishes         Dish[]
}

model Branch {
  // Campos y relaciones existentes de specs anteriores.
  dishes BranchDish[]
}

model MenuCategory {
  id             String             @id @default(uuid()) @db.Uuid
  restaurantId   String             @db.Uuid
  name           String             @db.VarChar(80)
  normalizedName String             @db.VarChar(80)
  position       Int
  status         MenuCategoryStatus @default(INACTIVE)
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  restaurant     Restaurant         @relation(fields: [restaurantId], references: [id], onDelete: Restrict)
  dishes         Dish[]

  @@unique([restaurantId, normalizedName])
  @@index([restaurantId, status, position])
}

model Dish {
  id             String         @id @default(uuid()) @db.Uuid
  restaurantId   String         @db.Uuid
  categoryId     String         @db.Uuid
  name           String         @db.VarChar(120)
  normalizedName String         @db.VarChar(120)
  description    String         @db.VarChar(1000)
  imageUrl       String?        @db.VarChar(2048)
  ingredients    String[]       @default([])
  allergens      String[]       @default([])
  position       Int
  status         DishStatus     @default(INACTIVE)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  restaurant     Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Restrict)
  category       MenuCategory   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  branches       BranchDish[]

  @@unique([restaurantId, normalizedName])
  @@index([restaurantId, status])
  @@index([categoryId, position])
}

model BranchDish {
  id        String           @id @default(uuid()) @db.Uuid
  branchId  String           @db.Uuid
  dishId    String           @db.Uuid
  price     Decimal          @db.Decimal(10, 2)
  status    BranchDishStatus
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  branch    Branch           @relation(fields: [branchId], references: [id], onDelete: Restrict)
  dish      Dish             @relation(fields: [dishId], references: [id], onDelete: Restrict)

  @@unique([branchId, dishId])
  @@index([branchId, status])
  @@index([dishId])
}
```

### Conventions and invariants

- `MenuCategory` y `Dish` pertenecen al restaurante y se reutilizan en todas sus sucursales.
- `BranchDish` representa la configuración comercial de un plato en una sucursal concreta.
- La categoría asignada a un plato debe pertenecer al mismo restaurante.
- La sucursal y el plato de `BranchDish` deben pertenecer al mismo restaurante.
- Los nombres se recortan antes de persistirse.
- `normalizedName` contiene el nombre recortado y convertido a minúsculas para aplicar unicidad sin distinguir mayúsculas.
- El nombre de categoría contiene entre 1 y 80 caracteres.
- El nombre del plato contiene entre 1 y 120 caracteres.
- La descripción contiene entre 1 y 1000 caracteres.
- `position` es un entero positivo tanto para categorías como para platos.
- Las posiciones pueden repetirse.
- Categorías y platos se ordenan primero por `position` ascendente y luego por `name` ascendente.
- `imageUrl` acepta `null` o una URL absoluta `http` o `https` de hasta 2048 caracteres.
- Un plato contiene como máximo 50 ingredientes y 30 alérgenos.
- Cada ingrediente o alérgeno contiene entre 1 y 100 caracteres después del recorte.
- Ingredientes y alérgenos se recortan, eliminan entradas vacías y deduplican sin distinguir mayúsculas, conservando la primera escritura.
- Actualizar ingredientes o alérgenos reemplaza la lista completa correspondiente.
- Enviar `imageUrl: null` elimina la referencia actual sin intentar borrar ningún archivo externo.
- Categorías y platos nuevos siempre se persisten como `INACTIVE`.
- La API recibe y devuelve los estados globales como `active` e `inactive`.
- La API recibe y devuelve los estados por sucursal como `available`, `sold_out` e `inactive`.
- El precio debe ser mayor que `0.00`, admitir como máximo dos decimales y no superar `99999999.99`.
- La API recibe y devuelve el precio como una cadena decimal con exactamente dos posiciones, por ejemplo `"35.90"`.
- El `PUT` de configuración por sucursal exige `price` y `status`, y realiza una creación o reemplazo idempotente.
- Desactivar una categoría o plato no modifica ninguna configuración `BranchDish`.
- Reactivar una categoría o plato recupera las configuraciones por sucursal conservadas.
- Configurar un plato no activa automáticamente la categoría, el plato ni la sucursal.
- No se elimina físicamente ningún registro de categoría, plato o configuración por sucursal.

### Administrative endpoints

#### Categories

- `POST /restaurants/:restaurantId/menu/categories`
- `GET /restaurants/:restaurantId/menu/categories`
- `GET /restaurants/:restaurantId/menu/categories/:categoryId`
- `PATCH /restaurants/:restaurantId/menu/categories/:categoryId`
- `PATCH /restaurants/:restaurantId/menu/categories/:categoryId/status`

#### Dishes

- `POST /restaurants/:restaurantId/menu/dishes`
- `GET /restaurants/:restaurantId/menu/dishes`
- `GET /restaurants/:restaurantId/menu/dishes/:dishId`
- `PATCH /restaurants/:restaurantId/menu/dishes/:dishId`
- `PATCH /restaurants/:restaurantId/menu/dishes/:dishId/status`

#### Branch configuration

- `GET /restaurants/:restaurantId/branches/:branchId/dishes`
- `PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId`

Los listados administrativos no usan paginación. El listado por sucursal devuelve todos los platos globales y añade `branchConfiguration: null` cuando todavía no existe una configuración local.

### Public endpoint

- `GET /public/restaurants/:restaurantId/branches/:branchId/menu`

El endpoint no exige autenticación. Devuelve `404 PUBLIC_MENU_NOT_FOUND` cuando el restaurante o la sucursal no existen, no están relacionados o la sucursal está inactiva.

Una sucursal activa sin platos publicables devuelve `200`:

```json
{
  "restaurantId": "uuid",
  "branchId": "uuid",
  "categories": []
}
```

Cuando existen platos publicables, la respuesta los agrupa por categoría:

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

Solo aparecen categorías `active`, platos `active` y configuraciones `available` o `sold_out`. Las configuraciones `inactive`, los platos no configurados y las categorías vacías se omiten.

### Permission matrix

| Operation | `ADMIN` | `MANAGER` | `BRANCH_ADMIN` | Public |
| --- | --- | --- | --- | --- |
| Listar y consultar categorías y platos globales | Sí | Sí | Sí | No |
| Crear, editar o cambiar estado de categorías | Sí | Sí | No | No |
| Crear, editar o cambiar estado de platos | Sí | Sí | No | No |
| Listar configuración de cualquier sucursal | Sí | Sí | No | No |
| Configurar precio y estado en cualquier sucursal | Sí | Sí | No | No |
| Listar y configurar platos en la sucursal asignada | Sí | Sí | Sí | No |
| Consultar menú publicable de una sucursal activa | Sí | Sí | Sí | Sí |

## Implementation plan

1. Extender `prisma/schema.prisma` con los tres enums, `MenuCategory`, `Dish`, `BranchDish` y sus relaciones; crear la migración, validar el esquema y regenerar Prisma Client.
2. Crear bajo `src/modules/menu/repositories/` los contratos de categorías, platos y configuraciones por sucursal, sin exponer Prisma fuera de sus implementaciones.
3. Implementar los repositorios Prisma con consultas por restaurante, categoría, sucursal, nombre normalizado y estado; mapear las restricciones únicas incluso ante solicitudes concurrentes.
4. Crear bajo `src/modules/menu/dto/` y `src/modules/menu/mapper/` las representaciones administrativas y públicas; convertir enums a minúsculas y valores `Decimal` a cadenas con dos decimales.
5. Crear los esquemas Zod de categorías bajo `src/modules/menu/schemas/`; validar nombre, posición y estado mediante `@hono/standard-validator`.
6. Crear `MENU_CATEGORY_NOT_FOUND` y `MENU_CATEGORY_NAME_ALREADY_EXISTS` como excepciones independientes bajo `src/modules/menu/exceptions/`.
7. Implementar los casos de uso `create-category`, `list-categories` y `get-category` en carpetas independientes; aplicar pertenencia al restaurante, normalización, orden determinista y estado inicial `INACTIVE`.
8. Implementar `update-category` y `update-category-status`; permitir posiciones repetidas y conservar platos y configuraciones al desactivar.
9. Incorporar las cinco rutas de categorías al router administrativo de `src/modules/menu/`; permitir lectura a todos los roles y escritura únicamente a `ADMIN` y `MANAGER`.
10. Crear los esquemas Zod de platos; validar categoría, textos, URL opcional, límites de listas, posición y estado.
11. Crear `DISH_NOT_FOUND` y `DISH_NAME_ALREADY_EXISTS` como excepciones independientes bajo `src/modules/menu/exceptions/`.
12. Implementar la normalización reutilizable de ingredientes y alérgenos, incluyendo recorte, eliminación de vacíos y deduplicación estable sin distinguir mayúsculas.
13. Implementar `create-dish`, `list-dishes` y `get-dish`; validar que la categoría pertenezca al restaurante y crear siempre con estado `INACTIVE`.
14. Implementar `update-dish` y `update-dish-status`; permitir reemplazar listas, limpiar `imageUrl` con `null` y cambiar categoría o posición sin alterar configuraciones locales.
15. Incorporar las cinco rutas de platos al router administrativo; permitir lectura a todos los roles y escritura únicamente a `ADMIN` y `MANAGER`.
16. Crear los esquemas y DTO de configuración por sucursal; validar precio como cadena decimal y los estados `available`, `sold_out` e `inactive`.
17. Implementar `list-branch-dishes`; comprobar la pertenencia entre restaurante y sucursal y combinar todos los platos globales con su configuración local o `null`.
18. Implementar `upsert-branch-dish`; comprobar que restaurante, sucursal y plato estén relacionados y persistir precio y estado mediante una operación idempotente.
19. Crear el router administrativo de configuración por sucursal; autorizar a `ADMIN` y `MANAGER` globalmente y limitar a `BRANCH_ADMIN` a su sucursal asignada.
20. Crear `PUBLIC_MENU_NOT_FOUND` y el caso de uso `get-public-menu`; exigir una sucursal activa y consultar en una sola operación únicamente categorías, platos y configuraciones publicables.
21. Crear el router público sin middleware de autenticación; agrupar y ordenar la respuesta y devolver `categories: []` cuando una sucursal activa no tenga platos publicables.
22. Instanciar los repositorios y casos de uso mediante inyección por constructor en `src/index.ts`; montar los routers administrativos y público sin añadir nuevas capas arquitectónicas.
23. Ejecutar `bun --bun run prisma validate`, `bun --bun run prisma generate` y `bunx tsc --noEmit` después de integrar los routers; corregir cualquier incompatibilidad antes de documentar el contrato.
24. Actualizar `README.md` y `api-contract.md` con modelos, permisos, entradas, respuestas, orden, estados, errores y ejemplos del menú público.

Cada caso de uso tendrá su propia carpeta con contrato e implementación. Cada excepción permanecerá en un archivo independiente. No se incorporará un framework de pruebas en esta spec.

## Acceptance criteria

- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate` y `bunx tsc --noEmit` finalizan correctamente.
- [ ] La migración crea `MenuCategory`, `Dish` y `BranchDish` con UUID, relaciones, restricciones e índices definidos.
- [ ] Todas las rutas administrativas exigen una sesión válida.
- [ ] Una petición administrativa sin sesión válida retorna `401 UNAUTHORIZED`.
- [ ] `POST /restaurants/:restaurantId/menu/categories` crea una categoría con estado `inactive`.
- [ ] El nombre de categoría acepta entre 1 y 80 caracteres después del recorte.
- [ ] Dos categorías del mismo restaurante no pueden compartir un nombre ignorando mayúsculas y minúsculas.
- [ ] Un nombre de categoría duplicado retorna `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`, incluso ante solicitudes concurrentes.
- [ ] La posición de una categoría debe ser un entero positivo y puede repetirse.
- [ ] El listado administrativo de categorías no usa paginación y ordena por posición y nombre.
- [ ] Consultar una categoría inexistente o ajena al restaurante retorna `404 MENU_CATEGORY_NOT_FOUND`.
- [ ] Editar una categoría permite modificar únicamente su nombre y posición.
- [ ] Cambiar el estado de una categoría acepta exclusivamente `active` o `inactive`.
- [ ] Desactivar una categoría conserva sus platos y configuraciones por sucursal.
- [ ] `POST /restaurants/:restaurantId/menu/dishes` crea un plato con estado `inactive`.
- [ ] Crear un plato exige nombre, descripción, categoría y posición.
- [ ] La imagen es opcional y solo acepta `null` o una URL absoluta `http/https` de hasta 2048 caracteres.
- [ ] Enviar `imageUrl: null` retira la URL sin ejecutar operaciones sobre almacenamiento externo.
- [ ] El nombre del plato acepta entre 1 y 120 caracteres y la descripción entre 1 y 1000.
- [ ] Dos platos del mismo restaurante no pueden compartir un nombre ignorando mayúsculas y minúsculas.
- [ ] Un nombre de plato duplicado retorna `409 DISH_NAME_ALREADY_EXISTS`, incluso ante solicitudes concurrentes.
- [ ] Crear o mover un plato a una categoría inexistente o ajena retorna `404 MENU_CATEGORY_NOT_FOUND`.
- [ ] La posición de un plato debe ser un entero positivo y puede repetirse.
- [ ] Los platos se ordenan por posición y nombre dentro de cada categoría.
- [ ] Un plato admite como máximo 50 ingredientes y 30 alérgenos.
- [ ] Cada ingrediente y alérgeno contiene entre 1 y 100 caracteres normalizados.
- [ ] Ingredientes y alérgenos eliminan textos vacíos y duplicados sin distinguir mayúsculas, conservando la primera escritura.
- [ ] Actualizar ingredientes o alérgenos reemplaza completamente la lista correspondiente.
- [ ] Consultar un plato inexistente o ajeno al restaurante retorna `404 DISH_NOT_FOUND`.
- [ ] Editar un plato permite modificar nombre, descripción, imagen, ingredientes, alérgenos, categoría y posición.
- [ ] Cambiar el estado de un plato acepta exclusivamente `active` o `inactive`.
- [ ] Desactivar un plato conserva todas sus configuraciones por sucursal.
- [ ] No existe ningún endpoint para eliminar físicamente categorías o platos.
- [ ] `GET /restaurants/:restaurantId/branches/:branchId/dishes` devuelve todos los platos globales sin paginación.
- [ ] El listado por sucursal devuelve `branchConfiguration: null` para un plato todavía no configurado.
- [ ] `PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId` exige precio y estado.
- [ ] El precio se recibe y devuelve como cadena decimal con exactamente dos posiciones.
- [ ] El precio rechaza cero, valores negativos, más de dos decimales y valores superiores a `99999999.99`.
- [ ] El estado local acepta exclusivamente `available`, `sold_out` o `inactive`.
- [ ] Repetir el mismo `PUT` no crea configuraciones duplicadas.
- [ ] Configurar un plato mientras la sucursal, categoría o plato están inactivos está permitido.
- [ ] Configurar un plato no cambia automáticamente el estado de ninguna otra entidad.
- [ ] Una sucursal inexistente o ajena al restaurante retorna `404 BRANCH_NOT_FOUND` en rutas administrativas.
- [ ] `ADMIN` y `MANAGER` pueden crear, editar, activar y desactivar categorías y platos.
- [ ] `ADMIN` y `MANAGER` pueden listar y configurar platos de cualquier sucursal.
- [ ] `BRANCH_ADMIN` puede listar y consultar categorías y platos globales.
- [ ] `BRANCH_ADMIN` no puede crear, editar ni cambiar el estado de categorías o platos globales.
- [ ] `BRANCH_ADMIN` puede listar y configurar precio y estado únicamente en su sucursal asignada.
- [ ] `BRANCH_ADMIN` recibe `403 FORBIDDEN` al intentar operar sobre la configuración de otra sucursal.
- [ ] `GET /public/restaurants/:restaurantId/branches/:branchId/menu` no exige autenticación.
- [ ] Un restaurante o sucursal inexistente, una relación incorrecta o una sucursal inactiva retornan `404 PUBLIC_MENU_NOT_FOUND` en la ruta pública.
- [ ] Una sucursal activa sin platos publicables retorna `200` con `categories: []`.
- [ ] El menú público incluye platos locales `available` y `sold_out` y conserva ese estado en cada respuesta.
- [ ] El menú público excluye categorías inactivas, platos inactivos, configuraciones inactivas y platos sin configuración local.
- [ ] El menú público omite categorías que quedan sin platos publicables.
- [ ] El menú público agrupa platos por categoría y ordena categorías y platos por posición y nombre.
- [ ] El menú público devuelve el precio como cadena decimal de dos posiciones.
- [ ] Ninguna respuesta expone `normalizedName` ni valores internos de enums en mayúsculas.
- [ ] Todos los errores mantienen `{ "error": { "code", "message", "details" } }`.
- [ ] No se implementan carga de imágenes, inventario, modificadores, reservas, pedidos ni pagos.
- [ ] `README.md` y `api-contract.md` documentan el contrato administrativo y público implementado.

## Decisions

- **Sí:** catálogo global por restaurante. Evita duplicar categorías y platos entre sucursales.
- **Sí:** precio y disponibilidad independientes por sucursal mediante `BranchDish`.
- **No:** almacenar precio en `Dish`. Una misma preparación puede venderse a precios distintos según la sucursal.
- **Sí:** categorías administrables con nombre, posición y estado.
- **Sí:** posición propia para cada plato dentro de su categoría.
- **Sí:** permitir posiciones repetidas y desempatar por nombre. Evita incorporar un flujo adicional de reordenamiento atómico.
- **Sí:** nombres únicos por restaurante sin distinguir mayúsculas y minúsculas.
- **Sí:** categorías y platos nuevos empiezan como `inactive`. Reduce publicaciones accidentales.
- **Sí:** configuración local con estados `available`, `sold_out` e `inactive`.
- **Sí:** mostrar públicamente platos agotados. El cliente puede conocer el catálogo completo de la sucursal.
- **No:** mostrar configuraciones inactivas o platos todavía no configurados.
- **Sí:** conservar configuraciones locales al desactivar y reactivar categorías o platos.
- **Sí:** permitir preparar configuraciones mientras otras entidades estén inactivas.
- **No:** activar automáticamente categorías, platos o sucursales al crear una configuración.
- **Sí:** precio como cadena decimal en la API y `Decimal(10,2)` en PostgreSQL. Evita errores de punto flotante.
- **Sí:** ingredientes y alérgenos como listas de texto normalizadas.
- **No:** convertir ingredientes o alérgenos en catálogos relacionales. No existe alcance de inventario ni consultas especializadas todavía.
- **Sí:** una única URL opcional de imagen por plato.
- **No:** carga o gestión de archivos. El cliente administrativo proporciona la URL.
- **Sí:** `ADMIN` y `MANAGER` administran el catálogo global y cualquier sucursal.
- **Sí:** `BRANCH_ADMIN` puede leer el catálogo global, pero solo cambia precio y estado en su sucursal.
- **Sí:** `PUT` idempotente para crear o reemplazar la configuración de un plato por sucursal.
- **Sí:** ruta pública anidada por restaurante y sucursal usando UUID existentes.
- **Sí:** responder `PUBLIC_MENU_NOT_FOUND` si la sucursal no existe, no pertenece al restaurante o está inactiva.
- **Sí:** una sucursal activa sin platos publicables responde `200` con una lista vacía.
- **No:** eliminación física. Los estados preservan referencias para futuras reservas.
- **No:** pruebas automatizadas en esta spec porque el proyecto no dispone de un framework de pruebas.

## Risks

| Risk | Mitigation |
| --- | --- |
| Dos solicitudes concurrentes podrían crear nombres equivalentes con distinta capitalización. | Persistir `normalizedName`, aplicar restricciones únicas compuestas y mapear sus violaciones a errores de dominio. |
| Una configuración podría vincular una sucursal y un plato de restaurantes diferentes. | Validar ambas pertenencias en el caso de uso antes del `upsert` y mantener repositorios limitados por `restaurantId`. |
| `Decimal` podría serializarse con formatos inconsistentes. | Centralizar el mapper monetario y devolver siempre cadenas con exactamente dos decimales. |
| Un mapper defectuoso podría publicar categorías, platos o sucursales inactivas. | Ejecutar una consulta pública con todos los estados requeridos como filtros y volver a verificar las condiciones en el caso de uso. |
| Cambiar nombres, categorías o precios podría alterar la interpretación de reservas futuras. | La futura spec de reservas deberá guardar referencias y congelar nombre y precio cuando corresponda. |
| Las listas de texto dificultan búsquedas avanzadas de alérgenos. | Mantenerlas normalizadas y migrarlas a entidades únicamente si aparece un requisito de filtrado especializado. |
| Una URL externa podría dejar de responder o apuntar a contenido inseguro. | Aceptar solo `http/https`, no descargar contenido desde el backend y dejar la gestión de imágenes para otra spec. |
| El catálogo público podría crecer y producir respuestas grandes. | Mantener la consulta indexada y dejar paginación o caché para una spec posterior basada en métricas reales. |

## What is **not** in this spec

- Carga, almacenamiento o eliminación de imágenes.
- Inventario y control de stock de ingredientes.
- Catálogos relacionales de ingredientes o alérgenos.
- Variantes, tamaños, extras y modificadores.
- Promociones, descuentos, impuestos e historial de precios.
- Información nutricional.
- Eliminación física y operaciones masivas.
- Búsqueda, paginación y filtros públicos avanzados.
- Selección de platos en reservas.
- Congelación de precios en reservas o pedidos.
- Disponibilidad por fecha, horario o cantidad.
- Pedidos, pagos y entrega a domicilio.

Estas capacidades se definirán en specs posteriores cuando exista un alcance concreto.
