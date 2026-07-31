import type { PaymentStatusDto } from "../../dto/payment.dto";

export interface GetPaymentStatusUseCase {
	execute(
		restaurantSlug: string,
		branchSlug: string,
		reservationId: string,
		bearerToken: string,
	): Promise<PaymentStatusDto>;
}
