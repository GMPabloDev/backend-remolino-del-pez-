import nodemailer, { type Transporter } from "nodemailer";
import type { Env } from "../config/env";
import type { EmailMessage, EmailService } from "./email.service";

export class NodemailerEmailService implements EmailService {
	private readonly transporter: Transporter;
	private readonly from: string;

	constructor(env: Env) {
		this.transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			requireTLS: env.SMTP_HOST === "smtp.gmail.com" && env.SMTP_PORT === 587,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS,
			},
		});
		this.from = formatSender(env.SMTP_FROM_NAME, env.SMTP_FROM_EMAIL);
	}

	async send(message: EmailMessage): Promise<void> {
		await this.transporter.sendMail({
			from: this.from,
			to: message.to,
			subject: message.subject,
			text: message.text,
			html: message.html,
			attachments: message.attachments?.map((attachment) => ({
				filename: attachment.filename,
				content: Buffer.from(attachment.content),
				contentType: attachment.contentType,
			})),
		});
	}
}

function formatSender(name: string, email: string): string {
	const escapedName = name.replaceAll('"', '\\"');
	return `"${escapedName}" <${email}>`;
}
