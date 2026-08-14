import type { CustomerReservationDto } from "../../dto/customer-reservation.dto";

export interface ListCustomerReservationsUseCase {
	execute(customerId: string): Promise<CustomerReservationDto[]>;
}
