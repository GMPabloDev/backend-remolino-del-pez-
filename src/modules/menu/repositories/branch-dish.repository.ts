import type {
	BranchDish,
	BranchDishStatus,
} from "../../../generated/prisma/client";

export interface BranchDishWithDish extends BranchDish {
	dish: {
		id: string;
		name: string;
		description: string;
		imageUrl: string | null;
		ingredients: string[];
		allergens: string[];
		position: number;
		status: string;
		category: {
			id: string;
			name: string;
			position: number;
		};
	};
}

export interface BranchDishRepository {
	findByBranchId(branchId: string): Promise<BranchDish[]>;
	findByBranchAndDish(
		branchId: string,
		dishId: string,
	): Promise<BranchDish | null>;
	upsert(
		branchId: string,
		dishId: string,
		data: UpsertBranchDishData,
	): Promise<BranchDish>;
}

export interface UpsertBranchDishData {
	price: string;
	status: BranchDishStatus;
}
