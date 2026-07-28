import type { TemporaryReservationDto } from "../../dto/reservation.dto";
import type { CreateTemporaryReservationInput } from "../../schemas/create-temporary-reservation.schema";

export interface CreateTemporaryReservationResult {
	reservation: TemporaryReservationDto;
	created: boolean;
}

export interface CreateTemporaryReservationUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		idempotencyKey: string,
		input: CreateTemporaryReservationInput,
	): Promise<CreateTemporaryReservationResult>;
}
