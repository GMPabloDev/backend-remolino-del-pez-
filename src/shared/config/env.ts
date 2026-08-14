import { z } from "zod";

const envSchema = z
	.object({
		DATABASE_URL: z.string().url(),
		ADMIN_NAME: z.string().min(1).optional(),
		ADMIN_EMAIL: z.string().email().optional(),
		ADMIN_PASSWORD: z.string().min(10).optional(),
		ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
		ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(25),
		REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
		CHECKOUT_TOKEN_SECRET: z.string().min(32),
		CUSTOMER_ACCESS_TOKEN_SECRET: z.string().min(32),
		CUSTOMER_MAGIC_LINK_URL: z
			.string()
			.url()
			.refine((value) => {
				const url = new URL(value);
				return (
					url.protocol === "https:" ||
					(url.protocol === "http:" && url.hostname === "localhost")
				);
			}, "debe usar HTTPS, excepto en localhost"),
		SMTP_HOST: z.string().min(1),
		SMTP_PORT: z.coerce.number().int().min(1).max(65535),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.transform((value) => value === "true"),
		SMTP_USER: z.string().email(),
		SMTP_PASS: z.string().min(1),
		SMTP_FROM_NAME: z.string().min(1),
		SMTP_FROM_EMAIL: z.string().email(),
		CLOUDINARY_CLOUD_NAME: z.string().min(1),
		CLOUDINARY_API_KEY: z.string().min(1),
		CLOUDINARY_API_SECRET: z.string().min(1),
		STRIPE_SECRET_KEY: z.string().min(1),
		STRIPE_WEBHOOK_SECRET: z.string().min(1),
		STRIPE_CHECKOUT_SUCCESS_URL: z.string().url(),
		STRIPE_CHECKOUT_CANCEL_URL: z.string().url(),
		CORS_ORIGINS: z.string().optional().default("http://localhost:4321"),
	})
	.superRefine((config, context) => {
		if (
			config.ACCESS_TOKEN_SECRET &&
			config.CUSTOMER_ACCESS_TOKEN_SECRET === config.ACCESS_TOKEN_SECRET
		) {
			context.addIssue({
				code: "custom",
				path: ["CUSTOMER_ACCESS_TOKEN_SECRET"],
				message: "debe ser diferente de ACCESS_TOKEN_SECRET",
			});
		}

		if (config.CUSTOMER_ACCESS_TOKEN_SECRET === config.CHECKOUT_TOKEN_SECRET) {
			context.addIssue({
				code: "custom",
				path: ["CUSTOMER_ACCESS_TOKEN_SECRET"],
				message: "debe ser diferente de CHECKOUT_TOKEN_SECRET",
			});
		}

		if (
			config.SMTP_HOST === "smtp.gmail.com" &&
			config.SMTP_PORT === 587 &&
			config.SMTP_SECURE
		) {
			context.addIssue({
				code: "custom",
				path: ["SMTP_SECURE"],
				message: "debe ser false para Gmail mediante STARTTLS en el puerto 587",
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		throw new Error(
			`Configuración de entorno inválida:\n${issues}\n\n` +
				"Revisa el archivo .env.example para conocer las variables requeridas.",
		);
	}

	return result.data;
}

export const env = loadEnv();
