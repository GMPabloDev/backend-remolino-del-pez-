import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidRefreshTokenException extends DomainException {
	constructor() {
		super("INVALID_REFRESH_TOKEN", "Refresh token inválido o expirado", 401);
		this.name = "InvalidRefreshTokenException";
	}
}
