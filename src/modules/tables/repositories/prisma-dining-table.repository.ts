import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateDiningTableData,
	DiningTableRepository,
	UpdateDiningTableData,
} from "./dining-table.repository";
import type { DiningTableStatus } from "../../../generated/prisma/client";

export class PrismaDiningTableRepository implements DiningTableRepository {
	async create(data: CreateDiningTableData) {
		return prisma.diningTable.create({ data });
	}

	async findById(id: string) {
		if (!isValidUuid(id)) return null;

		return prisma.diningTable.findUnique({
			where: { id },
		});
	}

	async findByBranchId(branchId: string, status?: DiningTableStatus) {
		if (!isValidUuid(branchId)) return [];

		return prisma.diningTable.findMany({
			where: { branchId, ...(status ? { status } : {}) },
		});
	}

	async update(id: string, data: UpdateDiningTableData) {
		return prisma.diningTable.update({
			where: { id },
			data,
		});
	}

	async updateStatus(id: string, status: DiningTableStatus) {
		return prisma.diningTable.update({
			where: { id },
			data: { status },
		});
	}

	async countByBranchAndCode(branchId: string, code: string) {
		return prisma.diningTable.count({
			where: { branchId, code },
		});
	}
}
