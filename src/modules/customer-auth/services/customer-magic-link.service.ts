export interface MagicLinkGenerationResult {
	token: string;
	tokenHash: string;
	expiresAt: Date;
}

export interface CustomerMagicLinkService {
	generate(now?: Date): MagicLinkGenerationResult;
	hashToken(token: string): string;
}
