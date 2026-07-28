import { z } from "zod";

export const createCategorySchema = z.object({
	name: z
		.string()
		.min(1)
		.max(80)
		.transform((v) => v.trim()),
	position: z.number().int().positive(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
