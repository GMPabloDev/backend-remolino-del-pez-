import type { MenuCategoryDto } from "../../dto/menu-category.dto";
import type { CreateCategoryInput } from "../../schemas/create-category.schema";

export interface CreateCategoryUseCase {
	execute(
		restaurantId: string,
		input: CreateCategoryInput,
	): Promise<MenuCategoryDto>;
}
