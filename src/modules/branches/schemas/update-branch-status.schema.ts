import { z } from "zod";

export const updateBranchStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export type UpdateBranchStatusInput = z.infer<typeof updateBranchStatusSchema>;
