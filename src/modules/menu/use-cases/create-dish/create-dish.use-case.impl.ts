import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { DishNameAlreadyExistsException } from "../../exceptions/dish-name-already-exists.exception";
import { MenuCategoryNotFoundException } from "../../exceptions/menu-category-not-found.exception";
import { toDishDto } from "../../mapper/dish.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { DishRepository } from "../../repositories/dish.repository";
import type { CreateDishInput } from "../../schemas/create-dish.schema";
import { normalizeTextList } from "../../services/normalize-text-list.service";
import type { CreateDishUseCase } from "./create-dish.use-case";

export class CreateDishUseCaseImpl implements CreateDishUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, input: CreateDishInput) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		// Validar que la categoría pertenece al restaurante
		const category = await this.categoryRepository.findById(input.categoryId);
		if (!category || category.restaurantId !== restaurantId) {
			throw new MenuCategoryNotFoundException();
		}

		const normalizedName = input.name.toLowerCase();

		const count = await this.dishRepository.countByRestaurantAndNormalizedName(
			restaurantId,
			normalizedName,
		);
		if (count > 0) {
			throw new DishNameAlreadyExistsException();
		}

		const dish = await this.dishRepository.create({
			restaurantId,
			categoryId: input.categoryId,
			name: input.name,
			normalizedName,
			description: input.description,
			imageUrl: input.imageUrl ?? null,
			ingredients: normalizeTextList(input.ingredients ?? []),
			allergens: normalizeTextList(input.allergens ?? []),
			position: input.position,
		});

		return toDishDto(dish as Parameters<typeof toDishDto>[0]);
	}
}
