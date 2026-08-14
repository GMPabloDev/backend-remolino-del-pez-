export interface StoredDocument {
	publicId: string;
	version: string;
	bytes: number;
}

export interface DocumentStorageService {
	uploadPdf(bytes: Uint8Array, publicId: string): Promise<StoredDocument>;
	createDownloadUrl(
		publicId: string,
		fileName: string,
		expiresAt: Date,
	): Promise<string>;
}
