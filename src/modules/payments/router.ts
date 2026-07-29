import { Hono } from "hono";
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

	router.post("/reservations/:reservationId/checkout", async (c) => {
		const params = paymentRouteParamsSchema.parse({
			restaurantId: c.req.param("restaurantId"),
			branchId: c.req.param("branchId"),
			reservationId: c.req.param("reservationId"),
		});

		const rawToken = c.req.header("Authorization");
		const tokenResult = bearerTokenSchema.safeParse(rawToken);

		if (!tokenResult.success) {
			throw new PublicPaymentNotFoundException();
		}

		const result = await deps.createCheckout.execute(
			params.restaurantId,
			params.branchId,
			params.reservationId,
			tokenResult.data,
		);

		return c.json(result.checkout, result.created ? 201 : 200);
	});

	router.get("/reservations/:reservationId/payment", async (c) => {
		const params = paymentRouteParamsSchema.parse({
			restaurantId: c.req.param("restaurantId"),
			branchId: c.req.param("branchId"),
			reservationId: c.req.param("reservationId"),
		});

		const rawToken = c.req.header("Authorization");
		const tokenResult = bearerTokenSchema.safeParse(rawToken);

		if (!tokenResult.success) {
			throw new PublicPaymentNotFoundException();
		}

		const paymentStatus = await deps.getPaymentStatus.execute(
			params.restaurantId,
			params.branchId,
			params.reservationId,
			tokenResult.data,
		);

		return c.json(paymentStatus);
	});

	return router;
}
