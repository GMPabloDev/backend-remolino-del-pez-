import { Hono } from "hono";
import { publicBranchSlugParamsSchema } from "../../shared/slug/public-slug.schema";
import { validatePublicParams } from "../../shared/validation/public-params-validation";
import type { GetPublicMenuUseCase } from "./use-cases/get-public-menu/get-public-menu.use-case";

export function createPublicMenuRouter(deps: {
	getPublicMenu: GetPublicMenuUseCase;
}): Hono {
	const router = new Hono();

	router.get(
		"/",
		validatePublicParams(publicBranchSlugParamsSchema, "PUBLIC_MENU_NOT_FOUND"),
		async (c) => {
			const { restaurantSlug, branchSlug } = c.req.valid("param");
			const menu = await deps.getPublicMenu.execute(restaurantSlug, branchSlug);
			return c.json(menu);
		},
	);

	return router;
}
