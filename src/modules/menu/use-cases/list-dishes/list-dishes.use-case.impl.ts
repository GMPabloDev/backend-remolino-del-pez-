import type { DishStatus } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { toDishDto } from "../../mapper/dish.mapper";
import type { DishRepository } from "../../repositories/dish.repository";
import type { ListDishesUseCase } from "./list-dishes.use-case";

export class ListDishesUseCaseImpl implements ListDishesUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, status?: DishStatus) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const dishes = await this.dishRepository.findByRestaurantId(
			restaurantId,
			status,
		);

		return dishes.map((d) => toDishDto(d as Parameters<typeof toDishDto>[0]));
	}
}
