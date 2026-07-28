import { z } from "zod";

const TABLE_CODE_REGEX = /^[A-Z0-9_-]{1,30}$/;

export const createDiningTableSchema = z.object({
	code: z
		.string()
		.min(1)
		.max(30)
		.transform((v) => v.trim().toUpperCase())
		.refine((v) => TABLE_CODE_REGEX.test(v), {
			message:
				"El código solo puede contener letras, números, guiones y guiones bajos",
		}),
	capacity: z.number().int().positive(),
});

export type CreateDiningTableInput = z.infer<typeof createDiningTableSchema>;
