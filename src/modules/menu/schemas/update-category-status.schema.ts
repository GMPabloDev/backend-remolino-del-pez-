import { z } from "zod";

export const updateCategoryStatusSchema = z.object({
	status: z.enum(["active", "inactive"]),
});

export type UpdateCategoryStatusInput = z.infer<
	typeof updateCategoryStatusSchema
>;
