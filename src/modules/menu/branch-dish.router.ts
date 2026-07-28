import { Hono } from "hono";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import type { AuthContext } from "../auth/middleware/auth-context.types";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { upsertBranchDishSchema } from "./schemas/upsert-branch-dish.schema";
import type { ListBranchDishesUseCase } from "./use-cases/list-branch-dishes/list-branch-dishes.use-case";
import type { UpsertBranchDishUseCase } from "./use-cases/upsert-branch-dish/upsert-branch-dish.use-case";

function getRestaurantId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("restaurantId");
	if (!id) throw new Error("restaurantId es requerido");
	return id;
}

function getBranchId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("branchId");
	if (!id) throw new Error("branchId es requerido");
	return id;
}

function getDishId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("dishId");
	if (!id) throw new Error("dishId es requerido");
	return id;
}

function forbiddenResponse(c: {
	json: (body: unknown, status: number) => Response;
}): Response {
	return c.json(
		{
			error: {
				code: "FORBIDDEN",
				message:
					"No tienes permisos para gestionar los platos de esta sucursal",
				details: [],
			},
		},
		403,
	);
}

/** Verifica que el usuario autenticado pueda operar sobre la sucursal indicada. */
function authorizeBranchAccess(
	c: {
		get: (key: string) => unknown;
		json: (body: unknown, status: number) => Response;
	},
	branchId: string,
): boolean {
	const auth = c.get("auth") as AuthContext | undefined;
	if (!auth) return false;
	if (auth.userRole === "BRANCH_ADMIN" && auth.userBranchId !== branchId) {
		return false;
	}
	return true;
}

export function createBranchDishRouter(deps: {
	listBranchDishes: ListBranchDishesUseCase;
	upsertBranchDish: UpsertBranchDishUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);

	// GET — listar platos con su configuración local
	router.get("/", auth, async (c) => {
		const restaurantId = getRestaurantId(c);
		const branchId = getBranchId(c);

		if (!authorizeBranchAccess(c, branchId)) {
			return forbiddenResponse(c);
		}

		const dishes = await deps.listBranchDishes.execute(restaurantId, branchId);
		return c.json(dishes);
	});

	// PUT — crear o reemplazar configuración de un plato en la sucursal
	router.put(
		"/:dishId",
		auth,
		validate("json", upsertBranchDishSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const dishId = getDishId(c);

			// BRANCH_ADMIN solo puede en su sucursal
			const auth = c.get("auth") as AuthContext | undefined;
			if (!auth) {
				return c.json(
					{
						error: {
							code: "UNAUTHORIZED",
							message: "Autenticación requerida",
							details: [],
						},
					},
					401,
				);
			}

			if (auth.userRole === "BRANCH_ADMIN") {
				if (auth.userBranchId !== branchId) {
					return forbiddenResponse(c);
				}
			} else if (auth.userRole !== "ADMIN" && auth.userRole !== "MANAGER") {
				return forbiddenResponse(c);
			}

			const input = c.req.valid("json");
			const config = await deps.upsertBranchDish.execute(
				restaurantId,
				branchId,
				dishId,
				input,
			);
			return c.json(config);
		},
	);

	return router;
}
