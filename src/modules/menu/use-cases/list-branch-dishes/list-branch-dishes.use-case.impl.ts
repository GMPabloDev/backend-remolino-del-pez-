import type { MenuCategory } from "../../../../generated/prisma/client";
import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import type { BranchDishListItemDto } from "../../dto/branch-dish.dto";
import { toBranchDishConfigDto } from "../../mapper/branch-dish.mapper";
import type { BranchDishRepository } from "../../repositories/branch-dish.repository";
import type { DishRepository } from "../../repositories/dish.repository";
import type { ListBranchDishesUseCase } from "./list-branch-dishes.use-case";

// El repositorio incluye la categoría en runtime; el contrato devuelve Dish sin relaciones.
type DishWithCategory = Awaited<
	ReturnType<DishRepository["findByRestaurantId"]>
>[number] & { category: MenuCategory };

export class ListBranchDishesUseCaseImpl implements ListBranchDishesUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly branchDishRepository: BranchDishRepository,
		private readonly branchBelongsToRestaurant: (
			branchId: string,
			restaurantId: string,
		) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		branchId: string,
	): Promise<BranchDishListItemDto[]> {
		const belongs = await this.branchBelongsToRestaurant(
			branchId,
			restaurantId,
		);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const [dishes, branchDishes] = await Promise.all([
			this.dishRepository.findByRestaurantId(restaurantId),
			this.branchDishRepository.findByBranchId(branchId),
		]);

		// Índice por dishId para acceso rápido
		const configByDishId = new Map(
			branchDishes.map((bd) => [bd.dishId, toBranchDishConfigDto(bd)]),
		);

		return (dishes as DishWithCategory[]).map((dish) => ({
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
			branchConfiguration: configByDishId.get(dish.id) ?? null,
			createdAt: dish.createdAt.toISOString(),
			updatedAt: dish.updatedAt.toISOString(),
		}));
	}
}
