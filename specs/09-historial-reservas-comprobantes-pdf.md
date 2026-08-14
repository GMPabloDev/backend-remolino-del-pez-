# SPEC 09 — Historial de reservas y comprobantes PDF

> **Status:** Aprobado
> **Depends on:** SPEC 08
> **Date:** 2026-08-13
> **Objective:** Permitir que cada cliente autenticado consulte su historial completo de reservas, descargue un comprobante de pago PDF almacenado en Cloudinary y reciba ese mismo PDF adjunto en el correo de confirmación.

## Scope

**In:**

- Crear un comprobante de pago por cada nueva reserva confirmada mediante el webhook Stripe.
- Asignar a cada comprobante una numeración interna única con formato `CP-000001`.
- Congelar en el comprobante los datos del restaurante, sucursal, cliente, moneda y total vigentes al confirmar la reserva.
- Generar un PDF profesional en español a partir de los snapshots de la reserva y del comprobante.
- Incluir en el PDF restaurante, razón social, RUC, sucursal, dirección, cliente, fecha de emisión, fecha y hora de reserva, cantidad de personas, platos, cantidades, precios, subtotales, moneda y total pagado.
- Paginar internamente el contenido del PDF cuando la cantidad de platos no quepa en una sola página.
- Subir el PDF a Cloudinary como recurso `raw` de entrega restringida y conservar únicamente sus metadatos en PostgreSQL.
- Adjuntar el PDF al único correo de confirmación y acceso definido por SPEC 08; no enviar un segundo correo.
- Mantener independientes la subida a Cloudinary y la entrega SMTP después del commit de confirmación.
- Listar todas las reservas confirmadas vinculadas al cliente autenticado, con sus items y estado de comprobante.
- Devolver `200 []` cuando el cliente todavía no tenga reservas vinculadas.
- Permitir que el cliente autenticado solicite una URL de descarga firmada y temporal para un comprobante disponible.
- Verificar en backend que la reserva solicitada pertenece al cliente autenticado.
- Mantener el formato global de errores, estados en minúsculas, importes como cadenas y arquitectura modular existente.
- Actualizar el contrato público, la configuración de entorno y la documentación operativa.

**Out of scope:**

- Integración, envío, validación o consulta ante SUNAT.
- XML UBL, firma digital, CDR, series fiscales, IGV desglosado, notas de crédito o anulaciones tributarias.
- Facturas, selección de tipo de comprobante o captura de DNI/RUC del cliente.
- Mostrar mensajes sobre SUNAT, validez tributaria o modo de desarrollo en el PDF, correo o respuestas HTTP.
- Descargar el comprobante mediante `checkoutToken` desde la pantalla pública posterior al pago.
- Enviar un segundo correo exclusivo para el comprobante.
- Reintentos automáticos, outbox, workers, colas o tareas programadas para PDFs, Cloudinary o SMTP.
- Regeneración, reemplazo o eliminación de un PDF ya disponible.
- Backfill de comprobantes para reservas confirmadas antes de esta spec.
- Paginación HTTP del historial de reservas.
- Cancelación, reprogramación, devolución o edición de reservas.
- Cambios de interfaz en el repositorio frontend.
- Pruebas automatizadas o incorporación de un framework de testing.

## Contracts and data

### Prisma

