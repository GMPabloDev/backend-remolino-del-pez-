// --- Estados expuestos en la API pública (minúsculas) ---

export type CheckoutAttemptStatus =
	| "pending"
	| "paid"
	| "failed"
	| "expired"
	| "refund_pending"
	| "refunded"
	| "refund_failed";

export type ReservationPaymentStatus = "pending_payment" | "confirmed";

// --- DTO de respuesta del POST checkout ---

export interface CheckoutDto {
	reservationId: string;
	paymentAttemptId: string;
	status: CheckoutAttemptStatus;
	checkoutUrl: string;
	reservationExpiresAt: string;
	checkoutExpiresAt: string;
	currency: string;
	total: string;
}

// --- DTO del último pago (incrustado en el estado) ---

export interface PaymentAttemptSummaryDto {
	id: string;
	provider: string;
	status: CheckoutAttemptStatus;
	amount: string;
	currency: string;
	createdAt: string;
	updatedAt: string;
}

// --- DTO de respuesta del GET payment status ---

export interface PaymentStatusDto {
	reservationId: string;
	reservationStatus: ReservationPaymentStatus;
	payment: PaymentAttemptSummaryDto | null;
	total: string;
	currency: string;
	expiresAt: string;
	confirmedAt: string | null;
}
