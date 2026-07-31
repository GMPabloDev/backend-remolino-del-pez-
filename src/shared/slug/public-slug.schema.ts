import { z } from "zod";
import { PUBLIC_SLUG_MAX_LENGTH } from "./slug";

export const publicSlugSchema = z
	.string()
	.min(1, "El slug es obligatorio")
	.max(
		PUBLIC_SLUG_MAX_LENGTH,
		`El slug no puede superar ${PUBLIC_SLUG_MAX_LENGTH} caracteres`,
	)
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		"El slug debe usar minúsculas, números y guiones simples",
	);

export const publicRestaurantSlugParamsSchema = z.object({
	restaurantSlug: publicSlugSchema,
});

export const publicBranchSlugParamsSchema =
	publicRestaurantSlugParamsSchema.extend({
		branchSlug: publicSlugSchema,
	});

export type PublicRestaurantSlugParams = z.infer<
	typeof publicRestaurantSlugParamsSchema
>;

export type PublicBranchSlugParams = z.infer<
	typeof publicBranchSlugParamsSchema
>;
