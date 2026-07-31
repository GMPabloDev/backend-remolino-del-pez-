import { SlugConflictError } from "../../../../shared/errors/slug-conflict.error";
import { generateSlugCandidates } from "../../../../shared/slug/slug";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import { BranchCodeAlreadyExistsException } from "../../exceptions/branch-code-already-exists.exception";
import type {
	BranchRepository,
	BranchWithRelations,
} from "../../repositories/branch.repository";
import type { CreateBranchInput } from "../../schemas/create-branch.schema";
import type { CreateBranchUseCase } from "./create-branch.use-case";

export class CreateBranchUseCaseImpl implements CreateBranchUseCase {
	constructor(
		private readonly branchRepository: BranchRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		input: CreateBranchInput,
	): Promise<BranchWithRelations> {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const normalizedCode = input.code.trim().toUpperCase();

		const count = await this.branchRepository.countByRestaurantAndCode(
			restaurantId,
			normalizedCode,
		);
		if (count > 0) {
			throw new BranchCodeAlreadyExistsException();
		}

		for (const slug of generateSlugCandidates(input.name, "branch")) {
			const existingSlug =
				await this.branchRepository.findByRestaurantIdAndSlug(
					restaurantId,
					slug,
				);
			if (existingSlug) continue;

			try {
				return await this.branchRepository.create({
					restaurantId,
					slug,
					name: input.name,
					code: normalizedCode,
					address: input.address,
					district: input.district,
					province: input.province,
					department: input.department,
					phone: input.phone,
					email: input.email,
					rules: input.rules,
				});
			} catch (error) {
				if (!(error instanceof SlugConflictError)) throw error;
			}
		}

		throw new Error("No se pudo generar un slug para la sucursal");
	}
}
