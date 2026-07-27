import { z } from "zod";

export const createRestaurantSchema = z.object({
	name: z.string().min(1),
	legalName: z.string().min(1),
	taxId: z.string().length(11).regex(/^\d+$/),
	phone: z.string().optional(),
	email: z.string().email().optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
