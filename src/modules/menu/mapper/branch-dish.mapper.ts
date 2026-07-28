import type { BranchDish } from "../../../generated/prisma/client";
import type { BranchDishConfigDto } from "../dto/branch-dish.dto";

/** Convierte el estado interno de BranchDish a la representación pública en minúsculas. */
export function toBranchDishStatus(
	status: string,
): "available" | "sold_out" | "inactive" {
	switch (status) {
		case "AVAILABLE":
			return "available";
		case "SOLD_OUT":
			return "sold_out";
		default:
			return "inactive";
	}
}

/** Convierte un BranchDish a su DTO de configuración pública. */
export function toBranchDishConfigDto(
	branchDish: BranchDish,
): BranchDishConfigDto {
	return {
		price: branchDish.price.toString(),
		status: toBranchDishStatus(branchDish.status),
	};
}
