import { createHash, timingSafeEqual } from "node:crypto";
import { PaymentProviderUnavailableException } from "../../exceptions/payment-provider-unavailable.exception";
import { PublicPaymentNotFoundException } from "../../exceptions/public-payment-not-found.exception";
import { ReservationAlreadyConfirmedException } from "../../exceptions/reservation-already-confirmed.exception";
import { ReservationExpiredException } from "../../exceptions/reservation-expired.exception";
import { toCheckoutDto } from "../../mapper/payment.mapper";
import type {
	PaymentRepository,
	PaymentReservationContext,
} from "../../repositories/payment.repository";
import { isConfirmedCheckoutTokenExpired } from "../../services/confirmed-checkout-token-window";
import type { PaymentGatewayService } from "../../services/payment-gateway.service";
import type {
	CreateCheckoutResult,
	CreateCheckoutUseCase,
} from "./create-checkout.use-case";

export class CreateCheckoutUseCaseImpl implements CreateCheckoutUseCase {
	constructor(
		private readonly paymentRepository: PaymentRepository,
		private readonly paymentGateway: PaymentGatewayService,
	) {}

	async execute(
		restaurantSlug: string,
		branchSlug: string,
		reservationId: string,
		bearerToken: string,
	): Promise<CreateCheckoutResult> {
		const reservation = await this.paymentRepository.findReservationForPayment(
			reservationId,
			branchSlug,
			restaurantSlug,
		);

		if (!reservation?.checkoutTokenHash) {
			throw new PublicPaymentNotFoundException();
		}

		// Verificación en tiempo constante del bearer token
		const tokenHash = createHash("sha256").update(bearerToken).digest();
		const storedHash = Buffer.from(reservation.checkoutTokenHash, "hex");

		if (
			tokenHash.length !== storedHash.length ||
			!timingSafeEqual(tokenHash, storedHash)
		) {
			throw new PublicPaymentNotFoundException();
		}

		// Validar estado de la reserva
		const now = new Date();
		if (
			isConfirmedCheckoutTokenExpired(
				reservation.status,
				reservation.confirmedAt,
				now,
			)
		) {
			throw new PublicPaymentNotFoundException();
		}

		if (reservation.status === "CONFIRMED") {
			throw new ReservationAlreadyConfirmedException();
		}

		if (reservation.expiresAt <= now) {
			throw new ReservationExpiredException();
		}

		// Buscar intento pendiente reutilizable
		const pendingAttempt =
			await this.paymentRepository.findPendingAttemptByReservation(
				reservationId,
				now,
			);

		if (
			pendingAttempt?.checkoutUrl &&
			pendingAttempt.providerCheckoutSessionId
		) {
			// Sesión activa → reutilizar
			return {
				checkout: toCheckoutDto(
					reservation,
					pendingAttempt,
					pendingAttempt.checkoutUrl,
				),
				created: false,
			};
		}

		// Crear o reutilizar intento y llamar a Stripe
		return this.createSession(reservation, pendingAttempt);
	}

	private async createSession(
		reservation: PaymentReservationContext,
		existingAttempt: Awaited<
			ReturnType<PaymentRepository["findPendingAttemptByReservation"]>
		>,
	): Promise<CreateCheckoutResult> {
		let attempt = existingAttempt;

		if (!attempt) {
			attempt = await this.paymentRepository.createAttempt({
				reservationId: reservation.id,
				provider: "STRIPE",
				amount: reservation.total,
				currency: reservation.currency,
			});
		}

		try {
			const session = await this.paymentGateway.createCheckoutSession({
				reservationId: reservation.id,
				paymentAttemptId: attempt.id,
				total: reservation.total.toFixed(2),
				currency: reservation.currency,
				customerEmail: reservation.email,
				items: reservation.items,
			});

			await this.paymentRepository.setAttemptSessionData(attempt.id, {
				providerCheckoutSessionId: session.providerSessionId,
				checkoutUrl: session.checkoutUrl,
				providerExpiresAt: session.expiresAt,
			});

			// Releer el intento actualizado para el DTO
			const updatedAttempt = await this.paymentRepository.findAttemptById(
				attempt.id,
			);

			const checkoutUrl = session.checkoutUrl;

			return {
				checkout: toCheckoutDto(
					reservation,
					updatedAttempt ?? attempt,
					checkoutUrl,
				),
				created: !existingAttempt,
			};
		} catch {
			throw new PaymentProviderUnavailableException();
		}
	}
}
