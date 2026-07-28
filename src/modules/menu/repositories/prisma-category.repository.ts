import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateCategoryData,
	MenuCategoryRepository,
	UpdateCategoryData,
} from "./category.repository";
import type { MenuCategoryStatus } from "../../../generated/prisma/client";

export class PrismaMenuCategoryRepository implements MenuCategoryRepository {
	async create(data: CreateCategoryData) {
		return prisma.menuCategory.create({ data });
	}

	async findById(id: string) {
		if (!isValidUuid(id)) return null;

		return prisma.menuCategory.findUnique({ where: { id } });
	}

	async findByRestaurantId(
		restaurantId: string,
		status?: MenuCategoryStatus,
	) {
		if (!isValidUuid(restaurantId)) return [];

		return prisma.menuCategory.findMany({
			where: {
				restaurantId,
				...(status ? { status } : {}),
			},
			orderBy: [{ position: "asc" }, { name: "asc" }],
		});
	}

	async update(id: string, data: UpdateCategoryData) {
		return prisma.menuCategory.update({ where: { id }, data });
	}

	async updateStatus(id: string, status: MenuCategoryStatus) {
		return prisma.menuCategory.update({ where: { id }, data: { status } });
	}

	async countByRestaurantAndNormalizedName(
		restaurantId: string,
		normalizedName: string,
	) {
		return prisma.menuCategory.count({
			where: { restaurantId, normalizedName },
		});
	}
}
