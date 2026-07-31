-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'EXPIRED',
    'REFUND_PENDING',
    'REFUNDED',
    'REFUND_FAILED'
);

-- CreateEnum
CREATE TYPE "PaymentWebhookStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "providerCheckoutSessionId" VARCHAR(255),
    "providerPaymentIntentId" VARCHAR(255),
    "providerRefundId" VARCHAR(255),
    "checkoutUrl" VARCHAR(2048),
    "providerExpiresAt" TIMESTAMPTZ(3),
    "paidAt" TIMESTAMPTZ(3),
    "refundedAt" TIMESTAMPTZ(3),
    "failedAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerEventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "status" "PaymentWebhookStatus" NOT NULL DEFAULT 'PROCESSING',
    "processingAttempts" INTEGER NOT NULL DEFAULT 1,
    "lastErrorCode" VARCHAR(100),
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Reservation"
    ADD COLUMN "checkoutTokenHash" CHAR(64),
    ADD COLUMN "checkoutTokenVersion" UUID,
    ADD COLUMN "confirmedAt" TIMESTAMPTZ(3),
    ADD COLUMN "confirmedPaymentAttemptId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerCheckoutSessionId_key" ON "PaymentAttempt"("providerCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentIntentId_key" ON "PaymentAttempt"("providerPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerRefundId_key" ON "PaymentAttempt"("providerRefundId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_reservationId_createdAt_idx" ON "PaymentAttempt"("reservationId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_status_idx" ON "PaymentAttempt"("provider", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_updatedAt_idx" ON "PaymentAttempt"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_status_updatedAt_idx" ON "PaymentWebhookEvent"("provider", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_checkoutTokenHash_key" ON "Reservation"("checkoutTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_confirmedPaymentAttemptId_key" ON "Reservation"("confirmedPaymentAttemptId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_confirmedPaymentAttemptId_fkey" FOREIGN KEY ("confirmedPaymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
