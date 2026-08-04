import { Prisma } from "../../../../generated/prisma/client";
import type { EmailService } from "../../../../shared/email/email.service";
import type { CustomerMagicLinkService } from "../../../customer-auth/services/customer-magic-link.service";
import type { CustomerRepository } from "../../../customers/repositories/customer.repository";
import type { ReservationConfirmationEmailService } from "../../../customers/services/reservation-confirmation-email.service";
import type {
	PaymentRepository,
	PaymentReservationContext,
} from "../../repositories/payment.repository";
import type {
	GatewayWebhookEvent,
	PaymentGatewayService,
} from "../../services/payment-gateway.service";
import type { ProcessStripeWebhookUseCase } from "./process-stripe-webhook.use-case";

/** Clave de idempotencia para reembolsos derivada del intento. */
function refundIdempotencyKey(attemptId: string): string {
	return attemptId.replace(/-/g, "");
}

/** Convierte céntimos a número decimal para comparar con Prisma Decimal. */
function centsToDecimal(cents: number): Prisma.Decimal {
	return new Prisma.Decimal(cents).div(100);
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function buildMagicLinkUrl(baseUrl: string, token: string): string {
	const url = new URL(baseUrl);
	url.searchParams.set("token", token);
	return url.toString();
}

export class ProcessStripeWebhookUseCaseImpl
	implements ProcessStripeWebhookUseCase
{
	constructor(
		private readonly paymentRepository: PaymentRepository,
		private readonly paymentGateway: PaymentGatewayService,
		private readonly customerRepository: CustomerRepository,
		private readonly customerMagicLinkService: CustomerMagicLinkService,
		private readonly confirmationEmailService: ReservationConfirmationEmailService,
		private readonly emailService: EmailService,
		private readonly customerMagicLinkUrl: string,
	) {}

	async execute(rawBody: string, signature: string): Promise<void> {
		const event = await this.paymentGateway.parseWebhookEvent(
			rawBody,
			signature,
		);

		// Idempotencia por event.id
		const existingEvent = await this.paymentRepository.findWebhookEvent(
			event.providerEventId,
		);

		if (existingEvent?.status === "PROCESSED") {
			return; // Ya procesado, responder 200
		}

		if (existingEvent?.status === "FAILED") {
			await this.paymentRepository.updateWebhookEvent(existingEvent.id, {
				status: "PROCESSING",
			});
		} else if (!existingEvent) {
			await this.paymentRepository.createWebhookEvent({
				provider: "STRIPE",
				providerEventId: event.providerEventId,
				eventType: event.eventType,
			});
		}

		try {
			await this.processEvent(event);
		} catch (error) {
			// Marcar como FAILED para que Stripe reenvíe
			const eventRecord = await this.paymentRepository.findWebhookEvent(
				event.providerEventId,
			);
			if (eventRecord) {
				const errorCode =
					error instanceof Error ? error.message.slice(0, 100) : null;
				await this.paymentRepository.updateWebhookEvent(eventRecord.id, {
					status: "FAILED",
					lastErrorCode: errorCode,
				});
			}
			throw error;
		}

		// Éxito → marcar como PROCESSED
		const eventRecord = await this.paymentRepository.findWebhookEvent(
			event.providerEventId,
		);
		if (eventRecord && eventRecord.status !== "PROCESSED") {
			await this.paymentRepository.updateWebhookEvent(eventRecord.id, {
				status: "PROCESSED",
			});
		}
	}

	private async processEvent(event: GatewayWebhookEvent): Promise<void> {
		switch (event.eventType) {
			case "checkout.session.completed":
				await this.handleSessionCompleted(event);
				break;
			case "checkout.session.expired":
				await this.handleSessionExpired(event);
				break;
			case "payment_intent.payment_failed":
				await this.handlePaymentFailed(event);
				break;
			case "charge.refunded":
			case "charge.refund.updated":
				await this.handleRefundUpdate(event);
				break;
			// Eventos no utilizados: responder OK sin cambios
		}
	}

	// --- Manejadores de eventos ---

	private async handleSessionCompleted(
		event: GatewayWebhookEvent,
	): Promise<void> {
		if (!event.checkoutSessionId) return;

		const attempt = await this.paymentRepository.findAttemptByProviderSessionId(
			event.checkoutSessionId,
		);

		if (attempt?.status !== "PENDING") return;

		const reservation = await this.paymentRepository.findReservationById(
			attempt.reservationId,
		);

		// Validamos el importe y moneda reportados por Stripe
		const expectedAmount = attempt.amount;
		const paidAmount = event.amount ? centsToDecimal(event.amount) : null;
		const paidCurrency = event.currency?.toUpperCase();

		const amountMatches =
			paidAmount !== null && expectedAmount.equals(paidAmount);
		const currencyMatches = paidCurrency === attempt.currency.toUpperCase();

		if (!amountMatches || !currencyMatches) {
			await this.refundPayment(attempt, event);
			return;
		}

		// Pago válido: intentar confirmar
		if (!reservation) {
			await this.refundPayment(attempt, event);
			return;
		}

		const paidAt = new Date();

		// ¿Tardío o ya confirmado?
		if (
			reservation.status !== "PENDING_PAYMENT" ||
			reservation.expiresAt <= paidAt ||
			reservation.confirmedPaymentAttemptId !== null
		) {
			await this.refundPayment(attempt, event);
			return;
		}

		// Generar el token antes de la transacción. Solo se persiste su hash.
		const magicLink = this.customerMagicLinkService.generate(paidAt);

		// Confirmación transaccional junto con cliente, vínculo y magic link.
		const confirmed = await this.paymentRepository.confirmReservation(
			reservation.id,
			attempt.id,
			event.paymentIntentId ?? "",
			paidAt,
			{
				fullName: reservation.fullName,
				email: reservation.email,
				normalizedEmail: normalizeEmail(reservation.email),
				phone: reservation.phone,
				tokenHash: magicLink.tokenHash,
				tokenExpiresAt: magicLink.expiresAt,
			},
		);

		if (!confirmed) {
			// Carrera: otro webhook ya confirmó o venció
			await this.refundPayment(attempt, event);
			return;
		}

		if (confirmed.magicLinkId) {
			await this.sendReservationConfirmationEmail(
				reservation,
				confirmed.magicLinkId,
				magicLink.token,
			);
		}
	}

	private async sendReservationConfirmationEmail(
		reservation: PaymentReservationContext,
		magicLinkId: string,
		token: string,
	): Promise<void> {
		try {
			const message = this.confirmationEmailService.create({
				to: reservation.email,
				customerName: reservation.fullName,
				restaurantName: reservation.branch.restaurant.name,
				branchName: reservation.branch.name,
				startAt: reservation.startAt,
				endAt: reservation.endAt,
				timezone: reservation.branch.restaurant.timezone,
				partySize: reservation.partySize,
				items: reservation.items.map((item) => ({
					name: item.dishName,
					quantity: item.quantity,
					unitPrice: item.unitPrice.toFixed(2),
					subtotal: item.subtotal.toFixed(2),
				})),
				currency: reservation.currency,
				total: reservation.total.toFixed(2),
				accessUrl: buildMagicLinkUrl(this.customerMagicLinkUrl, token),
			});

			await this.emailService.send(message);
			await this.customerRepository.markMagicLinkSent(magicLinkId, new Date());
		} catch {
			try {
				await this.customerRepository.markMagicLinkFailed(
					magicLinkId,
					new Date(),
					"EMAIL_SEND_FAILED",
				);
			} catch {
				// El fallo de persistencia no debe revertir el pago confirmado.
			}
		}
	}

	private async handleSessionExpired(
		event: GatewayWebhookEvent,
	): Promise<void> {
		if (!event.checkoutSessionId) return;

		const attempt = await this.paymentRepository.findAttemptByProviderSessionId(
			event.checkoutSessionId,
		);

		if (attempt?.status === "PENDING") {
			await this.paymentRepository.updateAttemptStatus(attempt.id, {
				status: "EXPIRED",
				failedAt: new Date(),
			});
		}
	}

	private async handlePaymentFailed(event: GatewayWebhookEvent): Promise<void> {
		if (!event.paymentIntentId) return;

		const attempt =
			await this.paymentRepository.findAttemptByProviderPaymentIntentId(
				event.paymentIntentId,
			);

		if (attempt?.status === "PENDING") {
			await this.paymentRepository.updateAttemptStatus(attempt.id, {
				status: "FAILED",
				failedAt: new Date(),
			});
		}
	}

	private async handleRefundUpdate(event: GatewayWebhookEvent): Promise<void> {
		if (!event.paymentIntentId) return;

		const attempt =
			await this.paymentRepository.findAttemptByProviderPaymentIntentId(
				event.paymentIntentId,
			);

		if (!attempt) return;

		if (event.refundStatus === "succeeded") {
			if (
				attempt.status === "REFUND_PENDING" ||
				attempt.status === "REFUND_FAILED"
			) {
				await this.paymentRepository.updateAttemptStatus(attempt.id, {
					status: "REFUNDED",
					providerRefundId: event.refundId ?? attempt.providerRefundId,
					refundedAt: new Date(),
				});
			}
		} else if (event.refundStatus === "failed") {
			// Reintentar reembolso con misma clave idempotente
			if (!attempt.providerPaymentIntentId) return;

			const refundAmount =
				event.amount ?? Math.round(Number(attempt.amount) * 100);

			await this.paymentRepository.updateAttemptStatus(attempt.id, {
				status: "REFUND_PENDING",
			});

			const refundResult = await this.paymentGateway.refund(
				attempt.providerPaymentIntentId,
				refundAmount,
				refundIdempotencyKey(attempt.id),
			);

			if (refundResult.status === "succeeded") {
				await this.paymentRepository.updateAttemptStatus(attempt.id, {
					status: "REFUNDED",
					providerRefundId: refundResult.providerRefundId,
					refundedAt: new Date(),
				});
			} else if (refundResult.status === "failed") {
				await this.paymentRepository.updateAttemptStatus(attempt.id, {
					status: "REFUND_FAILED",
				});
			}
		}
	}

	// --- Reembolso automático ---

	private async refundPayment(
		attempt: Awaited<
			ReturnType<PaymentRepository["findAttemptByProviderSessionId"]>
		>,
		event: GatewayWebhookEvent,
	): Promise<void> {
		if (!attempt?.providerPaymentIntentId) return;

		await this.paymentRepository.updateAttemptStatus(attempt.id, {
			status: "REFUND_PENDING",
			providerPaymentIntentId:
				event.paymentIntentId ?? attempt.providerPaymentIntentId,
		});

		try {
			const refundAmount =
				event.amount ?? Math.round(Number(attempt.amount) * 100);

			const refundResult = await this.paymentGateway.refund(
				attempt.providerPaymentIntentId,
				refundAmount,
				refundIdempotencyKey(attempt.id),
			);

			if (refundResult.status === "succeeded") {
				await this.paymentRepository.updateAttemptStatus(attempt.id, {
					status: "REFUNDED",
					providerRefundId: refundResult.providerRefundId,
					refundedAt: new Date(),
				});
			} else if (refundResult.status === "failed") {
				await this.paymentRepository.updateAttemptStatus(attempt.id, {
					status: "REFUND_FAILED",
				});
			}
		} catch {
			await this.paymentRepository.updateAttemptStatus(attempt.id, {
				status: "REFUND_FAILED",
			});
		}
	}
}
