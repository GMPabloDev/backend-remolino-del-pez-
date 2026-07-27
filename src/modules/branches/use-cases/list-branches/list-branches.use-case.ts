import type { BranchWithRelations } from "../../repositories/branch.repository";
import type { BranchStatus } from "../../../../generated/prisma/client";

export interface ListBranchesUseCase {
  execute(restaurantId: string, status?: BranchStatus): Promise<BranchWithRelations[]>;
}
