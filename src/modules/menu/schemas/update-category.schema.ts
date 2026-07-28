import { z } from "zod";

export const updateCategorySchema = z.object({
	name: z
		.string()
		.min(1)
		.max(80)
		.transform((v) => v.trim())
		.optional(),
	position: z.number().int().positive().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
