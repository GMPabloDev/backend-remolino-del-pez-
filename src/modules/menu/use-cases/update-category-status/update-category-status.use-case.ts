import type { MenuCategoryDto } from "../../dto/menu-category.dto";
import type { UpdateCategoryStatusInput } from "../../schemas/update-category-status.schema";

export interface UpdateCategoryStatusUseCase {
	execute(
		restaurantId: string,
		categoryId: string,
		input: UpdateCategoryStatusInput,
	): Promise<MenuCategoryDto>;
}
