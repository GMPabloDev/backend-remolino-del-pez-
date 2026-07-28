import type { AvailabilityDto } from "../../dto/reservation.dto";
import type { GetAvailabilityQuery } from "../../schemas/get-availability.schema";

export interface GetAvailabilityUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		input: GetAvailabilityQuery,
	): Promise<AvailabilityDto>;
}
