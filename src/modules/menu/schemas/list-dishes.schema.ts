import { z } from "zod";

export const listDishesQuerySchema = z.object({
	status: z.enum(["active", "inactive"]).optional(),
});

export type ListDishesQuery = z.infer<typeof listDishesQuerySchema>;
