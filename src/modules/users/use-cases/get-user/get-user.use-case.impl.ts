import type { SafeUser } from "../../../../shared/users/safe-user.dto";
import { toSafeUser } from "../../../../shared/users/user.mapper";
import { UserNotFoundException } from "../../exceptions/user-not-found.exception";
import type { UserRepository } from "../../repositories/user.repository";
import type { GetUserUseCase } from "./get-user.use-case";

export class GetUserUseCaseImpl implements GetUserUseCase {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(userId: string): Promise<SafeUser> {
		const user = await this.userRepository.findById(userId);

		if (!user) {
			throw new UserNotFoundException();
		}

		return toSafeUser(user);
	}
}
