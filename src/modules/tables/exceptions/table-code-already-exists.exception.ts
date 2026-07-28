import { DomainException } from "../../../shared/errors/domain.exception";

export class TableCodeAlreadyExistsException extends DomainException {
	constructor() {
		super(
			"TABLE_CODE_ALREADY_EXISTS",
			"El código de mesa ya existe en esta sucursal",
			409,
		);
		this.name = "TableCodeAlreadyExistsException";
	}
}
