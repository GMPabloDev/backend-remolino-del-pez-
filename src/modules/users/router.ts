import { Hono } from "hono";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import type { AuthContext } from "../auth/middleware/auth-context.types";
import { requireRole } from "../auth/middleware/require-role.middleware";
import type { AuthRepository } from "../auth/repositories/auth.repository";
import { createUserSchema } from "./schemas/create-user.schema";
import { listUsersQuerySchema } from "./schemas/list-users.schema";
import { resetUserPasswordSchema } from "./schemas/reset-user-password.schema";
import { updateUserSchema } from "./schemas/update-user.schema";
import { updateUserStatusSchema } from "./schemas/update-user-status.schema";
import type { CreateUserUseCase } from "./use-cases/create-user/create-user.use-case";
import type { GetUserUseCase } from "./use-cases/get-user/get-user.use-case";
import type { ListUsersUseCase } from "./use-cases/list-users/list-users.use-case";
import type { ResetUserPasswordUseCase } from "./use-cases/reset-user-password/reset-user-password.use-case";
import type { UpdateUserUseCase } from "./use-cases/update-user/update-user.use-case";
import type { UpdateUserStatusUseCase } from "./use-cases/update-user-status/update-user-status.use-case";

export function createUserRouter(deps: {
	createUser: CreateUserUseCase;
	listUsers: ListUsersUseCase;
	getUser: GetUserUseCase;
	updateUser: UpdateUserUseCase;
	updateUserStatus: UpdateUserStatusUseCase;
	resetUserPassword: ResetUserPasswordUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();
	const auth = authMiddleware(deps.tokenService, deps.authRepository);
	const adminOnly = requireRole("ADMIN");

	// Todas las rutas requieren autenticación + rol ADMIN
	router.use("*", auth, adminOnly);

	// POST /users
	router.post("/", validate("json", createUserSchema), async (c) => {
		const input = c.req.valid("json");
		const user = await deps.createUser.execute(input);
		return c.json(user, 201);
	});

	// GET /users
	router.get("/", validate("query", listUsersQuerySchema), async (c) => {
		const query = c.req.valid("query");
		const users = await deps.listUsers.execute(query);
		return c.json(users, 200);
	});

	// GET /users/:userId
	router.get("/:userId", async (c) => {
		const userId = c.req.param("userId");
		const user = await deps.getUser.execute(userId);
		return c.json(user, 200);
	});

	// PATCH /users/:userId
	router.patch("/:userId", validate("json", updateUserSchema), async (c) => {
		const userId = c.req.param("userId");
		const input = c.req.valid("json");
		const user = await deps.updateUser.execute(userId, input);
		return c.json(user, 200);
	});

	// PATCH /users/:userId/status
	router.patch(
		"/:userId/status",
		validate("json", updateUserStatusSchema),
		async (c) => {
			const userId = c.req.param("userId");
			const input = c.req.valid("json");
			const user = await deps.updateUserStatus.execute(userId, input);
			return c.json(user, 200);
		},
	);

	// PUT /users/:userId/password
	router.put(
		"/:userId/password",
		validate("json", resetUserPasswordSchema),
		async (c) => {
			const userId = c.req.param("userId");
			const input = c.req.valid("json");
			const user = await deps.resetUserPassword.execute(userId, input);
			return c.json(user, 200);
		},
	);

	return router;
}
