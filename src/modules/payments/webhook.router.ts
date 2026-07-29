import { Hono } from "hono";
import { InvalidStripeSignatureException } from "./exceptions/invalid-stripe-signature.exception";
import type { ProcessStripeWebhookUseCase } from "./use-cases/process-stripe-webhook/process-stripe-webhook.use-case";

export function createStripeWebhookRouter(deps: {
	processStripeWebhook: ProcessStripeWebhookUseCase;
}): Hono {
	const router = new Hono();

	router.post("/", async (c) => {
		const signature = c.req.header("Stripe-Signature");

		if (!signature) {
			throw new InvalidStripeSignatureException();
		}

		const rawBody = await c.req.text();
		await deps.processStripeWebhook.execute(rawBody, signature);

		return c.json({ received: true });
	});

	return router;
}
