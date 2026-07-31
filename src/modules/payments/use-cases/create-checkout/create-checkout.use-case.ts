import type { CheckoutDto } from "../../dto/payment.dto";

export interface CreateCheckoutResult {
	checkout: CheckoutDto;
	created: boolean;
}

export interface CreateCheckoutUseCase {
	execute(
		restaurantSlug: string,
		branchSlug: string,
		reservationId: string,
		bearerToken: string,
	): Promise<CreateCheckoutResult>;
}
