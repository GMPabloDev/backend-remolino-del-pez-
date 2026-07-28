import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { MenuCategoryNotFoundException } from "../../exceptions/menu-category-not-found.exception";
import { toMenuCategoryDto } from "../../mapper/menu-category.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { GetCategoryUseCase } from "./get-category.use-case";

export class GetCategoryUseCaseImpl implements GetCategoryUseCase {
	constructor(
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, categoryId: string) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const category = await this.categoryRepository.findById(categoryId);

		if (!category || category.restaurantId !== restaurantId) {
			throw new MenuCategoryNotFoundException();
		}

		return toMenuCategoryDto(category);
	}
}
