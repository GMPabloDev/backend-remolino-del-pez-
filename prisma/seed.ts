import { env } from "../src/shared/config/env";
import { prisma } from "../src/shared/database/prisma-client";
import { BunPasswordService } from "../src/shared/security/bun-password.service";

const passwordService = new BunPasswordService();

async function seed(): Promise<void> {
	// Validar que las variables del admin están presentes
	if (!env.ADMIN_NAME || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
		throw new Error(
			"Faltan variables de entorno para el seed: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD.\n" +
				"Revisa el archivo .env.example.",
		);
	}

	const normalizedEmail = env.ADMIN_EMAIL.toLowerCase().trim();

	const existing = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});

	if (existing) {
		console.log(
			`ℹ️  El administrador "${normalizedEmail}" ya existe. No se modifica.`,
		);
		return;
	}

	const passwordHash = await passwordService.hash(env.ADMIN_PASSWORD);

	await prisma.user.create({
		data: {
			fullName: env.ADMIN_NAME,
			email: normalizedEmail,
			passwordHash,
			role: "ADMIN",
			status: "ACTIVE",
		},
	});

	console.log(`✅ Administrador "${normalizedEmail}" creado.`);
}

seed()
	.then(() => {
		process.exit(0);
	})
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error en el seed: ${message}`);
		process.exit(1);
	});
