import type { BranchDishConfigDto } from "../../dto/branch-dish.dto";
import type { UpsertBranchDishInput } from "../../schemas/upsert-branch-dish.schema";

export interface UpsertBranchDishUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		dishId: string,
		input: UpsertBranchDishInput,
	): Promise<BranchDishConfigDto>;
}
