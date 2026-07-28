import { z } from "zod";

const PRICE_REGEX = /^\d{1,8}\.\d{2}$/;
const MAX_PRICE = 99999999.99;

export const upsertBranchDishSchema = z.object({
	price: z
		.string()
		.regex(PRICE_REGEX, {
			message:
				"El precio debe ser una cadena decimal con exactamente dos posiciones (ej. 35.90)",
		})
		.refine(
			(v) => {
				const num = Number.parseFloat(v);
				return num > 0 && num <= MAX_PRICE;
			},
			{
				message: `El precio debe ser mayor que 0.00 y no superar ${MAX_PRICE}`,
			},
		),
	status: z.enum(["available", "sold_out", "inactive"]),
});

export type UpsertBranchDishInput = z.infer<typeof upsertBranchDishSchema>;
