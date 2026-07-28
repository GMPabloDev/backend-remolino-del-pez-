import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { MenuCategoryNameAlreadyExistsException } from "../../exceptions/menu-category-name-already-exists.exception";
import { toMenuCategoryDto } from "../../mapper/menu-category.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { CreateCategoryInput } from "../../schemas/create-category.schema";
import type { CreateCategoryUseCase } from "./create-category.use-case";

export class CreateCategoryUseCaseImpl implements CreateCategoryUseCase {
	constructor(
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, input: CreateCategoryInput) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const normalizedName = input.name.toLowerCase();

		const count =
			await this.categoryRepository.countByRestaurantAndNormalizedName(
				restaurantId,
				normalizedName,
			);
		if (count > 0) {
			throw new MenuCategoryNameAlreadyExistsException();
		}

		const category = await this.categoryRepository.create({
			restaurantId,
			name: input.name,
			normalizedName,
			position: input.position,
		});

		return toMenuCategoryDto(category);
	}
}
