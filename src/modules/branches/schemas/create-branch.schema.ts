import { z } from "zod";

const rulesSchema = z
  .object({
    defaultReservationDurationMinutes: z.number().int().positive(),
    minimumAdvanceMinutes: z.number().int().positive(),
    maximumAdvanceDays: z.number().int().positive(),
    arrivalToleranceMinutes: z.number().int().positive(),
    maxPartySize: z.number().int().positive(),
  })
  .refine(
    (rules) => rules.minimumAdvanceMinutes < rules.maximumAdvanceDays * 24 * 60,
    {
      message: "La anticipación mínima debe ser menor que la máxima",
      path: ["minimumAdvanceMinutes"],
    },
  );

export const createBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().min(1),
  district: z.string().min(1),
  province: z.string().min(1),
  department: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  rules: rulesSchema,
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
