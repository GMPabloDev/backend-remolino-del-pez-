import type { Context, Next } from "hono";
import type { TokenService } from "../../../shared/security/token.service";
import type { AuthRepository } from "../repositories/auth.repository";
import type { AuthContext } from "./auth-context.types";

export function authMiddleware(
	tokenService: TokenService,
	authRepository: AuthRepository,
) {
	return async (c: Context, next: Next) => {
		const header = c.req.header("Authorization");

		if (!header?.startsWith("Bearer ")) {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "Token de acceso requerido",
						details: [],
					},
				},
				401,
			);
		}

		const token = header.slice(7);

		try {
			const payload = await tokenService.verifyAccessToken(token);

			// Cargar usuario y sesión desde BD (datos frescos, no del JWT)
			const [user, session] = await Promise.all([
				authRepository.findUserById(payload.sub),
				authRepository.findSessionById(payload.sid),
			]);

			if (!user || user.status === "INACTIVE") {
				return c.json(
					{
						error: {
							code: "UNAUTHORIZED",
							message: "Usuario no encontrado o inactivo",
							details: [],
						},
					},
					401,
				);
			}

			if (!session || session.revokedAt || session.expiresAt < new Date()) {
				return c.json(
					{
						error: {
							code: "UNAUTHORIZED",
							message: "Sesión inválida o expirada",
							details: [],
						},
					},
					401,
				);
			}

			const authContext: AuthContext = {
				userId: user.id,
				sessionId: session.id,
				userRole: user.role,
				userStatus: user.status,
				userBranchId: user.branchId,
			};

			c.set("auth", authContext);
			await next();
		} catch {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "Token inválido o expirado",
						details: [],
					},
				},
				401,
			);
		}
	};
}
