import { DomainException } from "../../../shared/errors/domain.exception";

export class BranchScheduleConflictException extends DomainException {
  constructor() {
    super("BRANCH_SCHEDULE_CONFLICT", "Los intervalos del mismo día no pueden solaparse", 409);
    this.name = "BranchScheduleConflictException";
  }
}
