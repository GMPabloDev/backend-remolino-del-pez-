import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchDto } from "../../dto/branch.dto";

export interface UpdateBranchStatusUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		status: BranchStatus,
	): Promise<BranchDto>;
}
