import { createHash, timingSafeEqual } from "node:crypto";
import { PublicPaymentNotFoundException } from "../../exceptions/public-payment-not-found.exception";
import { toPaymentStatusDto } from "../../mapper/payment.mapper";
import type { PaymentRepository } from "../../repositories/payment.repository";
import { isConfirmedCheckoutTokenExpired } from "../../services/confirmed-checkout-token-window";
import type { GetPaymentStatusUseCase } from "./get-payment-status.use-case";

export class GetPaymentStatusUseCaseImpl implements GetPaymentStatusUseCase {
	constructor(private readonly paymentRepository: PaymentRepository) {}

	async execute(
		restaurantSlug: string,
		branchSlug: string,
		reservationId: string,
		bearerToken: string,
	) {
		const reservation = await this.paymentRepository.findReservationForPayment(
			reservationId,
			branchSlug,
			restaurantSlug,
		);

		if (!reservation?.checkoutTokenHash) {
			throw new PublicPaymentNotFoundException();
		}

		// Verificación en tiempo constante
		const tokenHash = createHash("sha256").update(bearerToken).digest();
		const storedHash = Buffer.from(reservation.checkoutTokenHash, "hex");

		if (
			tokenHash.length !== storedHash.length ||
			!timingSafeEqual(tokenHash, storedHash)
		) {
			throw new PublicPaymentNotFoundException();
		}

		if (
			isConfirmedCheckoutTokenExpired(
				reservation.status,
				reservation.confirmedAt,
				new Date(),
			)
		) {
			throw new PublicPaymentNotFoundException();
		}

		const latestAttempt =
			await this.paymentRepository.findLatestAttemptByReservation(
				reservationId,
			);

		return toPaymentStatusDto(reservation, latestAttempt);
	}
}
