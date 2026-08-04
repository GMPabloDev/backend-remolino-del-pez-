import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { Env } from "../../../shared/config/env";
import type {
	CustomerAccessTokenPayload,
	CustomerTokenService,
} from "./customer-token.service";

const CUSTOMER_TOKEN_AUDIENCE = "customer";

export class JwtCustomerTokenService implements CustomerTokenService {
	private readonly secret: Uint8Array;
	private readonly accessTokenTtl: string;

	constructor(env: Env) {
		this.secret = new TextEncoder().encode(env.CUSTOMER_ACCESS_TOKEN_SECRET);
		this.accessTokenTtl = `${env.ACCESS_TOKEN_TTL_MINUTES}m`;
	}

	async generateAccessToken(
		payload: CustomerAccessTokenPayload,
	): Promise<string> {
		const now = Math.floor(Date.now() / 1000);

		return new SignJWT({})
			.setProtectedHeader({ alg: "HS256" })
			.setAudience(CUSTOMER_TOKEN_AUDIENCE)
			.setSubject(payload.sub)
			.setJti(payload.sid)
			.setIssuedAt(now)
			.setExpirationTime(this.accessTokenTtl)
			.sign(this.secret);
	}

	async verifyAccessToken(token: string): Promise<CustomerAccessTokenPayload> {
		const { payload } = await jwtVerify(token, this.secret, {
			algorithms: ["HS256"],
			audience: CUSTOMER_TOKEN_AUDIENCE,
		});

		if (!payload.sub || !payload.jti) {
			throw new Error("Token de cliente inválido: faltan claims requeridos");
		}

		return {
			sub: payload.sub,
			sid: payload.jti,
		};
	}

	generateRefreshToken(): string {
		return randomBytes(32).toString("hex");
	}

	hashToken(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}
}
