import { z } from "zod";

export const updateRestaurantSchema = z.object({
	name: z.string().min(1).optional(),
	legalName: z.string().min(1).optional(),
	taxId: z.string().length(11).regex(/^\d+$/).optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
});

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
