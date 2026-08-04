import { createHash, randomBytes } from "node:crypto";
import type {
	CustomerMagicLinkService,
	MagicLinkGenerationResult,
} from "./customer-magic-link.service";

const MAGIC_LINK_TTL_MINUTES = 15;
const MAGIC_LINK_BYTES = 32;

export class CryptoCustomerMagicLinkService
	implements CustomerMagicLinkService
{
	generate(now = new Date()): MagicLinkGenerationResult {
		const token = randomBytes(MAGIC_LINK_BYTES).toString("base64url");
		const tokenHash = this.hashToken(token);
		const expiresAt = new Date(
			now.getTime() + MAGIC_LINK_TTL_MINUTES * 60 * 1000,
		);

		return { token, tokenHash, expiresAt };
	}

	hashToken(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}
}
