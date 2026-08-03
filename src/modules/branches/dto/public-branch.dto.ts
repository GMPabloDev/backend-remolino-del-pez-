import type { BranchRulesDto } from "./branch.dto";

export interface PublicBranchDto {
	restaurantSlug: string;
	branchSlug: string;
	name: string;
	address: string;
	district: string;
	province: string;
	department: string;
	phone: string;
	email: string | null;
	rules: BranchRulesDto;
	intervals: Array<{
		dayOfWeek: number;
		startTime: string;
		endTime: string;
	}>;
}
