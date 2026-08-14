-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('BOLETA', 'FACTURA');

-- Add billing data to reservations
ALTER TABLE "Reservation"
ADD COLUMN "receiptType" "ReceiptType" NOT NULL DEFAULT 'BOLETA',
ADD COLUMN "documentNumber" VARCHAR(20),
ADD COLUMN "invoiceRuc" VARCHAR(11),
ADD COLUMN "invoiceBusinessName" VARCHAR(200),
ADD COLUMN "invoiceAddress" VARCHAR(250);

-- Keep a snapshot of the selected document in the generated receipt
ALTER TABLE "PaymentReceipt"
ADD COLUMN "receiptType" "ReceiptType" NOT NULL DEFAULT 'BOLETA',
ADD COLUMN "documentNumber" VARCHAR(20),
ADD COLUMN "invoiceRuc" VARCHAR(11),
ADD COLUMN "invoiceBusinessName" VARCHAR(200),
ADD COLUMN "invoiceAddress" VARCHAR(250);
