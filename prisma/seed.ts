import { env } from "../src/shared/config/env";
import { prisma } from "../src/shared/database/prisma-client";
import { BunPasswordService } from "../src/shared/security/bun-password.service";
import { normalizeSlug } from "../src/shared/slug/slug";
import {
	BranchStatus,
	BranchDishStatus,
	DiningTableStatus,
	MenuCategoryStatus,
	DishStatus,
	UserRole,
	UserStatus,
} from "../src/generated/prisma/enums";

const passwordService = new BunPasswordService();

const RESTAURANT = {
	name: "El Remolino del Pez",
	legalName: "El Remolino del Pez S.A.C.",
	taxId: "20123456789",
	phone: "+51 1 555 1234",
	email: "contacto@elremolinodelpez.pe",
};

const BRANCH_RULES = {
	defaultReservationDurationMinutes: 90,
	minimumAdvanceMinutes: 60,
	maximumAdvanceDays: 30,
	arrivalToleranceMinutes: 15,
	maxPartySize: 10,
};

const SCHEDULE_INTERVALS = [
	{ dayOfWeek: 1, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 1, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 2, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 2, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 3, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 3, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 4, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 4, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 5, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 5, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 6, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 6, startMinute: 18 * 60, endMinute: 23 * 60 },
	{ dayOfWeek: 7, startMinute: 12 * 60, endMinute: 17 * 60 },
	{ dayOfWeek: 7, startMinute: 18 * 60, endMinute: 23 * 60 },
];

type BranchSeed = {
	name: string;
	code: string;
	address: string;
	district: string;
	province: string;
	department: string;
	phone: string;
	email: string;
	status: BranchStatus;
};

const BRANCHES: BranchSeed[] = [
	{
		name: "Miraflores",
		code: "MIR-001",
		address: "Av. Larco 1234",
		district: "Miraflores",
		province: "Lima",
		department: "Lima",
		phone: "+51 1 446 1234",
		email: "miraflores@elremolinodelpez.pe",
		status: BranchStatus.ACTIVE,
	},
	{
		name: "Barranco",
		code: "BAR-001",
		address: "Jr. Unión 456",
		district: "Barranco",
		province: "Lima",
		department: "Lima",
		phone: "+51 1 247 5678",
		email: "barranco@elremolinodelpez.pe",
		status: BranchStatus.ACTIVE,
	},
	{
		name: "Callao",
		code: "CAL-001",
		address: "Av. Grau 789",
		district: "Callao",
		province: "Callao",
		department: "Callao",
		phone: "+51 1 429 9012",
		email: "callao@elremolinodelpez.pe",
		status: BranchStatus.ACTIVE,
	},
	{
		name: "Chiclayo",
		code: "CHI-001",
		address: "Av. Balta 101",
		district: "Chiclayo",
		province: "Chiclayo",
		department: "Lambayeque",
		phone: "+51 74 20 3456",
		email: "chiclayo@elremolinodelpez.pe",
		status: BranchStatus.ACTIVE,
	},
	{
		name: "Arequipa",
		code: "ARE-001",
		address: "Calle San Francisco 202",
		district: "Arequipa",
		province: "Arequipa",
		department: "Arequipa",
		phone: "+51 54 21 7890",
		email: "arequipa@elremolinodelpez.pe",
		status: BranchStatus.INACTIVE,
	},
];

type UserSeed = {
	fullName: string;
	email: string;
	phone: string;
	password: string;
	role: UserRole;
	status: UserStatus;
	branch?: string;
};

