import { Hono } from "hono";
import { validate } from "../../shared/validation/validation-hook";
import { createRestaurantSchema } from "./schemas/create-restaurant.schema";
import { updateRestaurantSchema } from "./schemas/update-restaurant.schema";
import type { CreateRestaurantUseCase } from "./use-cases/create-restaurant/create-restaurant.use-case";
import type { GetRestaurantUseCase } from "./use-cases/get-restaurant/get-restaurant.use-case";
import type { UpdateRestaurantUseCase } from "./use-cases/update-restaurant/update-restaurant.use-case";

export function createRestaurantRouter(deps: {
	createRestaurant: CreateRestaurantUseCase;
	getRestaurant: GetRestaurantUseCase;
	updateRestaurant: UpdateRestaurantUseCase;
}): Hono {
	const router = new Hono();

	router.post("/", validate("json", createRestaurantSchema), async (c) => {
		const input = c.req.valid("json");
		const restaurant = await deps.createRestaurant.execute(input);
		return c.json(restaurant, 201);
	});

	router.get("/:restaurantId", async (c) => {
		const restaurantId = c.req.param("restaurantId");
		if (!restaurantId) {
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Falta el ID del restaurante",
						details: [],
					},
				},
				400,
			);
		}
		const restaurant = await deps.getRestaurant.execute(restaurantId);
		return c.json(restaurant);
	});

	router.patch(
		"/:restaurantId",
		validate("json", updateRestaurantSchema),
		async (c) => {
			const restaurantId = c.req.param("restaurantId");
			if (!restaurantId) {
				return c.json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Falta el ID del restaurante",
							details: [],
						},
					},
					400,
				);
			}
			const input = c.req.valid("json");
			const restaurant = await deps.updateRestaurant.execute(
				restaurantId,
				input,
			);
			return c.json(restaurant);
		},
	);

	return router;
}
