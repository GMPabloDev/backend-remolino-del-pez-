import type {
	BranchRules,
	BranchScheduleInterval,
} from "../../../generated/prisma/client";

/** Representación pública de una sucursal, con estado en minúsculas. */
export interface BranchDto {
	id: string;
	restaurantId: string;
	slug: string;
	name: string;
	code: string;
	address: string;
	district: string;
	province: string;
	department: string;
	phone: string;
	email: string | null;
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
	rules: BranchRules | null;
	intervals: BranchScheduleInterval[];
}
