import { Hono } from "hono";
import type { MenuCategoryStatus } from "../../generated/prisma/client";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createCategorySchema } from "./schemas/create-category.schema";
import { listCategoriesQuerySchema } from "./schemas/list-categories.schema";
import { updateCategorySchema } from "./schemas/update-category.schema";
import { updateCategoryStatusSchema } from "./schemas/update-category-status.schema";
import type { CreateCategoryUseCase } from "./use-cases/create-category/create-category.use-case";
import type { GetCategoryUseCase } from "./use-cases/get-category/get-category.use-case";
import type { ListCategoriesUseCase } from "./use-cases/list-categories/list-categories.use-case";
import type { UpdateCategoryUseCase } from "./use-cases/update-category/update-category.use-case";
import type { UpdateCategoryStatusUseCase } from "./use-cases/update-category-status/update-category-status.use-case";

function getRestaurantId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("restaurantId");
	if (!id) throw new Error("restaurantId es requerido");
	return id;
}

function getCategoryId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("categoryId");
	if (!id) throw new Error("categoryId es requerido");
	return id;
}

export function createCategoryRouter(deps: {
	createCategory: CreateCategoryUseCase;
	listCategories: ListCategoriesUseCase;
	getCategory: GetCategoryUseCase;
	updateCategory: UpdateCategoryUseCase;
	updateCategoryStatus: UpdateCategoryStatusUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono {
	const router = new Hono();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const staffOnly = requireRole("ADMIN", "MANAGER");

	// POST — crear categoría (ADMIN o MANAGER)
	router.post(
		"/",
		auth,
		staffOnly,
		validate("json", createCategorySchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const input = c.req.valid("json");
			const category = await deps.createCategory.execute(
				restaurantId,
				input,
			);
			return c.json(category, 201);
		},
	);

	// GET — listar categorías
	router.get(
		"/",
		auth,
		validate("query", listCategoriesQuerySchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const query = c.req.valid("query");
			const status = query.status
				? ((query.status.toUpperCase() as "ACTIVE" | "INACTIVE") as MenuCategoryStatus)
				: undefined;

			const categories = await deps.listCategories.execute(
				restaurantId,
				status,
			);
			return c.json(categories);
		},
	);

	// GET — detalle de categoría
	router.get("/:categoryId", auth, async (c) => {
		const restaurantId = getRestaurantId(c);
		const categoryId = getCategoryId(c);

		const category = await deps.getCategory.execute(
			restaurantId,
			categoryId,
		);
		return c.json(category);
	});

	// PATCH — actualizar categoría (ADMIN o MANAGER)
	router.patch(
		"/:categoryId",
		auth,
		staffOnly,
		validate("json", updateCategorySchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const categoryId = getCategoryId(c);
			const input = c.req.valid("json");

			const category = await deps.updateCategory.execute(
				restaurantId,
				categoryId,
				input,
			);
			return c.json(category);
		},
	);

	// PATCH — activar/desactivar categoría (ADMIN o MANAGER)
	router.patch(
		"/:categoryId/status",
		auth,
		staffOnly,
		validate("json", updateCategoryStatusSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const categoryId = getCategoryId(c);
			const input = c.req.valid("json");

			const category = await deps.updateCategoryStatus.execute(
				restaurantId,
				categoryId,
				input,
			);
			return c.json(category);
		},
	);

	return router;
}
