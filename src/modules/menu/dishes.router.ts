import { Hono } from "hono";
import type { DishStatus } from "../../generated/prisma/client";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createDishSchema } from "./schemas/create-dish.schema";
import { listDishesQuerySchema } from "./schemas/list-dishes.schema";
import { updateDishSchema } from "./schemas/update-dish.schema";
import { updateDishStatusSchema } from "./schemas/update-dish-status.schema";
import type { CreateDishUseCase } from "./use-cases/create-dish/create-dish.use-case";
import type { GetDishUseCase } from "./use-cases/get-dish/get-dish.use-case";
import type { ListDishesUseCase } from "./use-cases/list-dishes/list-dishes.use-case";
import type { UpdateDishUseCase } from "./use-cases/update-dish/update-dish.use-case";
import type { UpdateDishStatusUseCase } from "./use-cases/update-dish-status/update-dish-status.use-case";

function getRestaurantId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("restaurantId");
	if (!id) throw new Error("restaurantId es requerido");
	return id;
}

function getDishId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("dishId");
	if (!id) throw new Error("dishId es requerido");
	return id;
}

export function createDishRouter(deps: {
	createDish: CreateDishUseCase;
	listDishes: ListDishesUseCase;
	getDish: GetDishUseCase;
	updateDish: UpdateDishUseCase;
	updateDishStatus: UpdateDishStatusUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono {
	const router = new Hono();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const staffOnly = requireRole("ADMIN", "MANAGER");

	// POST — crear plato (ADMIN o MANAGER)
	router.post(
		"/",
		auth,
		staffOnly,
		validate("json", createDishSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const input = c.req.valid("json");
			const dish = await deps.createDish.execute(restaurantId, input);
			return c.json(dish, 201);
		},
	);

	// GET — listar platos
	router.get("/", auth, validate("query", listDishesQuerySchema), async (c) => {
		const restaurantId = getRestaurantId(c);
		const query = c.req.valid("query");
		const status = query.status
			? (query.status.toUpperCase() as "ACTIVE" | "INACTIVE" as DishStatus)
			: undefined;

		const dishes = await deps.listDishes.execute(restaurantId, status);
		return c.json(dishes);
	});

	// GET — detalle de plato
	router.get("/:dishId", auth, async (c) => {
		const restaurantId = getRestaurantId(c);
		const dishId = getDishId(c);

		const dish = await deps.getDish.execute(restaurantId, dishId);
		return c.json(dish);
	});

	// PATCH — actualizar plato (ADMIN o MANAGER)
	router.patch(
		"/:dishId",
		auth,
		staffOnly,
		validate("json", updateDishSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const dishId = getDishId(c);
			const input = c.req.valid("json");

			const dish = await deps.updateDish.execute(restaurantId, dishId, input);
			return c.json(dish);
		},
	);

	// PATCH — activar/desactivar plato (ADMIN o MANAGER)
	router.patch(
		"/:dishId/status",
		auth,
		staffOnly,
		validate("json", updateDishStatusSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const dishId = getDishId(c);
			const input = c.req.valid("json");

			const dish = await deps.updateDishStatus.execute(
				restaurantId,
				dishId,
				input,
			);
			return c.json(dish);
		},
	);

	return router;
}
