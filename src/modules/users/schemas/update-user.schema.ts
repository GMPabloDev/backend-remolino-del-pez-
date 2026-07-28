import { z } from "zod";

export const updateUserSchema = z
	.object({
		fullName: z.string().min(1).max(150).optional(),
		email: z.string().email().max(320).optional(),
		phone: z.string().max(30).optional(),
		role: z.enum(["admin", "manager", "branch_admin"]).optional(),
		branchId: z.string().uuid().optional().nullable(),
	})
	.refine(
		(data) => {
			if (data.role === "branch_admin") {
				// Si el rol es branch_admin, branchId debe estar presente
				return data.branchId !== undefined && data.branchId !== null;
			}
			if (
				data.role === "admin" ||
				data.role === "manager" ||
				// Si no se especifica rol pero se especifica branchId, asumimos que el rol actual
				// no es branch_admin; la validación cruzada la hace el caso de uso
				data.branchId
			) {
				return true;
			}
			return true;
		},
		{
			message:
				"El rol branch_admin requiere una sucursal asignada y admin/manager no pueden tenerla",
			path: ["branchId"],
		},
	);

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
