import { Hono } from "hono";
import { validate } from "../../shared/validation/validation-hook";
import {
	createTemporaryReservationHeadersSchema,
	createTemporaryReservationSchema,
} from "./schemas/create-temporary-reservation.schema";
import { getAvailabilitySchema } from "./schemas/get-availability.schema";
import type { CreateTemporaryReservationUseCase } from "./use-cases/create-temporary-reservation/create-temporary-reservation.use-case";
import type { GetAvailabilityUseCase } from "./use-cases/get-availability/get-availability.use-case";

function getRouteParam(
	c: { req: { param: (name: string) => string | undefined } },
	name: string,
): string {
	const value = c.req.param(name);
	if (!value) throw new Error(`${name} es requerido`);
	return value;
}

export function createReservationRouter(deps: {
	getAvailability: GetAvailabilityUseCase;
	createTemporaryReservation: CreateTemporaryReservationUseCase;
}): Hono {
	const router = new Hono();

	router.get(
		"/availability",
		validate("query", getAvailabilitySchema),
		async (c) => {
			const restaurantId = getRouteParam(c, "restaurantId");
			const branchId = getRouteParam(c, "branchId");
			const query = c.req.valid("query");
			const availability = await deps.getAvailability.execute(
				restaurantId,
				branchId,
				query,
			);
			return c.json(availability);
		},
	);

	router.post(
		"/temporary",
		validate("header", createTemporaryReservationHeadersSchema),
		validate("json", createTemporaryReservationSchema),
		async (c) => {
			const restaurantId = getRouteParam(c, "restaurantId");
			const branchId = getRouteParam(c, "branchId");
			const headers = c.req.valid("header");
			const input = c.req.valid("json");
			const result = await deps.createTemporaryReservation.execute(
				restaurantId,
				branchId,
				headers["idempotency-key"],
				input,
			);

			return c.json(result.reservation, result.created ? 201 : 200);
		},
	);

	return router;
}
