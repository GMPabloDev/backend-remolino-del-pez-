import type {
	Branch,
	BranchRules,
	BranchScheduleInterval,
	BranchStatus,
} from "../../../generated/prisma/client";
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

type PrismaBranchWithRelations = Branch & {
	rules: BranchRules | null;
	intervals: BranchScheduleInterval[];
};

/**
 * La API garantiza que toda sucursal tiene reglas (obligatorias al crear y no
 * nullables por update), así que el tipo de dominio es no-nullable.
 */
function toBranchWithRelations(
	branch: PrismaBranchWithRelations,
): BranchWithRelations {
	return branch as BranchWithRelations;
}

export class PrismaBranchRepository implements BranchRepository {
	async create(data: CreateBranchData): Promise<BranchWithRelations> {
		const { rules, ...branchData } = data;

		try {
			return toBranchWithRelations(
				await prisma.branch.create({
					data: {
						...branchData,
						rules: { create: rules },
					},
					include: INCLUDE_RULES_AND_INTERVALS,
				}),
			);
		} catch (error) {
			if (isSlugUniqueConstraintError(error, "Branch_restaurantId_slug_key")) {
				throw new SlugConflictError("branch", data.slug);
			}
			throw error;
		}
	}

	async findById(id: string): Promise<BranchWithRelations | null> {
		if (!isValidUuid(id)) return null;

		const branch = await prisma.branch.findUnique({
			where: { id },
			include: INCLUDE_RULES_AND_INTERVALS,
		});
		return branch ? toBranchWithRelations(branch) : null;
	}

	async findByRestaurantIdAndSlug(
		restaurantId: string,
		slug: string,
	): Promise<BranchWithRelations | null> {
		if (!isValidUuid(restaurantId)) return null;

		const branch = await prisma.branch.findUnique({
			where: {
				restaurantId_slug: { restaurantId, slug },
			},
			include: INCLUDE_RULES_AND_INTERVALS,
		});
		return branch ? toBranchWithRelations(branch) : null;
	}

	async findByRestaurantId(
		restaurantId: string,
		status?: BranchStatus,
	): Promise<BranchWithRelations[]> {
		if (!isValidUuid(restaurantId)) return [];

		const branches = await prisma.branch.findMany({
			where: { restaurantId, ...(status ? { status } : {}) },
			include: INCLUDE_RULES_AND_INTERVALS,
			orderBy: [{ name: "asc" }, { slug: "asc" }],
		});
		return branches.map(toBranchWithRelations);
	}

	async update(
		id: string,
		data: UpdateBranchData,
	): Promise<BranchWithRelations> {
		const { rules, ...branchData } = data;

		return toBranchWithRelations(
			await prisma.branch.update({
				where: { id },
				data: {
					...branchData,
					...(rules ? { rules: { update: rules } } : {}),
				},
				include: INCLUDE_RULES_AND_INTERVALS,
			}),
		);
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

			// El horario pertenece a la sucursal: bump manual de updatedAt para
			// que PUT /schedule se refleje en Branch.updatedAt (data: {} no lo hace).
			await tx.branch.update({
				where: { id: branchId },
				data: { updatedAt: new Date() },
			});

			return toBranchWithRelations(
				await tx.branch.findUniqueOrThrow({
					where: { id: branchId },
					include: INCLUDE_RULES_AND_INTERVALS,
				}),
			);
		});
	}

	async updateStatus(
		branchId: string,
		status: BranchStatus,
	): Promise<BranchWithRelations> {
		return toBranchWithRelations(
			await prisma.branch.update({
				where: { id: branchId },
				data: { status },
				include: INCLUDE_RULES_AND_INTERVALS,
			}),
		);
	}
}
