import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { usersController } from "./users.controller";
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "./users.schema";

export const usersRouter = Router();

usersRouter.get("/me", authenticate, usersController.getMe);
usersRouter.get("/", authenticate, authorize(Role.ADMIN), validate(listUsersQuerySchema), usersController.listUsers);
usersRouter.patch(
  "/:id/role",
  authenticate,
  authorize(Role.ADMIN),
  validate(updateUserRoleSchema),
  usersController.updateRole,
);
usersRouter.patch(
  "/:id/status",
  authenticate,
  authorize(Role.ADMIN),
  validate(updateUserStatusSchema),
  usersController.updateStatus,
);
