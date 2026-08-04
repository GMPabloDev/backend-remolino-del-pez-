-- CreateEnum
CREATE TYPE "CustomerMagicLinkSource" AS ENUM ('RESERVATION_CONFIRMATION', 'ACCESS_REQUEST');

-- CreateEnum
CREATE TYPE "CustomerMagicLinkDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "customerId" UUID;

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "replacedBySessionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMagicLink" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "reservationId" UUID,
    "source" "CustomerMagicLinkSource" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "deliveryStatus" "CustomerMagicLinkDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "failedAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_restaurantId_emailVerifiedAt_idx" ON "Customer"("restaurantId", "emailVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_restaurantId_normalizedEmail_key" ON "Customer"("restaurantId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_refreshTokenHash_key" ON "CustomerSession"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_replacedBySessionId_key" ON "CustomerSession"("replacedBySessionId");

-- CreateIndex
CREATE INDEX "CustomerSession_customerId_revokedAt_idx" ON "CustomerSession"("customerId", "revokedAt");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMagicLink_reservationId_key" ON "CustomerMagicLink"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMagicLink_tokenHash_key" ON "CustomerMagicLink"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerMagicLink_customerId_createdAt_idx" ON "CustomerMagicLink"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerMagicLink_deliveryStatus_createdAt_idx" ON "CustomerMagicLink"("deliveryStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerMagicLink_expiresAt_idx" ON "CustomerMagicLink"("expiresAt");

-- CreateIndex
CREATE INDEX "Reservation_customerId_status_startAt_idx" ON "Reservation"("customerId", "status", "startAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "CustomerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMagicLink" ADD CONSTRAINT "CustomerMagicLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMagicLink" ADD CONSTRAINT "CustomerMagicLink_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
