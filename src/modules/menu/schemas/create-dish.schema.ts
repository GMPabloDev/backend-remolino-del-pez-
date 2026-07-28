import { z } from "zod";

const IMAGE_URL_MAX = 2048;

export const createDishSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(120)
		.transform((v) => v.trim()),
	description: z
		.string()
		.min(1)
		.max(1000)
		.transform((v) => v.trim()),
	imageUrl: z
		.string()
		.max(IMAGE_URL_MAX)
		.url()
		.refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
			message: "La URL de la imagen debe ser http o https",
		})
		.nullable()
		.optional()
		.default(null),
	ingredients: z
		.array(z.string().min(1).max(100))
		.max(50)
		.optional()
		.default([]),
	allergens: z.array(z.string().min(1).max(100)).max(30).optional().default([]),
	categoryId: z.string().uuid(),
	position: z.number().int().positive(),
});

export type CreateDishInput = z.infer<typeof createDishSchema>;
