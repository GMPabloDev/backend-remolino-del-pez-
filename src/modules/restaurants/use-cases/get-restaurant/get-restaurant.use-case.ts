import type { Restaurant } from "../../../../generated/prisma/client";

export interface GetRestaurantUseCase {
	execute(id: string): Promise<Restaurant>;
}
