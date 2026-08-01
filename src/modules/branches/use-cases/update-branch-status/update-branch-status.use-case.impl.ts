import type { BranchStatus } from "../../../../generated/prisma/client";
import type { BranchDto } from "../../dto/branch.dto";
import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import { BranchScheduleRequiredException } from "../../exceptions/branch-schedule-required.exception";
import { toBranchDto } from "../../mapper/branch.mapper";
import type { BranchRepository } from "../../repositories/branch.repository";
import type { UpdateBranchStatusUseCase } from "./update-branch-status.use-case";

export class UpdateBranchStatusUseCaseImpl
	implements UpdateBranchStatusUseCase
{
	constructor(private readonly branchRepository: BranchRepository) {}

	async execute(
		restaurantId: string,
		branchId: string,
		status: BranchStatus,
	): Promise<BranchDto> {
		const branch = await this.branchRepository.findById(branchId);

		if (!branch || branch.restaurantId !== restaurantId) {
			throw new BranchNotFoundException();
		}

		// Activar requiere al menos un intervalo
		if (status === "ACTIVE" && branch.intervals.length === 0) {
			throw new BranchScheduleRequiredException();
		}

		return toBranchDto(
			await this.branchRepository.updateStatus(branchId, status),
		);
	}
}
