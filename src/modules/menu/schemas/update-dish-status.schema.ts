import { z } from "zod";

export const updateDishStatusSchema = z.object({
	status: z.enum(["active", "inactive"]),
});

export type UpdateDishStatusInput = z.infer<typeof updateDishStatusSchema>;
