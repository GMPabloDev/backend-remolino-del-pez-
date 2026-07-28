export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export interface TokenService {
  generateAccessToken(payload: AccessTokenPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  generateRefreshToken(): string;
  hashToken(token: string): string;
}
