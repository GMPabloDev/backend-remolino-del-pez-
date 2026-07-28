import type { DiningTableDto } from "../../dto/dining-table.dto";
import type { UpdateDiningTableStatusInput } from "../../schemas/update-dining-table-status.schema";

export interface UpdateTableStatusUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		tableId: string,
		input: UpdateDiningTableStatusInput,
	): Promise<DiningTableDto>;
}
