import type { Branch, BranchRules, BranchStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
  BranchRepository,
  BranchWithRelations,
  CreateBranchData,
  UpdateBranchData,
} from "./branch.repository";

const INCLUDE_RULES_AND_INTERVALS = {
  rules: true,
  intervals: { orderBy: { dayOfWeek: "asc" as const } },
} as const;

export class PrismaBranchRepository implements BranchRepository {
  async create(data: CreateBranchData): Promise<BranchWithRelations> {
    const { rules, ...branchData } = data;

    return prisma.branch.create({
      data: {
        ...branchData,
        rules: { create: rules },
      },
      include: INCLUDE_RULES_AND_INTERVALS,
    });
  }

  async findById(id: string): Promise<BranchWithRelations | null> {
    if (!isValidUuid(id)) return null;

    return prisma.branch.findUnique({
      where: { id },
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
    });
  }

  async update(id: string, data: UpdateBranchData): Promise<BranchWithRelations> {
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

  async countByRestaurantAndCode(restaurantId: string, code: string): Promise<number> {
    return prisma.branch.count({
      where: { restaurantId, code },
    });
  }
}
