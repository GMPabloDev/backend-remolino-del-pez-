import type { Restaurant } from "../../../generated/prisma/client";

export interface RestaurantRepository {
	create(data: CreateRestaurantData): Promise<Restaurant>;
	findById(id: string): Promise<Restaurant | null>;
	update(id: string, data: UpdateRestaurantData): Promise<Restaurant>;
	count(): Promise<number>;
}

export interface CreateRestaurantData {
	name: string;
	legalName: string;
	taxId: string;
	phone?: string;
	email?: string;
}

export interface UpdateRestaurantData {
	name?: string;
	legalName?: string;
	taxId?: string;
	phone?: string;
	email?: string;
}
