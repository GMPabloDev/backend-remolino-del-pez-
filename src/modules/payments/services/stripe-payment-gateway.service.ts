import Stripe from "stripe";
import type { Env } from "../../../shared/config/env";
import { InvalidStripeSignatureException } from "../exceptions/invalid-stripe-signature.exception";
import type {
	CheckoutSession,
	CreateCheckoutSessionInput,
	GatewayWebhookEvent,
	PaymentGatewayService,
	RefundResult,
} from "./payment-gateway.service";

/** Clave de idempotencia máxima para Stripe (UUID sin guiones). */
function stripeIdempotencyKey(attemptId: string): string {
	return `attempt_${attemptId.replace(/-/g, "")}`;
}

/** Convierte un importe decimal en cadena ("71.80") a céntimos (7180). */
function toSmallestUnit(amount: string): number {
	const parsed = Math.round(Number.parseFloat(amount) * 100);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`Importe inválido para Stripe: ${amount}`);
	}
	return parsed;
}

export class StripePaymentGatewayService implements PaymentGatewayService {
	private readonly stripe: Stripe;
	private readonly successUrl: string;
	private readonly cancelUrl: string;
	private readonly webhookSecret: string;

	constructor(env: Env) {
		this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
			apiVersion: "2026-06-24.dahlia",
		});
		this.successUrl = env.STRIPE_CHECKOUT_SUCCESS_URL;
		this.cancelUrl = env.STRIPE_CHECKOUT_CANCEL_URL;
		this.webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	}

	async createCheckoutSession(
		input: CreateCheckoutSessionInput,
	): Promise<CheckoutSession> {
		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
			input.items.map((item) => ({
				price_data: {
					currency: "pen",
					product_data: {
						name: item.dishName,
					},
					unit_amount: toSmallestUnit(item.unitPrice.toFixed(2)),
				},
				quantity: item.quantity,
			}));

		const session = await this.stripe.checkout.sessions.create(
			{
				mode: "payment",
				payment_method_types: ["card"],
				line_items: lineItems,
				customer_email: input.customerEmail,
				currency: "pen",
				success_url: this.successUrl,
				cancel_url: this.cancelUrl,
				metadata: {
					reservationId: input.reservationId,
					paymentAttemptId: input.paymentAttemptId,
				},
				expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min por defecto
			},
			{
				idempotencyKey: stripeIdempotencyKey(input.paymentAttemptId),
			},
		);

		return {
			providerSessionId: session.id,
			checkoutUrl: session.url ?? "",
			expiresAt: new Date((session.expires_at ?? 0) * 1000),
		};
	}

	async parseWebhookEvent(
		rawBody: string,
		signature: string,
	): Promise<GatewayWebhookEvent> {
		try {
			const event = await this.stripe.webhooks.constructEventAsync(
				rawBody,
				signature,
				this.webhookSecret,
			);

			return this.mapStripeEvent(event);
		} catch {
			throw new InvalidStripeSignatureException();
		}
	}

	async refund(
		paymentIntentId: string,
		amount: number,
		idempotencyKey: string,
	): Promise<RefundResult> {
		const refund = await this.stripe.refunds.create(
			{
				payment_intent: paymentIntentId,
				amount,
			},
			{
				idempotencyKey: `refund_${idempotencyKey}`,
			},
		);

		return {
			providerRefundId: refund.id,
			status: this.mapRefundStatus(refund.status),
		};
	}

	// --- Mapeo interno ---

	private mapStripeEvent(event: Stripe.Event): GatewayWebhookEvent {
		const base: GatewayWebhookEvent = {
			providerEventId: event.id,
			eventType: event.type,
			checkoutSessionId: null,
			paymentIntentId: null,
			amount: null,
			currency: null,
			refundId: null,
			refundStatus: null,
		};

		switch (event.type) {
			case "checkout.session.completed":
			case "checkout.session.expired": {
				const session = event.data.object as Stripe.Checkout.Session;
				base.checkoutSessionId = session.id;
				base.paymentIntentId =
					typeof session.payment_intent === "string"
						? session.payment_intent
						: (session.payment_intent?.id ?? null);
				if (event.type === "checkout.session.completed") {
					base.amount = session.amount_total;
					base.currency = session.currency?.toUpperCase() ?? null;
				}
				break;
			}
			case "payment_intent.payment_failed": {
				const pi = event.data.object as Stripe.PaymentIntent;
				base.paymentIntentId = pi.id;
				base.amount = pi.amount;
				base.currency = pi.currency?.toUpperCase() ?? null;
				// Intentamos recuperar la sesión asociada
				break;
			}
			case "charge.refunded":
			case "charge.refund.updated": {
				const charge = event.data.object as Stripe.Charge;
				base.paymentIntentId =
					typeof charge.payment_intent === "string"
						? charge.payment_intent
						: (charge.payment_intent?.id ?? null);
				if (charge.refunds?.data?.length) {
					const lastRefund =
						charge.refunds.data[charge.refunds.data.length - 1];
					base.refundId = lastRefund.id;
					base.refundStatus = this.mapRefundStatus(lastRefund.status);
				}
				break;
			}
		}

		return base;
	}

	private mapRefundStatus(
		status: string | null,
	): "succeeded" | "failed" | "pending" {
		switch (status) {
			case "succeeded":
				return "succeeded";
			case "failed":
			case "canceled":
				return "failed";
			default:
				return "pending";
		}
	}
}
