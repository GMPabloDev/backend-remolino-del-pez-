import { Prisma, ReservationStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	ConfirmPaymentResult,
	CreatePaymentAttemptData,
	PaymentRepository,
	PaymentReservationContext,
	UpdateAttemptStatusData,
} from "./payment.repository";

const RESERVATION_INCLUDE = {
	items: true,
} as const;

const SERIALIZABLE_RETRY_LIMIT = 3;

export class PrismaPaymentRepository implements PaymentRepository {
	// --- Contexto de autorización ---

	async findReservationById(
		reservationId: string,
	): Promise<PaymentReservationContext | null> {
		if (!isValidUuid(reservationId)) return null;

		return prisma.reservation.findUnique({
			where: { id: reservationId },
			include: RESERVATION_INCLUDE,
		});
	}

	async findReservationForPayment(
		reservationId: string,
		branchId: string,
		restaurantId: string,
	): Promise<PaymentReservationContext | null> {
		if (
			!isValidUuid(reservationId) ||
			!isValidUuid(branchId) ||
			!isValidUuid(restaurantId)
		) {
			return null;
		}

		const reservation = await prisma.reservation.findFirst({
			where: {
				id: reservationId,
				branchId,
				branch: { restaurantId },
			},
			include: RESERVATION_INCLUDE,
		});

		return reservation ?? null;
	}

	// --- Intentos de pago ---

	async findLatestAttemptByReservation(reservationId: string) {
		if (!isValidUuid(reservationId)) return null;

		return prisma.paymentAttempt.findFirst({
			where: { reservationId },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});
	}

	async findAttemptById(attemptId: string) {
		if (!isValidUuid(attemptId)) return null;

		return prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
	}

	async findAttemptByProviderSessionId(sessionId: string) {
		if (!sessionId) return null;

		return prisma.paymentAttempt.findUnique({
			where: { providerCheckoutSessionId: sessionId },
		});
	}

	async findAttemptByProviderPaymentIntentId(paymentIntentId: string) {
		if (!paymentIntentId) return null;

		return prisma.paymentAttempt.findUnique({
			where: { providerPaymentIntentId: paymentIntentId },
		});
	}

	async findPendingAttemptByReservation(reservationId: string, now: Date) {
		if (!isValidUuid(reservationId)) return null;

		return prisma.paymentAttempt.findFirst({
			where: {
				reservationId,
				status: "PENDING",
				OR: [{ providerExpiresAt: { gt: now } }, { providerExpiresAt: null }],
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});
	}

	async createAttempt(data: CreatePaymentAttemptData) {
		return prisma.paymentAttempt.create({ data });
	}

	async setAttemptSessionData(
		attemptId: string,
		data: {
			providerCheckoutSessionId: string;
			checkoutUrl: string;
			providerExpiresAt: Date;
		},
	) {
		return prisma.paymentAttempt.update({
			where: { id: attemptId },
			data: {
				providerCheckoutSessionId: data.providerCheckoutSessionId,
				checkoutUrl: data.checkoutUrl,
				providerExpiresAt: data.providerExpiresAt,
			},
		});
	}

	async updateAttemptStatus(attemptId: string, data: UpdateAttemptStatusData) {
		return prisma.paymentAttempt.update({
			where: { id: attemptId },
			data: {
				status: data.status,
				providerPaymentIntentId: data.providerPaymentIntentId,
				providerRefundId: data.providerRefundId,
				paidAt: data.paidAt,
				refundedAt: data.refundedAt,
				failedAt: data.failedAt,
				lastErrorCode: data.lastErrorCode,
			},
		});
	}

	// --- Confirmación transaccional ---

	async confirmReservation(
		reservationId: string,
		attemptId: string,
		providerPaymentIntentId: string,
		paidAt: Date,
	): Promise<ConfirmPaymentResult | null> {
		for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
			try {
				return await prisma.$transaction(
					async (tx) => {
						const reservation = await tx.reservation.findUnique({
							where: { id: reservationId },
						});

						// Solo confirma si está PENDING_PAYMENT, no vencida y no tiene otro intento confirmado
						if (
							!reservation ||
							reservation.status !== ReservationStatus.PENDING_PAYMENT ||
							reservation.expiresAt <= paidAt ||
							reservation.confirmedPaymentAttemptId !== null
						) {
							return null;
						}

						const attempt = await tx.paymentAttempt.findUnique({
							where: { id: attemptId },
						});

						if (attempt?.status !== "PENDING") return null;

						await tx.reservation.update({
							where: { id: reservationId },
							data: {
								status: ReservationStatus.CONFIRMED,
								confirmedAt: paidAt,
								confirmedPaymentAttemptId: attemptId,
							},
						});

						await tx.paymentAttempt.update({
							where: { id: attemptId },
							data: {
								status: "PAID",
								providerPaymentIntentId,
								paidAt,
							},
						});

						return { reservationId, attemptId };
					},
					{
						isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
						maxWait: 5_000,
						timeout: 10_000,
					},
				);
			} catch (error) {
				if (!isSerializationConflict(error)) throw error;
				if (attempt === SERIALIZABLE_RETRY_LIMIT) throw error;
			}
		}

		throw new Error("No se pudo completar la confirmación de la reserva");
	}

	// --- Eventos webhook ---

	async findWebhookEvent(providerEventId: string) {
		return prisma.paymentWebhookEvent.findUnique({
			where: { providerEventId },
		});
	}

	async createWebhookEvent(data: {
		provider: "STRIPE";
		providerEventId: string;
		eventType: string;
	}) {
		return prisma.paymentWebhookEvent.create({ data });
	}

	async updateWebhookEvent(
		id: string,
		data: {
			status: "PROCESSING" | "PROCESSED" | "FAILED";
			lastErrorCode?: string | null;
		},
	) {
		return prisma.paymentWebhookEvent.update({
			where: { id },
			data: {
				status: data.status,
				lastErrorCode: data.lastErrorCode,
				processingAttempts:
					data.status === "FAILED" ? { increment: 1 } : undefined,
				processedAt: data.status === "PROCESSED" ? new Date() : undefined,
			},
		});
	}
}

// --- Helpers ---

function isSerializationConflict(error: unknown): boolean {
	return (
		(error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2034") ||
		hasAdapterCode(error, "40001")
	);
}

function hasAdapterCode(error: unknown, code: string): boolean {
	if (!isRecord(error) || !isRecord(error.cause)) return false;
	return error.cause.originalCode === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
