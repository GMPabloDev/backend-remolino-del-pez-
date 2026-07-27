import { DomainException } from "../../../shared/errors/domain.exception";

export class BranchCodeAlreadyExistsException extends DomainException {
	constructor() {
		super(
			"BRANCH_CODE_ALREADY_EXISTS",
			"El código de sucursal ya existe en este restaurante",
			409,
		);
		this.name = "BranchCodeAlreadyExistsException";
	}
}
