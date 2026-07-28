import type { MenuCategory } from "../../../generated/prisma/client";
import type { MenuCategoryDto } from "../dto/menu-category.dto";

/** Convierte un modelo Prisma MenuCategory al DTO público con estado en minúsculas. */
export function toMenuCategoryDto(category: MenuCategory): MenuCategoryDto {
	return {
		id: category.id,
		restaurantId: category.restaurantId,
		name: category.name,
		position: category.position,
		status:
			category.status === "ACTIVE" ? "active" : "inactive",
		createdAt: category.createdAt.toISOString(),
		updatedAt: category.updatedAt.toISOString(),
	};
}
