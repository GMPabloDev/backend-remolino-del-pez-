import type {
	DiningTable,
	DiningTableStatus,
} from "../../../generated/prisma/client";

export interface DiningTableRepository {
	create(data: CreateDiningTableData): Promise<DiningTable>;
	findById(id: string): Promise<DiningTable | null>;
	findByBranchId(
		branchId: string,
		status?: DiningTableStatus,
	): Promise<DiningTable[]>;
	update(id: string, data: UpdateDiningTableData): Promise<DiningTable>;
	updateStatus(id: string, status: DiningTableStatus): Promise<DiningTable>;
	countByBranchAndCode(branchId: string, code: string): Promise<number>;
}

export interface CreateDiningTableData {
	branchId: string;
	code: string;
	capacity: number;
}

export interface UpdateDiningTableData {
	code?: string;
	capacity?: number;
}
