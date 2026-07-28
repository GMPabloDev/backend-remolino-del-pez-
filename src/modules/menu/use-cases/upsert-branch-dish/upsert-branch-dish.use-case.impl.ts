import type { BranchDishStatus } from "../../../../generated/prisma/client";
import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { DishNotFoundException } from "../../exceptions/dish-not-found.exception";
import { toBranchDishConfigDto } from "../../mapper/branch-dish.mapper";
import type { BranchDishRepository } from "../../repositories/branch-dish.repository";
import type { DishRepository } from "../../repositories/dish.repository";
import type { UpsertBranchDishInput } from "../../schemas/upsert-branch-dish.schema";
import type { UpsertBranchDishUseCase } from "./upsert-branch-dish.use-case";

const statusMap: Record<string, BranchDishStatus> = {
	available: "AVAILABLE" as BranchDishStatus,
	sold_out: "SOLD_OUT" as BranchDishStatus,
	inactive: "INACTIVE" as BranchDishStatus,
};

export class UpsertBranchDishUseCaseImpl implements UpsertBranchDishUseCase {
	constructor(
		private readonly branchDishRepository: BranchDishRepository,
		private readonly dishRepository: DishRepository,
		private readonly branchBelongsToRestaurant: (
			branchId: string,
			restaurantId: string,
		) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		branchId: string,
		dishId: string,
		input: UpsertBranchDishInput,
	) {
		const belongs = await this.branchBelongsToRestaurant(
			branchId,
			restaurantId,
		);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		// Verificar que el plato pertenece al mismo restaurante
		const dish = await this.dishRepository.findById(dishId);
		if (!dish || dish.restaurantId !== restaurantId) {
			throw new DishNotFoundException();
		}

		const status = statusMap[input.status];
		if (!status) {
			throw new DishNotFoundException(); // No debería ocurrir si Zod validó
		}

		const branchDish = await this.branchDishRepository.upsert(
			branchId,
			dishId,
			{
				price: input.price,
				status,
			},
		);

		return toBranchDishConfigDto(branchDish);
	}
}
