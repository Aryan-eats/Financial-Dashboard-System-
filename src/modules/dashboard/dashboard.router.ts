import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { dashboardController } from "./dashboard.controller";
import { dashboardQuerySchema, recentActivityQuerySchema } from "./dashboard.schema";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", authenticate, authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN), validate(dashboardQuerySchema), dashboardController.summary);
dashboardRouter.get(
  "/category-breakdown",
  authenticate,
  authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN),
  validate(dashboardQuerySchema),
  dashboardController.categoryBreakdown,
);
dashboardRouter.get("/trends", authenticate, authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN), validate(dashboardQuerySchema), dashboardController.trends);
dashboardRouter.get("/recent", authenticate, authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN), validate(recentActivityQuerySchema), dashboardController.recent);
