export interface CheckoutTokenGenerationResult {
	token: string;
	version: string;
	hash: string;
}

export interface CheckoutTokenService {
	generate(reservationId: string): CheckoutTokenGenerationResult;
	reconstruct(reservationId: string, version: string): string;
}