const USERS: UserSeed[] = [
	{
		fullName: "Carlos Mendoza",
		email: "manager@elremolinodelpez.pe",
		phone: "+51987654321",
		password: "Gerente2024",
		role: UserRole.MANAGER,
		status: UserStatus.ACTIVE,
	},
	{
		fullName: "Rosa Huamán",
		email: "miraflores@elremolinodelpez.pe",
		phone: "+51981234567",
		password: "Miraflores2024",
		role: UserRole.BRANCH_ADMIN,
		status: UserStatus.ACTIVE,
		branch: "Miraflores",
	},
	{
		fullName: "Jorge Torres",
		email: "chiclayo@elremolinodelpez.pe",
		phone: "+51979876543",
		password: "Chiclayo2024",
		role: UserRole.BRANCH_ADMIN,
		status: UserStatus.ACTIVE,
		branch: "Chiclayo",
	},
	{
		fullName: "Lucía Fernández",
		email: "arequipa@elremolinodelpez.pe",
		phone: "+51962345678",
		password: "Arequipa2024",
		role: UserRole.BRANCH_ADMIN,
		status: UserStatus.INACTIVE,
		branch: "Arequipa",
	},
];

type CategorySeed = {
	name: string;
	position: number;
	status: MenuCategoryStatus;
};

const CATEGORIES: CategorySeed[] = [
	{ name: "Ceviches", position: 1, status: MenuCategoryStatus.ACTIVE },
	{ name: "Tiraditos", position: 2, status: MenuCategoryStatus.ACTIVE },
	{ name: "Arroces y Marineros", position: 3, status: MenuCategoryStatus.ACTIVE },
	{ name: "Jaleas y Frituras", position: 4, status: MenuCategoryStatus.ACTIVE },
	{ name: "Sopas y Guisos", position: 5, status: MenuCategoryStatus.ACTIVE },
	{ name: "Entradas", position: 6, status: MenuCategoryStatus.ACTIVE },
	{ name: "Postres y Bebidas", position: 7, status: MenuCategoryStatus.INACTIVE },
];

type DishSeed = {
	name: string;
	category: string;
	description: string;
	price: string;
	ingredients: string[];
	allergens: string[];
	status: DishStatus;
};

