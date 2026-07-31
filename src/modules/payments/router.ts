import { Hono } from "hono";
import { validatePublicParams } from "../../shared/validation/public-params-validation";
import { PublicPaymentNotFoundException } from "./exceptions/public-payment-not-found.exception";
import {
	bearerTokenSchema,
	paymentRouteParamsSchema,
} from "./schemas/payment.schema";
import type { CreateCheckoutUseCase } from "./use-cases/create-checkout/create-checkout.use-case";
import type { GetPaymentStatusUseCase } from "./use-cases/get-payment-status/get-payment-status.use-case";

export function createPaymentRouter(deps: {
	createCheckout: CreateCheckoutUseCase;
	getPaymentStatus: GetPaymentStatusUseCase;
}): Hono {
	const router = new Hono();

	router.post(
		"/reservations/:reservationId/checkout",
		validatePublicParams(paymentRouteParamsSchema, "PUBLIC_PAYMENT_NOT_FOUND"),
		async (c) => {
			const params = c.req.valid("param");
			const rawToken = c.req.header("Authorization");
			const tokenResult = bearerTokenSchema.safeParse(rawToken);

			if (!tokenResult.success) {
				throw new PublicPaymentNotFoundException();
			}

			const result = await deps.createCheckout.execute(
				params.restaurantSlug,
				params.branchSlug,
				params.reservationId,
				tokenResult.data,
			);

			return c.json(result.checkout, result.created ? 201 : 200);
		},
	);

	router.get(
		"/reservations/:reservationId/payment",
		validatePublicParams(paymentRouteParamsSchema, "PUBLIC_PAYMENT_NOT_FOUND"),
		async (c) => {
			const params = c.req.valid("param");
			const rawToken = c.req.header("Authorization");
			const tokenResult = bearerTokenSchema.safeParse(rawToken);

			if (!tokenResult.success) {
				throw new PublicPaymentNotFoundException();
			}

			const paymentStatus = await deps.getPaymentStatus.execute(
				params.restaurantSlug,
				params.branchSlug,
				params.reservationId,
				tokenResult.data,
			);

			return c.json(paymentStatus);
		},
	);

	return router;
}
