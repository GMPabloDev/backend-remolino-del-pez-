import type { EmailService } from "../../../../shared/email/email.service";
import type { CustomerMagicLinkService } from "../../../customer-auth/services/customer-magic-link.service";
import type { CustomerRepository } from "../../repositories/customer.repository";
import type { CustomerAccessEmailService } from "../../services/customer-access-email.service";
import type {
	RequestCustomerMagicLinkInput,
	RequestCustomerMagicLinkUseCase,
} from "./request-customer-magic-link.use-case";

const MANUAL_REQUEST_COOLDOWN_MS = 60 * 1000;

export class RequestCustomerMagicLinkUseCaseImpl
	implements RequestCustomerMagicLinkUseCase
{
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly customerMagicLinkService: CustomerMagicLinkService,
		private readonly accessEmailService: CustomerAccessEmailService,
		private readonly emailService: EmailService,
		private readonly customerMagicLinkUrl: string,
	) {}

	async execute(input: RequestCustomerMagicLinkInput): Promise<void> {
		const normalizedEmail = normalizeEmail(input.email);
		const customer =
			await this.customerRepository.findByRestaurantSlugAndNormalizedEmail(
				input.restaurantSlug,
				normalizedEmail,
			);

		if (!customer) return;

		const now = new Date();
		const latestManualLink =
			await this.customerRepository.findLatestManualMagicLink(customer.id);

		if (
			latestManualLink &&
			latestManualLink.createdAt.getTime() >
				now.getTime() - MANUAL_REQUEST_COOLDOWN_MS
		) {
			return;
		}

		const magicLink = this.customerMagicLinkService.generate(now);

		await this.customerRepository.invalidateActiveMagicLinks(customer.id, now);

		const persistedMagicLink = await this.customerRepository.createMagicLink({
			customerId: customer.id,
			source: "ACCESS_REQUEST",
			tokenHash: magicLink.tokenHash,
			expiresAt: magicLink.expiresAt,
		});

		try {
			const message = this.accessEmailService.create({
				to: customer.email,
				customerName: customer.fullName,
				restaurantName: customer.restaurant.name,
				accessUrl: buildMagicLinkUrl(
					this.customerMagicLinkUrl,
					magicLink.token,
				),
			});

			await this.emailService.send(message);
			await this.customerRepository.markMagicLinkSent(
				persistedMagicLink.id,
				new Date(),
			);
		} catch {
			try {
				await this.customerRepository.markMagicLinkFailed(
					persistedMagicLink.id,
					new Date(),
					"EMAIL_SEND_FAILED",
				);
			} catch {
				// La respuesta pública no debe revelar ni propagar el fallo SMTP.
			}
		}
	}
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function buildMagicLinkUrl(baseUrl: string, token: string): string {
	const url = new URL(baseUrl);
	url.searchParams.set("token", token);
	return url.toString();
}
