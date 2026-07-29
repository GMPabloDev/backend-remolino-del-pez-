import type { PaymentStatusDto } from "../../dto/payment.dto";

export interface GetPaymentStatusUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		reservationId: string,
		bearerToken: string,
	): Promise<PaymentStatusDto>;
}
