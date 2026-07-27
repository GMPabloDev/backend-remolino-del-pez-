import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { validationHook } from "../../shared/validation/validation-hook";
import { createBranchSchema } from "./schemas/create-branch.schema";
import type { CreateBranchUseCase } from "./use-cases/create-branch/create-branch.use-case";

export function createBranchRouter(deps: {
  createBranch: CreateBranchUseCase;
}): Hono {
  const router = new Hono();

  router.post("/", sValidator("json", createBranchSchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const input = c.req.valid("json");
    const branch = await deps.createBranch.execute(restaurantId, input);
    return c.json(branch, 201);
  });

  return router;
}
