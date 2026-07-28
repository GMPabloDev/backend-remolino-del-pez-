import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";
import type { AccessTokenPayload, TokenService } from "./token.service";

export class JwtTokenService implements TokenService {
  private readonly secret: Uint8Array;
  private readonly accessTokenTtl: string;

  constructor() {
    this.secret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
    this.accessTokenTtl = `${env.ACCESS_TOKEN_TTL_MINUTES}m`;
  }

  async generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setJti(payload.sid)
      .setIssuedAt(now)
      .setExpirationTime(this.accessTokenTtl)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ["HS256"],
    });

    return {
      sub: payload.sub!,
      sid: payload.jti!,
    };
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString("hex");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
