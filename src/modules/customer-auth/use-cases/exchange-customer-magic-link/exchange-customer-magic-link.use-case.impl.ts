import { env } from "../../../../shared/config/env";
import { toCustomerDto } from "../../../customers/mapper/customer.mapper";
import type { CustomerRepository } from "../../../customers/repositories/customer.repository";
import { InvalidMagicLinkException } from "../../exceptions/invalid-magic-link.exception";
import type { CustomerTokenService } from "../../services/customer-token.service";
import type {
	ExchangeCustomerMagicLinkResult,
	ExchangeCustomerMagicLinkUseCase,
} from "./exchange-customer-magic-link.use-case";

export class ExchangeCustomerMagicLinkUseCaseImpl
	implements ExchangeCustomerMagicLinkUseCase
{
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly customerTokenService: CustomerTokenService,
	) {}

	async execute(token: string): Promise<ExchangeCustomerMagicLinkResult> {
		const now = new Date();
		const refreshToken = this.customerTokenService.generateRefreshToken();
		const refreshTokenHash = this.customerTokenService.hashToken(refreshToken);
		const refreshTokenExpiresAt = new Date(
			now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
		);

		const result = await this.customerRepository.exchangeMagicLink({
			tokenHash: this.customerTokenService.hashToken(token),
			consumedAt: now,
			refreshTokenHash,
			refreshTokenExpiresAt,
		});

		if (!result) {
			throw new InvalidMagicLinkException();
		}

		const accessToken = await this.customerTokenService.generateAccessToken({
			sub: result.customer.id,
			sid: result.session.id,
		});

		return {
			accessToken,
			refreshToken,
			customer: toCustomerDto(result.customer),
		};
	}
}
