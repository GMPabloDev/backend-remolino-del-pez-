import type { MenuCategory } from "../../../../generated/prisma/client";
import type { BranchRepository } from "../../../branches/repositories/branch.repository";
import type { RestaurantRepository } from "../../../restaurants/repositories/restaurant.repository";
import type {
	PublicMenuCategory,
	PublicMenuDish,
	PublicMenuResponse,
} from "../../dto/public-menu.dto";
import { PublicMenuNotFoundException } from "../../exceptions/public-menu-not-found.exception";
import { toBranchDishStatus } from "../../mapper/branch-dish.mapper";
import type { BranchDishRepository } from "../../repositories/branch-dish.repository";
import type { DishRepository } from "../../repositories/dish.repository";
import type { GetPublicMenuUseCase } from "./get-public-menu.use-case";

// Tipos runtime con relaciones incluidas
type DishWithCategory = Awaited<
	ReturnType<DishRepository["findByRestaurantId"]>
>[number] & { category: MenuCategory };

const PUBLISHABLE_STATUSES = ["AVAILABLE", "SOLD_OUT"];

export class GetPublicMenuUseCaseImpl implements GetPublicMenuUseCase {
	constructor(
		private readonly dishRepository: DishRepository,
		private readonly branchDishRepository: BranchDishRepository,
		private readonly restaurantRepository: RestaurantRepository,
		private readonly branchRepository: BranchRepository,
	) {}

	async execute(
		restaurantSlug: string,
		branchSlug: string,
	): Promise<PublicMenuResponse> {
		const restaurant =
			await this.restaurantRepository.findBySlug(restaurantSlug);
		const branch = restaurant
			? await this.branchRepository.findByRestaurantIdAndSlug(
					restaurant.id,
					branchSlug,
				)
			: null;

		if (!restaurant || !branch || branch.status !== "ACTIVE") {
			throw new PublicMenuNotFoundException();
		}

		// Consultar solo platos activos y configuraciones de la sucursal en paralelo
		const [dishes, branchDishes] = await Promise.all([
			this.dishRepository.findByRestaurantId(restaurant.id, "ACTIVE"),
			this.branchDishRepository.findByBranchId(branch.id),
		]);

		// Índice de configuraciones publicables por dishId
		const configByDishId = new Map<string, PublicMenuDish>();
		for (const bd of branchDishes) {
			if (!PUBLISHABLE_STATUSES.includes(bd.status)) continue;

			// El dish se resolverá después; guardamos precio y estado locales
			configByDishId.set(bd.dishId, {
				id: bd.dishId,
				name: "",
				description: "",
				imageUrl: null,
				ingredients: [],
				allergens: [],
				position: 0,
				price: bd.price.toFixed(2),
				status: toBranchDishStatus(bd.status) as "available" | "sold_out",
			});
		}

		// Índice de platos activos por id
		const dishById = new Map(
			(dishes as DishWithCategory[]).map((d) => [d.id, d]),
		);

		// Agrupar platos publicables por categoría
		const categoryMap = new Map<string, PublicMenuCategory>();

		for (const [dishId, menuDish] of configByDishId) {
			const dish = dishById.get(dishId);
			if (!dish) continue; // Plato inactivo o eliminado

			// Completar datos del plato
			menuDish.name = dish.name;
			menuDish.description = dish.description;
			menuDish.imageUrl = dish.imageUrl;
			menuDish.ingredients = dish.ingredients;
			menuDish.allergens = dish.allergens;
			menuDish.position = dish.position;

			const catId = dish.category.id;
			if (!categoryMap.has(catId)) {
				categoryMap.set(catId, {
					id: dish.category.id,
					name: dish.category.name,
					position: dish.category.position,
					dishes: [],
				});
			}

			categoryMap.get(catId)?.dishes.push(menuDish);
		}

		// Ordenar categorías y platos dentro de cada una
		const result: PublicMenuCategory[] = Array.from(categoryMap.values()).map(
			(cat) => ({
				...cat,
				dishes: cat.dishes.sort(
					(a, b) => a.position - b.position || a.name.localeCompare(b.name),
				),
			}),
		);

		result.sort(
			(a, b) => a.position - b.position || a.name.localeCompare(b.name),
		);

		return {
			restaurantSlug: restaurant.slug,
			branchSlug: branch.slug,
			categories: result,
		};
	}
}
