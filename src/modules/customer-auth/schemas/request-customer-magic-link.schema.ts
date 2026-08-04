import { z } from "zod";

export const requestCustomerMagicLinkSchema = z.object({
	email: z.string().trim().email("El email no es válido"),
});

export type RequestCustomerMagicLinkInput = z.infer<
	typeof requestCustomerMagicLinkSchema
>;
