import type { BranchWithRelations } from "../../repositories/branch.repository";
import type { UpdateBranchInput } from "../../schemas/update-branch.schema";

export interface UpdateBranchUseCase {
  execute(restaurantId: string, branchId: string, input: UpdateBranchInput): Promise<BranchWithRelations>;
}
