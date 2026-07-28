import { z } from "zod";

export const listUsersQuerySchema = z.object({
	role: z.enum(["admin", "manager", "branch_admin"]).optional(),
	status: z.enum(["active", "inactive"]).optional(),
	branchId: z.string().uuid().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
