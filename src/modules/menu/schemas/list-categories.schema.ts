import { z } from "zod";

export const listCategoriesQuerySchema = z.object({
	status: z.enum(["active", "inactive"]).optional(),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
