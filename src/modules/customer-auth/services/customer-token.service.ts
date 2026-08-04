export interface CustomerAccessTokenPayload {
	sub: string;
	sid: string;
}

export interface CustomerTokenService {
	generateAccessToken(payload: CustomerAccessTokenPayload): Promise<string>;
	verifyAccessToken(token: string): Promise<CustomerAccessTokenPayload>;
	generateRefreshToken(): string;
	hashToken(token: string): string;
}
