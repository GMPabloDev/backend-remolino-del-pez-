import type { BranchDto } from "../../dto/branch.dto";
import { BranchCodeAlreadyExistsException } from "../../exceptions/branch-code-already-exists.exception";
import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import { toBranchDto } from "../../mapper/branch.mapper";
import type {
	BranchRepository,
	UpdateBranchData,
} from "../../repositories/branch.repository";
import type { UpdateBranchInput } from "../../schemas/update-branch.schema";
import type { UpdateBranchUseCase } from "./update-branch.use-case";

export class UpdateBranchUseCaseImpl implements UpdateBranchUseCase {
	constructor(private readonly branchRepository: BranchRepository) {}

	async execute(
		restaurantId: string,
		branchId: string,
		input: UpdateBranchInput,
	): Promise<BranchDto> {
		const branch = await this.branchRepository.findById(branchId);

		if (!branch || branch.restaurantId !== restaurantId) {
			throw new BranchNotFoundException();
		}

		const updateData: UpdateBranchData = {};

		// Datos generales
		if (input.name !== undefined) updateData.name = input.name;
		if (input.address !== undefined) updateData.address = input.address;
		if (input.district !== undefined) updateData.district = input.district;
		if (input.province !== undefined) updateData.province = input.province;
		if (input.department !== undefined)
			updateData.department = input.department;
		if (input.phone !== undefined) updateData.phone = input.phone;
		if (input.email !== undefined) updateData.email = input.email;

		// Código: normalizar y validar unicidad si cambió
		if (input.code !== undefined) {
			const normalizedCode = input.code.trim().toUpperCase();
			if (normalizedCode !== branch.code) {
				const count = await this.branchRepository.countByRestaurantAndCode(
					restaurantId,
					normalizedCode,
				);
				if (count > 0) {
					throw new BranchCodeAlreadyExistsException();
				}
			}
			updateData.code = normalizedCode;
		}

		// Reglas (parcial)
		if (input.rules !== undefined) {
			updateData.rules = input.rules;
		}

		return toBranchDto(
			await this.branchRepository.update(branchId, updateData),
		);
	}
}
