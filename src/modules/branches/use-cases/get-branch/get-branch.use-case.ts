import type { BranchWithRelations } from "../../repositories/branch.repository";

export interface GetBranchUseCase {
	execute(restaurantId: string, branchId: string): Promise<BranchWithRelations>;
}
