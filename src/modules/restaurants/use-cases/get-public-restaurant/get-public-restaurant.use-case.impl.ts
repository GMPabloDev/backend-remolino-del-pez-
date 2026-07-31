import { RestaurantNotFoundException } from "../../exceptions/restaurant-not-found.exception";
import { toPublicRestaurantDto } from "../../mapper/public-restaurant.mapper";
import type { RestaurantRepository } from "../../repositories/restaurant.repository";
import type { GetPublicRestaurantUseCase } from "./get-public-restaurant.use-case";

export class GetPublicRestaurantUseCaseImpl
	implements GetPublicRestaurantUseCase
{
	constructor(private readonly restaurantRepository: RestaurantRepository) {}

	async execute(restaurantSlug: string) {
		const restaurant =
			await this.restaurantRepository.findBySlug(restaurantSlug);

		if (!restaurant) {
			throw new RestaurantNotFoundException();
		}

		return toPublicRestaurantDto(restaurant);
	}
}
