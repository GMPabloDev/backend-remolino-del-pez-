import { Hono } from "hono";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import type { AuthContext } from "../auth/middleware/auth-context.types";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createRestaurantSchema } from "./schemas/create-restaurant.schema";
import { updateRestaurantSchema } from "./schemas/update-restaurant.schema";
import type { CreateRestaurantUseCase } from "./use-cases/create-restaurant/create-restaurant.use-case";
import type { GetRestaurantUseCase } from "./use-cases/get-restaurant/get-restaurant.use-case";
import type { UpdateRestaurantUseCase } from "./use-cases/update-restaurant/update-restaurant.use-case";

export function createRestaurantRouter(deps: {
	createRestaurant: CreateRestaurantUseCase;
	getRestaurant: GetRestaurantUseCase;
	updateRestaurant: UpdateRestaurantUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const adminOnly = requireRole("ADMIN");

	// GET /:restaurantId — cualquier usuario autenticado
	router.get("/:restaurantId", auth, async (c) => {
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

	// POST / — solo ADMIN
	router.post(
		"/",
		auth,
		adminOnly,
		validate("json", createRestaurantSchema),
		async (c) => {
			const input = c.req.valid("json");
			const restaurant = await deps.createRestaurant.execute(input);
			return c.json(restaurant, 201);
		},
	);

	// PATCH /:restaurantId — solo ADMIN
	router.patch(
		"/:restaurantId",
		auth,
		adminOnly,
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
