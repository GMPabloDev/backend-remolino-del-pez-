import { v2 as cloudinary } from "cloudinary";
import type { Env } from "../config/env";
import type {
	DocumentStorageService,
	StoredDocument,
} from "./document-storage.service";

export class CloudinaryDocumentStorageService
	implements DocumentStorageService
{
	constructor(env: Env) {
		cloudinary.config({
			cloud_name: env.CLOUDINARY_CLOUD_NAME,
			api_key: env.CLOUDINARY_API_KEY,
			api_secret: env.CLOUDINARY_API_SECRET,
			secure: true,
		});
	}

	async uploadPdf(
		bytes: Uint8Array,
		publicId: string,
	): Promise<StoredDocument> {
		return new Promise((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					resource_type: "raw",
					type: "authenticated",
					public_id: publicId,
					format: "pdf",
					overwrite: false,
				},
				(error, result) => {
					if (error || !result) {
						reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
						return;
					}

					resolve({
						publicId: result.public_id,
						version: String(result.version),
						bytes: result.bytes,
					});
				},
			);

			stream.end(Buffer.from(bytes));
		});
	}

	async createDownloadUrl(
		publicId: string,
		_fileName: string,
		expiresAt: Date,
	): Promise<string> {
		if (!publicId || expiresAt <= new Date()) {
			throw new Error("DOCUMENT_STORAGE_UNAVAILABLE");
		}

		return cloudinary.utils.private_download_url(publicId, "pdf", {
			resource_type: "raw",
			type: "authenticated",
			expires_at: Math.floor(expiresAt.getTime() / 1000),
			attachment: true,
		});
	}
}
