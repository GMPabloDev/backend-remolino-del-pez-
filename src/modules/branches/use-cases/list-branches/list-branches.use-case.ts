import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchDto } from "../../dto/branch.dto";

export interface ListBranchesUseCase {
	execute(
		restaurantId: string,
		status?: BranchStatus,
		assignedBranchId?: string,
	): Promise<BranchDto[]>;
}
