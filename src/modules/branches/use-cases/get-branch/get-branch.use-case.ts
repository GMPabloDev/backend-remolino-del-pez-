import type { BranchDto } from "../../dto/branch.dto";

export interface GetBranchUseCase {
	execute(restaurantId: string, branchId: string): Promise<BranchDto>;
}
