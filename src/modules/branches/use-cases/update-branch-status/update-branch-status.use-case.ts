import type { BranchWithRelations } from "../../repositories/branch.repository";
import type { BranchStatus } from "../../../../generated/prisma/client";

export interface UpdateBranchStatusUseCase {
  execute(restaurantId: string, branchId: string, status: BranchStatus): Promise<BranchWithRelations>;
}
