export interface EmailAttachment {
	filename: string;
	content: Uint8Array;
	contentType: string;
}

export interface EmailMessage {
	to: string;
	subject: string;
	text: string;
	html: string;
	attachments?: EmailAttachment[];
}

export interface EmailService {
	send(message: EmailMessage): Promise<void>;
}
