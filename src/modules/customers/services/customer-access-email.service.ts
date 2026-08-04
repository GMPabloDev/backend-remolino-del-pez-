import type { EmailMessage } from "../../../shared/email/email.service";

export interface CustomerAccessEmailData {
	to: string;
	customerName: string;
	restaurantName: string;
	accessUrl: string;
}

export interface CustomerAccessEmailService {
	create(data: CustomerAccessEmailData): EmailMessage;
}
