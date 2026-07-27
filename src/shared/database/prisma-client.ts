import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL no está definida en el entorno");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

export { prisma };
