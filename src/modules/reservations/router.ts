import { Hono } from "hono";
import { publicBranchSlugParamsSchema } from "../../shared/slug/public-slug.schema";
import { validatePublicParams } from "../../shared/validation/public-params-validation";
import { validate } from "../../shared/validation/validation-hook";
import {
	createTemporaryReservationHeadersSchema,
	createTemporaryReservationSchema,
} from "./schemas/create-temporary-reservation.schema";
import { getAvailabilitySchema } from "./schemas/get-availability.schema";
import type { CreateTemporaryReservationUseCase } from "./use-cases/create-temporary-reservation/create-temporary-reservation.use-case";
import type { GetAvailabilityUseCase } from "./use-cases/get-availability/get-availability.use-case";

export function createReservationRouter(deps: {
	getAvailability: GetAvailabilityUseCase;
	createTemporaryReservation: CreateTemporaryReservationUseCase;
}): Hono {
	const router = new Hono();

	router.get(
		"/availability",
		validatePublicParams(
			publicBranchSlugParamsSchema,
			"PUBLIC_RESERVATION_NOT_FOUND",
		),
		validate("query", getAvailabilitySchema),
		async (c) => {
			const { restaurantSlug, branchSlug } = c.req.valid("param");
			const query = c.req.valid("query");
			const availability = await deps.getAvailability.execute(
				restaurantSlug,
				branchSlug,
				query,
			);
			return c.json(availability);
		},
	);

	router.post(
		"/temporary",
		validatePublicParams(
			publicBranchSlugParamsSchema,
			"PUBLIC_RESERVATION_NOT_FOUND",
		),
		validate("header", createTemporaryReservationHeadersSchema),
		validate("json", createTemporaryReservationSchema),
		async (c) => {
			const { restaurantSlug, branchSlug } = c.req.valid("param");
			const headers = c.req.valid("header");
			const input = c.req.valid("json");
			const result = await deps.createTemporaryReservation.execute(
				restaurantSlug,
				branchSlug,
				headers["idempotency-key"],
				input,
			);

			return c.json(result.reservation, result.created ? 201 : 200);
		},
	);

	return router;
}