```prisma
enum PaymentReceiptStatus {
  PENDING
  AVAILABLE
  FAILED
}

model Reservation {
  // Campos y relaciones existentes.
  paymentReceipt PaymentReceipt?
}

model PaymentAttempt {
  // Campos y relaciones existentes.
  paymentReceipt PaymentReceipt?
}

model PaymentReceipt {
  id                       String               @id @default(uuid()) @db.Uuid
  sequence                 Int                  @unique @default(autoincrement())
  reservationId            String               @unique @db.Uuid
  paymentAttemptId         String               @unique @db.Uuid
  status                   PaymentReceiptStatus @default(PENDING)
  restaurantName           String               @db.VarChar(150)
  restaurantLegalName      String               @db.VarChar(200)
  restaurantTaxId          String               @db.VarChar(11)
  branchName               String               @db.VarChar(150)
  branchAddress            String               @db.VarChar(250)
  branchDistrict           String               @db.VarChar(100)
  branchProvince           String               @db.VarChar(100)
  branchDepartment         String               @db.VarChar(100)
  customerName             String               @db.VarChar(150)
  customerEmail            String               @db.VarChar(320)
  customerPhone            String               @db.VarChar(16)
  currency                 String               @db.Char(3)
  total                    Decimal              @db.Decimal(10, 2)
  issuedAt                 DateTime             @db.Timestamptz(3)
  storagePublicId          String?              @unique @db.VarChar(255)
  storageVersion           String?              @db.VarChar(50)
  storageBytes             Int?
  generatedAt              DateTime?            @db.Timestamptz(3)
  failedAt                 DateTime?            @db.Timestamptz(3)
  lastErrorCode            String?              @db.VarChar(100)
  createdAt                DateTime             @default(now())
  updatedAt                DateTime             @updatedAt
  reservation              Reservation          @relation(fields: [reservationId], references: [id], onDelete: Restrict)
  paymentAttempt           PaymentAttempt       @relation(fields: [paymentAttemptId], references: [id], onDelete: Restrict)

  @@index([status, updatedAt])
}
```

- `PaymentReceipt.sequence` es una numeración interna global y se presenta como `CP-` seguido de seis dígitos como mínimo.
- Los saltos producidos por rollbacks o concurrencia son válidos; la secuencia garantiza identidad, no continuidad fiscal.
- Cada reserva y cada intento confirmado tienen como máximo un comprobante.
- El comprobante se crea como `PENDING` dentro de la misma transacción `Serializable` que confirma reserva, pago, cliente y magic link.
- `issuedAt` coincide con el instante de confirmación del pago.
- Los datos del emisor, sucursal, cliente, moneda y total no se vuelven a leer para representar un comprobante ya creado.
- Los items se obtienen de `ReservationItem`, que ya conserva nombre, precio, cantidad y subtotal congelados.
- Una reserva confirmada antes de esta spec puede aparecer en el historial con `receipt: null`.
- Un comprobante `AVAILABLE` es inmutable: no se reemplaza su archivo ni se modifican sus snapshots.
- `storagePublicId`, versión, tamaño y errores son internos y nunca aparecen en DTOs.

### Servicios

`PaymentReceiptPdfService` recibe un DTO sin tipos Prisma y devuelve los bytes del PDF como `Uint8Array`.

`DocumentStorageService` abstrae la subida y la creación de URLs firmadas. Su implementación inicial `CloudinaryDocumentStorageService` cumple estas reglas:

- Usa el SDK oficial `cloudinary`.
- Sube dentro de `payment-receipts/` con un `publicId` determinista basado en `receiptId`.
- Usa `resource_type: "raw"` y entrega `authenticated`.
- No sobrescribe un asset disponible.
- Genera URLs HTTPS firmadas con cinco minutos de vigencia.
- Solicita descarga con nombre `comprobante-CP-000001.pdf` y tipo `application/pdf`.
- No incluye nombre, correo, teléfono, RUC ni datos de reserva en el `publicId` o metadata remota.
- Nunca registra API secret, bytes del PDF o URL firmada completa.

La implementación PDF usa `pdf-lib`, fuentes estándar embebidas y páginas A4. El layout debe conservar márgenes, repetir encabezados de tabla al cambiar de página y evitar texto o filas recortadas.

### Confirmation flow

Después de confirmar transaccionalmente la reserva:

1. El webhook obtiene el contexto del comprobante `PENDING` y genera una sola vez los bytes del PDF.
2. Intenta subir esos bytes a Cloudinary y marca el comprobante `AVAILABLE` o `FAILED` sin revertir pago, reserva, cliente ni magic link.
3. Construye el correo combinado de SPEC 08 y, si los bytes se generaron correctamente, añade el PDF como attachment aunque Cloudinary haya fallado.
4. Envía el único correo automático y conserva `SENT` o `FAILED` en `CustomerMagicLink` conforme al contrato SMTP existente.
5. Marca el evento Stripe como procesado aunque falle PDF, Cloudinary o SMTP después del commit.

