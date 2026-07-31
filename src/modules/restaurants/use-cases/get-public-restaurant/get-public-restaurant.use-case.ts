import type { PublicRestaurantDto } from "../../dto/public-restaurant.dto";

export interface GetPublicRestaurantUseCase {
	execute(restaurantSlug: string): Promise<PublicRestaurantDto>;
}
