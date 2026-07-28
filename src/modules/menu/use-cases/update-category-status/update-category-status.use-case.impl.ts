import type { MenuCategoryStatus } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { MenuCategoryNotFoundException } from "../../exceptions/menu-category-not-found.exception";
import { toMenuCategoryDto } from "../../mapper/menu-category.mapper";
import type { MenuCategoryRepository } from "../../repositories/category.repository";
import type { UpdateCategoryStatusInput } from "../../schemas/update-category-status.schema";
import type { UpdateCategoryStatusUseCase } from "./update-category-status.use-case";

export class UpdateCategoryStatusUseCaseImpl
	implements UpdateCategoryStatusUseCase
{
	constructor(
		private readonly categoryRepository: MenuCategoryRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		categoryId: string,
		input: UpdateCategoryStatusInput,
	) {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const existing = await this.categoryRepository.findById(categoryId);
		if (!existing || existing.restaurantId !== restaurantId) {
			throw new MenuCategoryNotFoundException();
		}

		const statusEnum: MenuCategoryStatus =
			input.status === "active" ? "ACTIVE" : "INACTIVE";

		const updated = await this.categoryRepository.updateStatus(
			categoryId,
			statusEnum,
		);

		return toMenuCategoryDto(updated);
	}
}
