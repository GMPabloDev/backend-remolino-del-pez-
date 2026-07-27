import type { Restaurant } from "../../../../generated/prisma/client";
import type { CreateRestaurantInput } from "../../schemas/create-restaurant.schema";

export interface CreateRestaurantUseCase {
	execute(input: CreateRestaurantInput): Promise<Restaurant>;
}
