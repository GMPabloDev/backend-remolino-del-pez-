import { z } from "zod";

export const listBranchesQuerySchema = z.object({
	status: z.enum(["active", "inactive"]).optional(),
});

export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
