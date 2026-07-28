import { z } from "zod";

const IMAGE_URL_MAX = 2048;

export const updateDishSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(120)
		.transform((v) => v.trim())
		.optional(),
	description: z
		.string()
		.min(1)
		.max(1000)
		.transform((v) => v.trim())
		.optional(),
	imageUrl: z
		.string()
		.max(IMAGE_URL_MAX)
		.url()
		.refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
			message: "La URL de la imagen debe ser http o https",
		})
		.nullable()
		.optional(),
	ingredients: z.array(z.string().min(1).max(100)).max(50).optional(),
	allergens: z.array(z.string().min(1).max(100)).max(30).optional(),
	categoryId: z.string().uuid().optional(),
	position: z.number().int().positive().optional(),
});

export type UpdateDishInput = z.infer<typeof updateDishSchema>;
