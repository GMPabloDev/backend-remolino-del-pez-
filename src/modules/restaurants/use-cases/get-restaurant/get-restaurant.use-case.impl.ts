import type { Restaurant } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../exceptions/restaurant-not-found.exception";
import type { RestaurantRepository } from "../../repositories/restaurant.repository";
import type { GetRestaurantUseCase } from "./get-restaurant.use-case";

export class GetRestaurantUseCaseImpl implements GetRestaurantUseCase {
	constructor(private readonly restaurantRepository: RestaurantRepository) {}

	async execute(id: string): Promise<Restaurant> {
		const restaurant = await this.restaurantRepository.findById(id);

		if (!restaurant) {
			throw new RestaurantNotFoundException();
		}

		return restaurant;
	}
}
