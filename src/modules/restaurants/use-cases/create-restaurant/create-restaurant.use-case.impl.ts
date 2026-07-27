import type { Restaurant } from "../../../../generated/prisma/client";
import type { RestaurantRepository } from "../../repositories/restaurant.repository";
import type { CreateRestaurantInput } from "../../schemas/create-restaurant.schema";
import { RestaurantAlreadyExistsException } from "../../exceptions/restaurant-already-exists.exception";
import type { CreateRestaurantUseCase } from "./create-restaurant.use-case";

export class CreateRestaurantUseCaseImpl implements CreateRestaurantUseCase {
  constructor(private readonly restaurantRepository: RestaurantRepository) {}

  async execute(input: CreateRestaurantInput): Promise<Restaurant> {
    const count = await this.restaurantRepository.count();

    if (count > 0) {
      throw new RestaurantAlreadyExistsException();
    }

    return this.restaurantRepository.create(input);
  }
}
