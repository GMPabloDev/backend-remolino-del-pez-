import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchWithRelations } from "../../repositories/branch.repository";

export interface UpdateBranchStatusUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		status: BranchStatus,
	): Promise<BranchWithRelations>;
}
