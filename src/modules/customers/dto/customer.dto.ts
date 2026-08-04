import type { Customer, Restaurant } from "../../../generated/prisma/client";

export interface CustomerDto {
	fullName: string;
	email: string;
	phone: string;
	restaurantSlug: string;
}

export type CustomerWithRestaurant = Customer & {
	restaurant: Pick<Restaurant, "slug" | "name">;
};
