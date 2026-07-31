import type { PublicBranchDto } from "../../dto/public-branch.dto";

export interface ListPublicBranchesUseCase {
	execute(restaurantSlug: string): Promise<PublicBranchDto[]>;
}
