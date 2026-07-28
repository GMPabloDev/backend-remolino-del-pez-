import type { Context, Next } from "hono";
import type { UserRole } from "../../../generated/prisma/client";
import type { AuthContext } from "./auth-context.types";

export function requireRole(...roles: UserRole[]) {
	return async (c: Context, next: Next) => {
		const auth = c.get("auth") as AuthContext | undefined;

		if (!auth || !roles.includes(auth.userRole)) {
			return c.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "No tienes permisos para realizar esta acción",
						details: [],
					},
				},
				403,
			);
		}

		await next();
	};
}
