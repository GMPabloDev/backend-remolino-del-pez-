import type { EmailMessage } from "../../../shared/email/email.service";
import type {
	CustomerAccessEmailData,
	CustomerAccessEmailService,
} from "./customer-access-email.service";

export class TemplateCustomerAccessEmailService
	implements CustomerAccessEmailService
{
	create(data: CustomerAccessEmailData): EmailMessage {
		const customerName = escapeHtml(data.customerName);
		const restaurantName = escapeHtml(data.restaurantName);
		const accessUrl = escapeHtml(data.accessUrl);

		return {
			to: data.to,
			subject: `Acceso a tu cuenta de ${data.restaurantName}`,
			text: [
				`Hola ${data.customerName},`,
				"",
				`Solicitaste acceso a tu cuenta de ${data.restaurantName}.`,
				"Usa el siguiente enlace para iniciar sesión:",
				data.accessUrl,
				"",
				"El enlace vence en 15 minutos y solo puede utilizarse una vez.",
			].join("\n"),
			html: `<!doctype html>
<html lang="es">
	<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
		<div style="max-width:600px;margin:0 auto;padding:24px;">
			<div style="background:#ffffff;border-radius:12px;padding:32px;">
				<h1>Acceso a tu cuenta</h1>
				<p>Hola ${customerName},</p>
				<p>Solicitaste acceso a tu cuenta de <strong>${restaurantName}</strong>.</p>
				<p style="text-align:center;margin:32px 0;">
					<a href="${accessUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;">Acceder a mi cuenta</a>
				</p>
				<p>El enlace vence en 15 minutos y solo puede utilizarse una vez.</p>
			</div>
		</div>
	</body>
</html>`,
		};
	}
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
