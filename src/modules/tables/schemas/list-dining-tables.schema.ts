import { z } from "zod";

export const listDiningTablesQuerySchema = z.object({
	status: z.enum(["active", "inactive"]).optional(),
});

export type ListDiningTablesQuery = z.infer<typeof listDiningTablesQuerySchema>;
