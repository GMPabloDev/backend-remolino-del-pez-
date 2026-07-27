import type { BranchRepository, BranchWithRelations, UpdateBranchData } from "../../repositories/branch.repository";
import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import { BranchCodeAlreadyExistsException } from "../../exceptions/branch-code-already-exists.exception";
import type { UpdateBranchInput } from "../../schemas/update-branch.schema";
import type { UpdateBranchUseCase } from "./update-branch.use-case";

export class UpdateBranchUseCaseImpl implements UpdateBranchUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(
    restaurantId: string,
    branchId: string,
    input: UpdateBranchInput,
  ): Promise<BranchWithRelations> {
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
    if (input.department !== undefined) updateData.department = input.department;
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

    return this.branchRepository.update(branchId, updateData);
  }
}
