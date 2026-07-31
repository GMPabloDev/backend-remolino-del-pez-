import { Hono } from "hono";
import { publicRestaurantSlugParamsSchema } from "../../shared/slug/public-slug.schema";
import { validatePublicParams } from "../../shared/validation/public-params-validation";
import type { ListPublicBranchesUseCase } from "./use-cases/list-public-branches/list-public-branches.use-case";

export function createPublicBranchRouter(deps: {
	listPublicBranches: ListPublicBranchesUseCase;
}): Hono {
	const router = new Hono();

	router.get(
		"/",
		validatePublicParams(
			publicRestaurantSlugParamsSchema,
			"RESTAURANT_NOT_FOUND",
		),
		async (c) => {
			const { restaurantSlug } = c.req.valid("param");
			const branches = await deps.listPublicBranches.execute(restaurantSlug);
			return c.json(branches);
		},
	);

	return router;
}
