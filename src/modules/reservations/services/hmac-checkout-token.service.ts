import { createHash, createHmac, randomUUID } from "node:crypto";
import type { Env } from "../../../shared/config/env";
import type {
	CheckoutTokenGenerationResult,
	CheckoutTokenService,
} from "./checkout-token.service";

export class HmacCheckoutTokenService implements CheckoutTokenService {
	constructor(private readonly env: Env) {}

	generate(reservationId: string): CheckoutTokenGenerationResult {
		const version = randomUUID();
		const token = this.computeToken(reservationId, version);
		const hash = createHash("sha256").update(token).digest("hex");

		return { token, version, hash };
	}

	reconstruct(reservationId: string, version: string): string {
		return this.computeToken(reservationId, version);
	}

	private computeToken(reservationId: string, version: string): string {
		return createHmac("sha256", this.env.CHECKOUT_TOKEN_SECRET)
			.update(`${reservationId}:${version}`)
			.digest("base64url");
	}
}