const DISHES: DishSeed[] = [
	{
		name: "Ceviche Clásico",
		category: "Ceviches",
		description:
			"Pescado fresco en cubos, limón, ají limo, cebolla roja, camote y choclo.",
		price: "25.90",
		ingredients: ["Pescado fresco", "Limón", "Ají limo", "Cebolla roja", "Camote", "Choclo"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Ceviche Mixto",
		category: "Ceviches",
		description:
			"Pescado fresco, calamar, langostinos y conchas en limón con cebolla roja y ají.",
		price: "38.50",
		ingredients: ["Pescado fresco", "Calamar", "Langostinos", "Conchas", "Limón", "Ají limo", "Cebolla roja"],
		allergens: ["Pescado", "Crustáceos", "Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Ceviche de Lenguado",
		category: "Ceviches",
		description: "Trozos de lenguado de roca macerados en limón, ají limo y cebolla.",
		price: "32.00",
		ingredients: ["Lenguado", "Limón", "Ají limo", "Cebolla roja", "Camote"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Ceviche de Conchas Negras",
		category: "Ceviches",
		description: "Conchas negras frescas al limón con ají limo, el sabor del norte del Perú.",
		price: "42.00",
		ingredients: ["Conchas negras", "Limón", "Ají limo", "Cebolla roja", "Camote"],
		allergens: ["Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Ceviche de Pulpo",
		category: "Ceviches",
		description: "Pulpo tierno al limón con ají amarillo y cebolla morada.",
		price: "36.50",
		ingredients: ["Pulpo", "Limón", "Ají amarillo", "Cebolla morada"],
		allergens: ["Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Tiradito de Pescado",
		category: "Tiraditos",
		description: "Finas láminas de pescado con salsa de ají limo y rocoto.",
		price: "30.00",
		ingredients: ["Pescado fresco", "Ají limo", "Rocoto", "Limón"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Tiradito de Pulpo",
		category: "Tiraditos",
		description: "Láminas de pulpo con crema de ají amarillo y aceite de sésamo.",
		price: "34.50",
		ingredients: ["Pulpo", "Ají amarillo", "Sésamo", "Limón"],
		allergens: ["Moluscos", "Sésamo"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Tiradito Mixto",
		category: "Tiraditos",
		description: "Pescado, pulpo y langostinos en láminas con leche de tigre clásica.",
		price: "38.00",
		ingredients: ["Pescado fresco", "Pulpo", "Langostinos", "Leche de tigre"],
		allergens: ["Pescado", "Crustáceos", "Moluscos"],
		status: DishStatus.INACTIVE,
	},
	{
		name: "Arroz con Mariscos",
		category: "Arroces y Marineros",
		description: "Arroz verde con calamares, langostinos, conchas y ají amarillo.",
		price: "39.00",
		ingredients: ["Arroz", "Calamar", "Langostinos", "Conchas", "Ají amarillo", "Perejil"],
		allergens: ["Crustáceos", "Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Arroz a la Criolla con Mariscos",
		category: "Arroces y Marineros",
		description: "Arroz criollo guisado con mariscos del día y ají panca.",
		price: "35.50",
		ingredients: ["Arroz", "Mariscos del día", "Ají panca", "Cebolla", "Ajo"],
		allergens: ["Crustáceos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Arroz con Calamares",
		category: "Arroces y Marineros",
		description: "Arroz marinero con calamares frescos salteados y ají amarillo.",
		price: "32.50",
		ingredients: ["Arroz", "Calamar", "Ají amarillo", "Cebolla"],
		allergens: ["Moluscos"],
		status: DishStatus.INACTIVE,
	},
	{
		name: "Jalea Mixta",
		category: "Jaleas y Frituras",
		description: "Pescado, calamar y langostinos fritos con salsa criolla y ensalada.",
		price: "48.00",
		ingredients: ["Pescado fresco", "Calamar", "Langostinos", "Limón", "Salsa criolla"],
		allergens: ["Pescado", "Crustáceos", "Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Chicharrón de Calamar",
		category: "Jaleas y Frituras",
		description: "Anillas de calamar crocantes con salsa tártara de la casa.",
		price: "28.00",
		ingredients: ["Calamar", "Harina", "Limón", "Salsa tártara"],
		allergens: ["Moluscos", "Gluten", "Huevo"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Pescado Frito",
		category: "Jaleas y Frituras",
		description: "Entero frito con chifle, camote y ensalada criolla.",
		price: "26.50",
		ingredients: ["Pescado entero", "Chifle", "Camote", "Ensalada criolla"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Parihuela",
		category: "Sopas y Guisos",
		description: "Sopa marina picante con pescado, calamar, langostinos y conchas.",
		price: "45.00",
		ingredients: ["Pescado fresco", "Calamar", "Langostinos", "Conchas", "Ají amarillo", "Rocoto"],
		allergens: ["Pescado", "Crustáceos", "Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Sudado de Pescado",
		category: "Sopas y Guisos",
		description: "Pescado sudado al vapor con cebolla, tomate y ají amarillo.",
		price: "33.00",
		ingredients: ["Pescado fresco", "Cebolla", "Tomate", "Ají amarillo"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Chupe de Camarones",
		category: "Sopas y Guisos",
		description: "Chupe arequipeño de camarones con leche, papa y queso.",
		price: "42.00",
		ingredients: ["Camarones", "Leche", "Papa", "Queso", "Arroz"],
		allergens: ["Crustáceos", "Lácteos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Aguadito de Mariscos",
		category: "Sopas y Guisos",
		description: "Caldo de arroz y culantro con mariscos del día.",
		price: "30.50",
		ingredients: ["Arroz", "Mariscos del día", "Culantro", "Ají verde"],
		allergens: ["Crustáceos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Leche de Tigre",
		category: "Entradas",
		description: "La leche de tigre clásica con trozos de pescado y maíz cancha.",
		price: "19.00",
		ingredients: ["Pescado", "Limón", "Ají limo", "Maíz cancha"],
		allergens: ["Pescado"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Causa Limeña de Atún",
		category: "Entradas",
		description: "Causa fría de atún con ají amarillo, palta y huevo.",
		price: "22.00",
		ingredients: ["Papa amarilla", "Atún", "Ají amarillo", "Palta", "Huevo"],
		allergens: ["Pescado", "Huevo"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Conchitas a la Parmesana",
		category: "Entradas",
		description: "Conchas de abanico gratinadas con parmesano y toque de vino blanco.",
		price: "27.50",
		ingredients: ["Conchas de abanico", "Parmesano", "Vino blanco", "Limón"],
		allergens: ["Moluscos", "Lácteos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Pulpo al Olivo",
		category: "Entradas",
		description: "Pulpo al olivo sobre lechuga fresca con aceitunas botija.",
		price: "29.00",
		ingredients: ["Pulpo", "Aceituna botija", "Aceite de oliva", "Lechuga"],
		allergens: ["Moluscos"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Ceviche Nikkei",
		category: "Entradas",
		description: "Fusión peruano-japonesa con pescado fresco, ají limo y toques de soja.",
		price: "35.00",
		ingredients: ["Pescado fresco", "Ají limo", "Sésamo", "Soja", "Cebollín"],
		allergens: ["Pescado", "Sésamo", "Soja"],
		status: DishStatus.ACTIVE,
	},
	{
		name: "Suspiro a la Limeña",
		category: "Postres y Bebidas",
		description: "Dulce de manjarblanco con merengue y canela.",
		price: "14.00",
		ingredients: ["Manjarblanco", "Huevo", "Canela"],
		allergens: ["Huevo", "Lácteos"],
		status: DishStatus.INACTIVE,
	},
	{
		name: "Pie de Limón",
		category: "Postres y Bebidas",
		description: "Tarta de limón con base crujiente y merengue.",
		price: "13.00",
		ingredients: ["Limón", "Huevo", "Galleta", "Azúcar"],
		allergens: ["Huevo", "Gluten", "Lácteos"],
		status: DishStatus.INACTIVE,
	},
	{
		name: "Chicha Morada",
		category: "Postres y Bebidas",
		description: "Refresco tradicional de maíz morado con piña y canela.",
		price: "8.00",
		ingredients: ["Maíz morado", "Piña", "Canela", "Limón"],
		allergens: [],
		status: DishStatus.INACTIVE,
	},
];

type BranchDishOverride = {
	soldOut: string[];
	inactive: string[];
};

const BRANCH_DISH_OVERRIDES: Record<string, BranchDishOverride> = {
	Miraflores: {
		soldOut: ["Ceviche de Conchas Negras", "Leche de Tigre"],
		inactive: ["Chicharrón de Calamar"],
	},
	Barranco: {
		soldOut: ["Parihuela", "Pulpo al Olivo"],
		inactive: ["Ceviche de Pulpo"],
	},
	Callao: {
		soldOut: ["Arroz con Mariscos", "Conchitas a la Parmesana"],
		inactive: ["Sudado de Pescado"],
	},
	Chiclayo: {
		soldOut: ["Jalea Mixta", "Chupe de Camarones"],
		inactive: ["Tiradito de Pulpo"],
	},
};

const INACTIVE_BRANCH_DISHES = ["Ceviche Clásico", "Ceviche Mixto", "Parihuela"];

const TABLE_DEFS: { code: string; capacity: number; status: DiningTableStatus }[] = [
	{ code: "T1", capacity: 2, status: DiningTableStatus.ACTIVE },
	{ code: "T2", capacity: 2, status: DiningTableStatus.INACTIVE },
	{ code: "T3", capacity: 4, status: DiningTableStatus.ACTIVE },
	{ code: "T4", capacity: 4, status: DiningTableStatus.ACTIVE },
	{ code: "T5", capacity: 6, status: DiningTableStatus.ACTIVE },
	{ code: "T6", capacity: 6, status: DiningTableStatus.ACTIVE },
	{ code: "T7", capacity: 8, status: DiningTableStatus.ACTIVE },
	{ code: "T8", capacity: 8, status: DiningTableStatus.INACTIVE },
];

function dishImageUrl(name: string): string {
	return `https://placehold.co/600x400?text=${encodeURIComponent(name)}`;
}

function countStatus<T extends { status: string }>(items: T[]): Record<string, number> {
	return items.reduce<Record<string, number>>((acc, item) => {
		acc[item.status] = (acc[item.status] ?? 0) + 1;
		return acc;
	}, {});
}

async function seedAdmin(): Promise<void> {
	if (!env.ADMIN_NAME || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
		console.warn(
			"⚠️  Faltan variables ADMIN_* en el entorno; no se crea el administrador.",
		);
		return;
	}

	const normalizedEmail = env.ADMIN_EMAIL.toLowerCase().trim();
	const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

	if (existing) {
		console.log(`ℹ️  El administrador "${normalizedEmail}" ya existe. No se modifica.`);
		return;
	}

	const passwordHash = await passwordService.hash(env.ADMIN_PASSWORD);

	await prisma.user.create({
		data: {
			fullName: env.ADMIN_NAME,
			email: normalizedEmail,
			passwordHash,
			role: UserRole.ADMIN,
			status: UserStatus.ACTIVE,
		},
	});

	console.log(`✅ Administrador "${normalizedEmail}" creado.`);
}

async function seedDevData(): Promise<void> {
	const existingRestaurant = await prisma.restaurant.findUnique({
		where: { taxId: RESTAURANT.taxId },
	});

	if (existingRestaurant) {
		console.log(
			`ℹ️  El restaurante "${existingRestaurant.name}" ya existe. No se modifica.`,
		);
		return;
	}

	const restaurant = await prisma.restaurant.create({
		data: {
			name: RESTAURANT.name,
			slug: normalizeSlug(RESTAURANT.name, "restaurant"),
			legalName: RESTAURANT.legalName,
			taxId: RESTAURANT.taxId,
			phone: RESTAURANT.phone,
			email: RESTAURANT.email,
		},
	});
	console.log(`✅ Restaurante "${RESTAURANT.name}" creado.`);

	const branchByName = new Map<string, { id: string; name: string }>();

	for (const branchSeed of BRANCHES) {
		const branch = await prisma.branch.create({
			data: {
				restaurantId: restaurant.id,
				slug: normalizeSlug(branchSeed.name, "branch"),
				name: branchSeed.name,
				code: branchSeed.code,
				address: branchSeed.address,
				district: branchSeed.district,
				province: branchSeed.province,
				department: branchSeed.department,
				phone: branchSeed.phone,
				email: branchSeed.email,
				status: branchSeed.status,
				rules: { create: BRANCH_RULES },
			},
		});
		branchByName.set(branch.name, { id: branch.id, name: branch.name });

		await prisma.branchScheduleInterval.createMany({
			data: SCHEDULE_INTERVALS.map((interval) => ({
				branchId: branch.id,
				...interval,
			})),
		});

		if (branchSeed.status === BranchStatus.ACTIVE) {
			await prisma.diningTable.createMany({
				data: TABLE_DEFS.map((table) => ({ branchId: branch.id, ...table })),
			});
		}
	}
	console.log(`✅ ${BRANCHES.length} sucursales creadas con reglas y horarios.`);

	for (const userSeed of USERS) {
		const passwordHash = await passwordService.hash(userSeed.password);
		await prisma.user.create({
			data: {
				fullName: userSeed.fullName,
				email: userSeed.email,
				phone: userSeed.phone,
				passwordHash,
				role: userSeed.role,
				status: userSeed.status,
				branchId: userSeed.branch ? branchByName.get(userSeed.branch)?.id : null,
			},
		});
	}
	console.log(`✅ ${USERS.length} usuarios de prueba creados.`);

	const categoryByName = new Map<string, { id: string; name: string }>();

	for (const categorySeed of CATEGORIES) {
		const category = await prisma.menuCategory.create({
			data: {
				restaurantId: restaurant.id,
				name: categorySeed.name,
				normalizedName: categorySeed.name.toLowerCase(),
				position: categorySeed.position,
				status: categorySeed.status,
			},
		});
		categoryByName.set(category.name, { id: category.id, name: category.name });
	}
	console.log(`✅ ${CATEGORIES.length} categorías creadas.`);

	const dishByName = new Map<string, { id: string; name: string; category: string }>();
	const positions = new Map<string, number>();

	for (const dishSeed of DISHES) {
		const position = (positions.get(dishSeed.category) ?? 0) + 1;
		positions.set(dishSeed.category, position);

		const dish = await prisma.dish.create({
			data: {
				restaurantId: restaurant.id,
				categoryId: categoryByName.get(dishSeed.category)!.id,
				name: dishSeed.name,
				normalizedName: dishSeed.name.toLowerCase(),
				description: dishSeed.description,
				imageUrl: dishImageUrl(dishSeed.name),
				ingredients: dishSeed.ingredients,
				allergens: dishSeed.allergens,
				position,
				status: dishSeed.status,
			},
		});
		dishByName.set(dish.name, {
			id: dish.id,
			name: dish.name,
			category: dishSeed.category,
		});
	}
	console.log(`✅ ${DISHES.length} platos creados.`);

	const activeCategories = new Set(
		CATEGORIES.filter((c) => c.status === MenuCategoryStatus.ACTIVE).map((c) => c.name),
	);
	const assignableDishes = DISHES.filter((d) => activeCategories.has(d.category));

	let branchDishCount = 0;

	for (const branchSeed of BRANCHES) {
		if (branchSeed.status !== BranchStatus.ACTIVE) {
			continue;
		}

		const branch = branchByName.get(branchSeed.name)!;
		const overrides = BRANCH_DISH_OVERRIDES[branchSeed.name];

		await prisma.branchDish.createMany({
			data: assignableDishes.map((dish) => {
				let status: BranchDishStatus = BranchDishStatus.AVAILABLE;
				if (overrides.soldOut.includes(dish.name)) {
					status = BranchDishStatus.SOLD_OUT;
				}
				if (overrides.inactive.includes(dish.name)) {
					status = BranchDishStatus.INACTIVE;
				}
				return {
					branchId: branch.id,
					dishId: dishByName.get(dish.name)!.id,
					price: dish.price,
					status,
				};
			}),
		});
		branchDishCount += assignableDishes.length;
	}

	const arequipaBranch = branchByName.get("Arequipa")!;
	for (const dishName of INACTIVE_BRANCH_DISHES) {
		const dish = dishByName.get(dishName)!;
		await prisma.branchDish.create({
			data: {
				branchId: arequipaBranch.id,
				dishId: dish.id,
				price: DISHES.find((d) => d.name === dishName)!.price,
				status: BranchDishStatus.INACTIVE,
			},
		});
	}
	branchDishCount += INACTIVE_BRANCH_DISHES.length;

	console.log(`✅ ${branchDishCount} precios por sucursal (BranchDish) creados.`);

	console.log("\n📊 Resumen de datos de prueba:");
	console.log(`   - Restaurante: ${RESTAURANT.name}`);
	console.log(
		`   - Sucursales: ${BRANCHES.length} (${countStatus(BRANCHES).ACTIVE ?? 0} activas, ${countStatus(BRANCHES).INACTIVE ?? 0} inactiva)`,
	);
	console.log(
		`   - Usuarios: ${USERS.length} (${countStatus(USERS).ACTIVE ?? 0} activos, ${countStatus(USERS).INACTIVE ?? 0} inactivo)`,
	);
	console.log(
		`   - Categorías: ${CATEGORIES.length} (${countStatus(CATEGORIES).ACTIVE ?? 0} activas, ${countStatus(CATEGORIES).INACTIVE ?? 0} inactiva)`,
	);
	console.log(
		`   - Platos: ${DISHES.length} (${countStatus(DISHES).ACTIVE ?? 0} activos, ${countStatus(DISHES).INACTIVE ?? 0} inactivos)`,
	);
	console.log(`   - Precios por sucursal: ${branchDishCount}`);

	console.log("\n🔐 Credenciales de usuarios de prueba:");
	for (const userSeed of USERS) {
		const branchLabel = userSeed.branch ? ` (${userSeed.branch})` : "";
		console.log(`   - ${userSeed.email} / ${userSeed.password} [${userSeed.role}]${branchLabel}`);
	}
}

async function seed(): Promise<void> {
	console.log("🌱 Sembrando base de datos...");

	await seedAdmin();
	await seedDevData();

	console.log("✅ Seed completado.");
}

seed()
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error en el seed: ${message}`);
		process.exit(1);
	});
