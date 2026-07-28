import { z } from "zod";

export const updateDiningTableStatusSchema = z.object({
	status: z.enum(["active", "inactive"]),
});

export type UpdateDiningTableStatusInput = z.infer<
	typeof updateDiningTableStatusSchema
>;
