import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { MenuCategoryNameAlreadyExistsException } from "../../exceptions/menu-category-name-already-exists.exception";
import { MenuCategoryNotFoundException } from "../../exceptions/menu-category-not-found.exception";
import { toMenuCategoryDto } from "../../mapper/menu-category.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { UpdateCategoryInput } from "../../schemas/update-category.schema";
import type { UpdateCategoryUseCase } from "./update-category.use-case";

export class UpdateCategoryUseCaseImpl implements UpdateCategoryUseCase {
	constructor(
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		categoryId: string,
		input: UpdateCategoryInput,
	) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const existing = await this.categoryRepository.findById(categoryId);
		if (!existing || existing.restaurantId !== restaurantId) {
			throw new MenuCategoryNotFoundException();
		}

		// Verificar unicidad del nombre si se está cambiando
		if (input.name !== undefined) {
			const normalizedName = input.name.toLowerCase();
			if (normalizedName !== existing.normalizedName) {
				const count =
					await this.categoryRepository.countByRestaurantAndNormalizedName(
						restaurantId,
						normalizedName,
					);
				if (count > 0) {
					throw new MenuCategoryNameAlreadyExistsException();
				}
			}

			const updated = await this.categoryRepository.update(categoryId, {
				name: input.name,
				normalizedName,
				position: input.position,
			});

			return toMenuCategoryDto(updated);
		}

		const updated = await this.categoryRepository.update(categoryId, {
			position: input.position,
		});

		return toMenuCategoryDto(updated);
	}
}
