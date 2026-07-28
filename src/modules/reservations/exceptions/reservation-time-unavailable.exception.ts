import { DomainException } from "../../../shared/errors/domain.exception";

export class ReservationTimeUnavailableException extends DomainException {
	constructor() {
		super(
			"RESERVATION_TIME_UNAVAILABLE",
			"El horario solicitado no está disponible",
			409,
		);
		this.name = "ReservationTimeUnavailableException";
	}
}
