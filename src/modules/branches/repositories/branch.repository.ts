import type {
	Branch,
	BranchRules,
	BranchScheduleInterval,
	BranchStatus,
} from "../../../generated/prisma/client";

export interface BranchWithRelations extends Branch {
	rules: BranchRules | null;
	intervals: BranchScheduleInterval[];
}

export interface BranchRepository {
	create(data: CreateBranchData): Promise<BranchWithRelations>;
	findById(id: string): Promise<BranchWithRelations | null>;
	findByRestaurantId(
		restaurantId: string,
		status?: BranchStatus,
	): Promise<BranchWithRelations[]>;
	update(id: string, data: UpdateBranchData): Promise<BranchWithRelations>;
	countByRestaurantAndCode(restaurantId: string, code: string): Promise<number>;
	replaceIntervals(
		branchId: string,
		intervals: CreateIntervalData[],
	): Promise<BranchWithRelations>;
	updateStatus(
		branchId: string,
		status: BranchStatus,
	): Promise<BranchWithRelations>;
}

export interface CreateIntervalData {
	dayOfWeek: number;
	startMinute: number;
	endMinute: number;
}

export interface CreateBranchData {
	restaurantId: string;
	name: string;
	code: string;
	address: string;
	district: string;
	province: string;
	department: string;
	phone: string;
	email?: string;
	rules: CreateBranchRulesData;
}

export interface CreateBranchRulesData {
	defaultReservationDurationMinutes: number;
	minimumAdvanceMinutes: number;
	maximumAdvanceDays: number;
	arrivalToleranceMinutes: number;
	maxPartySize: number;
}

export interface UpdateBranchData {
	name?: string;
	code?: string;
	address?: string;
	district?: string;
	province?: string;
	department?: string;
	phone?: string;
	email?: string;
	rules?: Partial<CreateBranchRulesData>;
}
