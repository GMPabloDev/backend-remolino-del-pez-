import type {
	PaymentAttempt,
	PaymentAttemptStatus,
	PaymentProvider,
	PaymentWebhookEvent,
	PaymentWebhookStatus,
	Prisma,
	ReservationItem,
	ReservationStatus,
} from "../../../generated/prisma/client";

// --- Contexto de reserva para operaciones de pago ---

export interface PaymentReservationContext {
	id: string;
	branchId: string;
	status: ReservationStatus;
	expiresAt: Date;
	confirmedAt: Date | null;
	fullName: string;
	email: string;
	phone: string;
	partySize: number;
	startAt: Date;
	endAt: Date;
	branch: {
		name: string;
		address: string;
		district: string;
		province: string;
		department: string;
		restaurant: {
			name: string;
			legalName: string;
			taxId: string;
			timezone: string;
		};
	};
	checkoutTokenHash: string | null;
	checkoutTokenVersion: string | null;
	confirmedPaymentAttemptId: string | null;
	total: Prisma.Decimal;
	currency: string;
	items: ReservationItem[];
}

// --- Datos de creación de intento ---

export interface CreatePaymentAttemptData {
	reservationId: string;
	provider: PaymentProvider;
	amount: Prisma.Decimal;
	currency: string;
	providerCheckoutSessionId?: string | null;
	checkoutUrl?: string | null;
	providerExpiresAt?: Date | null;
}

// --- Resultado de confirmación ---

export interface ConfirmedCustomerData {
	fullName: string;
	email: string;
	normalizedEmail: string;
	phone: string;
	tokenHash: string;
	tokenExpiresAt: Date;
}

export interface ConfirmPaymentResult {
	reservationId: string;
	attemptId: string;
	customerId: string | null;
	magicLinkId: string | null;
	receiptId: string;
}

// --- Datos de actualización de intento ---

export interface UpdateAttemptStatusData {
	status: PaymentAttemptStatus;
	providerPaymentIntentId?: string | null;
	providerRefundId?: string | null;
	paidAt?: Date | null;
	refundedAt?: Date | null;
	failedAt?: Date | null;
	lastErrorCode?: string | null;
}

// --- Repositorio ---

export interface PaymentRepository {
	// Contexto de autorización
	findReservationForPayment(
		reservationId: string,
		branchSlug: string,
		restaurantSlug: string,
	): Promise<PaymentReservationContext | null>;

	findReservationById(
		reservationId: string,
	): Promise<PaymentReservationContext | null>;

	// Intentos de pago
	findLatestAttemptByReservation(
		reservationId: string,
	): Promise<PaymentAttempt | null>;

	findAttemptById(attemptId: string): Promise<PaymentAttempt | null>;

	findAttemptByProviderSessionId(
		sessionId: string,
	): Promise<PaymentAttempt | null>;

	findAttemptByProviderPaymentIntentId(
		paymentIntentId: string,
	): Promise<PaymentAttempt | null>;

	findPendingAttemptByReservation(
		reservationId: string,
		now: Date,
	): Promise<PaymentAttempt | null>;

	createAttempt(data: CreatePaymentAttemptData): Promise<PaymentAttempt>;

	setAttemptSessionData(
		attemptId: string,
		data: {
			providerCheckoutSessionId: string;
			checkoutUrl: string;
			providerExpiresAt: Date;
		},
	): Promise<PaymentAttempt>;

	updateAttemptStatus(
		attemptId: string,
		data: UpdateAttemptStatusData,
	): Promise<PaymentAttempt>;

	// Confirmación transaccional
	confirmReservation(
		reservationId: string,
		attemptId: string,
		providerPaymentIntentId: string,
		paidAt: Date,
		customer?: ConfirmedCustomerData,
	): Promise<ConfirmPaymentResult | null>;

	// Eventos webhook
	findWebhookEvent(
		providerEventId: string,
	): Promise<PaymentWebhookEvent | null>;

	createWebhookEvent(data: {
		provider: PaymentProvider;
		providerEventId: string;
		eventType: string;
	}): Promise<PaymentWebhookEvent>;

	updateWebhookEvent(
		id: string,
		data: { status: PaymentWebhookStatus; lastErrorCode?: string | null },
	): Promise<PaymentWebhookEvent>;
}
