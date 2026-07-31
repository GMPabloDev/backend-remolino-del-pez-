import type { Restaurant } from "../../../../generated/prisma/client";
import { SlugConflictError } from "../../../../shared/errors/slug-conflict.error";
import { generateSlugCandidates } from "../../../../shared/slug/slug";
import { RestaurantAlreadyExistsException } from "../../exceptions/restaurant-already-exists.exception";
import type { RestaurantRepository } from "../../repositories/restaurant.repository";
import type { CreateRestaurantInput } from "../../schemas/create-restaurant.schema";
import type { CreateRestaurantUseCase } from "./create-restaurant.use-case";

export class CreateRestaurantUseCaseImpl implements CreateRestaurantUseCase {
	constructor(private readonly restaurantRepository: RestaurantRepository) {}

	async execute(input: CreateRestaurantInput): Promise<Restaurant> {
		const count = await this.restaurantRepository.count();

		if (count > 0) {
			throw new RestaurantAlreadyExistsException();
		}

		for (const slug of generateSlugCandidates(input.name, "restaurant")) {
			try {
				return await this.restaurantRepository.create({ ...input, slug });
			} catch (error) {
				if (!(error instanceof SlugConflictError)) throw error;

				if ((await this.restaurantRepository.count()) > 0) {
					throw new RestaurantAlreadyExistsException();
				}
			}
		}

		throw new Error("No se pudo generar un slug para el restaurante");
	}
}
