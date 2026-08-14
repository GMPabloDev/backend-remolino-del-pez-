-- CreateEnum
CREATE TYPE "PaymentReceiptStatus" AS ENUM ('PENDING', 'AVAILABLE', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "reservationId" UUID NOT NULL,
    "paymentAttemptId" UUID NOT NULL,
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "restaurantName" VARCHAR(150) NOT NULL,
    "restaurantLegalName" VARCHAR(200) NOT NULL,
    "restaurantTaxId" VARCHAR(11) NOT NULL,
    "branchName" VARCHAR(150) NOT NULL,
    "branchAddress" VARCHAR(250) NOT NULL,
    "branchDistrict" VARCHAR(100) NOT NULL,
    "branchProvince" VARCHAR(100) NOT NULL,
    "branchDepartment" VARCHAR(100) NOT NULL,
    "customerName" VARCHAR(150) NOT NULL,
    "customerEmail" VARCHAR(320) NOT NULL,
    "customerPhone" VARCHAR(16) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "storagePublicId" VARCHAR(255),
    "storageVersion" VARCHAR(50),
    "storageBytes" INTEGER,
    "generatedAt" TIMESTAMPTZ(3),
    "failedAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_sequence_key" ON "PaymentReceipt"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_reservationId_key" ON "PaymentReceipt"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_paymentAttemptId_key" ON "PaymentReceipt"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_storagePublicId_key" ON "PaymentReceipt"("storagePublicId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_status_updatedAt_idx" ON "PaymentReceipt"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
