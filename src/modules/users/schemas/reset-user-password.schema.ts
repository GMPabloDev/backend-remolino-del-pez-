import { z } from "zod";

export const resetUserPasswordSchema = z.object({
	password: z
		.string()
		.min(10)
		.max(128)
		.regex(/[A-Z]/, "Debe contener al menos una mayúscula")
		.regex(/[a-z]/, "Debe contener al menos una minúscula")
		.regex(/[0-9]/, "Debe contener al menos un número"),
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
