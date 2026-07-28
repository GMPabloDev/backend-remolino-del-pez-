import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	BranchDishRepository,
	UpsertBranchDishData,
} from "./branch-dish.repository";
import { Prisma, BranchDishStatus } from "../../../generated/prisma/client";

export class PrismaBranchDishRepository implements BranchDishRepository {
	async findByBranchId(branchId: string) {
		if (!isValidUuid(branchId)) return [];

		return prisma.branchDish.findMany({
			where: { branchId },
			include: {
				dish: {
					include: { category: true },
				},
			},
		});
	}

	async findByBranchAndDish(branchId: string, dishId: string) {
		if (!isValidUuid(branchId) || !isValidUuid(dishId)) return null;

		return prisma.branchDish.findUnique({
			where: { branchId_dishId: { branchId, dishId } },
		});
	}

	async upsert(branchId: string, dishId: string, data: UpsertBranchDishData) {
		return prisma.branchDish.upsert({
			where: { branchId_dishId: { branchId, dishId } },
			create: {
				branchId,
				dishId,
				price: new Prisma.Decimal(data.price),
				status: data.status as BranchDishStatus,
			},
			update: {
				price: new Prisma.Decimal(data.price),
				status: data.status as BranchDishStatus,
			},
		});
	}
}
