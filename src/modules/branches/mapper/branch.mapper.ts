import type { BranchDto } from "../dto/branch.dto";
import type { BranchWithRelations } from "../repositories/branch.repository";

/** Convierte una sucursal Prisma al DTO público con estado en minúsculas. */
export function toBranchDto(branch: BranchWithRelations): BranchDto {
	return {
		id: branch.id,
		restaurantId: branch.restaurantId,
		slug: branch.slug,
		name: branch.name,
		code: branch.code,
		address: branch.address,
		district: branch.district,
		province: branch.province,
		department: branch.department,
		phone: branch.phone,
		email: branch.email,
		status: branch.status === "ACTIVE" ? "active" : "inactive",
		createdAt: branch.createdAt.toISOString(),
		updatedAt: branch.updatedAt.toISOString(),
		rules: branch.rules,
		intervals: branch.intervals,
	};
}
