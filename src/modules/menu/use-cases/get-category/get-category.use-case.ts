import type { MenuCategoryDto } from "../../dto/menu-category.dto";

export interface GetCategoryUseCase {
	execute(
		restaurantId: string,
		categoryId: string,
	): Promise<MenuCategoryDto>;
}
