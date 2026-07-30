import type { ReservationItem } from "../../../generated/prisma/client";

// --- Tipos de entrada para crear una sesión de checkout ---

export interface CreateCheckoutSessionInput {
	reservationId: string;
	paymentAttemptId: string;
	total: string; // Cadena decimal con dos posiciones, ej. "71.80"
	currency: string; // "PEN"
	customerEmail: string;
	items: ReservationItem[];
}

export interface CheckoutSession {
	providerSessionId: string;
	checkoutUrl: string;
	expiresAt: Date;
}

// --- Tipos de evento webhook interpretado ---

export interface GatewayWebhookEvent {
	providerEventId: string;
	eventType: string;
	checkoutSessionId: string | null;
	paymentIntentId: string | null;
	amount: number | null; // En unidad mínima (céntimos)
	currency: string | null;
	refundId: string | null;
	refundStatus: string | null; // "succeeded" | "failed" | "pending" | null
}

// --- Resultado de reembolso ---

export type RefundStatus = "succeeded" | "failed" | "pending";

export interface RefundResult {
	providerRefundId: string;
	status: RefundStatus;
}

// --- Contrato del gateway de pagos ---

export interface PaymentGatewayService {
	createCheckoutSession(
		input: CreateCheckoutSessionInput,
	): Promise<CheckoutSession>;

	parseWebhookEvent(
		rawBody: string,
		signature: string,
	): Promise<GatewayWebhookEvent>;

	refund(
		paymentIntentId: string,
		amount: number, // En unidad mínima (céntimos)
		idempotencyKey: string,
	): Promise<RefundResult>;
}
