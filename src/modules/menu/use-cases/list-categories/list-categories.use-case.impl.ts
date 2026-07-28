import type { MenuCategoryStatus } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { toMenuCategoryDto } from "../../mapper/menu-category.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { ListCategoriesUseCase } from "./list-categories.use-case";

export class ListCategoriesUseCaseImpl implements ListCategoriesUseCase {
	constructor(
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, status?: MenuCategoryStatus) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const categories = await this.categoryRepository.findByRestaurantId(
			restaurantId,
			status,
		);

		return categories.map(toMenuCategoryDto);
	}
}
