import { z } from "zod";

const magicLinkTokenSchema = z
	.string()
	.min(1, "El token es obligatorio")
	.max(512, "El token no es válido")
	.regex(/^[A-Za-z0-9_-]+$/, "El token no es válido");

export const exchangeCustomerMagicLinkSchema = z.object({
	token: magicLinkTokenSchema,
});

export type ExchangeCustomerMagicLinkInput = z.infer<
	typeof exchangeCustomerMagicLinkSchema
>;
