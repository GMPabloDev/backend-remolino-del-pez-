import { Hono } from "hono";
import type { BranchStatus } from "../../generated/prisma/client";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import type { AuthContext } from "../auth/middleware/auth-context.types";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createBranchSchema } from "./schemas/create-branch.schema";
import { listBranchesQuerySchema } from "./schemas/list-branches.schema";
import { replaceScheduleSchema } from "./schemas/replace-schedule.schema";
import { updateBranchSchema } from "./schemas/update-branch.schema";
import { updateBranchStatusSchema } from "./schemas/update-branch-status.schema";
import type { CreateBranchUseCase } from "./use-cases/create-branch/create-branch.use-case";
import type { GetBranchUseCase } from "./use-cases/get-branch/get-branch.use-case";
import type { ListBranchesUseCase } from "./use-cases/list-branches/list-branches.use-case";
import type { ReplaceBranchScheduleUseCase } from "./use-cases/replace-branch-schedule/replace-branch-schedule.use-case";
import type { UpdateBranchUseCase } from "./use-cases/update-branch/update-branch.use-case";
import type { UpdateBranchStatusUseCase } from "./use-cases/update-branch-status/update-branch-status.use-case";

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

function forbiddenResponse(c: {
	json: (body: unknown, status: number) => Response;
}): Response {
	return c.json(
		{
			error: {
				code: "FORBIDDEN",
				message: "No tienes permisos para acceder a esta sucursal",
				details: [],
			},
		},
		403,
	);
}

export function createBranchRouter(deps: {
	createBranch: CreateBranchUseCase;
	listBranches: ListBranchesUseCase;
	getBranch: GetBranchUseCase;
	updateBranch: UpdateBranchUseCase;
	replaceSchedule: ReplaceBranchScheduleUseCase;
	updateStatus: UpdateBranchStatusUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const staffOnly = requireRole("ADMIN", "MANAGER");

	// POST — crear sucursal (ADMIN o MANAGER)
	router.post(
		"/",
		auth,
		staffOnly,
		validate("json", createBranchSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const input = c.req.valid("json");
			const branch = await deps.createBranch.execute(restaurantId, input);
			return c.json(branch, 201);
		},
	);

	// GET — listar sucursales
	router.get(
		"/",
		auth,
		validate("query", listBranchesQuerySchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const query = c.req.valid("query");
			const status = query.status?.toUpperCase() as BranchStatus | undefined;
			const authCtx = c.get("auth");

			const assignedBranchId =
				authCtx.userRole === "BRANCH_ADMIN"
					? (authCtx.userBranchId ?? undefined)
					: undefined;

			const branches = await deps.listBranches.execute(
				restaurantId,
				status,
				assignedBranchId,
			);
			return c.json(branches);
		},
	);

	// GET — detalle de sucursal
	router.get("/:branchId", auth, async (c) => {
		const restaurantId = getRestaurantId(c);
		const branchId = getBranchId(c);
		const authCtx = c.get("auth");

		if (
			authCtx.userRole === "BRANCH_ADMIN" &&
			authCtx.userBranchId !== branchId
		) {
			return forbiddenResponse(c);
		}

		const branch = await deps.getBranch.execute(restaurantId, branchId);
		return c.json(branch);
	});

	// PATCH — actualizar sucursal
	router.patch(
		"/:branchId",
		auth,
		validate("json", updateBranchSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const authCtx = c.get("auth");

			if (
				authCtx.userRole === "BRANCH_ADMIN" &&
				authCtx.userBranchId !== branchId
			) {
				return forbiddenResponse(c);
			}

			const input = c.req.valid("json");
			const branch = await deps.updateBranch.execute(
				restaurantId,
				branchId,
				input,
			);
			return c.json(branch);
		},
	);

	// PUT — reemplazar horarios
	router.put(
		"/:branchId/schedule",
		auth,
		validate("json", replaceScheduleSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const authCtx = c.get("auth");

			if (
				authCtx.userRole === "BRANCH_ADMIN" &&
				authCtx.userBranchId !== branchId
			) {
				return forbiddenResponse(c);
			}

			const input = c.req.valid("json");
			const branch = await deps.replaceSchedule.execute(
				restaurantId,
				branchId,
				input,
			);
			return c.json(branch);
		},
	);

	// PATCH — activar/desactivar sucursal
	router.patch(
		"/:branchId/status",
		auth,
		validate("json", updateBranchStatusSchema),
		async (c) => {
			const restaurantId = getRestaurantId(c);
			const branchId = getBranchId(c);
			const authCtx = c.get("auth");

			if (
				authCtx.userRole === "BRANCH_ADMIN" &&
				authCtx.userBranchId !== branchId
			) {
				return forbiddenResponse(c);
			}

			const { status } = c.req.valid("json");
			const statusEnum = status.toUpperCase() as BranchStatus;
			const branch = await deps.updateStatus.execute(
				restaurantId,
				branchId,
				statusEnum,
			);
			return c.json(branch);
		},
	);

	return router;
}
