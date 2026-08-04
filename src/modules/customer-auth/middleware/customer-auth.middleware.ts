import type { Context, Next } from "hono";
import type { CustomerRepository } from "../../customers/repositories/customer.repository";
import type { CustomerTokenService } from "../services/customer-token.service";
import type { CustomerAuthContext } from "./customer-auth-context.types";

export function customerAuthMiddleware(
	customerTokenService: CustomerTokenService,
	customerRepository: CustomerRepository,
) {
	return async (c: Context, next: Next) => {
		const header = c.req.header("Authorization");

		if (!header?.startsWith("Bearer ")) {
			return unauthorized(c);
		}

		try {
			const payload = await customerTokenService.verifyAccessToken(
				header.slice(7),
			);
			const session = await customerRepository.findSessionById(payload.sid);

			if (
				!session ||
				session.customer.id !== payload.sub ||
				session.revokedAt ||
				session.expiresAt <= new Date()
			) {
				return unauthorized(c);
			}

			const authContext: CustomerAuthContext = {
				customerId: session.customer.id,
				sessionId: session.id,
			};

			c.set("customerAuth", authContext);
			await next();
		} catch {
			return unauthorized(c);
		}
	};
}

function unauthorized(c: Context): Response {
	return c.json(
		{
			error: {
				code: "CUSTOMER_AUTH_REQUIRED",
				message: "Se requiere autenticación de cliente",
				details: [],
			},
		},
		401,
	);
}
