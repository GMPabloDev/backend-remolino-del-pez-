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
	rules: {
		defaultReservationDurationMinutes: number;
		minimumAdvanceMinutes: number;
		maximumAdvanceDays: number;
		arrivalToleranceMinutes: number;
		maxPartySize: number;
	};
	intervals: Array<{
		dayOfWeek: number;
		startTime: string;
		endTime: string;
	}>;
}
