import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { DishNameAlreadyExistsException } from "../../exceptions/dish-name-already-exists.exception";
import { DishNotFoundException } from "../../exceptions/dish-not-found.exception";
import { MenuCategoryNotFoundException } from "../../exceptions/menu-category-not-found.exception";
import { toDishDto } from "../../mapper/dish.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { DishRepository } from "../../repositories/dish.repository";
import type { UpdateDishInput } from "../../schemas/update-dish.schema";
import { normalizeTextList } from "../../services/normalize-text-list.service";
import type { UpdateDishUseCase } from "./update-dish.use-case";

export class UpdateDishUseCaseImpl implements UpdateDishUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, dishId: string, input: UpdateDishInput) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const existing = await this.dishRepository.findById(dishId);
		if (!existing || existing.restaurantId !== restaurantId) {
			throw new DishNotFoundException();
		}

		// Construir datos de actualización
		const data: Record<string, unknown> = {};

		// Unicidad del nombre si se está cambiando
		if (input.name !== undefined) {
			const normalizedName = input.name.toLowerCase();
			if (normalizedName !== existing.normalizedName) {
				const count =
					await this.dishRepository.countByRestaurantAndNormalizedName(
						restaurantId,
						normalizedName,
					);
				if (count > 0) {
					throw new DishNameAlreadyExistsException();
				}
			}
			data.name = input.name;
			data.normalizedName = normalizedName;
		}

		if (input.description !== undefined) data.description = input.description;
		if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
		if (input.ingredients !== undefined) {
			data.ingredients = normalizeTextList(input.ingredients);
		}
		if (input.allergens !== undefined) {
			data.allergens = normalizeTextList(input.allergens);
		}
		if (input.categoryId !== undefined) {
			const category = await this.categoryRepository.findById(input.categoryId);
			if (!category || category.restaurantId !== restaurantId) {
				throw new MenuCategoryNotFoundException();
			}
			data.categoryId = input.categoryId;
		}
		if (input.position !== undefined) data.position = input.position;

		const updated = await this.dishRepository.update(dishId, data);

		return toDishDto(updated as Parameters<typeof toDishDto>[0]);
	}
}
