import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchRepository, BranchWithRelations } from "../../repositories/branch.repository";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import type { ListBranchesUseCase } from "./list-branches.use-case";

export class ListBranchesUseCaseImpl implements ListBranchesUseCase {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly restaurantExists: (id: string) => Promise<boolean>,
  ) {}

  async execute(restaurantId: string, status?: BranchStatus): Promise<BranchWithRelations[]> {
    const exists = await this.restaurantExists(restaurantId);
    if (!exists) {
      throw new RestaurantNotFoundException();
    }

    return this.branchRepository.findByRestaurantId(restaurantId, status);
  }
}
