import { Hono } from "hono";
import { publicRestaurantSlugParamsSchema } from "../../shared/slug/public-slug.schema";
import { validatePublicParams } from "../../shared/validation/public-params-validation";
import type { GetPublicRestaurantUseCase } from "./use-cases/get-public-restaurant/get-public-restaurant.use-case";

export function createPublicRestaurantRouter(deps: {
	getPublicRestaurant: GetPublicRestaurantUseCase;
}): Hono {
	const router = new Hono();

	router.get(
		"/",
		validatePublicParams(
			publicRestaurantSlugParamsSchema,
			"RESTAURANT_NOT_FOUND",
		),
		async (c) => {
			const { restaurantSlug } = c.req.valid("param");
			const restaurant = await deps.getPublicRestaurant.execute(restaurantSlug);
			return c.json(restaurant);
		},
	);

	return router;
}
