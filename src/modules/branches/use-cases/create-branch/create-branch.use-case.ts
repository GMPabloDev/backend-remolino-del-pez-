import type { BranchWithRelations } from "../../repositories/branch.repository";
import type { CreateBranchInput } from "../../schemas/create-branch.schema";

export interface CreateBranchUseCase {
  execute(restaurantId: string, input: CreateBranchInput): Promise<BranchWithRelations>;
}
