import { env } from "../../../../shared/config/env";
import { toCustomerDto } from "../../../customers/mapper/customer.mapper";
import type { CustomerRepository } from "../../../customers/repositories/customer.repository";
import { InvalidCustomerRefreshTokenException } from "../../exceptions/invalid-customer-refresh-token.exception";
import type { CustomerTokenService } from "../../services/customer-token.service";
import type {
	RefreshCustomerSessionResult,
	RefreshCustomerSessionUseCase,
} from "./refresh-customer-session.use-case";

export class RefreshCustomerSessionUseCaseImpl
	implements RefreshCustomerSessionUseCase
{
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly customerTokenService: CustomerTokenService,
	) {}

	async execute(refreshToken: string): Promise<RefreshCustomerSessionResult> {
		const now = new Date();
		const refreshTokenHash = this.customerTokenService.hashToken(refreshToken);
		const session =
			await this.customerRepository.findSessionByRefreshTokenHash(
				refreshTokenHash,
			);

		if (!session || session.expiresAt <= now) {
			throw new InvalidCustomerRefreshTokenException();
		}

		if (session.revokedAt) {
			await this.revokeSessionsIfTokenWasReused(
				session.customerId,
				session.replacedBySessionId !== null,
			);
			throw new InvalidCustomerRefreshTokenException();
		}

		const newRefreshToken = this.customerTokenService.generateRefreshToken();
		const newRefreshTokenHash =
			this.customerTokenService.hashToken(newRefreshToken);
		const newExpiresAt = new Date(
			now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
		);
		const rotatedSession = await this.customerRepository.rotateSession({
			sessionId: session.id,
			now,
			refreshTokenHash: newRefreshTokenHash,
			expiresAt: newExpiresAt,
		});

		if (!rotatedSession) {
			const currentSession =
				await this.customerRepository.findSessionByRefreshTokenHash(
					refreshTokenHash,
				);
			await this.revokeSessionsIfTokenWasReused(
				currentSession?.customerId,
				currentSession?.replacedBySessionId != null,
			);
			throw new InvalidCustomerRefreshTokenException();
		}

		const accessToken = await this.customerTokenService.generateAccessToken({
			sub: rotatedSession.customer.id,
			sid: rotatedSession.session.id,
		});

		return {
			accessToken,
			refreshToken: newRefreshToken,
			customer: toCustomerDto(rotatedSession.customer),
		};
	}

	private async revokeSessionsIfTokenWasReused(
		customerId: string | undefined,
		wasReused: boolean,
	): Promise<void> {
		if (!customerId || !wasReused) return;

		await this.customerRepository.revokeAllSessions(customerId);
	}
}
