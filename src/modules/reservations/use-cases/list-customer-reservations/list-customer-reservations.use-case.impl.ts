import { toCustomerReservationDto } from "../../mapper/customer-reservation.mapper";
import type { ReservationRepository } from "../../repositories/reservation.repository";
import type { ListCustomerReservationsUseCase } from "./list-customer-reservations.use-case";

export class ListCustomerReservationsUseCaseImpl
	implements ListCustomerReservationsUseCase
{
	constructor(private readonly reservationRepository: ReservationRepository) {}

	async execute(customerId: string) {
		const reservations =
			await this.reservationRepository.findConfirmedByCustomerId(customerId);
		return reservations.map(toCustomerReservationDto);
	}
}
