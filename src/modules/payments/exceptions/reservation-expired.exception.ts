import { DomainException } from "../../../shared/errors/domain.exception";

export class ReservationExpiredException extends DomainException {
	constructor() {
		super(
			"RESERVATION_EXPIRED",
			"La reserva ha vencido y no admite pagos",
			409,
		);
		this.name = "ReservationExpiredException";
	}
}
