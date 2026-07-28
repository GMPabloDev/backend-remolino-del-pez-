import type { DiningTableStatus } from "../../../../generated/prisma/client";
import type { DiningTableDto } from "../../dto/dining-table.dto";

export interface ListTablesUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		status?: DiningTableStatus,
	): Promise<DiningTableDto[]>;
}
