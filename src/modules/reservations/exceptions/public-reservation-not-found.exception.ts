import { DomainException } from "../../../shared/errors/domain.exception";

export class PublicReservationNotFoundException extends DomainException {
	constructor() {
		super(
			"PUBLIC_RESERVATION_NOT_FOUND",
			"La reserva pública no está disponible para esta sucursal",
			404,
		);
		this.name = "PublicReservationNotFoundException";
	}
}
