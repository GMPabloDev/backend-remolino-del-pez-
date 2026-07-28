import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchWithRelations } from "../../repositories/branch.repository";

export interface ListBranchesUseCase {
	execute(
		restaurantId: string,
		status?: BranchStatus,
		assignedBranchId?: string,
	): Promise<BranchWithRelations[]>;
}
