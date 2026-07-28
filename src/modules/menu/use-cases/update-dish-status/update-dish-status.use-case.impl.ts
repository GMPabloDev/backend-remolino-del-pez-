import type { DishStatus } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { DishNotFoundException } from "../../exceptions/dish-not-found.exception";
import { toDishDto } from "../../mapper/dish.mapper";
import type { DishRepository } from "../../repositories/dish.repository";
import type { UpdateDishStatusInput } from "../../schemas/update-dish-status.schema";
import type { UpdateDishStatusUseCase } from "./update-dish-status.use-case";

export class UpdateDishStatusUseCaseImpl implements UpdateDishStatusUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		dishId: string,
		input: UpdateDishStatusInput,
	) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const existing = await this.dishRepository.findById(dishId);
		if (!existing || existing.restaurantId !== restaurantId) {
			throw new DishNotFoundException();
		}

		const statusEnum: DishStatus =
			input.status === "active" ? "ACTIVE" : "INACTIVE";

		const updated = await this.dishRepository.updateStatus(dishId, statusEnum);

		return toDishDto(updated as Parameters<typeof toDishDto>[0]);
	}
}
