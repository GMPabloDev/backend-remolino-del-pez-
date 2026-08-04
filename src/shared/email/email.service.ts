export interface EmailMessage {
	to: string;
	subject: string;
	text: string;
	html: string;
}

export interface EmailService {
	send(message: EmailMessage): Promise<void>;
}
