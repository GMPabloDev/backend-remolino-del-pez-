import type { Restaurant } from "../../../../generated/prisma/client";
import type { UpdateRestaurantInput } from "../../schemas/update-restaurant.schema";

export interface UpdateRestaurantUseCase {
  execute(id: string, input: UpdateRestaurantInput): Promise<Restaurant>;
}
