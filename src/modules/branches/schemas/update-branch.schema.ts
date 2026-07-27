import { z } from "zod";

const updateRulesSchema = z.object({
  defaultReservationDurationMinutes: z.number().int().positive().optional(),
  minimumAdvanceMinutes: z.number().int().positive().optional(),
  maximumAdvanceDays: z.number().int().positive().optional(),
  arrivalToleranceMinutes: z.number().int().positive().optional(),
  maxPartySize: z.number().int().positive().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  rules: updateRulesSchema.optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
