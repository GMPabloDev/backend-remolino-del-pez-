import type { MenuCategoryStatus } from "../../../../generated/prisma/client";
import type { MenuCategoryDto } from "../../dto/menu-category.dto";

export interface ListCategoriesUseCase {
	execute(
		restaurantId: string,
		status?: MenuCategoryStatus,
	): Promise<MenuCategoryDto[]>;
}
