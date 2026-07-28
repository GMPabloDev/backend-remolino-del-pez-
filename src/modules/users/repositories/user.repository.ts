import type {
	User,
	UserRole,
	UserStatus,
} from "../../../generated/prisma/client";

export interface CreateUserData {
	fullName: string;
	email: string;
	phone?: string | null;
	passwordHash: string;
	role: UserRole;
	branchId?: string | null;
}

export interface UpdateUserData {
	fullName?: string;
	email?: string;
	phone?: string | null;
	passwordHash?: string;
	role?: UserRole;
	branchId?: string | null;
}

export interface UserFilters {
	role?: UserRole;
	status?: UserStatus;
	branchId?: string;
}

export interface UserRepository {
	create(data: CreateUserData): Promise<User>;
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	findAll(filters: UserFilters): Promise<User[]>;
	update(id: string, data: UpdateUserData): Promise<User>;
	updateStatus(id: string, status: UserStatus): Promise<User>;
	countActiveAdmins(): Promise<number>;
	revokeAllSessions(userId: string): Promise<void>;
}
