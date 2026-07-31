import type { Restaurant } from "../../../generated/prisma/client";
import type { PublicRestaurantDto } from "../dto/public-restaurant.dto";

export function toPublicRestaurantDto(
	restaurant: Restaurant,
): PublicRestaurantDto {
	return {
		slug: restaurant.slug,
		name: restaurant.name,
		phone: restaurant.phone,
		email: restaurant.email,
		timezone: restaurant.timezone,
	};
}
