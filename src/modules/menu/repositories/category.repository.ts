import type {
	MenuCategory,
	MenuCategoryStatus,
} from "../../../generated/prisma/client";

export interface MenuCategoryRepository {
	create(data: CreateCategoryData): Promise<MenuCategory>;
	findById(id: string): Promise<MenuCategory | null>;
	findByRestaurantId(
		restaurantId: string,
		status?: MenuCategoryStatus,
	): Promise<MenuCategory[]>;
	update(id: string, data: UpdateCategoryData): Promise<MenuCategory>;
	updateStatus(
		id: string,
		status: MenuCategoryStatus,
	): Promise<MenuCategory>;
	countByRestaurantAndNormalizedName(
		restaurantId: string,
		normalizedName: string,
	): Promise<number>;
}

export interface CreateCategoryData {
	restaurantId: string;
	name: string;
	normalizedName: string;
	position: number;
}

export interface UpdateCategoryData {
	name?: string;
	normalizedName?: string;
	position?: number;
}
