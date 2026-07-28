import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateDishData,
	DishRepository,
	UpdateDishData,
} from "./dish.repository";
import type { DishStatus } from "../../../generated/prisma/client";

export class PrismaDishRepository implements DishRepository {
	async create(data: CreateDishData) {
		return prisma.dish.create({ data });
	}

	async findById(id: string) {
		if (!isValidUuid(id)) return null;

		return prisma.dish.findUnique({
			where: { id },
			include: { category: true },
		});
	}

	async findByRestaurantId(restaurantId: string, status?: DishStatus) {
		if (!isValidUuid(restaurantId)) return [];

		return prisma.dish.findMany({
			where: {
				restaurantId,
				...(status ? { status } : {}),
			},
			include: { category: true },
			orderBy: [{ position: "asc" }, { name: "asc" }],
		});
	}

	async update(id: string, data: UpdateDishData) {
		return prisma.dish.update({
			where: { id },
			data,
			include: { category: true },
		});
	}

	async updateStatus(id: string, status: DishStatus) {
		return prisma.dish.update({
			where: { id },
			data: { status },
			include: { category: true },
		});
	}

	async countByRestaurantAndNormalizedName(
		restaurantId: string,
		normalizedName: string,
	) {
		return prisma.dish.count({
			where: { restaurantId, normalizedName },
		});
	}
}
