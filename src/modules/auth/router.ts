import { Hono } from "hono";
import type { TokenService } from "../../shared/security/token.service";
import { validate } from "../../shared/validation/validation-hook";
import { authMiddleware } from "./middleware/auth.middleware";
import type { AuthContext } from "./middleware/auth-context.types";
import type { AuthRepository } from "./repositories/auth.repository";
import { changePasswordSchema } from "./schemas/change-password.schema";
import { loginSchema } from "./schemas/login.schema";
import { logoutSchema } from "./schemas/logout.schema";
import { refreshSessionSchema } from "./schemas/refresh-session.schema";
import type { ChangePasswordUseCase } from "./use-cases/change-password/change-password.use-case";
import type { LoginUseCase } from "./use-cases/login/login.use-case";
import type { LogoutUseCase } from "./use-cases/logout/logout.use-case";
import type { RefreshSessionUseCase } from "./use-cases/refresh-session/refresh-session.use-case";

export function createAuthRouter(deps: {
	loginUseCase: LoginUseCase;
	refreshSessionUseCase: RefreshSessionUseCase;
	logoutUseCase: LogoutUseCase;
	changePasswordUseCase: ChangePasswordUseCase;
	tokenService: TokenService;
	authRepository: AuthRepository;
}): Hono<{ Variables: { auth: AuthContext } }> {
	const router = new Hono<{ Variables: { auth: AuthContext } }>();

	const auth = authMiddleware(deps.tokenService, deps.authRepository);

	// POST /auth/login — público
	router.post("/login", validate("json", loginSchema), async (c) => {
		const input = c.req.valid("json");
		const result = await deps.loginUseCase.execute(input);
		return c.json(result, 200);
	});

	// POST /auth/refresh — público
	router.post("/refresh", validate("json", refreshSessionSchema), async (c) => {
		const input = c.req.valid("json");
		const result = await deps.refreshSessionUseCase.execute(input);
		return c.json(result, 200);
	});

	// POST /auth/logout — público
	router.post("/logout", validate("json", logoutSchema), async (c) => {
		const input = c.req.valid("json");
		await deps.logoutUseCase.execute(input);
		return c.body(null, 204);
	});

	// PATCH /auth/password — requiere autenticación
	router.patch(
		"/password",
		auth,
		validate("json", changePasswordSchema),
		async (c) => {
			const authCtx = c.get("auth");
			const input = c.req.valid("json");
			await deps.changePasswordUseCase.execute(authCtx.userId, input);
			return c.body(null, 204);
		},
	);

	return router;
}
