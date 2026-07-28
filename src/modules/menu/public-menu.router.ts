import { Hono } from "hono";
import type { GetPublicMenuUseCase } from "./use-cases/get-public-menu/get-public-menu.use-case";

function getRestaurantId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("restaurantId");
	if (!id) throw new Error("restaurantId es requerido");
	return id;
}

function getBranchId(c: {
	req: { param: (name: string) => string | undefined };
}): string {
	const id = c.req.param("branchId");
	if (!id) throw new Error("branchId es requerido");
	return id;
}

export function createPublicMenuRouter(deps: {
	getPublicMenu: GetPublicMenuUseCase;
}): Hono {
	const router = new Hono();

	router.get("/", async (c) => {
		const restaurantId = getRestaurantId(c);
		const branchId = getBranchId(c);

		const menu = await deps.getPublicMenu.execute(restaurantId, branchId);
		return c.json(menu);
	});

	return router;
}
