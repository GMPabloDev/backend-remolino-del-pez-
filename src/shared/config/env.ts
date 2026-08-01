import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	ADMIN_NAME: z.string().min(1).optional(),
	ADMIN_EMAIL: z.string().email().optional(),
	ADMIN_PASSWORD: z.string().min(10).optional(),
	ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
	ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(25),
	REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
	CHECKOUT_TOKEN_SECRET: z.string().min(32),
	STRIPE_SECRET_KEY: z.string().min(1),
	STRIPE_WEBHOOK_SECRET: z.string().min(1),
	STRIPE_CHECKOUT_SUCCESS_URL: z.string().url(),
	STRIPE_CHECKOUT_CANCEL_URL: z.string().url(),
	CORS_ORIGINS: z.string().optional().default("http://localhost:4321"),
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
