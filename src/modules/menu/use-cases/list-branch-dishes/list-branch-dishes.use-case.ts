import type { BranchDishListItemDto } from "../../dto/branch-dish.dto";

export interface ListBranchDishesUseCase {
	execute(
		restaurantId: string,
		branchId: string,
	): Promise<BranchDishListItemDto[]>;
}
