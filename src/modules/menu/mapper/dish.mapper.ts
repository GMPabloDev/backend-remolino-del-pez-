import type { Dish, MenuCategory } from "../../../generated/prisma/client";
import type { DishDto } from "../dto/dish.dto";

type DishWithCategory = Dish & { category: MenuCategory };

/** Convierte un modelo Prisma Dish (con categoría incluida) al DTO público. */
export function toDishDto(dish: DishWithCategory): DishDto {
	return {
		id: dish.id,
		restaurantId: dish.restaurantId,
		categoryId: dish.categoryId,
		categoryName: dish.category.name,
		name: dish.name,
		description: dish.description,
		imageUrl: dish.imageUrl,
		ingredients: dish.ingredients,
		allergens: dish.allergens,
		position: dish.position,
		status: dish.status === "ACTIVE" ? "active" : "inactive",
		createdAt: dish.createdAt.toISOString(),
		updatedAt: dish.updatedAt.toISOString(),
	};
}
