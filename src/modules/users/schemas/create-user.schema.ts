import { z } from "zod";

export const createUserSchema = z
	.object({
		fullName: z.string().min(1).max(150),
		email: z.string().email().max(320),
		phone: z.string().max(30).optional(),
		password: z
			.string()
			.min(10)
			.max(128)
			.regex(/[A-Z]/, "Debe contener al menos una mayúscula")
			.regex(/[a-z]/, "Debe contener al menos una minúscula")
			.regex(/[0-9]/, "Debe contener al menos un número"),
		role: z.enum(["admin", "manager", "branch_admin"]),
		branchId: z.string().uuid().optional(),
	})
	.refine(
		(data) => {
			if (data.role === "branch_admin" && !data.branchId) {
				return false;
			}
			return true;
		},
		{
			message: "El rol branch_admin requiere una sucursal asignada",
			path: ["branchId"],
		},
	)
	.refine(
		(data) => {
			if ((data.role === "admin" || data.role === "manager") && data.branchId) {
				return false;
			}
			return true;
		},
		{
			message: "Los roles admin y manager no pueden tener sucursal asignada",
			path: ["branchId"],
		},
	);

export type CreateUserInput = z.infer<typeof createUserSchema>;
