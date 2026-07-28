import type { Dish, DishStatus } from "../../../generated/prisma/client";

export interface DishRepository {
	create(data: CreateDishData): Promise<Dish>;
	findById(id: string): Promise<Dish | null>;
	findByRestaurantId(
		restaurantId: string,
		status?: DishStatus,
	): Promise<Dish[]>;
	update(id: string, data: UpdateDishData): Promise<Dish>;
	updateStatus(id: string, status: DishStatus): Promise<Dish>;
	countByRestaurantAndNormalizedName(
		restaurantId: string,
		normalizedName: string,
	): Promise<number>;
}

export interface CreateDishData {
	restaurantId: string;
	categoryId: string;
	name: string;
	normalizedName: string;
	description: string;
	imageUrl: string | null;
	ingredients: string[];
	allergens: string[];
	position: number;
}

export interface UpdateDishData {
	name?: string;
	normalizedName?: string;
	description?: string;
	imageUrl?: string | null;
	ingredients?: string[];
	allergens?: string[];
	categoryId?: string;
	position?: number;
}
