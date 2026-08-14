import type { EmailMessage } from "../../../shared/email/email.service";
import type {
	CustomerAccessEmailData,
	CustomerAccessEmailService,
} from "./customer-access-email.service";

const COLORS = {
	background: "#f4f7fb",
	panel: "#ffffff",
	ink: "#172033",
	muted: "#667085",
	primary: "#0f766e",
	primaryDark: "#115e59",
	accent: "#f59e0b",
} as const;

export class TemplateCustomerAccessEmailService
	implements CustomerAccessEmailService
{
	constructor(private readonly logoUrl?: string) {}

	create(data: CustomerAccessEmailData): EmailMessage {
		const customerName = escapeHtml(data.customerName);
		const restaurantName = escapeHtml(data.restaurantName);
		const accessUrl = escapeHtml(data.accessUrl);
		const logo = this.logoUrl
			? `<img src="${escapeHtml(this.logoUrl)}" alt="${restaurantName}" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:16px;background:#ffffff;padding:8px;box-sizing:border-box;">`
			: `<div style="width:64px;height:64px;border-radius:16px;background:${COLORS.accent};color:#ffffff;font-size:28px;font-weight:700;line-height:64px;text-align:center;">${escapeHtml(data.restaurantName.charAt(0).toUpperCase())}</div>`;

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
	<body style="margin:0;background:${COLORS.background};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};">
		<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COLORS.background};padding:28px 12px;">
			<tr><td align="center">
				<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:${COLORS.panel};border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08);">
					<tr><td style="background:${COLORS.primaryDark};padding:28px 34px;">
						<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
							<td width="76" valign="top">${logo}</td>
							<td valign="middle" style="padding-left:16px;color:#ffffff;">
								<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#a7f3d0;font-weight:700;">${restaurantName}</div>
								<div style="font-size:26px;line-height:34px;font-weight:700;margin-top:5px;">Acceso seguro</div>
							</td>
						</tr></table>
					</td></tr>
					<tr><td style="padding:36px 34px 14px;">
						<p style="margin:0 0 10px;font-size:17px;font-weight:700;color:${COLORS.ink};">Hola ${customerName},</p>
						<p style="margin:0;color:${COLORS.muted};font-size:15px;line-height:24px;">Solicitaste acceso a tu cuenta de ${restaurantName}. Haz clic en el botón para continuar de forma segura.</p>
					</td></tr>
					<tr><td style="padding:24px 34px 30px;text-align:center;"><a href="${accessUrl}" style="display:inline-block;background:${COLORS.primary};color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Acceder a mi cuenta</a><p style="margin:18px 0 0;color:${COLORS.muted};font-size:13px;line-height:20px;">Este enlace vence en 15 minutos y solo puede utilizarse una vez.</p></td></tr>
					<tr><td style="background:#f8fafc;padding:20px 34px;text-align:center;color:${COLORS.muted};font-size:12px;line-height:19px;">${restaurantName}<br>Si no solicitaste este acceso, puedes ignorar este correo.</td></tr>
				</table>
			</td></tr>
		</table>
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
