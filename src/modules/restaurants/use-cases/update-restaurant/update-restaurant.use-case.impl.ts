import type { Restaurant } from "../../../../generated/prisma/client";
import type { RestaurantRepository } from "../../repositories/restaurant.repository";
import { RestaurantNotFoundException } from "../../exceptions/restaurant-not-found.exception";
import type { UpdateRestaurantInput } from "../../schemas/update-restaurant.schema";
import type { UpdateRestaurantUseCase } from "./update-restaurant.use-case";

export class UpdateRestaurantUseCaseImpl implements UpdateRestaurantUseCase {
  constructor(private readonly restaurantRepository: RestaurantRepository) {}

  async execute(id: string, input: UpdateRestaurantInput): Promise<Restaurant> {
    const existing = await this.restaurantRepository.findById(id);

    if (!existing) {
      throw new RestaurantNotFoundException();
    }

    return this.restaurantRepository.update(id, input);
  }
}
