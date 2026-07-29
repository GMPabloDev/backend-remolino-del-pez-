import { DomainException } from "../../../shared/errors/domain.exception";

export class ReservationAlreadyConfirmedException extends DomainException {
	constructor() {
		super(
			"RESERVATION_ALREADY_CONFIRMED",
			"La reserva ya fue confirmada y no admite otro pago",
			409,
		);
		this.name = "ReservationAlreadyConfirmedException";
	}
}
