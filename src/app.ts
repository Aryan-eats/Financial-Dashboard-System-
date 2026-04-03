import cors from "cors";
import express from "express";

import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { authRouter } from "./modules/auth/auth.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";
import { recordsRouter } from "./modules/records/records.router";
import { usersRouter } from "./modules/users/users.router";
import { successResponse } from "./utils/apiResponse";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.status(200).json(successResponse({ ok: true }));
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/records", recordsRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use(errorHandler);

  return app;
}

export const app = createApp();
