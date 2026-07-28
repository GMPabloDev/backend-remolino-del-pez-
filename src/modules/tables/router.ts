import { Hono } from "hono";
import type { DiningTableStatus } from "../../generated/prisma/client";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import type { AuthContext } from "../auth/middleware/auth-context.types";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createDiningTableSchema } from "./schemas/create-dining-table.schema";
import { listDiningTablesQuerySchema } from "./schemas/list-dining-tables.schema";
import { updateDiningTableSchema } from "./schemas/update-dining-table.schema";
import { updateDiningTableStatusSchema } from "./schemas/update-dining-table-status.schema";
import type { CreateTableUseCase } from "./use-cases/create-table/create-table.use-case";
import type { GetTableUseCase } from "./use-cases/get-table/get-table.use-case";
import type { ListTablesUseCase } from "./use-cases/list-tables/list-tables.use-case";
import type { UpdateTableUseCase } from "./use-cases/update-table/update-table.use-case";
import type { UpdateTableStatusUseCase } from "./use-cases/update-table-status/update-table-status.use-case";

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

function getTableId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("tableId");
	if (!id) throw new Error("tableId es requerido");
	return id;
}

function forbiddenResponse(c: {
	json: (body: unknown, status: number) => Response;
}): Response {
	return c.json(
		{
			error: {
				code: "FORBIDDEN",
				message: "No tienes permisos para gestionar las mesas de esta sucursal",
				details: [],
			},
		},
		403,
	);
}

/**
 * Verifica que el usuario autenticado pueda operar sobre la sucursal indicada.
 * ADMIN y MANAGER operan sobre cualquier sucursal.
 * BRANCH_ADMIN solo sobre la suya.
 */
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

export function createDiningTableRouter(deps: {
	createTable: CreateTableUseCase;
	listTables: ListTablesUseCase;
	getTable: GetTableUseCase;
	updateTable: UpdateTableUseCase;
	updateTableStatus: UpdateTableStatusUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const staffOnly = requireRole("ADMIN", "MANAGER");

	// POST — crear mesa (ADMIN o MANAGER)
	router.post(
		"/",
		auth,
		staffOnly,
		validate("json", createDiningTableSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const input = c.req.valid("json");
			const table = await deps.createTable.execute(
				restaurantId,
				branchId,
				input,
			);
			return c.json(table, 201);
		},
	);

	// GET — listar mesas
	router.get(
		"/",
		auth,
		validate("query", listDiningTablesQuerySchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);

			if (!authorizeBranchAccess(c, branchId)) {
				return forbiddenResponse(c);
			}

			const query = c.req.valid("query");
			const status = query.status
				? (query.status.toUpperCase() as
						| "ACTIVE"
						| "INACTIVE" as DiningTableStatus)
				: undefined;

			const tables = await deps.listTables.execute(
				restaurantId,
				branchId,
				status,
			);
			return c.json(tables);
		},
	);

	// GET — detalle de mesa
	router.get("/:tableId", auth, async (c) => {
		const restaurantId = getRestaurantId(c);
		const branchId = getBranchId(c);
		const tableId = getTableId(c);

		if (!authorizeBranchAccess(c, branchId)) {
			return forbiddenResponse(c);
		}

		const table = await deps.getTable.execute(restaurantId, branchId, tableId);
		return c.json(table);
	});

	// PATCH — actualizar mesa
	router.patch(
		"/:tableId",
		auth,
		validate("json", updateDiningTableSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const tableId = getTableId(c);

			if (!authorizeBranchAccess(c, branchId)) {
				return forbiddenResponse(c);
			}

			const input = c.req.valid("json");
			const table = await deps.updateTable.execute(
				restaurantId,
				branchId,
				tableId,
				input,
			);
			return c.json(table);
		},
	);

	// PATCH — activar/desactivar mesa
	router.patch(
		"/:tableId/status",
		auth,
		validate("json", updateDiningTableStatusSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const tableId = getTableId(c);

			if (!authorizeBranchAccess(c, branchId)) {
				return forbiddenResponse(c);
			}

			const input = c.req.valid("json");
			const table = await deps.updateTableStatus.execute(
				restaurantId,
				branchId,
				tableId,
				input,
			);
			return c.json(table);
		},
	);

	return router;
}
