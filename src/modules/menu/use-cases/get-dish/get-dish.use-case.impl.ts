import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { DishNotFoundException } from "../../exceptions/dish-not-found.exception";
import { toDishDto } from "../../mapper/dish.mapper";
import type { DishRepository } from "../../repositories/dish.repository";
import type { GetDishUseCase } from "./get-dish.use-case";

export class GetDishUseCaseImpl implements GetDishUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, dishId: string) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const dish = await this.dishRepository.findById(dishId);

		if (!dish || dish.restaurantId !== restaurantId) {
			throw new DishNotFoundException();
		}

		return toDishDto(dish as Parameters<typeof toDishDto>[0]);
	}
}