- Un replay de un webhook ya procesado no crea otro comprobante, PDF, asset ni correo.
- Un fallo al generar el PDF deja el comprobante `FAILED` y permite enviar el correo de confirmación sin adjunto.
- Un fallo de Cloudinary deja el comprobante `FAILED`, pero no impide adjuntar por SMTP los bytes ya generados.
- Un fallo SMTP no elimina ni invalida un comprobante disponible en Cloudinary.
- `lastErrorCode` guarda únicamente códigos controlados como `PDF_GENERATION_FAILED` o `CLOUDINARY_UPLOAD_FAILED`.

`EmailMessage` incorpora attachments opcionales con `filename`, `content: Uint8Array` y `contentType`. `NodemailerEmailService` los adapta al SDK sin modificar los mensajes que no tengan adjuntos.

### Configuration

Se agregan como variables obligatorias:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- La aplicación falla al iniciar si falta o está vacía alguna variable.
- El usuario configura los valores reales manualmente en `.env`.
- `.env.example` contiene únicamente los nombres y valores ilustrativos no sensibles.
- Las credenciales nunca se devuelven, registran ni incorporan en URLs persistidas.
- La cuenta Cloudinary debe permitir entrega de PDF antes de la verificación manual.

### Customer reservation history

`GET /customer/reservations`

Requiere `Authorization: Bearer <customerAccessToken>` y usa el `customerId` establecido por `customerAuthMiddleware`.

Respuesta `200`:

```json
[
  {
    "id": "uuid",
    "status": "confirmed",
    "branch": {
      "slug": "miraflores",
      "name": "Sucursal Miraflores",
      "address": "Av. Ejemplo 123",
      "district": "Miraflores",
      "province": "Lima",
      "department": "Lima"
    },
    "startAt": "ISO8601",
    "endAt": "ISO8601",
    "timezone": "America/Lima",
    "partySize": 4,
    "items": [
      {
        "dishId": "uuid",
        "name": "Ceviche clásico",
        "unitPrice": "35.90",
        "quantity": 2,
        "subtotal": "71.80"
      }
    ],
    "currency": "PEN",
    "total": "71.80",
    "confirmedAt": "ISO8601",
    "receipt": {
      "number": "CP-000001",
      "status": "available",
      "generatedAt": "ISO8601"
    }
  }
]
```

- Solo devuelve reservas con `customerId` igual al cliente autenticado.
- Ordena por `startAt DESC`, `createdAt DESC` e `id DESC`.
- Incluye reservas futuras y pasadas vinculadas; el frontend decide cómo agruparlas.
- No expone mesa, `paymentAttemptId`, IDs Stripe, magic links, tokens, datos de almacenamiento ni timestamps internos del comprobante.
- `receipt` es `null` para una reserva sin comprobante.
- `generatedAt` es `null` mientras el comprobante esté `pending` o `failed`.

### Receipt download

`GET /customer/reservations/:reservationId/receipt/download`

Requiere `Authorization: Bearer <customerAccessToken>`.

Respuesta `200`:

```json
{
  "fileName": "comprobante-CP-000001.pdf",
  "downloadUrl": "https://res.cloudinary.com/...firma-temporal...",
  "expiresAt": "ISO8601"
}
```

- `reservationId` se valida como UUID mediante Zod y `@hono/standard-validator`.
- El repositorio busca en una sola operación una reserva cuyo `id` y `customerId` coincidan y cuyo comprobante esté disponible.
- La URL se crea bajo demanda, nunca se persiste y vence cinco minutos después.
- La respuesta usa `Cache-Control: no-store`.

Errores nuevos:

| HTTP | Code | Condition |
| --- | --- | --- |
| `404` | `CUSTOMER_RESERVATION_NOT_FOUND` | La reserva no existe, no pertenece al cliente o no tiene comprobante. |
| `409` | `PAYMENT_RECEIPT_NOT_READY` | El comprobante pertenece al cliente, pero continúa `pending` o terminó `failed`. |
| `503` | `DOCUMENT_STORAGE_UNAVAILABLE` | Cloudinary no pudo crear temporalmente la descarga firmada. |

