import { DomainException } from "../../../shared/errors/domain.exception";

export class LastAdminRequiredException extends DomainException {
	constructor() {
		super(
			"LAST_ADMIN_REQUIRED",
			"No se puede desactivar o cambiar el rol del último administrador activo",
			422,
		);
		this.name = "LastAdminRequiredException";
	}
}
