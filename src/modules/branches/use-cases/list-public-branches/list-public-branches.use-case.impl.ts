import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import type { RestaurantRepository } from "../../../restaurants/repositories/restaurant.repository";
import { toPublicBranchDto } from "../../mapper/public-branch.mapper";
import type { BranchRepository } from "../../repositories/branch.repository";
import type { ListPublicBranchesUseCase } from "./list-public-branches.use-case";

export class ListPublicBranchesUseCaseImpl
	implements ListPublicBranchesUseCase
{
	constructor(
		private readonly restaurantRepository: RestaurantRepository,
		private readonly branchRepository: BranchRepository,
	) {}

	async execute(restaurantSlug: string) {
		const restaurant =
			await this.restaurantRepository.findBySlug(restaurantSlug);

		if (!restaurant) {
			throw new RestaurantNotFoundException();
		}

		const branches = await this.branchRepository.findByRestaurantId(
			restaurant.id,
			"ACTIVE",
		);

		return branches.map((branch) => toPublicBranchDto(branch, restaurant.slug));
	}
}
