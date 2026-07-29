export interface ProcessStripeWebhookUseCase {
	execute(rawBody: string, signature: string): Promise<void>;
}
