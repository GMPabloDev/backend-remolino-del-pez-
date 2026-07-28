import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidRoleBranchException extends DomainException {
	constructor(message: string) {
		super("INVALID_ROLE_BRANCH", message, 422);
		this.name = "InvalidRoleBranchException";
	}
}
