import { prisma } from "../src/shared/database/prisma-client";

async function clean(): Promise<void> {
	console.log("🧹 Limpiando base de datos...");

	await prisma.paymentWebhookEvent.deleteMany();
	await prisma.reservationItem.deleteMany();
	await prisma.paymentAttempt.deleteMany();
	await prisma.reservation.deleteMany();
	await prisma.userSession.deleteMany();
	await prisma.user.deleteMany();
	await prisma.branchDish.deleteMany();
	await prisma.dish.deleteMany();
	await prisma.menuCategory.deleteMany();
	await prisma.branchScheduleInterval.deleteMany();
	await prisma.branchRules.deleteMany();
	await prisma.diningTable.deleteMany();
	await prisma.branch.deleteMany();
	await prisma.restaurant.deleteMany();

	console.log("✅ Base de datos limpiada exitosamente.");
}

clean()
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error al limpiar la base de datos: ${message}`);
		process.exit(1);
	});
