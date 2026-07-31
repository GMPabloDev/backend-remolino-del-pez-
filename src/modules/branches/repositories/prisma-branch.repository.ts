import type { BranchStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import {
	isSlugUniqueConstraintError,
	SlugConflictError,
} from "../../../shared/errors/slug-conflict.error";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	BranchRepository,
	BranchWithRelations,
	CreateBranchData,
	CreateIntervalData,
	UpdateBranchData,
} from "./branch.repository";

const INCLUDE_RULES_AND_INTERVALS = {
	rules: true,
	intervals: { orderBy: { dayOfWeek: "asc" as const } },
} as const;

export class PrismaBranchRepository implements BranchRepository {
	async create(data: CreateBranchData): Promise<BranchWithRelations> {
		const { rules, ...branchData } = data;

		try {
			return await prisma.branch.create({
				data: {
					...branchData,
					rules: { create: rules },
				},
				include: INCLUDE_RULES_AND_INTERVALS,
			});
		} catch (error) {
			if (isSlugUniqueConstraintError(error, "Branch_restaurantId_slug_key")) {
				throw new SlugConflictError("branch", data.slug);
			}
			throw error;
		}
	}

	async findById(id: string): Promise<BranchWithRelations | null> {
		if (!isValidUuid(id)) return null;

		return prisma.branch.findUnique({
			where: { id },
			include: INCLUDE_RULES_AND_INTERVALS,
		});
	}

	async findByRestaurantIdAndSlug(
		restaurantId: string,
		slug: string,
	): Promise<BranchWithRelations | null> {
		if (!isValidUuid(restaurantId)) return null;

		return prisma.branch.findUnique({
			where: {
				restaurantId_slug: { restaurantId, slug },
			},
			include: INCLUDE_RULES_AND_INTERVALS,
		});
	}

	async findByRestaurantId(
		restaurantId: string,
		status?: BranchStatus,
	): Promise<BranchWithRelations[]> {
		if (!isValidUuid(restaurantId)) return [];

		return prisma.branch.findMany({
			where: { restaurantId, ...(status ? { status } : {}) },
			include: INCLUDE_RULES_AND_INTERVALS,
			orderBy: [{ name: "asc" }, { slug: "asc" }],
		});
	}

	async update(
		id: string,
		data: UpdateBranchData,
	): Promise<BranchWithRelations> {
		const { rules, ...branchData } = data;

		return prisma.branch.update({
			where: { id },
			data: {
				...branchData,
				...(rules ? { rules: { update: rules } } : {}),
			},
			include: INCLUDE_RULES_AND_INTERVALS,
		});
	}

	async countByRestaurantAndCode(
		restaurantId: string,
		code: string,
	): Promise<number> {
		return prisma.branch.count({
			where: { restaurantId, code },
		});
	}

	async replaceIntervals(
		branchId: string,
		intervals: CreateIntervalData[],
	): Promise<BranchWithRelations> {
		// Reemplazo atómico: borrar todos y crear los nuevos en una transacción
		return prisma.$transaction(async (tx) => {
			await tx.branchScheduleInterval.deleteMany({ where: { branchId } });

			if (intervals.length > 0) {
				await tx.branchScheduleInterval.createMany({
					data: intervals.map((i) => ({ branchId, ...i })),
				});
			}

			return tx.branch.findUniqueOrThrow({
				where: { id: branchId },
				include: INCLUDE_RULES_AND_INTERVALS,
			});
		});
	}

	async updateStatus(
		branchId: string,
		status: BranchStatus,
	): Promise<BranchWithRelations> {
		return prisma.branch.update({
			where: { id: branchId },
			data: { status },
			include: INCLUDE_RULES_AND_INTERVALS,
		});
	}
}
