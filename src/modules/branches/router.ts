import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { validationHook } from "../../shared/validation/validation-hook";
import { createBranchSchema } from "./schemas/create-branch.schema";
import { updateBranchSchema } from "./schemas/update-branch.schema";
import { listBranchesQuerySchema } from "./schemas/list-branches.schema";
import { replaceScheduleSchema } from "./schemas/replace-schedule.schema";
import { updateBranchStatusSchema } from "./schemas/update-branch-status.schema";
import type { CreateBranchUseCase } from "./use-cases/create-branch/create-branch.use-case";
import type { ListBranchesUseCase } from "./use-cases/list-branches/list-branches.use-case";
import type { GetBranchUseCase } from "./use-cases/get-branch/get-branch.use-case";
import type { UpdateBranchUseCase } from "./use-cases/update-branch/update-branch.use-case";
import type { ReplaceBranchScheduleUseCase } from "./use-cases/replace-branch-schedule/replace-branch-schedule.use-case";
import type { UpdateBranchStatusUseCase } from "./use-cases/update-branch-status/update-branch-status.use-case";
import type { BranchStatus } from "../../generated/prisma/client";

export function createBranchRouter(deps: {
  createBranch: CreateBranchUseCase;
  listBranches: ListBranchesUseCase;
  getBranch: GetBranchUseCase;
  updateBranch: UpdateBranchUseCase;
  replaceSchedule: ReplaceBranchScheduleUseCase;
  updateStatus: UpdateBranchStatusUseCase;
}): Hono {
  const router = new Hono();

  // POST — crear sucursal
  router.post("/", sValidator("json", createBranchSchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const input = c.req.valid("json");
    const branch = await deps.createBranch.execute(restaurantId, input);
    return c.json(branch, 201);
  });

  // GET — listar sucursales
  router.get("/", sValidator("query", listBranchesQuerySchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const query = c.req.valid("query");
    const status = query.status?.toUpperCase() as BranchStatus | undefined;
    const branches = await deps.listBranches.execute(restaurantId, status);
    return c.json(branches);
  });

  // GET — detalle de sucursal
  router.get("/:branchId", async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const branchId = c.req.param("branchId")!;
    const branch = await deps.getBranch.execute(restaurantId, branchId);
    return c.json(branch);
  });

  // PATCH — actualizar sucursal
  router.patch("/:branchId", sValidator("json", updateBranchSchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const branchId = c.req.param("branchId")!;
    const input = c.req.valid("json");
    const branch = await deps.updateBranch.execute(restaurantId, branchId, input);
    return c.json(branch);
  });

  // PUT — reemplazar horarios
  router.put("/:branchId/schedule", sValidator("json", replaceScheduleSchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const branchId = c.req.param("branchId")!;
    const input = c.req.valid("json");
    const branch = await deps.replaceSchedule.execute(restaurantId, branchId, input);
    return c.json(branch);
  });

  // PATCH — activar/desactivar sucursal
  router.patch("/:branchId/status", sValidator("json", updateBranchStatusSchema, validationHook as any), async (c) => {
    const restaurantId = c.req.param("restaurantId")!;
    const branchId = c.req.param("branchId")!;
    const { status } = c.req.valid("json");
    const statusEnum = status.toUpperCase() as BranchStatus;
    const branch = await deps.updateStatus.execute(restaurantId, branchId, statusEnum);
    return c.json(branch);
  });

  return router;
}
