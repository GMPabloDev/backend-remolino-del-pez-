import { z } from "zod";

export const customerRefreshTokenSchema = z
	.string()
	.min(1, "El refresh token es obligatorio")
	.max(128, "El refresh token no es válido")
	.regex(/^[a-f0-9]+$/, "El refresh token no es válido");

export const refreshCustomerSessionSchema = z.object({
	refreshToken: customerRefreshTokenSchema,
});

export type RefreshCustomerSessionInput = z.infer<
	typeof refreshCustomerSessionSchema
>;
