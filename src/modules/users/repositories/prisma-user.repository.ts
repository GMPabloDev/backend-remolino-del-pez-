import type { User, UserStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateUserData,
	UpdateUserData,
	UserFilters,
	UserRepository,
} from "./user.repository";

export class PrismaUserRepository implements UserRepository {
	async create(data: CreateUserData): Promise<User> {
		return prisma.user.create({ data });
	}

	async findById(id: string): Promise<User | null> {
		if (!isValidUuid(id)) return null;
		return prisma.user.findUnique({ where: { id } });
	}

	async findByEmail(email: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { email } });
	}

	async findAll(filters: UserFilters): Promise<User[]> {
		const where: Record<string, unknown> = {};

		if (filters.role) where.role = filters.role;
		if (filters.status) where.status = filters.status;
		if (filters.branchId) where.branchId = filters.branchId;

		return prisma.user.findMany({ where });
	}

	async update(id: string, data: UpdateUserData): Promise<User> {
		return prisma.user.update({ where: { id }, data });
	}

	async updateStatus(id: string, status: UserStatus): Promise<User> {
		return prisma.user.update({
			where: { id },
			data: { status },
		});
	}

	async countActiveAdmins(): Promise<number> {
		return prisma.user.count({
			where: { role: "ADMIN", status: "ACTIVE" },
		});
	}

	async revokeAllSessions(userId: string): Promise<void> {
		await prisma.userSession.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}
}
