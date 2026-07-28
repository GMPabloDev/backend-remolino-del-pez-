import { z } from "zod";

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z
		.string()
		.min(10)
		.max(128)
		.regex(/[A-Z]/, "Debe contener al menos una mayúscula")
		.regex(/[a-z]/, "Debe contener al menos una minúscula")
		.regex(/[0-9]/, "Debe contener al menos un número"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
