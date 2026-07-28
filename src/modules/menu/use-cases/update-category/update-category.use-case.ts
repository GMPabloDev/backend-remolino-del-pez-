import type { MenuCategoryDto } from "../../dto/menu-category.dto";
import type { UpdateCategoryInput } from "../../schemas/update-category.schema";

export interface UpdateCategoryUseCase {
	execute(
		restaurantId: string,
		categoryId: string,
		input: UpdateCategoryInput,
	): Promise<MenuCategoryDto>;
}
