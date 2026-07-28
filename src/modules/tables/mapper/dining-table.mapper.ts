import type { DiningTable } from "../../../generated/prisma/client";
import type { DiningTableDto } from "../dto/dining-table.dto";

/** Convierte un modelo Prisma DiningTable al DTO público con estado en minúsculas. */
export function toDiningTableDto(table: DiningTable): DiningTableDto {
	return {
		id: table.id,
		branchId: table.branchId,
		code: table.code,
		capacity: table.capacity,
		status: table.status === "ACTIVE" ? "active" : "inactive",
		createdAt: table.createdAt.toISOString(),
		updatedAt: table.updatedAt.toISOString(),
	};
}