Todos mantienen `{ "error": { "code", "message", "details" } }` y no revelan si una reserva ajena existe.

## Implementation plan

1. Añadir `cloudinary` y `pdf-lib` como dependencias de producción mediante Bun y actualizar `bun.lock`.
2. Extender `src/shared/config/env.ts` y `.env.example` con las tres variables Cloudinary obligatorias, conservando validación temprana con Zod.
3. Extender `prisma/schema.prisma` con `PaymentReceiptStatus`, `PaymentReceipt` y relaciones; crear una migración independiente y regenerar `src/generated/prisma`.
4. Ampliar `PaymentRepository.confirmReservation` y `PrismaPaymentRepository` para crear idempotentemente el comprobante `PENDING`, sus snapshots y su secuencia dentro de la transacción de confirmación, y devolver `receiptId`.
5. Extender el contexto de pago para cargar razón social, RUC, dirección completa, items y zona horaria sin exponerlos en respuestas públicas.
6. Crear `src/modules/payment-receipts/dto/` y `mapper/` para separar el contexto PDF y los DTOs HTTP de los modelos Prisma.
7. Crear `src/modules/payment-receipts/repositories/payment-receipt.repository.ts` y `prisma-payment-receipt.repository.ts` con lecturas por propietario y transiciones acotadas de `PENDING` a `AVAILABLE` o `FAILED`.
8. Crear el contrato `src/modules/payment-receipts/services/payment-receipt-pdf.service.ts` e implementar `pdf-lib-payment-receipt.service.ts` con formato A4, paginación de items, moneda, fechas en la zona horaria del restaurante y numeración interna.
9. Crear `src/shared/storage/document-storage.service.ts` y `cloudinary-document-storage.service.ts` con upload `raw/authenticated`, `publicId` determinista y descargas firmadas de cinco minutos.
10. Ampliar `src/shared/email/email.service.ts` y `nodemailer-email.service.ts` para attachments opcionales sin alterar correos existentes que no los usan.
11. Extender `ReservationConfirmationEmailService` y su plantilla para comunicar que el comprobante está adjunto, manteniendo agradecimiento, resumen y magic link en el mismo correo.
12. Refactorizar el procesamiento posterior al commit en `process-stripe-webhook` para generar una vez el PDF, resolver de forma independiente la subida y el SMTP, persistir ambos resultados y no convertir sus fallos en un nuevo cobro o confirmación.
13. Ampliar `ReservationRepository` y `PrismaReservationRepository` con la consulta completa de reservas por `customerId`, usando `select/include` explícitos y el orden determinista acordado.
14. Crear `list-customer-reservations` bajo `src/modules/reservations/use-cases/` con contrato e implementación y mapear enums a minúsculas y decimales a cadenas de dos posiciones.
15. Crear `get-payment-receipt-download` bajo `src/modules/payment-receipts/use-cases/`; comprobar propiedad y estado antes de solicitar una URL firmada.
16. Crear el schema UUID y excepciones independientes para `CUSTOMER_RESERVATION_NOT_FOUND`, `PAYMENT_RECEIPT_NOT_READY` y `DOCUMENT_STORAGE_UNAVAILABLE`.
17. Crear el router autenticado del historial y descarga dentro de los módulos propietarios, reutilizando `customerAuthMiddleware` y limitando cada handler a validación, caso de uso y respuesta.
18. Instanciar PDF, almacenamiento, repositorio y casos de uso mediante interfaces e inyección por constructor en `src/index.ts`; no añadir una nueva capa arquitectónica.
19. Actualizar `api-contract/00-convenciones.md`, `api-contract/01-publico.md`, `api-contract/README.md` y `README.md` con variables, historial, descarga, attachment, privacidad, estados y fallos parciales.
20. Ejecutar `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y `bunx biome check .`; corregir toda incompatibilidad.
21. Verificar manualmente con Stripe Test Mode una reserva pagada, el PDF multipágina, la subida restringida, el correo único con attachment, el historial vacío y poblado, la descarga autenticada, el aislamiento entre clientes y los fallos independientes de Cloudinary y SMTP.

## Acceptance criteria

- [ ] La migración crea `PaymentReceiptStatus`, `PaymentReceipt`, relaciones, restricciones e índices definidos.
- [ ] Cada nueva reserva confirmada crea exactamente un comprobante `PENDING` dentro de la transacción de confirmación.
- [ ] Un pago tardío, duplicado, inconsistente o reembolsado no crea un comprobante.
- [ ] Un replay del webhook no crea otro comprobante, secuencia, PDF, asset ni correo.
- [ ] Dos confirmaciones concurrentes no pueden crear dos comprobantes para la misma reserva o intento.
- [ ] La numeración visible usa `CP-` y al menos seis dígitos.
- [ ] El comprobante conserva snapshots de emisor, sucursal, cliente, moneda y total aunque esos datos cambien después.
- [ ] El PDF usa los nombres, cantidades, precios y subtotales congelados en `ReservationItem`.
- [ ] El PDF muestra todos los datos y totales definidos sin incluir mesa, UUID, Stripe IDs, tokens ni secretos.
- [ ] Un comprobante con hasta cincuenta platos produce todas las páginas necesarias sin filas ni texto recortados.
- [ ] El PDF, correo y API no muestran mensajes sobre SUNAT, validez tributaria o modo de desarrollo.
- [ ] El PDF no afirma tener CDR, firma digital, serie fiscal ni aceptación de SUNAT.
- [ ] El asset se almacena bajo `payment-receipts/` como `raw` y `authenticated`.
- [ ] El `publicId` remoto no contiene PII ni datos comerciales legibles.
- [ ] Un upload exitoso deja el comprobante `available` con `storagePublicId`, versión, tamaño y `generatedAt`.
- [ ] Un fallo de generación deja el comprobante `failed` con un código controlado y no revierte el pago.
- [ ] Un fallo Cloudinary deja el comprobante `failed` y no revierte reserva, pago, cliente, magic link ni webhook.
- [ ] Si el PDF fue generado, un fallo Cloudinary no impide adjuntarlo al correo.
- [ ] Un fallo SMTP no elimina ni degrada un comprobante disponible en Cloudinary.
- [ ] Se envía un solo correo automático por reserva confirmada.
- [ ] El correo conserva agradecimiento, resumen y magic link definidos en SPEC 08.
- [ ] En el flujo exitoso, ese mismo correo incluye `comprobante-CP-000001.pdf` como attachment `application/pdf`.
- [ ] Los correos manuales de acceso sin reserva continúan enviándose sin attachment.
- [ ] `GET /customer/reservations` exige un access token de cliente válido.
- [ ] Un cliente sin reservas vinculadas recibe `200 []`.
- [ ] El historial contiene todas las reservas futuras y pasadas vinculadas al cliente autenticado.
- [ ] Las reservas se ordenan por `startAt`, `createdAt` e `id` descendentes.
- [ ] Cada reserva incluye sucursal, fechas, zona horaria, personas, items, moneda, total, confirmación y metadata pública del comprobante.
- [ ] Los importes se devuelven como cadenas con dos decimales y los estados en minúsculas.
- [ ] El historial nunca expone reservas de otro cliente, aunque pertenezcan al mismo restaurante o correo similar.
- [ ] El historial no expone mesa, proveedor de pago, IDs Stripe, tokens ni metadata Cloudinary.
- [ ] Una reserva anterior sin comprobante aparece con `receipt: null` y no provoca un error global.
- [ ] La descarga exige autenticación de cliente y valida UUID con Zod y `@hono/standard-validator`.
- [ ] El propietario de un comprobante `available` recibe una URL HTTPS firmada con cinco minutos de vigencia.
- [ ] La respuesta de descarga usa `Cache-Control: no-store` y un nombre de archivo estable.
- [ ] Una reserva inexistente, ajena o sin comprobante devuelve el mismo `404 CUSTOMER_RESERVATION_NOT_FOUND`.
- [ ] Un comprobante propio `pending` o `failed` devuelve `409 PAYMENT_RECEIPT_NOT_READY` sin filtrar errores internos.
- [ ] Una indisponibilidad al firmar la descarga devuelve `503 DOCUMENT_STORAGE_UNAVAILABLE`.
- [ ] La URL firmada no se persiste ni aparece en logs.
- [ ] Las credenciales Cloudinary faltantes o vacías impiden iniciar la aplicación.
- [ ] `.env.example` no contiene credenciales reales.
- [ ] Routers, casos de uso, repositorios y servicios respetan interfaces, inyección por constructor y acceso exclusivo a Prisma desde repositorios.
- [ ] `bun --bun run prisma validate`, `bun --bun run prisma generate`, `bun run typecheck` y Biome finalizan correctamente.
- [ ] `api-contract/` y `README.md` documentan el flujo y la configuración vigente.
- [ ] La verificación manual usa Stripe Test Mode y una cuenta Cloudinary con entrega de PDF habilitada.
- [ ] No se incorporan integración SUNAT, segundo correo, descarga pública por checkout token, reintentos programados, cambios frontend ni pruebas automatizadas.

## Decisions

- **Sí:** ampliar la entrega prevista para SPEC 09 con historial completo y comprobantes; ambas capacidades forman el flujo autenticado posterior al pago.
- **Sí:** descargar desde la cuenta autenticada del cliente, no desde el resultado público de Stripe.
- **Sí:** un único correo combinado con el PDF adjunto, además del resumen y magic link ya existentes.
- **No:** enviar un segundo correo, porque duplicaría notificaciones para una misma confirmación.
- **Sí:** Cloudinary como almacenamiento externo porque la cuenta del proyecto ya permite entrega de PDFs.
- **Sí:** assets `raw/authenticated` y URLs firmadas breves; los comprobantes contienen datos personales.
- **No:** persistir URLs Cloudinary públicas o firmadas.
- **Sí:** `pdf-lib` como generador por ser una dependencia JavaScript compatible con Bun y no requerir navegador o binarios del sistema.
- **Sí:** snapshots explícitos del emisor y cliente para que el comprobante permanezca estable.
- **No:** inventar desglose de IGV o campos fiscales que el modelo actual no posee.
- **Sí:** numeración interna `CP-` separada de cualquier serie tributaria.
- **Sí:** generar y distribuir después del commit; un proveedor externo no participa en la transacción del pago.
- **Sí:** independencia entre generación, Cloudinary y SMTP para conservar el resultado disponible cuando falle otro canal.
- **No:** reintentos automáticos en esta entrega; el estado fallido queda observable y no afecta la reserva.
- **Sí:** devolver todo el historial vinculado sin paginación HTTP en esta fase para mantener simple el flujo de demostración.
- **No:** backfill de comprobantes antiguos; no existe un artefacto histórico que preservar para ellos.

## Risks

- Cloudinary puede rechazar PDFs aunque las credenciales sean válidas si la entrega está deshabilitada en la cuenta; la verificación manual debe confirmar esa opción antes de exponer.
- Una URL firmada reenviada permite acceso mientras siga vigente; la mitigación es usar assets autenticados, cinco minutos de duración y `Cache-Control: no-store`.
- El proceso puede terminar después de subir el asset y antes de guardar su metadata; el `publicId` determinista y la prohibición de overwrite evitan reemplazos silenciosos, pero la conciliación automática queda fuera de alcance.
- Adjuntar PDFs aumenta el tamaño del correo; el layout evita imágenes pesadas y genera únicamente texto y tablas.
- El historial sin paginación crecerá con el uso prolongado; se acepta para el alcance actual y deberá paginarse antes de operar con volúmenes no acotados.
- Una falla parcial puede dejar el PDF solo en correo o solo en Cloudinary; ambos canales mantienen estados independientes y nunca revierten un pago confirmado.
