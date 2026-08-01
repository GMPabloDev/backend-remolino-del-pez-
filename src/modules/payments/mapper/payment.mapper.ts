import type {
	PaymentAttempt,
	PaymentAttemptStatus,
	ReservationStatus,
} from "../../../generated/prisma/client";
import type {
	CheckoutAttemptStatus,
	CheckoutDto,
	PaymentAttemptSummaryDto,
	PaymentStatusDto,
	ReservationPaymentStatus,
} from "../dto/payment.dto";
import type { PaymentReservationContext } from "../repositories/payment.repository";

/** Convierte el enum Prisma de intento de pago a minúsculas. */
export function toPaymentAttemptStatusDto(
	status: PaymentAttemptStatus,
): CheckoutAttemptStatus {
	const map: Record<PaymentAttemptStatus, CheckoutAttemptStatus> = {
		PENDING: "pending",
		PAID: "paid",
		FAILED: "failed",
		EXPIRED: "expired",
		REFUND_PENDING: "refund_pending",
		REFUNDED: "refunded",
		REFUND_FAILED: "refund_failed",
	};
	return map[status] ?? "pending";
}

/** Convierte el enum Prisma de estado de reserva a minúsculas. */
export function toReservationPaymentStatusDto(
	status: ReservationStatus,
): ReservationPaymentStatus {
	return status === "CONFIRMED" ? "confirmed" : "pending_payment";
}

// --- Checkout DTO ---

export function toCheckoutDto(
	reservation: PaymentReservationContext,
	attempt: PaymentAttempt,
	checkoutUrl: string,
): CheckoutDto {
	return {
		reservationId: reservation.id,
		paymentAttemptId: attempt.id,
		status: toPaymentAttemptStatusDto(attempt.status),
		checkoutUrl,
		reservationExpiresAt: reservation.expiresAt.toISOString(),
		checkoutExpiresAt: attempt.providerExpiresAt?.toISOString() ?? null,
		currency: attempt.currency,
		total: attempt.amount.toFixed(2),
	};
}

// --- Payment intent summary ---

export function toPaymentAttemptSummaryDto(
	attempt: PaymentAttempt,
): PaymentAttemptSummaryDto {
	return {
		id: attempt.id,
		provider: attempt.provider.toLowerCase(),
		status: toPaymentAttemptStatusDto(attempt.status),
		amount: attempt.amount.toFixed(2),
		currency: attempt.currency,
		createdAt: attempt.createdAt.toISOString(),
		updatedAt: attempt.updatedAt.toISOString(),
	};
}

// --- Payment status DTO ---

export function toPaymentStatusDto(
	reservation: PaymentReservationContext,
	latestAttempt: PaymentAttempt | null,
): PaymentStatusDto {
	return {
		reservationId: reservation.id,
		reservationStatus: toReservationPaymentStatusDto(reservation.status),
		payment: latestAttempt ? toPaymentAttemptSummaryDto(latestAttempt) : null,
		total: reservation.total.toFixed(2),
		currency: reservation.currency,
		expiresAt: reservation.expiresAt.toISOString(),
		confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
	};
}
