import { DomainException } from "../../../shared/errors/domain.exception";

export class CustomerReservationNotFoundException extends DomainException {
	constructor() {
		super(
			"CUSTOMER_RESERVATION_NOT_FOUND",
			"La reserva no existe o no está disponible para este cliente",
			404,
		);
		this.name = "CustomerReservationNotFoundException";
	}
}
