import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { recordsController } from "./records.controller";
import {
  createRecordSchema,
  queryRecordsSchema,
  recordIdSchema,
  updateRecordSchema,
} from "./records.schema";

export const recordsRouter = Router();

recordsRouter.get("/", authenticate, authorize(Role.ANALYST, Role.ADMIN), validate(queryRecordsSchema), recordsController.list);
recordsRouter.get("/:id", authenticate, authorize(Role.ANALYST, Role.ADMIN), validate(recordIdSchema), recordsController.getById);
recordsRouter.post("/", authenticate, authorize(Role.ADMIN), validate(createRecordSchema), recordsController.create);
recordsRouter.patch(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate(recordIdSchema),
  validate(updateRecordSchema),
  recordsController.update,
);
recordsRouter.delete("/:id", authenticate, authorize(Role.ADMIN), validate(recordIdSchema), recordsController.remove);
